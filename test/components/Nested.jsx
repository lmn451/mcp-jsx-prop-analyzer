import React from "react";

export const NestedComponent = ({ testProp, children, className }) => {
  return (
    <div className={`nested ${className || ""}`}>
      <h3>Nested Component</h3>
      <p>Test Prop: {testProp}</p>
      {children}
    </div>
  );
};

export const ParentComponent = () => {
  return (
    <div className="parent">
      <NestedComponent testProp="child" className="example">
        <p>This is nested content</p>
      </NestedComponent>

      <NestedComponent testProp="sibling">
        <p>Another nested component</p>
      </NestedComponent>

      <NestedComponent className="no-test-prop">
        <p>Component without testProp</p>
      </NestedComponent>
    </div>
  );
};
