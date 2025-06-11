# JSX Component Prop Analyzer

A powerful tool for analyzing JSX component prop usage in React/JSX codebases. Now available as both a CLI tool and an MCP (Model Context Protocol) server!

## Features

- **Recursive file scanning** - Analyzes `.js`, `.jsx`, `.ts`, and `.tsx` files
- **Component detection** - Finds JSX components by name
- **Prop analysis** - Searches for specific props and their values
- **Missing prop detection** - Identifies components missing required props
- **Substring matching** - Search for prop values containing specific strings
- **Detailed output** - Shows file paths, line numbers, and prop values

## Installation

```bash
npm install
```

## Usage

### CLI Mode

Use the traditional command-line interface:

```bash
# Basic usage - find components with specific prop
./cli.js <rootDir> <componentName> <propName> [propValue]

# Find Button components with className prop
./cli.js ./src Button className

# Find Button components with specific className value
./cli.js ./src Button className "btn-primary"

# Find components missing a required prop
./cli.js ./src Button onClick --find-missing

# Verbose output showing all props
./cli.js ./src Button className --verbose

# Substring matching
./cli.js ./src Button className "primary" --includes
```

**CLI Options:**

- `--find-missing, -m`: Find components missing the specified prop
- `--verbose, -v`: Include all props of matching components in output
- `--includes, -i`: Substring match for prop values

### MCP Server Mode

The project now also works as an MCP server, exposing three tools:

#### Tools Available:

1. **`analyze_jsx_props`** - General JSX prop analysis

   - `rootDir`: Directory or file to analyze
   - `componentName`: JSX component name to search for
   - `propName`: Prop name to search for
   - `propValue` (optional): Expected prop value
   - `findMissing` (optional): Find missing props
   - `verbose` (optional): Include all props in output
   - `includes` (optional): Substring matching

2. **`find_missing_props`** - Find components missing required props

   - `rootDir`: Directory or file to analyze
   - `componentName`: JSX component name
   - `propName`: Required prop name
   - `verbose` (optional): Include all props in output

3. **`search_prop_values`** - Search prop values with substring matching
   - `rootDir`: Directory or file to analyze
   - `componentName`: JSX component name
   - `propName`: Prop name to search
   - `searchValue`: String to search for within prop values
   - `verbose` (optional): Include all props in output

The MCP server has been automatically configured and is ready to use!

## Project Structure

```
├── analyzer.js     # Core analysis logic
├── cli.js          # CLI interface
├── mcp-server.js   # MCP server interface
├── package.json    # Dependencies and scripts
└── README.md       # This file
```

## Examples

### CLI Examples

```bash
# Find all Button components with onClick prop
./cli.js ./src Button onClick

# Find Button components missing onClick prop
./cli.js ./src Button onClick --find-missing

# Find Input components with type="password"
./cli.js ./src Input type "password"

# Find components with className containing "primary"
./cli.js ./src Button className "primary" --includes --verbose
```

### MCP Examples

When using through an MCP client, you can invoke tools like:

- Analyze Button components for className prop in ./src directory
- Find Input components missing the required 'name' prop
- Search for components with className values containing 'btn-'

## Output Format

### CLI Output

```
--- JSX Prop Analysis Results ---

[1] src/components/Button.jsx:15
  Props: {
    "className": "btn btn-primary"
  }

[2] src/pages/Home.jsx:42
  Props: {
    "className": "btn btn-secondary"
  }
```

### MCP Output

```json
{
  "summary": {
    "totalMatches": 2,
    "searchCriteria": {
      "component": "Button",
      "prop": "className",
      "value": null,
      "mode": "existing props"
    }
  },
  "matches": [
    {
      "filePath": "src/components/Button.jsx",
      "lineNumber": 15,
      "props": {
        "className": "btn btn-primary"
      }
    }
  ]
}
```

## Supported File Types

- `.js` - JavaScript files
- `.jsx` - React JSX files
- `.ts` - TypeScript files
- `.tsx` - TypeScript JSX files

## Excluded Directories

The analyzer automatically skips:

- `node_modules`
- `.git`
- `dist`
- `build`
- `.next`

---

Your JSX prop analyzer is now ready to use in both CLI and MCP modes! 🚀
