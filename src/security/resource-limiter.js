import fs from "fs";
import { performance } from "perf_hooks";
import { EventEmitter } from "events";

/**
 * Custom error class for resource limit violations
 */
class ResourceLimitError extends Error {
  constructor(message, code, limit, current) {
    super(message);
    this.name = "ResourceLimitError";
    this.code = code;
    this.limit = limit;
    this.current = current;
  }
}

/**
 * Resource usage tracker and limiter to prevent DoS attacks
 * and system resource exhaustion
 */
class ResourceLimiter extends EventEmitter {
  constructor(options = {}) {
    super();

    // File size limits
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxTotalFileSize = options.maxTotalFileSize || 100 * 1024 * 1024; // 100MB

    // Processing limits
    this.maxProcessingTime = options.maxProcessingTime || 30 * 1000; // 30 seconds
    this.maxFileCount = options.maxFileCount || 1000;
    this.maxConcurrentOperations = options.maxConcurrentOperations || 5;

    // Memory limits (in bytes)
    this.maxMemoryUsage = options.maxMemoryUsage || 500 * 1024 * 1024; // 500MB
    this.memoryCheckInterval = options.memoryCheckInterval || 1000; // 1 second

    // AST parsing limits
    this.maxASTDepth = options.maxASTDepth || 50;
    this.maxASTNodes = options.maxASTNodes || 10000;

    // Directory traversal limits
    this.maxDirectoryDepth = options.maxDirectoryDepth || 20;
    this.maxDirectoriesScanned = options.maxDirectoriesScanned || 5000;

    // Current usage tracking
    this.currentOperations = new Set();
    this.totalFilesProcessed = 0;
    this.totalSizeProcessed = 0;
    this.operationStartTimes = new Map();
    this.memoryCheckTimer = null;
    this.initialMemoryUsage = process.memoryUsage().heapUsed;
    this.directoryDepthCounter = new Map();
    this.directoriesScanned = 0;

    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  /**
   * Starts monitoring memory usage at regular intervals
   */
  startMemoryMonitoring() {
    if (this.memoryCheckTimer) {
      clearInterval(this.memoryCheckTimer);
    }

    this.memoryCheckTimer = setInterval(() => {
      const memUsage = process.memoryUsage().heapUsed;
      if (memUsage > this.maxMemoryUsage) {
        this.emit("memoryLimitExceeded", {
          current: memUsage,
          limit: this.maxMemoryUsage,
        });

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }, this.memoryCheckInterval);
  }

  /**
   * Stops memory monitoring
   */
  stopMemoryMonitoring() {
    if (this.memoryCheckTimer) {
      clearInterval(this.memoryCheckTimer);
      this.memoryCheckTimer = null;
    }
  }

  /**
   * Checks if a file can be processed based on size limits
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>} - True if file can be processed
   * @throws {ResourceLimitError} - If file exceeds limits
   */
  async checkFileSize(filePath) {
    try {
      const stats = await fs.promises.stat(filePath);
      const fileSize = stats.size;

      // Check individual file size
      if (fileSize > this.maxFileSize) {
        throw new ResourceLimitError(
          `File size ${fileSize} bytes exceeds maximum allowed ${this.maxFileSize} bytes`,
          "FILE_TOO_LARGE",
          this.maxFileSize,
          fileSize,
        );
      }

      // Check total processed size
      if (this.totalSizeProcessed + fileSize > this.maxTotalFileSize) {
        throw new ResourceLimitError(
          `Total processing size would exceed limit of ${this.maxTotalFileSize} bytes`,
          "TOTAL_SIZE_EXCEEDED",
          this.maxTotalFileSize,
          this.totalSizeProcessed + fileSize,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ResourceLimitError) {
        throw error;
      }
      throw new ResourceLimitError(
        `Cannot check file size: ${error.message}`,
        "FILE_ACCESS_ERROR",
        null,
        null,
      );
    }
  }

  /**
   * Starts tracking a new operation
   * @param {string} operationId - Unique identifier for the operation
   * @returns {string} - The operation ID
   * @throws {ResourceLimitError} - If too many concurrent operations
   */
  startOperation(operationId = null) {
    if (!operationId) {
      operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Check concurrent operations limit
    if (this.currentOperations.size >= this.maxConcurrentOperations) {
      throw new ResourceLimitError(
        `Maximum concurrent operations (${this.maxConcurrentOperations}) exceeded`,
        "TOO_MANY_OPERATIONS",
        this.maxConcurrentOperations,
        this.currentOperations.size,
      );
    }

    this.currentOperations.add(operationId);
    this.operationStartTimes.set(operationId, performance.now());

    this.emit("operationStarted", { operationId });

    return operationId;
  }

  /**
   * Ends tracking of an operation
   * @param {string} operationId - The operation ID to end
   */
  endOperation(operationId) {
    this.currentOperations.delete(operationId);
    const startTime = this.operationStartTimes.get(operationId);
    this.operationStartTimes.delete(operationId);

    if (startTime) {
      const duration = performance.now() - startTime;
      this.emit("operationEnded", { operationId, duration });
    }
  }

  /**
   * Checks if an operation has exceeded time limits
   * @param {string} operationId - The operation ID to check
   * @throws {ResourceLimitError} - If operation has timed out
   */
  checkOperationTimeout(operationId) {
    const startTime = this.operationStartTimes.get(operationId);
    if (startTime) {
      const elapsed = performance.now() - startTime;
      if (elapsed > this.maxProcessingTime) {
        throw new ResourceLimitError(
          `Operation ${operationId} exceeded maximum processing time of ${this.maxProcessingTime}ms`,
          "OPERATION_TIMEOUT",
          this.maxProcessingTime,
          elapsed,
        );
      }
    }
  }

  /**
   * Records that a file has been processed
   * @param {string} filePath - Path of the processed file
   * @param {number} fileSize - Size of the processed file
   * @throws {ResourceLimitError} - If file count limit exceeded
   */
  recordFileProcessed(filePath, fileSize) {
    this.totalFilesProcessed++;
    this.totalSizeProcessed += fileSize;

    if (this.totalFilesProcessed > this.maxFileCount) {
      throw new ResourceLimitError(
        `Maximum file count (${this.maxFileCount}) exceeded`,
        "TOO_MANY_FILES",
        this.maxFileCount,
        this.totalFilesProcessed,
      );
    }

    this.emit("fileProcessed", {
      filePath,
      fileSize,
      totalProcessed: this.totalFilesProcessed,
      totalSize: this.totalSizeProcessed,
    });
  }

  /**
   * Validates AST complexity limits
   * @param {Object} ast - The AST to validate
   * @param {number} depth - Current depth (for recursion)
   * @returns {Object} - AST stats
   * @throws {ResourceLimitError} - If AST exceeds limits
   */
  validateAST(ast, depth = 0) {
    if (depth > this.maxASTDepth) {
      throw new ResourceLimitError(
        `AST depth ${depth} exceeds maximum allowed depth of ${this.maxASTDepth}`,
        "AST_TOO_DEEP",
        this.maxASTDepth,
        depth,
      );
    }

    let nodeCount = 1;

    // Recursively count nodes and check depth
    const traverse = (node, currentDepth) => {
      if (!node || typeof node !== "object") return;

      for (const key in node) {
        const value = node[key];
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === "object" && item.type) {
              nodeCount++;
              if (nodeCount > this.maxASTNodes) {
                throw new ResourceLimitError(
                  `AST node count ${nodeCount} exceeds maximum allowed nodes of ${this.maxASTNodes}`,
                  "AST_TOO_COMPLEX",
                  this.maxASTNodes,
                  nodeCount,
                );
              }
              traverse(item, currentDepth + 1);
            }
          }
        } else if (value && typeof value === "object" && value.type) {
          nodeCount++;
          if (nodeCount > this.maxASTNodes) {
            throw new ResourceLimitError(
              `AST node count ${nodeCount} exceeds maximum allowed nodes of ${this.maxASTNodes}`,
              "AST_TOO_COMPLEX",
              this.maxASTNodes,
              nodeCount,
            );
          }
          traverse(value, currentDepth + 1);
        }
      }
    };

    traverse(ast, depth);

    return { nodeCount, maxDepth: depth };
  }

  /**
   * Tracks directory traversal depth
   * @param {string} dirPath - Directory path being traversed
   * @param {number} depth - Current depth
   * @throws {ResourceLimitError} - If directory depth exceeds limits
   */
  trackDirectoryTraversal(dirPath, depth) {
    if (depth > this.maxDirectoryDepth) {
      throw new ResourceLimitError(
        `Directory traversal depth ${depth} exceeds maximum allowed depth of ${this.maxDirectoryDepth}`,
        "DIRECTORY_TOO_DEEP",
        this.maxDirectoryDepth,
        depth,
      );
    }

    this.directoriesScanned++;
    if (this.directoriesScanned > this.maxDirectoriesScanned) {
      throw new ResourceLimitError(
        `Number of directories scanned ${this.directoriesScanned} exceeds maximum allowed ${this.maxDirectoriesScanned}`,
        "TOO_MANY_DIRECTORIES",
        this.maxDirectoriesScanned,
        this.directoriesScanned,
      );
    }

    this.directoryDepthCounter.set(dirPath, depth);
    this.emit("directoryTraversed", {
      dirPath,
      depth,
      totalScanned: this.directoriesScanned,
    });
  }

  /**
   * Gets current resource usage statistics
   * @returns {Object} - Current usage stats
   */
  getUsageStats() {
    const memUsage = process.memoryUsage();
    return {
      files: {
        processed: this.totalFilesProcessed,
        limit: this.maxFileCount,
        sizeProcessed: this.totalSizeProcessed,
        sizeLimit: this.maxTotalFileSize,
      },
      operations: {
        current: this.currentOperations.size,
        limit: this.maxConcurrentOperations,
        active: Array.from(this.currentOperations),
      },
      directories: {
        scanned: this.directoriesScanned,
        limit: this.maxDirectoriesScanned,
      },
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        limit: this.maxMemoryUsage,
        initial: this.initialMemoryUsage,
      },
    };
  }

