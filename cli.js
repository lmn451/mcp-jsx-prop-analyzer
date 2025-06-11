#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { findPropUsage, displayResults } from "./analyzer.js";

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
          description:
            "Include all props of matching components in the output",
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
      const options = { findMissing, verbose, includes };

      console.log(
        `Analyzing ${componentName} for prop "${propName}" in ${rootDir}...`,
      );

      const results = findPropUsage(
        rootDir,
        componentName,
        propName,
        propValue,
        options,
      );

      if (results.length > 0) {
        displayResults(results);
      } else {
        console.log("No matching components found.");
      }
    },
  )
  .help()
  .alias("help", "h")
  .parse();
