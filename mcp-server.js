#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { findPropUsage } from "./analyzer.js";

// Create an MCP server
const server = new McpServer({
  name: "jsx-analyzer-server",
  version: "1.0.0",
});

// Tool for analyzing JSX prop usage
server.tool(
  "analyze_jsx_props",
  {
    rootDir: z.string().describe("Root directory or file path to analyze"),
    componentName: z.string().describe("Name of the JSX component to analyze"),
    propName: z.string().describe("Name of the prop to search for"),
    propValue: z
      .string()
      .optional()
      .describe("Expected value of the prop (optional)"),
    findMissing: z
      .boolean()
      .optional()
      .default(false)
      .describe("Find components missing the specified prop"),
    verbose: z
      .boolean()
      .optional()
      .default(false)
      .describe("Include all props of matching components in the output"),
    includes: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Check if the prop value includes the specified string (substring match)"
      ),
  },
  async ({
    rootDir,
    componentName,
    propName,
    propValue,
    findMissing,
    verbose,
    includes,
  }) => {
    try {
      const options = { findMissing, verbose, includes };
      const results = findPropUsage(
        rootDir,
        componentName,
        propName,
        propValue || null,
        options
      );

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No matching ${componentName} components found with the specified criteria.`,
            },
          ],
        };
      }

      // Format results as JSON for better consumption
      const formattedResults = {
        summary: {
          totalMatches: results.length,
          searchCriteria: {
            component: componentName,
            prop: propName,
            value: propValue || null,
            mode: findMissing ? "missing props" : "existing props",
          },
        },
        matches: results,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(formattedResults, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error analyzing JSX files: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool for finding missing props specifically
server.tool(
  "find_missing_props",
  {
    rootDir: z.string().describe("Root directory or file path to analyze"),
    componentName: z.string().describe("Name of the JSX component to analyze"),
    propName: z.string().describe("Name of the prop that should be present"),
    verbose: z
      .boolean()
      .optional()
      .default(false)
      .describe("Include all props of matching components in the output"),
  },
  async ({ rootDir, componentName, propName, verbose }) => {
    try {
      const options = { findMissing: true, verbose, includes: false };
      const results = findPropUsage(
        rootDir,
        componentName,
        propName,
        null,
        options
      );

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `All ${componentName} components have the '${propName}' prop. No missing props found.`,
            },
          ],
        };
      }

      const formattedResults = {
        summary: {
          componentsWithMissingProp: results.length,
          component: componentName,
          missingProp: propName,
        },
        violations: results,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(formattedResults, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error finding missing props: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool for searching prop values with substring matching
server.tool(
  "search_prop_values",
  {
    rootDir: z.string().describe("Root directory or file path to analyze"),
    componentName: z.string().describe("Name of the JSX component to analyze"),
    propName: z.string().describe("Name of the prop to search for"),
    searchValue: z.string().describe("String to search for within prop values"),
    verbose: z
      .boolean()
      .optional()
      .default(false)
      .describe("Include all props of matching components in the output"),
  },
  async ({ rootDir, componentName, propName, searchValue, verbose }) => {
    try {
      const options = { findMissing: false, verbose, includes: true };
      const results = findPropUsage(
        rootDir,
        componentName,
        propName,
        searchValue,
        options
      );

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No ${componentName} components found with '${propName}' prop containing '${searchValue}'.`,
            },
          ],
        };
      }

      const formattedResults = {
        summary: {
          totalMatches: results.length,
          searchCriteria: {
            component: componentName,
            prop: propName,
            contains: searchValue,
          },
        },
        matches: results,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(formattedResults, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching prop values: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("JSX Analyzer MCP server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
