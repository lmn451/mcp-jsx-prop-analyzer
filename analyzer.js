import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
const traverse = traverseModule.default || traverseModule;

/**
 * Recursively finds all JavaScript/JSX files in a directory
 * @param {string} dir - Directory to search
 * @returns {Array<string>} - Array of file paths
 */
const findJSXFiles = (dir) => {
  const files = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and other common directories
        if (
          !["node_modules", ".git", "dist", "build", ".next"].includes(
            entry.name
          )
        ) {
          files.push(...findJSXFiles(fullPath));
        }
      } else if (entry.isFile()) {
        // Check for JavaScript/JSX files
        const ext = path.extname(entry.name).toLowerCase();
        if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
  }

  return files;
};

/**
 * Parses a file and extracts JSX component usage
 * @param {string} filePath - Path to the file
 * @param {string} componentName - Name of the component to find
 * @param {string} propName - Name of the prop to check
 * @param {string|null} propValue - Value of the prop to match
 * @param {object} options - Additional options
 * @returns {Array} - Array of results for this file
 */
const analyzeFile = (filePath, componentName, propName, propValue, options) => {
  const results = [];

  try {
    const code = fs.readFileSync(filePath, "utf8");

    // Parse the code into an AST
    const ast = parse(code, {
      sourceType: "module",
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: [
        "jsx",
        "typescript",
        "decorators-legacy",
        "classProperties",
        "objectRestSpread",
        "asyncGenerators",
        "functionBind",
        "exportDefaultFrom",
        "exportNamespaceFrom",
        "dynamicImport",
        "nullishCoalescingOperator",
        "optionalChaining",
      ],
    });

    // Traverse the AST to find JSX elements
    traverse(ast, {
      JSXElement(nodePath) {
        const { node } = nodePath;
        const openingElement = node.openingElement;

        // Check if this is the component we're looking for
        let elementName = "";
        if (openingElement.name.type === "JSXIdentifier") {
          elementName = openingElement.name.name;
        } else if (openingElement.name.type === "JSXMemberExpression") {
          // Handle cases like <Component.SubComponent>
          const parts = [];
          let current = openingElement.name;
          while (current) {
            if (current.type === "JSXIdentifier") {
              parts.unshift(current.name);
              break;
            } else if (current.type === "JSXMemberExpression") {
              parts.unshift(current.property.name);
              current = current.object;
            }
          }
          elementName = parts.join(".");
        }

        if (elementName === componentName) {
          const lineNumber = openingElement.loc.start.line;
          const props = {};
          let hasProp = false;
          let propMatch = false;

          // Extract all props
          openingElement.attributes.forEach((attr) => {
            if (
              attr.type === "JSXAttribute" &&
              attr.name.type === "JSXIdentifier"
            ) {
              const attrName = attr.name.name;
              let attrValue = null;

              if (attr.value) {
                if (attr.value.type === "Literal") {
                  attrValue = attr.value.value;
                } else if (attr.value.type === "JSXExpressionContainer") {
                  // For expressions, get the raw code
                  attrValue = code.substring(attr.value.start, attr.value.end);
                } else {
                  attrValue = "<complex_value>";
                }
              } else {
                // Boolean prop (present without value)
                attrValue = true;
              }

              props[attrName] = attrValue;

              // Check if this is the prop we're looking for
              if (attrName === propName) {
                hasProp = true;

                if (propValue === null) {
                  // Just checking for presence of prop
                  propMatch = true;
                } else if (options.includes) {
                  // Substring match
                  propMatch = String(attrValue).includes(propValue);
                } else {
                  // Exact match
                  propMatch = String(attrValue) === propValue;
                }
              }
            }
          });

          // Determine if we should include this result
          let shouldInclude = false;
          let message = null;

          if (options.findMissing) {
            if (!hasProp) {
              shouldInclude = true;
              message = `Component <${componentName}> is missing the prop '${propName}'.`;
            }
          } else {
            if (hasProp && (propValue === null || propMatch)) {
              shouldInclude = true;
            }
          }

          if (shouldInclude) {
            const result = {
              filePath: path.relative(process.cwd(), filePath),
              lineNumber,
              props: options.verbose ? props : { [propName]: props[propName] },
            };

            if (message) {
              result.message = message;
            }

            results.push(result);
          }
        }
      },
    });
  } catch (error) {
    console.warn(`Warning: Could not parse file ${filePath}: ${error.message}`);
  }

  return results;
};

/**
 * Finds usages of a specified JSX component and its props.
 * @param {string} rootDir - The directory to search.
 * @param {string} componentName - The name of the component to find.
 * @param {string} propName - The name of the prop to check.
 * @param {string|null} propValue - The value of the prop to match.
 * @param {object} options - Additional options like findMissing, verbose, includes.
 * @returns {Array} - An array of matching results.
 */
export const findPropUsage = (
  rootDir,
  componentName,
  propName,
  propValue,
  options
) => {
  const results = [];

  // Check if rootDir is a file or directory
  const stats = fs.statSync(rootDir);

  if (stats.isFile()) {
    // Single file analysis
    const fileResults = analyzeFile(
      rootDir,
      componentName,
      propName,
      propValue,
      options
    );
    results.push(...fileResults);
  } else if (stats.isDirectory()) {
    // Directory analysis
    const files = findJSXFiles(rootDir);
    console.log(`Found ${files.length} JavaScript/JSX files to analyze...`);

    for (const filePath of files) {
      const fileResults = analyzeFile(
        filePath,
        componentName,
        propName,
        propValue,
        options
      );
      results.push(...fileResults);
    }
  }

  return results;
};

/**
 * Displays the analysis results in the console.
 * @param {Array} results - The array of results from findPropUsage.
 */
export const displayResults = (results) => {
  if (!results || results.length === 0) {
    console.log("No results to display.");
    return;
  }

  console.log("\n--- JSX Prop Analysis Results ---");
  results.forEach((result, index) => {
    console.log(`\n[${index + 1}] ${result.filePath}:${result.lineNumber}`);
    if (result.props) {
      console.log("  Props:", JSON.stringify(result.props, null, 2));
    }
    if (result.message) {
      console.log(`  Note: ${result.message}`);
    }
  });
  console.log("\n---------------------------------");
};
