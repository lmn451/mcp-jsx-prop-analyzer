import { PathValidationError } from "./path-validator.js";

/**
 * Custom error class for input sanitization failures
 */
class InputSanitizationError extends Error {
  constructor(message, code, field, value) {
    super(message);
    this.name = "InputSanitizationError";
    this.code = code;
    this.field = field;
    this.value = value;
  }
}

/**
 * Comprehensive input sanitizer to prevent injection attacks
 * and validate all user inputs according to expected formats
 */
class InputSanitizer {
  constructor(options = {}) {
    // Configuration options
    this.maxStringLength = options.maxStringLength || 1000;
    this.maxArrayLength = options.maxArrayLength || 100;
    this.allowedComponentNamePattern =
      options.allowedComponentNamePattern ||
      /^[A-Z][a-zA-Z0-9_$]*(\.[A-Z][a-zA-Z0-9_$]*)*$/;
    this.allowedPropNamePattern =
      options.allowedPropNamePattern || /^[a-zA-Z_$][a-zA-Z0-9_$-]*$/;
    this.allowedSearchValuePattern =
      options.allowedSearchValuePattern || /^[^<>'";&|`$(){}[\]\\]*$/;
  }

  /**
   * Sanitizes and validates component names
   * @param {string} componentName - The component name to validate
   * @returns {string} - The sanitized component name
   * @throws {InputSanitizationError} - If component name is invalid
   */
  sanitizeComponentName(componentName) {
    // Type check
    if (typeof componentName !== "string") {
      throw new InputSanitizationError(
        "Component name must be a string",
        "INVALID_TYPE",
        "componentName",
        componentName,
      );
    }

    // Length check
    if (componentName.length === 0) {
      throw new InputSanitizationError(
        "Component name cannot be empty",
        "EMPTY_VALUE",
        "componentName",
        componentName,
      );
    }

    if (componentName.length > this.maxStringLength) {
      throw new InputSanitizationError(
        `Component name exceeds maximum length of ${this.maxStringLength}`,
        "TOO_LONG",
        "componentName",
        componentName,
      );
    }

    // Pattern validation - React component names should start with uppercase
    // and can contain dots for namespaced components (e.g., React.Fragment)
    if (!this.allowedComponentNamePattern.test(componentName)) {
      throw new InputSanitizationError(
        "Component name contains invalid characters or format. Must start with uppercase letter and contain only alphanumeric characters, underscores, and dots.",
        "INVALID_FORMAT",
        "componentName",
        componentName,
      );
    }

    // Check for dangerous patterns
    if (this.containsDangerousPatterns(componentName)) {
      throw new InputSanitizationError(
        "Component name contains potentially dangerous patterns",
        "DANGEROUS_PATTERN",
        "componentName",
        componentName,
      );
    }

    return componentName.trim();
  }

  /**
   * Sanitizes and validates prop names
   * @param {string} propName - The prop name to validate
   * @returns {string} - The sanitized prop name
   * @throws {InputSanitizationError} - If prop name is invalid
   */
  sanitizePropName(propName) {
    // Type check
    if (typeof propName !== "string") {
      throw new InputSanitizationError(
        "Prop name must be a string",
        "INVALID_TYPE",
        "propName",
        propName,
      );
    }

    // Length check
    if (propName.length === 0) {
      throw new InputSanitizationError(
        "Prop name cannot be empty",
        "EMPTY_VALUE",
        "propName",
        propName,
      );
    }

    if (propName.length > this.maxStringLength) {
      throw new InputSanitizationError(
        `Prop name exceeds maximum length of ${this.maxStringLength}`,
        "TOO_LONG",
        "propName",
        propName,
      );
    }

    // Pattern validation - valid JavaScript identifier or common prop patterns
    if (!this.allowedPropNamePattern.test(propName)) {
      throw new InputSanitizationError(
        "Prop name contains invalid characters. Must be a valid JavaScript identifier or contain only alphanumeric characters, underscores, and hyphens.",
        "INVALID_FORMAT",
        "propName",
        propName,
      );
    }

    // Check for dangerous patterns
    if (this.containsDangerousPatterns(propName)) {
      throw new InputSanitizationError(
        "Prop name contains potentially dangerous patterns",
        "DANGEROUS_PATTERN",
        "propName",
        propName,
      );
    }

    return propName.trim();
  }

  /**
   * Sanitizes prop values based on their type
   * @param {any} propValue - The prop value to sanitize
   * @param {Object} options - Sanitization options
   * @returns {any} - The sanitized prop value
   * @throws {InputSanitizationError} - If prop value is invalid
   */
  sanitizePropValue(propValue, options = {}) {
    // Handle null and undefined
    if (propValue === null || propValue === undefined) {
      return propValue;
    }

    // Handle boolean values
    if (typeof propValue === "boolean") {
      return propValue;
    }

    // Handle numeric values
    if (typeof propValue === "number") {
      if (!Number.isFinite(propValue)) {
        throw new InputSanitizationError(
          "Prop value must be a finite number",
          "INVALID_NUMBER",
          "propValue",
          propValue,
        );
      }
      return propValue;
    }

    // Handle string values
    if (typeof propValue === "string") {
      return this.sanitizeString(propValue, "propValue", options);
    }

    // Handle arrays
    if (Array.isArray(propValue)) {
      if (propValue.length > this.maxArrayLength) {
        throw new InputSanitizationError(
          `Prop value array exceeds maximum length of ${this.maxArrayLength}`,
          "ARRAY_TOO_LONG",
          "propValue",
          propValue,
        );
      }
      return propValue.map((item, index) =>
        this.sanitizePropValue(item, { ...options, arrayIndex: index }),
      );
    }

    // Handle objects (basic sanitization)
    if (typeof propValue === "object") {
      if (options.allowObjects !== false) {
        const sanitized = {};
        const keys = Object.keys(propValue);

        if (keys.length > this.maxArrayLength) {
          throw new InputSanitizationError(
            `Prop value object has too many keys (max: ${this.maxArrayLength})`,
            "OBJECT_TOO_LARGE",
            "propValue",
            propValue,
          );
        }

        for (const key of keys) {
          const sanitizedKey = this.sanitizeString(key, "propValue.key");
          sanitized[sanitizedKey] = this.sanitizePropValue(
            propValue[key],
            options,
          );
        }
        return sanitized;
      } else {
        throw new InputSanitizationError(
          "Object prop values are not allowed in this context",
          "OBJECTS_NOT_ALLOWED",
          "propValue",
          propValue,
        );
      }
    }

    // Reject functions and other complex types
    throw new InputSanitizationError(
      `Unsupported prop value type: ${typeof propValue}`,
      "UNSUPPORTED_TYPE",
      "propValue",
      propValue,
    );
  }

  /**
   * Sanitizes search values for prop value searching
   * @param {string} searchValue - The search value to sanitize
   * @returns {string} - The sanitized search value
   * @throws {InputSanitizationError} - If search value is invalid
   */
  sanitizeSearchValue(searchValue) {
    if (typeof searchValue !== "string") {
      throw new InputSanitizationError(
        "Search value must be a string",
        "INVALID_TYPE",
        "searchValue",
        searchValue,
      );
    }

    if (searchValue.length > this.maxStringLength) {
      throw new InputSanitizationError(
        `Search value exceeds maximum length of ${this.maxStringLength}`,
        "TOO_LONG",
        "searchValue",
        searchValue,
      );
    }

    // Check for patterns that could be used for injection
    if (!this.allowedSearchValuePattern.test(searchValue)) {
      throw new InputSanitizationError(
        "Search value contains potentially dangerous characters",
        "DANGEROUS_CHARACTERS",
        "searchValue",
        searchValue,
      );
    }

    return searchValue;
  }

  /**
   * Sanitizes regex patterns for search functionality
   * @param {string} pattern - The regex pattern to sanitize
   * @returns {string} - The sanitized regex pattern
   * @throws {InputSanitizationError} - If pattern is invalid or dangerous
   */
  sanitizeRegexPattern(pattern) {
    if (typeof pattern !== "string") {
      throw new InputSanitizationError(
        "Regex pattern must be a string",
        "INVALID_TYPE",
        "regexPattern",
        pattern,
      );
    }

    if (pattern.length > this.maxStringLength) {
      throw new InputSanitizationError(
        `Regex pattern exceeds maximum length of ${this.maxStringLength}`,
        "TOO_LONG",
        "regexPattern",
        pattern,
      );
    }

    // Test if the regex is valid
    try {
      new RegExp(pattern);
    } catch (error) {
      throw new InputSanitizationError(
        `Invalid regex pattern: ${error.message}`,
        "INVALID_REGEX",
        "regexPattern",
        pattern,
      );
    }

    // Check for catastrophic backtracking patterns
    const dangerousRegexPatterns = [
      /\(\?\=/, // Positive lookahead
      /\(\?\!/, // Negative lookahead
      /\(\?\<\=/, // Positive lookbehind
      /\(\?\<\!/, // Negative lookbehind
      /\*\+/, // Nested quantifiers
      /\+\*/, // Nested quantifiers
      /\{\d+,\}/, // Large quantifiers without upper bound
      /\([^)]*[\+\*][^)]*\)[\+\*]/, // Nested quantifiers like (a+)+ or (a*)*
      /\([^)]*[\+\*][^)]*\)\{/, // Nested quantifiers with braces like (a+){2,}
      /[\+\*]\{[^}]*,\}/, // Unbounded quantifiers like +{2,} or *{3,}
      /\.\*\.\*/, // Multiple .* patterns
      /\.\+\.\+/, // Multiple .+ patterns
    ];

    for (const dangerousPattern of dangerousRegexPatterns) {
      if (dangerousPattern.test(pattern)) {
        throw new InputSanitizationError(
          "Regex pattern contains potentially dangerous constructs that could cause ReDoS",
          "DANGEROUS_REGEX",
          "regexPattern",
          pattern,
        );
      }
    }

    return pattern;
  }

  /**
   * Sanitizes file glob patterns
   * @param {string} globPattern - The glob pattern to sanitize
   * @returns {string} - The sanitized glob pattern
   * @throws {InputSanitizationError} - If pattern is invalid
   */
  sanitizeGlobPattern(globPattern) {
    if (typeof globPattern !== "string") {
      throw new InputSanitizationError(
        "Glob pattern must be a string",
        "INVALID_TYPE",
        "globPattern",
        globPattern,
      );
    }

    if (globPattern.length > this.maxStringLength) {
      throw new InputSanitizationError(
        `Glob pattern exceeds maximum length of ${this.maxStringLength}`,
        "TOO_LONG",
        "globPattern",
        globPattern,
      );
    }

    // Check for path traversal in glob patterns
    if (globPattern.includes("../") || globPattern.includes("..\\")) {
      throw new InputSanitizationError(
        "Glob pattern contains path traversal sequences",
        "PATH_TRAVERSAL",
        "globPattern",
        globPattern,
      );
    }

    // Ensure glob pattern doesn't start with absolute path indicators
    if (globPattern.startsWith("/") || /^[A-Za-z]:/.test(globPattern)) {
      throw new InputSanitizationError(
        "Glob pattern cannot be an absolute path",
        "ABSOLUTE_PATH",
        "globPattern",
        globPattern,
      );
    }

    return globPattern;
  }

  /**
   * General string sanitization utility
   * @param {string} input - The string to sanitize
   * @param {string} fieldName - Name of the field being sanitized
   * @param {Object} options - Sanitization options
   * @returns {string} - The sanitized string
   * @throws {InputSanitizationError} - If string is invalid
   */
  sanitizeString(input, fieldName = "string", options = {}) {
    if (typeof input !== "string") {
      throw new InputSanitizationError(
        `${fieldName} must be a string`,
        "INVALID_TYPE",
        fieldName,
        input,
      );
    }

    const maxLength = options.maxLength || this.maxStringLength;
    if (input.length > maxLength) {
      throw new InputSanitizationError(
        `${fieldName} exceeds maximum length of ${maxLength}`,
        "TOO_LONG",
        fieldName,
        input,
      );
    }

    // Check for null bytes
    if (input.includes("\0")) {
      throw new InputSanitizationError(
        `${fieldName} contains null bytes`,
        "NULL_BYTE",
        fieldName,
        input,
      );
    }

    // Check for dangerous patterns if not explicitly allowed
    if (
      options.allowDangerousPatterns !== true &&
      this.containsDangerousPatterns(input)
    ) {
      throw new InputSanitizationError(
        `${fieldName} contains potentially dangerous patterns`,
        "DANGEROUS_PATTERN",
        fieldName,
        input,
      );
    }

    return options.trim !== false ? input.trim() : input;
  }

  /**
   * Checks if a string contains dangerous patterns
   * @param {string} input - The string to check
   * @returns {boolean} - True if dangerous patterns are found
   */
  containsDangerousPatterns(input) {
    const dangerousPatterns = [
      /\$\{.*\}/, // Template literal injection
      /eval\s*\(/, // eval() calls
      /Function\s*\(/, // Function constructor
      /setTimeout\s*\(/, // setTimeout with string
      /setInterval\s*\(/, // setInterval with string
      /__proto__/, // Prototype pollution
      /constructor/, // Constructor access
      /\.\./, // Path traversal
      /<script/i, // Script tags
      /javascript:/i, // Javascript protocol
      /data:/i, // Data protocol
      /vbscript:/i, // VBScript protocol
      /on\w+\s*=/i, // Event handlers
    ];

    return dangerousPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Validates and sanitizes all parameters for the analyze operation
   * @param {Object} params - Parameters object
   * @returns {Object} - Sanitized parameters
   * @throws {InputSanitizationError} - If any parameter is invalid
   */
  sanitizeAnalyzeParams(params) {
    const sanitized = {};

    // Required parameters
    if (!params.rootDir) {
      throw new InputSanitizationError(
        "rootDir parameter is required",
        "MISSING_REQUIRED",
        "rootDir",
        params.rootDir,
      );
    }

    if (!params.componentName) {
      throw new InputSanitizationError(
        "componentName parameter is required",
        "MISSING_REQUIRED",
        "componentName",
        params.componentName,
      );
    }

    if (!params.propName) {
      throw new InputSanitizationError(
        "propName parameter is required",
        "MISSING_REQUIRED",
        "propName",
        params.propName,
      );
    }

    // Sanitize required parameters
    sanitized.rootDir = this.sanitizeString(params.rootDir, "rootDir");
    sanitized.componentName = this.sanitizeComponentName(params.componentName);
    sanitized.propName = this.sanitizePropName(params.propName);

    // Optional parameters
    if (params.propValue !== undefined && params.propValue !== null) {
      sanitized.propValue = this.sanitizePropValue(params.propValue);
    }

    if (params.findMissing !== undefined) {
      if (typeof params.findMissing !== "boolean") {
        throw new InputSanitizationError(
          "findMissing must be a boolean",
          "INVALID_TYPE",
          "findMissing",
          params.findMissing,
        );
      }
      sanitized.findMissing = params.findMissing;
    }

    if (params.verbose !== undefined) {
      if (typeof params.verbose !== "boolean") {
        throw new InputSanitizationError(
          "verbose must be a boolean",
          "INVALID_TYPE",
          "verbose",
          params.verbose,
        );
      }
      sanitized.verbose = params.verbose;
    }

    if (params.includes !== undefined) {
      if (typeof params.includes !== "boolean") {
        throw new InputSanitizationError(
          "includes must be a boolean",
          "INVALID_TYPE",
          "includes",
          params.includes,
        );
      }
      sanitized.includes = params.includes;
    }

    return sanitized;
  }
}

/**
 * Default instance for common use cases
 */
const defaultSanitizer = new InputSanitizer();

/**
 * Convenience functions using the default sanitizer
 */
export const sanitizeComponentName = (componentName) =>
  defaultSanitizer.sanitizeComponentName(componentName);

export const sanitizePropName = (propName) =>
  defaultSanitizer.sanitizePropName(propName);

export const sanitizePropValue = (propValue, options) =>
  defaultSanitizer.sanitizePropValue(propValue, options);

export const sanitizeSearchValue = (searchValue) =>
  defaultSanitizer.sanitizeSearchValue(searchValue);

export const sanitizeRegexPattern = (pattern) =>
  defaultSanitizer.sanitizeRegexPattern(pattern);

export const sanitizeGlobPattern = (globPattern) =>
  defaultSanitizer.sanitizeGlobPattern(globPattern);

export const sanitizeString = (input, fieldName, options) =>
  defaultSanitizer.sanitizeString(input, fieldName, options);

export const sanitizeAnalyzeParams = (params) =>
  defaultSanitizer.sanitizeAnalyzeParams(params);

export { InputSanitizer, InputSanitizationError };
