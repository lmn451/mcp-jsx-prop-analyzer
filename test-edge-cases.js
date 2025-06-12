#!/usr/bin/env node

import { spawn } from "child_process";
import { createInterface } from "readline";

class EdgeCaseTester {
  constructor() {
    this.server = null;
    this.messageId = 1;
    this.pendingRequests = new Map();
  }

  async startServer() {
    console.log("🚀 Starting MCP server for edge case testing...");

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
      }, 8000);
    });
  }

  async testSpreadPropsComponents() {
    console.log("\n🔄 Testing components with spread props...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "analyze_jsx_props",
        arguments: {
          rootDir: "./test",
          componentName: "FlexBox",
          propName: "direction",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ Spread props analysis successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${result.summary.totalMatches} FlexBox components with 'direction' prop`
        );
        return response;
      } else {
        throw new Error("Invalid spread props analysis response");
      }
    } catch (error) {
      console.error("❌ Spread props analysis failed:", error.message);
      throw error;
    }
  }

  async testModalComponents() {
    console.log("\n🔀 Testing Modal component with complex props...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "find_missing_props",
        arguments: {
          rootDir: "./test",
          componentName: "Modal",
          propName: "isOpen",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ Modal component analysis successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${
            result.summary.componentsWithMissingProp || 0
          } Modal components missing 'isOpen' prop`
        );
        return response;
      } else {
        throw new Error("Invalid Modal component analysis response");
      }
    } catch (error) {
      console.error("❌ Modal component analysis failed:", error.message);
      throw error;
    }
  }

  async testForwardRefComponents() {
    console.log("\n📎 Testing forwardRef components...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "analyze_jsx_props",
        arguments: {
          rootDir: "./test",
          componentName: "CustomInput",
          propName: "label",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ ForwardRef component analysis successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${result.summary.totalMatches} CustomInput components with 'label' prop`
        );
        return response;
      } else {
        throw new Error("Invalid forwardRef component analysis response");
      }
    } catch (error) {
      console.error("❌ ForwardRef component analysis failed:", error.message);
      throw error;
    }
  }

  async testConditionalProps() {
    console.log("\n❓ Testing conditional prop rendering...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "analyze_jsx_props",
        arguments: {
          rootDir: "./test",
          componentName: "Alert",
          propName: "dismissible",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ Conditional props analysis successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${result.summary.totalMatches} Alert components with 'dismissible' prop`
        );
        return response;
      } else {
        throw new Error("Invalid conditional props analysis response");
      }
    } catch (error) {
      console.error("❌ Conditional props analysis failed:", error.message);
      throw error;
    }
  }

  async testFunctionProps() {
    console.log("\n🎯 Testing function props...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "search_prop_values",
        arguments: {
          rootDir: "./test",
          componentName: "DataTable",
          propName: "onRowClick",
          searchValue: "onRowClick",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ Function props analysis successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${result.summary.totalMatches} DataTable components with 'onRowClick' function`
        );
        return response;
      } else {
        throw new Error("Invalid function props analysis response");
      }
    } catch (error) {
      console.error("❌ Function props analysis failed:", error.message);
      throw error;
    }
  }

  async testNestedJSXExpressions() {
    console.log("\n🔍 Testing components with nested JSX expressions...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "analyze_jsx_props",
        arguments: {
          rootDir: "./test",
          componentName: "DataTable",
          propName: "data",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ Nested JSX expressions analysis successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${result.summary.totalMatches} DataTable components with 'data' prop`
        );
        return response;
      } else {
        throw new Error("Invalid nested JSX expressions analysis response");
      }
    } catch (error) {
      console.error(
        "❌ Nested JSX expressions analysis failed:",
        error.message
      );
      throw error;
    }
  }

  async testDefaultValueProps() {
    console.log("\n⚙️  Testing props with default values...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "find_missing_props",
        arguments: {
          rootDir: "./test",
          componentName: "Modal",
          propName: "size",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ Default value props analysis successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${
            result.summary.componentsWithMissingProp || 0
          } Modal components missing 'size' prop (has default)`
        );
        return response;
      } else {
        throw new Error("Invalid default value props analysis response");
      }
    } catch (error) {
      console.error("❌ Default value props analysis failed:", error.message);
      throw error;
    }
  }

  async testAriaProps() {
    console.log("\n♿ Testing accessibility props...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "search_prop_values",
        arguments: {
          rootDir: "./test",
          componentName: "Alert",
          propName: "role",
          searchValue: "alert",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ Accessibility props analysis successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${result.summary.totalMatches} Alert components with 'role' prop`
        );
        return response;
      } else {
        throw new Error("Invalid accessibility props analysis response");
      }
    } catch (error) {
      console.error("❌ Accessibility props analysis failed:", error.message);
      throw error;
    }
  }

  async testEmptyAndNullProps() {
    console.log("\n🗳️  Testing empty and null prop values...");

    try {
      // Test for components that might have empty string props
      const response = await this.sendRequest("tools/call", {
        name: "analyze_jsx_props",
        arguments: {
          rootDir: "./test",
          componentName: "CustomInput",
          propName: "error",
          propValue: "",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ Empty prop values analysis successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(`   Analyzed empty prop patterns successfully`);
        return response;
      } else {
        throw new Error("Invalid empty prop values analysis response");
      }
    } catch (error) {
      console.error("❌ Empty prop values analysis failed:", error.message);
      throw error;
    }
  }

  async testComplexComponentHierarchy() {
    console.log("\n🏗️  Testing complex component hierarchy...");

    try {
      // Search for any component in the entire test directory
      const response = await this.sendRequest("tools/call", {
        name: "analyze_jsx_props",
        arguments: {
          rootDir: "./test",
          componentName: "React",
          propName: "Fragment",
          verbose: false,
        },
      });

      if (response.result) {
        console.log("✅ Complex hierarchy analysis successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(`   Analyzed complex component hierarchy`);
        return response;
      } else {
        throw new Error("Invalid complex hierarchy analysis response");
      }
    } catch (error) {
      console.error("❌ Complex hierarchy analysis failed:", error.message);
      throw error;
    }
  }

  async runEdgeCaseTests() {
    try {
      await this.startServer();

      // Initialize
      await this.sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "edge-case-test", version: "1.0.0" },
      });

      console.log("\n🔬 Starting Edge Case Test Suite");
      console.log("=================================");

      await this.testSpreadPropsComponents();
      await this.testModalComponents();
      await this.testForwardRefComponents();
      await this.testConditionalProps();
      await this.testFunctionProps();
      await this.testNestedJSXExpressions();
      await this.testDefaultValueProps();
      await this.testAriaProps();
      await this.testEmptyAndNullProps();
      await this.testComplexComponentHierarchy();

      console.log("\n🎉 All edge case tests completed successfully!");
      console.log("\n📊 Edge Case Test Summary:");
      console.log("   - Spread props: ✅");
      console.log("   - Complex components: ✅");
      console.log("   - ForwardRef handling: ✅");
      console.log("   - Conditional rendering: ✅");
      console.log("   - Function props: ✅");
      console.log("   - Nested expressions: ✅");
      console.log("   - Default values: ✅");
      console.log("   - Accessibility: ✅");
      console.log("   - Edge values: ✅");
      console.log("   - Complex hierarchy: ✅");
    } catch (error) {
      console.error("\n💥 Edge case test suite failed:", error.message);
      process.exit(1);
    } finally {
      this.cleanup();
    }
  }

  cleanup() {
    console.log("\n🧹 Cleaning up edge case tests...");
    if (this.server) {
      this.server.kill();
    }
    if (this.readline) {
      this.readline.close();
    }
  }
}

// Run edge case tests
const tester = new EdgeCaseTester();

process.on("SIGINT", () => {
  tester.cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  tester.cleanup();
  process.exit(0);
});

tester
  .runEdgeCaseTests()
  .then(() => {
    console.log("✅ Edge case test suite completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Edge case test suite failed:", error);
    process.exit(1);
  });