  /**
   * Resets usage counters (useful for new operations)
   */
  reset() {
    this.totalFilesProcessed = 0;
    this.totalSizeProcessed = 0;
    this.directoriesScanned = 0;
    this.directoryDepthCounter.clear();

    // Don't reset current operations as they might still be running
    this.emit("statsReset");
  }

  /**
   * Creates a scoped limiter for a specific operation
   * @param {Object} scopedLimits - Limits specific to this scope
   * @returns {ResourceLimiter} - New limiter instance with scoped limits
   */
  createScoped(scopedLimits = {}) {
    const scopedOptions = {
      maxFileSize: scopedLimits.maxFileSize || this.maxFileSize,
      maxTotalFileSize: scopedLimits.maxTotalFileSize || this.maxTotalFileSize,
      maxProcessingTime:
        scopedLimits.maxProcessingTime || this.maxProcessingTime,
      maxFileCount: scopedLimits.maxFileCount || this.maxFileCount,
      maxConcurrentOperations:
        scopedLimits.maxConcurrentOperations || this.maxConcurrentOperations,
      maxMemoryUsage: scopedLimits.maxMemoryUsage || this.maxMemoryUsage,
      maxASTDepth: scopedLimits.maxASTDepth || this.maxASTDepth,
      maxASTNodes: scopedLimits.maxASTNodes || this.maxASTNodes,
      maxDirectoryDepth:
        scopedLimits.maxDirectoryDepth || this.maxDirectoryDepth,
      maxDirectoriesScanned:
        scopedLimits.maxDirectoriesScanned || this.maxDirectoriesScanned,
    };

    return new ResourceLimiter(scopedOptions);
  }

