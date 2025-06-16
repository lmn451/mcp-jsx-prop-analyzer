#!/usr/bin/env node
/**
 * Test Runner for JSX Analyzer MCP Server
 * @module test-runner
 */

import { spawn } from "child_process";
import { existsSync } from "fs";

class TestRunner {
  /**
   * Create a test runner instance
   */
  constructor() {
    /**
     * Test execution statistics
     * @type {TestResult}
     */
    this.stats = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
    };
  }

  /**
   * Run a command in a child process
   * @param {string} command - Command to execute
   * @param {string[]} [args=[]] - Arguments for the command
   * @returns {Promise<number>} Exit code of the command
   */
  async runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      console.log(`🏃 Running: ${command} ${args.join(" ")}`);

      const child = spawn(command, args, {
        stdio: "inherit",
        shell: true,
      });

      child.on("exit", (code) => {
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  }

  /**
   * Run a test suite with the specified command
   * @param {string} name - Name of the test suite
   * @param {string} command - Command to execute for the test
   * @param {string[]} [args=[]] - Arguments for the command
   * @returns {Promise<TestSuiteResult>} Test suite execution result
   */
  async runTestSuite(name, command, args = []) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`🧪 Running ${name}`);
    console.log(`${"=".repeat(50)}`);

    this.stats.totalTests++;

    try {
      await this.runCommand(command, args);
      console.log(`\n✅ ${name} PASSED`);
      this.stats.passedTests++;
      return true;
    } catch (error) {
      console.error(`\n❌ ${name} FAILED:`, error.message);
      this.stats.failedTests++;
      return false;
    }
  }

  /**
   * Check if all required files exist before running tests
   * @returns {Promise<void>}
   */
  async checkPrerequisites() {
    console.log("🔍 Checking prerequisites...");

    const requiredFiles = [
      "mcp-server.js",
      "test-mcp.js",
      "test-performance.js",
      "test-edge-cases.js",
      "analyzer.js",
      "test/components/Button.jsx",
      "test/components/Form.jsx",
      "test/components/Nested.jsx",
      "test/components/Advanced.jsx",
      "test/app.jsx",
    ];

    for (const file of requiredFiles) {
      if (!existsSync(file)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    console.log("✅ All required files present");
  }

  /**
   * Run all test suites in sequence
   * @returns {Promise<TestResult>} Overall test execution results
   */
  async runAllTests() {
    try {
      console.log("🚀 Starting Comprehensive Test Suite");
      console.log("====================================");

      await this.checkPrerequisites();

      // Run basic functionality tests
      await this.runTestSuite("Basic Functionality Tests", "node", [
        "test-mcp.js",
      ]);

      // Run performance tests
      await this.runTestSuite("Performance & Stress Tests", "node", [
        "test-performance.js",
      ]);

      // Run edge case tests
      await this.runTestSuite("Edge Case & Advanced Component Tests", "node", [
        "test-edge-cases.js",
      ]);

      // Run CLI tests if available
      if (existsSync("cli.js")) {
        await this.runTestSuite("CLI Integration Tests", "node", [
          "cli.js",
          "--help",
        ]);
      }

      this.printSummary();
    } catch (error) {
      console.error("\n💥 Test runner failed:", error.message);
      process.exit(1);
    }
  }

  /**
   * Print a summary of test results
   */
  printSummary() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST SUITE SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total Test Suites: ${this.stats.totalTests}`);
    console.log(`Passed: ${this.stats.passedTests} ✅`);
    console.log(`Failed: ${this.stats.failedTests} ❌`);
    console.log(
      `Success Rate: ${(
        (this.stats.passedTests / this.stats.totalTests) *
        100
      ).toFixed(1)}%`
    );

    if (this.stats.failedTests === 0) {
      console.log("\n🎉 ALL TESTS PASSED! 🎉");
      console.log("The JSX Analyzer MCP Server is working correctly!");
    } else {
      console.log("\n⚠️  Some tests failed. Please review the output above.");
      process.exit(1);
    }
  }
}

// Run all tests
const runner = new TestRunner();

process.on("SIGINT", () => {
  console.log("\n🛑 Test runner interrupted");
  process.exit(1);
});

runner
  .runAllTests()
  .then(() => {
    console.log("\n✅ Test runner completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test runner failed:", error);
    process.exit(1);
  });
