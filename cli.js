#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
/**
 * Import functions for analyzing JSX prop usage and displaying results
 * @module analyzer
 */
import { findPropUsage, displayResults } from "./analyzer.js";

/**
 * CLI interface for JSX prop analysis tool
 * @module cli
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
 */

/**
 * Main command execution with enhanced type definitions
 * @param {Object} argv - Command line arguments
 * @param {string} argv.rootDir - Root directory or file to scan
 * @param {string} argv.componentName - Name of the JSX component to analyze
 * @param {string} argv.propName - Name of the prop to search for
 * @param {string|null} [argv.propValue=null] - Expected value of the prop
 * @param {boolean} [argv.findMissing=false] - Find components missing the specified prop
 * @param {boolean} [argv.verbose=false] - Include all props of matching components
 * @param {boolean} [argv.includes=false] - Check if prop value includes the specified string
 * @typedef {AnalysisOptions} argv.AnalysisOptions - Analysis configuration options
 */
yargs(hideBin(process.argv))
  .command(
    "$0 <rootDir> <componentName> <propName> [propValue]",
    "Analyze JSX prop usage in a codebase",
    (yargs) => {
      return yargs
        .positional("rootDir", {
          describe: "Root directory or file to scan",
          type: "string",
        })
        .positional("componentName", {
          describe: "Name of the JSX component to analyze",
          type: "string",
        })
        .positional("propName", {
          describe: "Name of the prop to search for",
          type: "string",
        })
        .positional("propValue", {
          describe: "Expected value of the prop (optional)",
          type: "string",
          default: null,
        })
        .option("find-missing", {
          alias: "m",
          type: "boolean",
          description: "Find components missing the specified prop",
          default: false,
        })
        .option("verbose", {
          alias: "v",
          type: "boolean",
          description: "Include all props of matching components in the output",
          default: false,
        })
        .option("includes", {
          alias: "i",
          type: "boolean",
          description:
            "Check if the prop value includes the specified string (substring match)",
          default: false,
        });
    },
    (argv) => {
      const {
        rootDir,
        componentName,
        propName,
        propValue,
        findMissing,
        verbose,
        includes,
      } = argv;

      /**
       * Analysis options configuration
       * @type {AnalysisOptions}
       * @property {boolean} findMissing - Whether to find missing props
       * @property {boolean} verbose - Whether to include all props in output
       * @property {boolean} includes - Whether to check substring matches
       */
      const options = { findMissing, verbose, includes };

      console.log(
        `Analyzing ${componentName} for prop "${propName}" in ${rootDir}...`
      );

      /**
       * Find prop usage with enhanced type inference
       * @type {Array<ComponentAnalysisResult>}
       */
      const results = findPropUsage(
        rootDir,
        componentName,
        propName,
        propValue,
        options
      );

      if (results.length > 0) {
        displayResults(results);
      } else {
        console.log("No matching components found.");
      }
    }
  )
  .help()
  .alias("help", "h")
  .parse();
