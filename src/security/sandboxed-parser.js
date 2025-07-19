import { parse } from "@babel/parser";
import { ResourceLimiter, ResourceLimitError } from "./resource-limiter.js";
import { performance } from "perf_hooks";
import { Worker } from "worker_threads";
import path from "path";
import fs from "fs";

/**
 * Custom error class for parser failures
 */
class ParserError extends Error {
  constructor(message, code, filePath, originalError) {
    super(message);
    this.name = "ParserError";
    this.code = code;
    this.filePath = filePath;
    this.originalError = originalError;
  }
}

/**
 * Sandboxed parser wrapper for safe AST parsing
 * Prevents code execution and resource exhaustion attacks
 */
class SandboxedParser {
  constructor(options = {}) {
    // Parser timeout settings
    this.parseTimeout = options.parseTimeout || 5000; // 5 seconds
    this.maxParseAttempts = options.maxParseAttempts || 3;

    // Resource limits
    this.resourceLimiter =
      options.resourceLimiter ||
      new ResourceLimiter({
        maxFileSize: 5 * 1024 * 1024, // 5MB for individual files
        maxASTDepth: 50,
        maxASTNodes: 10000,
      });

    // Parser configuration
    this.defaultParserOptions = {
      sourceType: "module",
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: [
        "jsx",
        "typescript",
        "decorators-legacy",
        "classProperties",
        "objectRestSpread",
        "asyncGenerators",
        "functionBind",
        "exportDefaultFrom",
        "exportNamespaceFrom",
        "dynamicImport",
        "nullishCoalescingOperator",
        "optionalChaining",
        "topLevelAwait",
        "importMeta",
        "bigInt",
        "optionalCatchBinding",
        "throwExpressions",
        "pipelineOperator",
        "partialApplication",
      ],
      errorRecovery: true,
      attachComments: false, // Disable to reduce memory usage
      ranges: false, // Disable to reduce memory usage
      tokens: false, // Disable to reduce memory usage
    };

    // File type detection patterns
    this.fileTypePatterns = {
      typescript: /\.tsx?$/,
      javascript: /\.jsx?$/,
    };

    // Dangerous code patterns to detect
    this.dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /new\s+Function/,
      /\.\s*constructor/,
      /__proto__/,
      /require\s*\(/,
      /import\s*\(/,
      /process\./,
      /global\./,
      /window\./,
      /document\./,
    ];

    // Worker thread pool for isolation (if needed)
    this.useWorkerThreads = options.useWorkerThreads || false;
    this.maxWorkers = options.maxWorkers || 2;
    this.workerPool = [];
  }

  /**
   * Safely parses a file with comprehensive error handling and resource limits
   * @param {string} filePath - Path to the file to parse (can be virtual for in-memory code)
   * @param {string} code - Source code to parse
   * @param {Object} options - Parsing options
   * @returns {Promise<Object>} - Parsed AST with metadata
   * @throws {ParserError} - If parsing fails or violates limits
   */
  async parseFile(filePath, code, options = {}) {
    const operationId = this.resourceLimiter.startOperation();
    const startTime = performance.now();

    try {
      // Check if this is in-memory parsing or actual file parsing
      const isInMemory = options.inMemory !== false && !fs.existsSync(filePath);

      if (!isInMemory) {
        // Validate file size for actual files
        await this.resourceLimiter.checkFileSize(filePath);
      } else {
        // For in-memory code, check code length directly
        if (code.length > this.resourceLimiter.maxFileSize) {
          throw new ResourceLimitError(
            `Code size ${code.length} bytes exceeds maximum allowed ${this.resourceLimiter.maxFileSize} bytes`,
            "CODE_TOO_LARGE",
            this.resourceLimiter.maxFileSize,
            code.length,
          );
        }
      }

      // Pre-parse validation
      this.validateCodeSafety(code, filePath);

      // Determine parser configuration based on file type
      const parserConfig = this.getParserConfig(filePath, options);

      // Parse with timeout protection
      const ast = await this.parseWithTimeout(code, parserConfig, filePath);

      // Validate AST complexity
      const astStats = this.resourceLimiter.validateAST(ast);

      // Record successful processing
      this.resourceLimiter.recordFileProcessed(filePath, code.length);

      const parseTime = performance.now() - startTime;

      return {
        ast,
        metadata: {
          filePath,
          parseTime,
          astStats,
          isInMemory,
          parserConfig: {
            sourceType: parserConfig.sourceType,
            plugins: parserConfig.plugins,
          },
        },
      };
    } catch (error) {
      const parseTime = performance.now() - startTime;

      // Wrap and enhance error information
      if (error instanceof ResourceLimitError) {
        throw new ParserError(
          `Resource limit exceeded while parsing ${filePath}: ${error.message}`,
          "RESOURCE_LIMIT_EXCEEDED",
          filePath,
          error,
        );
      }

      if (error instanceof ParserError) {
        throw error;
      }

      throw new ParserError(
        `Failed to parse ${filePath}: ${error.message}`,
        "PARSE_ERROR",
        filePath,
        error,
      );
    } finally {
      this.resourceLimiter.endOperation(operationId);
    }
  }

  /**
   * Parses code with timeout protection
   * @param {string} code - Source code to parse
   * @param {Object} parserConfig - Parser configuration
   * @param {string} filePath - File path for error reporting
   * @returns {Promise<Object>} - Parsed AST
   */
  async parseWithTimeout(code, parserConfig, filePath) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new ParserError(
            `Parsing timeout after ${this.parseTimeout}ms`,
            "PARSE_TIMEOUT",
            filePath,
          ),
        );
      }, this.parseTimeout);

      try {
        // Attempt to parse
        const ast = parse(code, parserConfig);
        clearTimeout(timeout);
        resolve(ast);
      } catch (error) {
        clearTimeout(timeout);

        // Try with more permissive settings if initial parse fails
        if (this.shouldRetryParsing(error)) {
          try {
            const permissiveConfig = {
              ...parserConfig,
              strictMode: false,
              allowHashBang: true,
              allowAwaitOutsideFunction: true,
              allowUndeclaredExports: true,
            };

            const ast = parse(code, permissiveConfig);
            resolve(ast);
          } catch (retryError) {
            reject(
              new ParserError(
                `Parse failed even with permissive settings: ${retryError.message}`,
                "PARSE_FAILED_RETRY",
                filePath,
                retryError,
              ),
            );
          }
        } else {
          reject(
            new ParserError(
              `Parse failed: ${error.message}`,
              "PARSE_FAILED",
              filePath,
              error,
            ),
          );
        }
      }
    });
  }

  /**
   * Validates code safety before parsing
   * @param {string} code - Source code to validate
   * @param {string} filePath - File path for error reporting
   * @throws {ParserError} - If dangerous patterns are detected
   */
  validateCodeSafety(code, filePath) {
    // Check for null bytes
    if (code.includes("\0")) {
      throw new ParserError(
        "Code contains null bytes",
        "NULL_BYTES_DETECTED",
        filePath,
      );
    }

    // Check for excessively long lines (potential DoS)
    const lines = code.split("\n");
    const maxLineLength = 10000;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > maxLineLength) {
        throw new ParserError(
          `Line ${i + 1} exceeds maximum length of ${maxLineLength} characters`,
          "LINE_TOO_LONG",
          filePath,
        );
