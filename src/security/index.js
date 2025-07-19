/**
 * Security Module Index
 *
 * Provides comprehensive security features for the JSX analyzer including:
 * - Path validation and traversal protection
 * - Input sanitization and validation
 * - Resource limits and DoS protection
 * - Sandboxed code parsing
 */

// Path validation exports
export {
  PathValidator,
  PathValidationError,
  validatePath,
  validatePathWithMetadata,
  validatePaths,
  isSafePath,
  getRelativePath,
} from "./path-validator.js";

// Input sanitization exports
export {
  InputSanitizer,
  InputSanitizationError,
  sanitizeComponentName,
  sanitizePropName,
  sanitizePropValue,
  sanitizeSearchValue,
  sanitizeRegexPattern,
  sanitizeGlobPattern,
  sanitizeString,
  sanitizeAnalyzeParams,
} from "./input-sanitizer.js";

// Resource limiting exports
export {
  ResourceLimiter,
  ResourceLimitError,
  checkFileSize,
  startOperation,
  endOperation,
  checkOperationTimeout,
  recordFileProcessed,
  validateAST,
  trackDirectoryTraversal,
  getUsageStats,
  resetUsage,
} from "./resource-limiter.js";

// Sandboxed parser exports
export {
  SandboxedParser,
  ParserError,
  parseFile,
  parseMultipleFiles,
  getParserStats,
  resetParser,
} from "./sandboxed-parser.js";

// Import the classes directly for internal use
import { PathValidator } from "./path-validator.js";
import { InputSanitizer } from "./input-sanitizer.js";
import { ResourceLimiter } from "./resource-limiter.js";
import { SandboxedParser } from "./sandboxed-parser.js";

/**
 * Creates a complete security context with all components configured
 * @param {Object} options - Configuration options for all security components
 * @returns {Object} - Complete security context
 */
export function createSecurityContext(options = {}) {
  const pathValidator = new PathValidator(options.pathValidator);
  const inputSanitizer = new InputSanitizer(options.inputSanitizer);
  const resourceLimiter = new ResourceLimiter(options.resourceLimiter);
  const sandboxedParser = new SandboxedParser({
    ...options.sandboxedParser,
    resourceLimiter,
  });

  return {
    pathValidator,
    inputSanitizer,
    resourceLimiter,
    sandboxedParser,

    /**
     * Validates and sanitizes all parameters for safe processing
     * @param {Object} params - Raw parameters
     * @returns {Object} - Validated and sanitized parameters
     */
    async validateAndSanitize(params) {
      // Sanitize inputs first
      const sanitized = inputSanitizer.sanitizeAnalyzeParams(params);

      // Validate and normalize path
      const validatedPath = pathValidator.validatePath(sanitized.rootDir, {
        requireExists: true,
      });

      return {
        ...sanitized,
        rootDir: validatedPath,
      };
    },

    /**
     * Gets comprehensive security stats
     * @returns {Object} - Security statistics
     */
    getSecurityStats() {
      return {
        resourceUsage: resourceLimiter.getUsageStats(),
        parserStats: sandboxedParser.getStats(),
        timestamp: new Date().toISOString(),
      };
    },

    /**
     * Resets all security counters
     */
    reset() {
      resourceLimiter.reset();
      sandboxedParser.reset();
    },

    /**
     * Cleanup all security components
     */
    destroy() {
      resourceLimiter.destroy();
      sandboxedParser.destroy();
    },
  };
}

/**
 * Default security context instance
 */
export const defaultSecurityContext = createSecurityContext();

/**
 * Quick validation function for common use cases
 * @param {Object} params - Parameters to validate
 * @returns {Promise<Object>} - Validated parameters
 */
export const quickValidate = (params) =>
  defaultSecurityContext.validateAndSanitize(params);
