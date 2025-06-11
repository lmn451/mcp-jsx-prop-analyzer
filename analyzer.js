/**
 * Finds usages of a specified JSX component and its props.
 * This is a mock implementation.
 * @param {string} rootDir - The directory to search.
 * @param {string} componentName - The name of the component to find.
 * @param {string} propName - The name of the prop to check.
 * @param {string|null} propValue - The value of the prop to match.
 * @param {object} options - Additional options like findMissing, verbose, includes.
 * @returns {Array} - An array of matching results.
 */
export const findPropUsage = (rootDir, componentName, propName, propValue, options) => {
  if (options.findMissing) {
    return [
      {
        filePath: 'src/components/ComponentWithoutProp.jsx',
        lineNumber: 8,
        props: { id: 'component-1' },
        message: `Component <${componentName}> is missing the prop '${propName}'.`
      }
    ];
  }

  return [
    {
      filePath: 'src/components/ComponentWithProp.jsx',
      lineNumber: 15,
      props: {
        [propName]: propValue || 'some-default-value',
        id: 'component-2'
      }
    }
  ];
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
      console.log('  Props:', JSON.stringify(result.props, null, 2));
    }
    if (result.message) {
      console.log(`  Note: ${result.message}`);
    }
  });
  console.log("\n---------------------------------");
};
