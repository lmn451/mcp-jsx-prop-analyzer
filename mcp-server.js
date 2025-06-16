#!/usr/bin/env node
/**
 * MCP Server for JSX Analysis Tools
 * @module mcp-server
 * @typedef {Object} AnalysisOptions - Configuration options for analysis
 * @property {boolean} [findMissing=false] - Find components missing the specified prop
 * @property {boolean} [verbose=false] - Include all props of matching components
 * @property {boolean} [includes=false] - Check if prop value includes the specified string
 *
 * @typedef {Object} ComponentAnalysisResult - Result of component analysis
 * @property {string} filePath - Path to the file containing the component
 * @property {string} componentName - Name of the component
 * @property {Object} props - Props of the component
 * @property {Object} [matchedProp] - Details of the matched prop
 *
 * @typedef {Object} ToolResponse - MCP tool response format
 * @property {Array<{type: string, text: string}>} content - Response content
 * @property {boolean} [isError] - Whether the response contains an error
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { findPropUsage } from "./analyzer.js";

// Create an MCP server
const server = new McpServer({
  name: "jsx-analyzer-server",
  version: "1.0.0",
});

/**
 * Analyze JSX prop usage with enhanced type definitions
 * @param {Object} params - Tool parameters
 * @param {string} params.rootDir - Root directory or file path to analyze
 * @param {string} params.componentName - Name of the JSX component to analyze
 * @param {string} params.propName - Name of the prop to search for
 * @param {string|null} [params.propValue=null] - Expected value of the prop
 * @param {AnalysisOptions} params.options - Analysis configuration options
 * @returns {Promise<ToolResponse>} Tool response with analysis results
 */
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
      /**
       * Analysis options configuration
       * @type {AnalysisOptions}
       */
      const options = { findMissing, verbose, includes };

      /**
       * Find prop usage with enhanced type inference
       * @type {Array<ComponentAnalysisResult>}
       */
      const results = findPropUsage(
        rootDir,
        componentName,
        propName,
        propValue || null,
        options
      );

      if (results.length === 0) {
        const formattedResults = {
          summary: {
            totalMatches: 0,
            searchCriteria: {
              component: componentName,
              prop: propName,
              value: propValue || null,
              mode: findMissing ? "missing props" : "existing props",
            },
          },
          matches: [],
          message: `No matching ${componentName} components found with the specified criteria.`,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedResults, null, 2),
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

/**
 * Find missing props with enhanced type definitions
 * @param {Object} params - Tool parameters
 * @param {string} params.rootDir - Root directory or file path to analyze
 * @param {string} params.componentName - Name of the JSX component to analyze
 * @param {string} params.propName - Name of the prop that should be present
 * @param {AnalysisOptions} params.options - Analysis configuration options
 * @returns {Promise<ToolResponse>} Tool response with missing prop analysis results
 */
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
      /**
       * Analysis options configuration for missing props
       * @type {AnalysisOptions}
       */
      const options = { findMissing: true, verbose, includes: false };

      /**
       * Find prop usage with enhanced type inference
       * @type {Array<ComponentAnalysisResult>}
       */
      const results = findPropUsage(
        rootDir,
        componentName,
        propName,
        null,
        options
      );

      if (results.length === 0) {
        const formattedResults = {
          summary: {
            componentsWithMissingProp: 0,
            component: componentName,
            missingProp: propName,
          },
          violations: [],
          message: `All ${componentName} components have the '${propName}' prop. No missing props found.`,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedResults, null, 2),
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

/**
 * Search prop values with substring matching and enhanced type definitions
 * @param {Object} params - Tool parameters
 * @param {string} params.rootDir - Root directory or file path to analyze
 * @param {string} params.componentName - Name of the JSX component to analyze
 * @param {string} params.propName - Name of the prop to search for
 * @param {string|null} [params.searchValue=null] - String to search for within prop values
 * @param {AnalysisOptions} params.options - Analysis configuration options
 * @returns {Promise<ToolResponse>} Tool response with search results
 */
server.tool(
  "search_prop_values",
  {
    rootDir: z.string().describe("Root directory or file path to analyze"),
    componentName: z.string().describe("Name of the JSX component to analyze"),
    propName: z.string().describe("Name of the prop to search for"),
    searchValue: z
      .string()
      .optional()
      .describe(
        "String to search for within prop values (optional - if not provided, lists all occurrences of the prop)"
      ),
    verbose: z
      .boolean()
      .optional()
      .default(false)
      .describe("Include all props of matching components in the output"),
  },
  async ({ rootDir, componentName, propName, searchValue, verbose }) => {
    try {
      /**
       * Analysis options configuration for prop value search
       * @type {AnalysisOptions}
       */
      const options = {
        findMissing: false,
        verbose,
        includes: searchValue ? true : false,
      };

      /**
       * Find prop usage with enhanced type inference
       * @type {Array<ComponentAnalysisResult>}
       */
      const results = findPropUsage(
        rootDir,
        componentName,
        propName,
        searchValue || null,
        options
      );

      if (results.length === 0) {
        const searchCriteria = {
          component: componentName,
          prop: propName,
        };

        if (searchValue) {
          searchCriteria.contains = searchValue;
        }

        const message = searchValue
          ? `No ${componentName} components found with '${propName}' prop containing '${searchValue}'.`
          : `No ${componentName} components found with '${propName}' prop.`;

        const formattedResults = {
          summary: {
            totalMatches: 0,
            searchCriteria,
          },
          matches: [],
          message,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedResults, null, 2),
            },
          ],
        };
      }

      const searchCriteria = {
        component: componentName,
        prop: propName,
      };

      if (searchValue) {
        searchCriteria.contains = searchValue;
      }

      const formattedResults = {
        summary: {
          totalMatches: results.length,
          searchCriteria,
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

/**
 * Start the MCP server with enhanced type definitions
 * @returns {Promise<void>} Server initialization result
 */
async function main() {
  try {
    /**
     * Server transport configuration
     * @type {StdioServerTransport}
     */
    const transport = new StdioServerTransport();

    await server.connect(transport);
    console.error("JSX Analyzer MCP server running on stdio");
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

// Start the server when the module is executed
main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
