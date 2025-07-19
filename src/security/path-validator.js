import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

/**
 * Custom error class for path validation failures
 */
class PathValidationError2 extends Error {
  constructor(message, code, originalPath) {
    super(message);
    this.name = "PathValidationError";
    this.code = code;
    this.originalPath = originalPath;
  }
}

/**
 * Secure path validator to prevent directory traversal attacks
 * and ensure all file operations stay within allowed boundaries
 */
class PathValidator {
  constructor(options = {}) {
    // Default allowed root directories (can be overridden)
    this.allowedRoots = options.allowedRoots || [process.cwd()];

    // Maximum path length to prevent buffer overflow attacks
    this.maxPathLength = options.maxPathLength || 4096;

    // Whether to resolve symbolic links
    this.resolveSymlinks = options.resolveSymlinks !== false;

    // Whether to check if path exists
    this.requireExists = options.requireExists || false;

    // Normalize allowed roots
    this.allowedRoots = this.allowedRoots.map((root) => path.resolve(root));
  }

  /**
   * Validates and normalizes a file or directory path
   * @param {string} inputPath - The path to validate
   * @param {Object} options - Validation options
   * @returns {string} - The validated and normalized path
   * @throws {PathValidationError2} - If path is invalid or unsafe
   */
  validatePath(inputPath, options = {}) {
    try {
      // Input validation
      if (!inputPath || typeof inputPath !== "string") {
        throw new PathValidationError2(
          "Path must be a non-empty string",
          "INVALID_INPUT",
          inputPath,
        );
      }

      // Check for null bytes (potential security issue)
      if (inputPath.includes("\0")) {
        throw new PathValidationError2(
          "Path contains null bytes",
          "NULL_BYTE_DETECTED",
          inputPath,
        );
      }

      // Check path length
      if (inputPath.length > this.maxPathLength) {
        throw new PathValidationError2(
          `Path exceeds maximum length of ${this.maxPathLength} characters`,
          "PATH_TOO_LONG",
          inputPath,
        );
      }

      // Normalize and resolve the path
      let normalizedPath = path.normalize(inputPath);
      let resolvedPath = path.resolve(normalizedPath);

      // Handle symbolic links if requested
      if (this.resolveSymlinks && fs.existsSync(resolvedPath)) {
        try {
          const stats = fs.lstatSync(resolvedPath);
          if (stats.isSymbolicLink()) {
            resolvedPath = fs.realpathSync(resolvedPath);
          }
        } catch (error) {
          throw new PathValidationError2(
            `Cannot resolve symbolic link: ${error.message}`,
            "SYMLINK_ERROR",
            inputPath,
          );
        }
      }

      // Check if path stays within allowed boundaries
      const isWithinAllowedRoot = this.allowedRoots.some((root) => {
        const relativePath = path.relative(root, resolvedPath);
        // Path should not start with '..' which would indicate it's outside the root
        return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
      });

      if (!isWithinAllowedRoot) {
        throw new PathValidationError2(
          "Path is outside allowed directories",
          "PATH_TRAVERSAL_DETECTED",
          inputPath,
        );
      }

      // Check for existence if required
      if (this.requireExists || options.requireExists) {
        if (!fs.existsSync(resolvedPath)) {
          throw new PathValidationError2(
            "Path does not exist",
            "PATH_NOT_FOUND",
            inputPath,
          );
        }
      }

      return resolvedPath;
    } catch (error) {
      if (error instanceof PathValidationError2) {
        throw error;
      }

      // Wrap other errors
      throw new PathValidationError2(
        `Path validation failed: ${error.message}`,
        "VALIDATION_ERROR",
        inputPath,
      );
    }
  }

  /**
   * Validates a path and returns additional metadata
   * @param {string} inputPath - The path to validate
   * @param {Object} options - Validation options
   * @returns {Object} - Validation result with metadata
   */
  validatePathWithMetadata(inputPath, options = {}) {
    const validatedPath = this.validatePath(inputPath, options);

    let metadata = {
      originalPath: inputPath,
      validatedPath: validatedPath,
      isDirectory: false,
      isFile: false,
      exists: false,
      size: null,
    };

    try {
      if (fs.existsSync(validatedPath)) {
        const stats = fs.statSync(validatedPath);
        metadata.exists = true;
        metadata.isDirectory = stats.isDirectory();
        metadata.isFile = stats.isFile();
        metadata.size = stats.size;
      }
    } catch (error) {
      // Don't throw here, just indicate the path couldn't be stat'd
      metadata.statError = error.message;
    }

    return metadata;
  }

  /**
   * Validates multiple paths at once
   * @param {string[]} paths - Array of paths to validate
   * @param {Object} options - Validation options
   * @returns {Object} - Results with valid and invalid paths
   */
  validatePaths(paths, options = {}) {
    const results = {
      valid: [],
      invalid: [],
      errors: [],
    };

    for (const inputPath of paths) {
      try {
        const validatedPath = this.validatePath(inputPath, options);
        results.valid.push({
          original: inputPath,
          validated: validatedPath,
        });
      } catch (error) {
        results.invalid.push(inputPath);
        results.errors.push({
          path: inputPath,
          error: error.message,
          code: error.code,
        });
      }
    }

    return results;
  }

  /**
   * Checks if a path is safe without throwing errors
   * @param {string} inputPath - The path to check
   * @returns {boolean} - True if path is safe, false otherwise
   */
  isSafePath(inputPath) {
    try {
      this.validatePath(inputPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets relative path from one of the allowed roots
   * @param {string} inputPath - The path to make relative
   * @returns {string} - Relative path from nearest allowed root
   */
  getRelativePath(inputPath) {
    const validatedPath = this.validatePath(inputPath);

    // Find the allowed root that this path is under
    for (const root of this.allowedRoots) {
      const relativePath = path.relative(root, validatedPath);
      if (!relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
        return relativePath || ".";
      }
    }

    // Fallback to relative from current working directory
    return path.relative(process.cwd(), validatedPath);
  }

  /**
   * Creates a new PathValidator with additional allowed roots
   * @param {string[]} additionalRoots - Additional root directories to allow
   * @returns {PathValidator} - New validator instance
   */
  withAdditionalRoots(additionalRoots) {
    return new PathValidator({
      allowedRoots: [...this.allowedRoots, ...additionalRoots],
      maxPathLength: this.maxPathLength,
      resolveSymlinks: this.resolveSymlinks,
      requireExists: this.requireExists,
    });
  }
}

/**
 * Default instance for common use cases
 */
const defaultValidator = new PathValidator();

/**
 * Convenience functions using the default validator
 */
export const validatePath = (inputPath, options) =>
  defaultValidator.validatePath(inputPath, options);

export const validatePathWithMetadata = (inputPath, options) =>
  defaultValidator.validatePathWithMetadata(inputPath, options);

export const validatePaths = (paths, options) =>
  defaultValidator.validatePaths(paths, options);

export const isSafePath = (inputPath) => defaultValidator.isSafePath(inputPath);

export const getRelativePath = (inputPath) =>
  defaultValidator.getRelativePath(inputPath);

export { PathValidator, PathValidationError2 as PathValidationError };