  /**
   * Cleanup method to stop monitoring and clear resources
   */
  destroy() {
    this.stopMemoryMonitoring();
    this.currentOperations.clear();
    this.operationStartTimes.clear();
    this.directoryDepthCounter.clear();
    this.removeAllListeners();
  }
}

/**
 * Default instance for common use cases
 */
const defaultLimiter = new ResourceLimiter();

/**
 * Convenience functions using the default limiter
 */
export const checkFileSize = (filePath) =>
  defaultLimiter.checkFileSize(filePath);

export const startOperation = (operationId) =>
  defaultLimiter.startOperation(operationId);

export const endOperation = (operationId) =>
  defaultLimiter.endOperation(operationId);

export const checkOperationTimeout = (operationId) =>
  defaultLimiter.checkOperationTimeout(operationId);

export const recordFileProcessed = (filePath, fileSize) =>
  defaultLimiter.recordFileProcessed(filePath, fileSize);

export const validateAST = (ast, depth) =>
  defaultLimiter.validateAST(ast, depth);

export const trackDirectoryTraversal = (dirPath, depth) =>
  defaultLimiter.trackDirectoryTraversal(dirPath, depth);

export const getUsageStats = () => defaultLimiter.getUsageStats();

export const resetUsage = () => defaultLimiter.reset();

export { ResourceLimiter, ResourceLimitError };
