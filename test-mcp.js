#!/usr/bin/env node

import { spawn } from "child_process";
import { createInterface } from "readline";

class MCPTester {
  constructor() {
    this.server = null;
    this.messageId = 1;
    this.pendingRequests = new Map();
  }
  async startServer() {
    console.log("🚀 Starting MCP server...");

    this.server = spawn("node", ["mcp-server.js"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Set up readline interface for server output
    this.readline = createInterface({
      input: this.server.stdout,
    });

    // Handle server messages
    this.readline.on("line", (line) => {
      try {
        const message = JSON.parse(line);
        this.handleServerMessage(message);
      } catch (error) {
        // Ignore non-JSON lines (like startup messages)
        if (line.includes("JSX Analyzer MCP server running")) {
          console.log("✅ Server started successfully");
        }
      }
    });

    // Handle server errors
    this.server.stderr.on("data", (data) => {
      console.error("Server error:", data.toString());
    });

    // Wait a bit for server to start
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

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout for ${method}`));
        }
      }, 5000);
    });
  }

  async testInitialize() {
    console.log("\n📋 Testing initialization...");

    try {
      const response = await this.sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "test-client",
          version: "1.0.0",
        },
      });

      console.log("✅ Initialize successful");
      return response;
    } catch (error) {
      console.error("❌ Initialize failed:", error.message);
      throw error;
    }
  }

  async testListTools() {
    console.log("\n🔧 Testing tools/list...");

    try {
      const response = await this.sendRequest("tools/list");

      if (response.result && response.result.tools) {
        console.log("✅ Tools listed successfully:");
        response.result.tools.forEach((tool) => {
          console.log(
            `   - ${tool.name}: ${tool.description || "No description"}`,
          );
        });
        return response;
      } else {
        throw new Error("Invalid tools/list response");
      }
    } catch (error) {
      console.error("❌ List tools failed:", error.message);
      throw error;
    }
  }

  async testAnalyzeJsxProps() {
    console.log("\n🔍 Testing analyze_jsx_props...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "analyze_jsx_props",
        arguments: {
          rootDir: "./test",
          componentName: "Button",
          propName: "onClick",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ analyze_jsx_props successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(`   Found ${result.summary.totalMatches} matches`);
        return response;
      } else {
        throw new Error("Invalid analyze_jsx_props response");
      }
    } catch (error) {
      console.error("❌ analyze_jsx_props failed:", error.message);
      throw error;
    }
  }

  async testFindMissingProps() {
    console.log("\n🔍 Testing find_missing_props...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "find_missing_props",
        arguments: {
          rootDir: "./test",
          componentName: "Input",
          propName: "id",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ find_missing_props successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        if (result.summary.componentsWithMissingProp !== undefined) {
          console.log(
            `   Found ${result.summary.componentsWithMissingProp} components missing 'id' prop`,
          );
        } else {
          console.log("   All components have the required prop");
        }
        return response;
      } else {
        throw new Error("Invalid find_missing_props response");
      }
    } catch (error) {
      console.error("❌ find_missing_props failed:", error.message);
      throw error;
    }
  }

  async testSearchPropValues() {
    console.log("\n🔍 Testing search_prop_values...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "search_prop_values",
        arguments: {
          rootDir: "./test",
          componentName: "Button",
          propName: "variant",
          searchValue: "primary",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ search_prop_values successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${result.summary.totalMatches} matches with 'primary' variant`,
        );
        return response;
      } else {
        throw new Error("Invalid search_prop_values response");
      }
    } catch (error) {
      console.error("❌ search_prop_values failed:", error.message);
      throw error;
    }
  }

  async testAnalyzeFormComponents() {
    console.log("\n📝 Testing form component analysis...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "analyze_jsx_props",
        arguments: {
          rootDir: "./test",
          componentName: "Input",
          propName: "type",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ Form component analysis successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${result.summary.totalMatches} Input components with 'type' prop`,
        );
        return response;
      } else {
        throw new Error("Invalid form component analysis response");
      }
    } catch (error) {
      console.error("❌ Form component analysis failed:", error.message);
      throw error;
    }
  }

  async testNestedComponentAnalysis() {
    console.log("\n🔍 Testing nested component analysis...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "analyze_jsx_props",
        arguments: {
          rootDir: "./test",
          componentName: "NestedComponent",
          propName: "testProp",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ Nested component analysis successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${result.summary.totalMatches} NestedComponent instances with 'testProp'`,
        );
        return response;
      } else {
        throw new Error("Invalid nested component analysis response");
      }
    } catch (error) {
      console.error("❌ Nested component analysis failed:", error.message);
      throw error;
    }
  }

  async testClassNameSearch() {
    console.log("\n🎨 Testing className prop search...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "search_prop_values",
        arguments: {
          rootDir: "./test",
          componentName: "NestedComponent",
          propName: "className",
          searchValue: "example",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ className search successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${result.summary.totalMatches} components with 'example' className`,
        );
        return response;
      } else {
        throw new Error("Invalid className search response");
      }
    } catch (error) {
      console.error("❌ className search failed:", error.message);
      throw error;
    }
  }

  async testMissingRequiredProps() {
    console.log("\n⚠️  Testing missing required props...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "find_missing_props",
        arguments: {
          rootDir: "./test",
          componentName: "Button",
          propName: "children",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ Missing required props test successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${
            result.summary.componentsWithMissingProp || 0
          } Button components missing 'children' prop`,
        );
        return response;
      } else {
        throw new Error("Invalid missing required props response");
      }
    } catch (error) {
      console.error("❌ Missing required props test failed:", error.message);
      throw error;
    }
  }

  async testIconButtonAnalysis() {
    console.log("\n🔘 Testing IconButton component analysis...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "analyze_jsx_props",
        arguments: {
          rootDir: "./test",
          componentName: "IconButton",
          propName: "icon",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ IconButton analysis successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${result.summary.totalMatches} IconButton components with 'icon' prop`,
        );
        return response;
      } else {
        throw new Error("Invalid IconButton analysis response");
      }
    } catch (error) {
      console.error("❌ IconButton analysis failed:", error.message);
      throw error;
    }
  }

  async testSelectOptionsAnalysis() {
    console.log("\n📋 Testing Select component options analysis...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "analyze_jsx_props",
        arguments: {
          rootDir: "./test",
          componentName: "Select",
          propName: "options",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ Select options analysis successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${result.summary.totalMatches} Select components with 'options' prop`,
        );
        return response;
      } else {
        throw new Error("Invalid Select options analysis response");
      }
    } catch (error) {
      console.error("❌ Select options analysis failed:", error.message);
      throw error;
    }
  }

  async testNonExistentComponent() {
    console.log("\n❓ Testing non-existent component...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "analyze_jsx_props",
        arguments: {
          rootDir: "./test",
          componentName: "NonExistentComponent",
          propName: "someProp",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ Non-existent component test successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   As expected, found ${result.summary.totalMatches} matches for non-existent component`,
        );
        return response;
      } else {
        throw new Error("Invalid non-existent component response");
      }
    } catch (error) {
      console.error("❌ Non-existent component test failed:", error.message);
      throw error;
    }
  }

  async testBooleanPropAnalysis() {
    console.log("\n✅ Testing boolean prop analysis...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "analyze_jsx_props",
        arguments: {
          rootDir: "./test",
          componentName: "Input",
          propName: "required",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ Boolean prop analysis successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${result.summary.totalMatches} Input components with 'required' prop`,
        );
        return response;
      } else {
        throw new Error("Invalid boolean prop analysis response");
      }
    } catch (error) {
      console.error("❌ Boolean prop analysis failed:", error.message);
      throw error;
    }
  }

  async testMultipleVariantSearch() {
    console.log("\n🎭 Testing multiple variant search...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "search_prop_values",
        arguments: {
          rootDir: "./test",
          componentName: "Button",
          propName: "variant",
          searchValue: "secondary",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ Multiple variant search successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${result.summary.totalMatches} Button components with 'secondary' variant`,
        );
        return response;
      } else {
        throw new Error("Invalid multiple variant search response");
      }
    } catch (error) {
      console.error("❌ Multiple variant search failed:", error.message);
      throw error;
    }
  }

  async testLinkButtonProps() {
    console.log("\n🔗 Testing LinkButton props...");

    try {
      const response = await this.sendRequest("tools/call", {
        name: "find_missing_props",
        arguments: {
          rootDir: "./test",
          componentName: "LinkButton",
          propName: "href",
          verbose: true,
        },
      });

      if (response.result) {
        console.log("✅ LinkButton props test successful");
        const content = response.result.content[0].text;
        const result = JSON.parse(content);
        console.log(
          `   Found ${
            result.summary.componentsWithMissingProp || 0
          } LinkButton components missing 'href' prop`,
        );
        return response;
      } else {
        throw new Error("Invalid LinkButton props response");
      }
    } catch (error) {
      console.error("❌ LinkButton props test failed:", error.message);
      throw error;
    }
  }

  async runAllTests() {
    try {
      await this.startServer();

      // Basic functionality tests
      await this.testInitialize();
      await this.testListTools();

      // Core tool tests
      await this.testAnalyzeJsxProps();
      await this.testFindMissingProps();
      await this.testSearchPropValues();

      // Extended component tests
      await this.testAnalyzeFormComponents();
      await this.testNestedComponentAnalysis();
      await this.testIconButtonAnalysis();
      await this.testSelectOptionsAnalysis();
      await this.testLinkButtonProps();

      // Property-specific tests
      await this.testClassNameSearch();
      await this.testMissingRequiredProps();
      await this.testBooleanPropAnalysis();
      await this.testMultipleVariantSearch();

      // Edge case tests
      await this.testNonExistentComponent();

      console.log("\n🎉 All tests passed successfully!");
      console.log(`\n📊 Test Summary:`);
      console.log(`   - Basic functionality: ✅`);
      console.log(`   - Core tools: ✅`);
      console.log(`   - Component analysis: ✅`);
      console.log(`   - Property analysis: ✅`);
      console.log(`   - Edge cases: ✅`);
    } catch (error) {
      console.error("\n💥 Test suite failed:", error.message);
      process.exit(1);
    } finally {
      this.cleanup();
    }
  }

  cleanup() {
    console.log("\n🧹 Cleaning up...");
    if (this.server) {
      this.server.kill();
    }
    if (this.readline) {
      this.readline.close();
    }
  }
}

// Run tests
const tester = new MCPTester();

// Handle process termination
process.on("SIGINT", () => {
  tester.cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  tester.cleanup();
  process.exit(0);
});

// Start testing
tester
  .runAllTests()
  .then(() => {
    console.log("✅ Test suite completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test suite failed:", error);
    process.exit(1);
  });
