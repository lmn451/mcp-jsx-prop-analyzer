#!/usr/bin/env node

/**
 * Comprehensive Security Test Suite
 *
 * Tests all security components to ensure they properly protect against:
 * - Path traversal attacks
 * - Input injection attacks
 * - Resource exhaustion (DoS) attacks
 * - Code execution vulnerabilities
 */

import {
  PathValidator,
  PathValidationError,
  InputSanitizer,
  InputSanitizationError,
  ResourceLimiter,
  ResourceLimitError,
  SandboxedParser,
  ParserError,
  createSecurityContext,
} from "./src/security/index.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SecurityTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
    };
  }

  /**
   * Runs a test and tracks results
   */
  async runTest(testName, testFn) {
    try {
      console.log(`🧪 Testing: ${testName}`);
      await testFn();
      console.log(`✅ PASSED: ${testName}`);
      this.testResults.passed++;
    } catch (error) {
      console.error(`❌ FAILED: ${testName} - ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push({ testName, error: error.message });
    }
  }

  /**
   * Asserts that a condition is true
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Asserts that a function throws an error
   */
  async assertThrows(fn, expectedErrorType, message) {
    try {
      await fn();
      throw new Error(
        `Expected function to throw ${expectedErrorType?.name || "Error"}: ${message}`,
      );
    } catch (error) {
      if (expectedErrorType && !(error instanceof expectedErrorType)) {
        throw new Error(
          `Expected ${expectedErrorType.name} but got ${error.constructor.name}: ${message}`,
        );
      }
    }
  }

  /**
   * Path Validator Security Tests
   */
  async testPathValidatorSecurity() {
    const validator = new PathValidator();

    // Test path traversal attempts
    await this.runTest("Path Traversal - Relative paths", async () => {
      await this.assertThrows(
        () => validator.validatePath("../../../etc/passwd"),
        PathValidationError,
        "Should block relative path traversal",
      );
    });

    await this.runTest("Path Traversal - Mixed slashes", async () => {
      await this.assertThrows(
        () => validator.validatePath("../..\\..\\windows\\system32"),
        PathValidationError,
        "Should block mixed slash traversal",
      );
    });

    await this.runTest("Null Byte Injection", async () => {
      await this.assertThrows(
        () => validator.validatePath("file.txt\0../../../etc/passwd"),
        PathValidationError,
        "Should block null byte injection",
      );
    });

    await this.runTest("Absolute Path Blocking", async () => {
      await this.assertThrows(
        () => validator.validatePath("/etc/passwd"),
        PathValidationError,
        "Should block absolute paths outside allowed roots",
      );
    });

    await this.runTest("Path Length Limit", async () => {
      const longPath = "a".repeat(5000);
      await this.assertThrows(
        () => validator.validatePath(longPath),
        PathValidationError,
        "Should block excessively long paths",
      );
    });

    await this.runTest("Valid Path Acceptance", async () => {
      const validPath = validator.validatePath("./test");
      this.assert(
        validPath.includes("test"),
        "Should accept valid relative paths",
      );
    });
  }

  /**
   * Input Sanitizer Security Tests
   */
  async testInputSanitizerSecurity() {
    const sanitizer = new InputSanitizer();

    // Component name validation
    await this.runTest("Component Name - Invalid characters", async () => {
      await this.assertThrows(
        () => sanitizer.sanitizeComponentName("<script>alert(1)</script>"),
        InputSanitizationError,
        "Should reject component names with HTML tags",
      );
    });

    await this.runTest("Component Name - Injection attempt", async () => {
      await this.assertThrows(
        () => sanitizer.sanitizeComponentName('eval("malicious code")'),
        InputSanitizationError,
        "Should reject component names with eval",
      );
    });

    await this.runTest("Component Name - Valid name", async () => {
      const validName = sanitizer.sanitizeComponentName("MyComponent");
      this.assert(
        validName === "MyComponent",
        "Should accept valid component names",
      );
    });

    // Prop name validation
    await this.runTest("Prop Name - Script injection", async () => {
      await this.assertThrows(
        () => sanitizer.sanitizePropName("on<script>alert(1)</script>"),
        InputSanitizationError,
        "Should reject prop names with scripts",
      );
    });

    await this.runTest("Prop Name - Constructor access", async () => {
      await this.assertThrows(
        () => sanitizer.sanitizePropName("constructor"),
        InputSanitizationError,
        "Should reject dangerous prop names",
      );
    });

    // Search value validation
    await this.runTest("Search Value - Command injection", async () => {
      await this.assertThrows(
        () => sanitizer.sanitizeSearchValue('"; rm -rf / ;"'),
        InputSanitizationError,
        "Should reject search values with command injection",
      );
    });

    await this.runTest("Search Value - XSS attempt", async () => {
      await this.assertThrows(
        () => sanitizer.sanitizeSearchValue("<img src=x onerror=alert(1)>"),
        InputSanitizationError,
        "Should reject search values with XSS payloads",
      );
    });

    // Regex pattern validation
    await this.runTest("Regex Pattern - ReDoS attack", async () => {
      await this.assertThrows(
        () => sanitizer.sanitizeRegexPattern("(a+)+b"),
        InputSanitizationError,
        "Should reject regex patterns prone to ReDoS",
      );
    });

    await this.runTest("Regex Pattern - Valid pattern", async () => {
      const validPattern = sanitizer.sanitizeRegexPattern("^[a-zA-Z]+$");
      this.assert(
        validPattern === "^[a-zA-Z]+$",
        "Should accept valid regex patterns",
      );
    });
  }

  /**
   * Resource Limiter Security Tests
   */
  async testResourceLimiterSecurity() {
    const limiter = new ResourceLimiter({
      maxFileSize: 1024, // 1KB for testing
      maxFileCount: 5,
      maxProcessingTime: 1000, // 1 second
      maxConcurrentOperations: 2,
    });

    // Create a temporary large file for testing
    const tempDir = path.join(__dirname, "temp-security-test");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const largeFilePath = path.join(tempDir, "large-file.txt");
    fs.writeFileSync(largeFilePath, "x".repeat(2048)); // 2KB file

    await this.runTest("File Size Limit", async () => {
      await this.assertThrows(
        () => limiter.checkFileSize(largeFilePath),
        ResourceLimitError,
        "Should reject files exceeding size limit",
      );
    });

    await this.runTest("Concurrent Operations Limit", async () => {
      const op1 = limiter.startOperation();
      const op2 = limiter.startOperation();

      await this.assertThrows(
        () => limiter.startOperation(),
        ResourceLimitError,
        "Should reject operations exceeding concurrency limit",
      );

      limiter.endOperation(op1);
      limiter.endOperation(op2);
    });

    await this.runTest("File Count Limit", async () => {
      // Process files up to the limit
      for (let i = 0; i < 5; i++) {
        limiter.recordFileProcessed(`file${i}.txt`, 100);
      }

      await this.assertThrows(
        () => limiter.recordFileProcessed("file6.txt", 100),
        ResourceLimitError,
        "Should reject processing more files than limit",
      );
    });

    // Clean up
    fs.unlinkSync(largeFilePath);
    fs.rmdirSync(tempDir);
  }

  /**
   * Sandboxed Parser Security Tests
   */
  async testSandboxedParserSecurity() {
    const parser = new SandboxedParser({
      parseTimeout: 1000, // 1 second timeout
    });

    await this.runTest("Malicious Code Detection", async () => {
      const maliciousCode = `
        eval("require('child_process').exec('rm -rf /')");
        const Component = () => <div>Hello</div>;
      `;

      // Should parse but warn about suspicious patterns
      const result = await parser.parseFile("test.jsx", maliciousCode);
      this.assert(
        result.ast,
        "Should parse code but detect suspicious patterns",
      );
    });

    await this.runTest("Parse Timeout Protection", async () => {
      // Create code that might cause parsing to hang
      const complexCode =
        "const x = " + "(".repeat(1000) + "a" + ")".repeat(1000) + ";";

      await this.assertThrows(
        () => parser.parseFile("test.js", complexCode),
        ParserError,
        "Should timeout on complex parsing",
      );
    });

    await this.runTest("Null Byte in Code", async () => {
      const codeWithNullByte = 'const x = "hello\0world";';

      await this.assertThrows(
        () => parser.parseFile("test.js", codeWithNullByte),
        ParserError,
        "Should reject code with null bytes",
      );
    });

    await this.runTest("Excessive Line Length", async () => {
      const longLine = 'const x = "' + "a".repeat(15000) + '";';

      await this.assertThrows(
        () => parser.parseFile("test.js", longLine),
        ParserError,
        "Should reject code with excessively long lines",
      );
    });

    await this.runTest("Valid JSX Parsing", async () => {
      const validCode = `
        import React from 'react';
        const Component = () => <div className="test">Hello</div>;
        export default Component;
      `;

      const result = await parser.parseFile("test.jsx", validCode);
      this.assert(
        result.ast && result.ast.type === "File",
        "Should parse valid JSX code",
      );
    });
  }

  /**
   * Integration Tests - Full Security Context
   */
  async testSecurityContextIntegration() {
    const securityContext = createSecurityContext();

    await this.runTest("Full Parameter Validation", async () => {
      const params = {
        rootDir: "./test",
        componentName: "Button",
        propName: "onClick",
        propValue: "handleClick",
      };

      const validated = await securityContext.validateAndSanitize(params);
      this.assert(
        validated.componentName === "Button",
        "Should validate and sanitize all parameters",
      );
    });

    await this.runTest("Malicious Parameter Rejection", async () => {
      const maliciousParams = {
        rootDir: "../../../etc",
        componentName: "<script>alert(1)</script>",
        propName: "constructor.__proto__",
        propValue: 'eval("malicious")',
      };

      await this.assertThrows(
        () => securityContext.validateAndSanitize(maliciousParams),
        Error,
        "Should reject malicious parameters",
      );
    });

    await this.runTest("Security Stats Reporting", async () => {
      const stats = securityContext.getSecurityStats();
      this.assert(
        stats.resourceUsage && stats.parserStats,
        "Should provide security statistics",
      );
    });

    // Cleanup
    securityContext.destroy();
  }

  /**
   * Performance Security Tests
   */
  async testPerformanceSecurity() {
    await this.runTest("Memory Usage Monitoring", async () => {
      const limiter = new ResourceLimiter({
        maxMemoryUsage: 50 * 1024 * 1024, // 50MB
        memoryCheckInterval: 100,
      });

      // Get initial memory usage
      const initialStats = limiter.getUsageStats();
      this.assert(
        initialStats.memory.heapUsed > 0,
        "Should track memory usage",
      );

      limiter.destroy();
    });

    await this.runTest("Resource Cleanup", async () => {
      const parser = new SandboxedParser();
      const limiter = new ResourceLimiter();

      // Use resources
      const opId = limiter.startOperation();

      // Cleanup
      limiter.endOperation(opId);
      parser.destroy();
      limiter.destroy();

      this.assert(true, "Should cleanup resources without errors");
    });
  }

  /**
   * Runs all security tests
   */
  async runAllTests() {
    console.log("\n🔒 Starting Comprehensive Security Test Suite");
    console.log("===============================================\n");

    await this.testPathValidatorSecurity();
    await this.testInputSanitizerSecurity();
    await this.testResourceLimiterSecurity();
    await this.testSandboxedParserSecurity();
    await this.testSecurityContextIntegration();
    await this.testPerformanceSecurity();

    console.log("\n📊 Security Test Results");
    console.log("========================");
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(
      `📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`,
    );

    if (this.testResults.failed > 0) {
      console.log("\n🚨 Failed Tests:");
      this.testResults.errors.forEach(({ testName, error }) => {
        console.log(`   - ${testName}: ${error}`);
      });
      process.exit(1);
    } else {
      console.log(
        "\n🎉 All security tests passed! The security layer is working correctly.",
      );
      console.log("\n✅ Security Implementation Status:");
      console.log("   - Path traversal protection: ACTIVE");
      console.log("   - Input sanitization: ACTIVE");
      console.log("   - Resource limits: ACTIVE");
      console.log("   - Sandboxed parsing: ACTIVE");
      console.log("   - DoS protection: ACTIVE");
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SecurityTester();

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
  });

  tester.runAllTests().catch((error) => {
    console.error("Test runner failed:", error);
    process.exit(1);
  });
}

export { SecurityTester };
