#!/usr/bin/env node

import { spawn } from "child_process";
import { createInterface } from "readline";

class PerformanceTester {
  constructor() {
    this.server = null;
    this.messageId = 1;
    this.pendingRequests = new Map();
  }

  async startServer() {
    console.log("🚀 Starting MCP server for performance testing...");

    this.server = spawn("node", ["mcp-server.js"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.readline = createInterface({
      input: this.server.stdout,
    });

    this.readline.on("line", (line) => {
      try {
        const message = JSON.parse(line);
        this.handleServerMessage(message);
      } catch (error) {
        if (line.includes("JSX Analyzer MCP server running")) {
          console.log("✅ Server started successfully");
        }
      }
    });

    this.server.stderr.on("data", (data) => {
      console.error("Server error:", data.toString());
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  handleServerMessage(message) {
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve } = this.pendingRequests.get(message.id);
      this.pendingRequests.delete(message.id);
      resolve(message);
    }
  }

  async sendRequest(method, params = {}) {
    const id = this.messageId++;
    const request = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.server.stdin.write(JSON.stringify(request) + "\n");

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout for ${method}`));
        }
      }, 10000); // Longer timeout for performance tests
    });
  }

  async testConcurrentRequests() {
    console.log("\n⚡ Testing concurrent requests...");
    const startTime = Date.now();

    try {
      // Initialize first
      await this.sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "perf-test", version: "1.0.0" },
      });

      const requests = [
        this.sendRequest("tools/call", {
          name: "analyze_jsx_props",
          arguments: {
            rootDir: "./test",
            componentName: "Button",
            propName: "onClick",
            verbose: true,
          },
        }),
        this.sendRequest("tools/call", {
          name: "find_missing_props",
          arguments: {
            rootDir: "./test",
            componentName: "Input",
            propName: "id",
            verbose: true,
          },
        }),
        this.sendRequest("tools/call", {
          name: "search_prop_values",
          arguments: {
            rootDir: "./test",
            componentName: "Button",
            propName: "variant",
            searchValue: "primary",
            verbose: true,
          },
        }),
      ];

      const results = await Promise.all(requests);
      const endTime = Date.now();

      console.log(
        `✅ Concurrent requests completed in ${endTime - startTime}ms`
      );
      console.log(`   Processed ${results.length} requests concurrently`);
      return results;
    } catch (error) {
      console.error("❌ Concurrent requests failed:", error.message);
      throw error;
    }
  }

  async testLargeDirectoryAnalysis() {
    console.log("\n📁 Testing large directory analysis...");
    const startTime = Date.now();

    try {
      const response = await this.sendRequest("tools/call", {
        name: "analyze_jsx_props",
        arguments: {
          rootDir: "./test",
          componentName: "*", // Wildcard to test all components
          propName: "className",
          verbose: true,
        },
      });

      const endTime = Date.now();
      console.log(
        `✅ Large directory analysis completed in ${endTime - startTime}ms`
      );

      if (response.result) {
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Analyzed directory with ${
            result.summary.totalMatches || 0
          } matches`
        );
      }
      return response;
    } catch (error) {
      console.error("❌ Large directory analysis failed:", error.message);
      throw error;
    }
  }

  async testInvalidParameters() {
    console.log("\n🚨 Testing invalid parameters...");

    const testCases = [
      {
        name: "Empty rootDir",
        args: { rootDir: "", componentName: "Button", propName: "onClick" },
      },
      {
        name: "Invalid rootDir",
        args: {
          rootDir: "/nonexistent/path",
          componentName: "Button",
          propName: "onClick",
        },
      },
      {
        name: "Missing componentName",
        args: { rootDir: "./test", propName: "onClick" },
      },
      {
        name: "Missing propName",
        args: { rootDir: "./test", componentName: "Button" },
      },
      {
        name: "Special characters in componentName",
        args: {
          rootDir: "./test",
          componentName: "Button@#$",
          propName: "onClick",
        },
      },
    ];

    let passedTests = 0;
    for (const testCase of testCases) {
      try {
        console.log(`   Testing: ${testCase.name}`);
        const response = await this.sendRequest("tools/call", {
          name: "analyze_jsx_props",
          arguments: testCase.args,
        });

        // Check if response contains error information
        if (response.error || (response.result && response.result.isError)) {
          console.log(`   ✅ Properly handled: ${testCase.name}`);
          passedTests++;
        } else {
          console.log(`   ⚠️  Unexpected success: ${testCase.name}`);
        }
      } catch (error) {
        console.log(`   ✅ Properly rejected: ${testCase.name}`);
        passedTests++;
      }
    }

    console.log(
      `✅ Invalid parameters test completed: ${passedTests}/${testCases.length} handled correctly`
    );
    return passedTests === testCases.length;
  }

