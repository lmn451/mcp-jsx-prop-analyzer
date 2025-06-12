#!/usr/bin/env node

import { spawn } from "child_process";
import { existsSync } from "fs";

class TestRunner {
  constructor() {
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
  }

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

  async runTestSuite(name, command, args = []) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`🧪 Running ${name}`);
    console.log(`${"=".repeat(50)}`);

    this.totalTests++;

    try {
      await this.runCommand(command, args);
      console.log(`\n✅ ${name} PASSED`);
      this.passedTests++;
      return true;
    } catch (error) {
      console.error(`\n❌ ${name} FAILED:`, error.message);
      this.failedTests++;
      return false;
    }
  }

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

  printSummary() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST SUITE SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total Test Suites: ${this.totalTests}`);
    console.log(`Passed: ${this.passedTests} ✅`);
    console.log(`Failed: ${this.failedTests} ❌`);
    console.log(
      `Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(
        1
      )}%`
    );

    if (this.failedTests === 0) {
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
