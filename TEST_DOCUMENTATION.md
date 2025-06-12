# JSX Analyzer MCP Server - Test Suite Documentation

## Overview

This comprehensive test suite ensures the JSX Analyzer MCP Server functions correctly across various scenarios, edge cases, and performance conditions.

## Test Structure

### 1. Basic Functionality Tests (`test-mcp.js`)

**Purpose**: Validates core MCP server functionality and basic tool operations.

**Tests Included**:

- Server initialization and startup
- MCP protocol handshake
- Tools listing
- Basic JSX prop analysis
- Missing prop detection
- Prop value searching
- Form component analysis
- Nested component analysis
- Icon button analysis
- Select component analysis
- Link button validation
- Boolean prop handling
- Multiple variant searching
- Non-existent component handling

**Key Components Tested**:

- `Button` with variants and click handlers
- `Input` with various types and validation
- `Select` with options
- `IconButton` with icons and sizes
- `LinkButton` with href attributes
- `NestedComponent` with test props

### 2. Performance & Stress Tests (`test-performance.js`)

**Purpose**: Validates server performance, concurrent request handling, and error resilience.

**Tests Included**:

- **Concurrent Requests**: Multiple simultaneous tool calls
- **Large Directory Analysis**: Performance with extensive file structures
- **Invalid Parameters**: Error handling with malformed inputs
- **Memory Usage**: Repeated requests to test memory leaks
- **Complex Query Patterns**: Advanced prop analysis scenarios

**Performance Metrics**:

- Request timing and throughput
- Memory stability over time
- Error handling robustness
- Server recovery capabilities

### 3. Edge Case & Advanced Component Tests (`test-edge-cases.js`)

**Purpose**: Tests complex JSX patterns and advanced React component features.

**Tests Included**:

- **Spread Props**: Components using `{...props}` syntax
- **ForwardRef Components**: React.forwardRef wrapped components
- **Conditional Rendering**: Props that conditionally render content
- **Function Props**: Event handlers and callback functions
- **Default Values**: Props with default parameter values
- **Accessibility Props**: ARIA attributes and roles
- **Empty/Null Values**: Edge cases with empty prop values
- **Complex Hierarchy**: Deeply nested component structures

**Advanced Components Tested**:

- `Modal` with complex prop patterns
- `FlexBox` with spread props
- `Alert` with conditional rendering
- `DataTable` with function props
- `CustomInput` with forwardRef

## Test Execution

### Running Individual Test Suites

```bash
# Basic functionality
node test-mcp.js

# Performance testing
node test-performance.js

# Edge cases
node test-edge-cases.js
```

### Running Complete Test Suite

```bash
# All tests with comprehensive reporting
node test-runner.js

# Using npm scripts
npm test
npm run test:performance
npm run test:edge-cases
npm run test:all
```

## Test Components

### Test Directory Structure

```
test/
├── app.jsx                 # Main application with form examples
├── components/
│   ├── Button.jsx         # Button variants and types
│   ├── Form.jsx           # Form input components
│   ├── Nested.jsx         # Nested component examples
│   └── Advanced.jsx       # Complex component patterns
```

### Component Prop Patterns Tested

1. **Simple Props**: Basic string, number, boolean values
2. **Object Props**: Complex data structures
3. **Function Props**: Event handlers and callbacks
4. **Conditional Props**: Props that may or may not be present
5. **Default Props**: Props with fallback values
6. **Spread Props**: Dynamic prop spreading
7. **Accessibility Props**: ARIA and semantic attributes

## Expected Test Results

### Success Criteria

- All basic functionality tests pass ✅
- Performance tests complete within acceptable timeframes ✅
- Edge cases are handled gracefully ✅
- Error conditions are properly managed ✅
- Memory usage remains stable ✅

### Test Metrics

- **Basic Tests**: ~15 test cases
- **Performance Tests**: ~5 stress scenarios
- **Edge Cases**: ~10 advanced patterns
- **Total Coverage**: 30+ test scenarios

## Troubleshooting

### Common Issues

1. **Server Startup Failures**

   - Ensure `mcp-server.js` is present
   - Check Node.js version compatibility
   - Verify all dependencies are installed

2. **Test Timeouts**

   - Large directories may take longer to analyze
   - Increase timeout values for complex scenarios
   - Check system resources

3. **Component Not Found**
   - Verify test component files exist
   - Check JSX syntax is valid
   - Ensure component exports are correct

### Debug Mode

Enable verbose output by setting the `verbose` flag to `true` in test arguments:

```javascript
arguments: {
  rootDir: "./test",
  componentName: "Button",
  propName: "onClick",
  verbose: true  // Detailed output
}
```

## Extending Tests

### Adding New Test Cases

1. **Create New Component**: Add to `test/components/`
2. **Update Test Suite**: Add test case to appropriate test file
3. **Document Pattern**: Update this documentation
4. **Verify Coverage**: Ensure new scenarios are tested

### Test Case Template

```javascript
async testNewFeature() {
  console.log("\n🔍 Testing new feature...");

  try {
    const response = await this.sendRequest("tools/call", {
      name: "analyze_jsx_props",
      arguments: {
        rootDir: "./test",
        componentName: "YourComponent",
        propName: "yourProp",
        verbose: true,
      },
    });

    if (response.result) {
      console.log("✅ New feature test successful");
      const content = response.result.content[0].text;
      const result = JSON.parse(content);
      console.log(`   Found ${result.summary.totalMatches} matches`);
      return response;
    } else {
      throw new Error("Invalid response");
    }
  } catch (error) {
    console.error("❌ New feature test failed:", error.message);
    throw error;
  }
}
```

## Continuous Integration

The test suite is designed to work in CI/CD environments:

- **Exit Codes**: Proper exit codes for success/failure
- **Logging**: Comprehensive output for debugging
- **Isolation**: Each test runs independently
- **Cleanup**: Automatic server cleanup on completion

## Performance Benchmarks

### Typical Performance Metrics

- **Basic Analysis**: < 100ms per request
- **Complex Components**: < 500ms per request
- **Large Directories**: < 2s for full analysis
- **Concurrent Requests**: 3+ simultaneous requests
- **Memory Usage**: Stable over 50+ iterations

## Security Considerations

- Tests use only local file system access
- No external network requests
- Sandboxed execution environment
- Validated input parameters