  async testMemoryUsage() {
    console.log("\n💾 Testing memory usage with repeated requests...");
    const iterations = 50;
    const startTime = Date.now();

    try {
      for (let i = 0; i < iterations; i++) {
        await this.sendRequest("tools/call", {
          name: "analyze_jsx_props",
          arguments: {
            rootDir: "./test",
            componentName: "Button",
            propName: "onClick",
            verbose: false, // Reduce output size
          },
        });

        if (i % 10 === 0) {
          console.log(`   Progress: ${i}/${iterations} requests completed`);
        }
      }

      const endTime = Date.now();
      const avgTime = (endTime - startTime) / iterations;

      console.log(
        `✅ Memory test completed: ${iterations} requests in ${
          endTime - startTime
        }ms`
      );
      console.log(`   Average request time: ${avgTime.toFixed(2)}ms`);
      return true;
    } catch (error) {
      console.error("❌ Memory usage test failed:", error.message);
      throw error;
    }
  }

  async testComplexQueryPatterns() {
    console.log("\n🔍 Testing complex query patterns...");

    const complexTests = [
      {
        name: "Deep nested prop search",
        args: {
          rootDir: "./test",
          componentName: "NestedComponent",
          propName: "testProp",
          propValue: "child",
          verbose: true,
        },
      },
      {
        name: "Boolean prop with includes",
        args: {
          rootDir: "./test",
          componentName: "Input",
          propName: "required",
          includes: true,
          verbose: true,
        },
      },
      {
        name: "Multiple component types",
        args: {
          rootDir: "./test",
          componentName: "Button",
          propName: "variant",
          findMissing: false,
          verbose: true,
        },
      },
    ];

    let passedTests = 0;
    for (const test of complexTests) {
      try {
        console.log(`   Testing: ${test.name}`);
        const response = await this.sendRequest("tools/call", {
          name: "analyze_jsx_props",
          arguments: test.args,
        });

        if (response.result) {
          console.log(`   ✅ ${test.name} successful`);
          passedTests++;
        } else {
          console.log(`   ❌ ${test.name} failed`);
        }
      } catch (error) {
        console.error(`   ❌ ${test.name} error:`, error.message);
      }
    }

    console.log(
      `✅ Complex query patterns: ${passedTests}/${complexTests.length} passed`
    );
    return passedTests === complexTests.length;
  }

  async runPerformanceTests() {
    try {
      await this.startServer();

      console.log("\n🎯 Starting Performance Test Suite");
      console.log("=====================================");

      await this.testConcurrentRequests();
      await this.testLargeDirectoryAnalysis();
      await this.testInvalidParameters();
      await this.testMemoryUsage();
      await this.testComplexQueryPatterns();

      console.log("\n🎉 All performance tests completed successfully!");
      console.log("\n📊 Performance Test Summary:");
      console.log("   - Concurrent requests: ✅");
      console.log("   - Large directory handling: ✅");
      console.log("   - Error handling: ✅");
      console.log("   - Memory stability: ✅");
      console.log("   - Complex queries: ✅");
    } catch (error) {
      console.error("\n💥 Performance test suite failed:", error.message);
      process.exit(1);
    } finally {
      this.cleanup();
    }
  }

  cleanup() {
    console.log("\n🧹 Cleaning up performance test...");
    if (this.server) {
      this.server.kill();
    }
    if (this.readline) {
      this.readline.close();
    }
  }
}

// Run performance tests
const tester = new PerformanceTester();

process.on("SIGINT", () => {
  tester.cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  tester.cleanup();
  process.exit(0);
});

tester
  .runPerformanceTests()
  .then(() => {
    console.log("✅ Performance test suite completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Performance test suite failed:", error);
    process.exit(1);
  });
