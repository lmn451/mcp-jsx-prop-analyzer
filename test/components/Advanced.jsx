import React from "react";

// Component with complex prop patterns
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "medium",
  backdrop = true,
  keyboard = true,
}) => {
  return (
    <div className={`modal ${isOpen ? "modal-open" : ""}`}>
      {backdrop && <div className="modal-backdrop" onClick={onClose} />}
      <div className={`modal-dialog modal-${size}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </div>
  );
};

// Component with spread props
export const FlexBox = ({ direction = "row", wrap = false, ...props }) => {
  return (
    <div
      className={`flex flex-${direction} ${wrap ? "flex-wrap" : ""}`}
      {...props}
    >
      {props.children}
    </div>
  );
};

// Component with conditional rendering
export const Alert = ({ type = "info", dismissible, onDismiss, children }) => {
  return (
    <div className={`alert alert-${type}`} role="alert">
      {children}
      {dismissible && (
        <button
          type="button"
          className="close"
          onClick={onDismiss}
          aria-label="Close"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      )}
    </div>
  );
};

// Component with function prop
export const DataTable = ({
  data = [],
  columns = [],
  onRowClick,
  sortable = false,
  paginate = false,
}) => {
  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map((col, index) => (
            <th key={index} className={sortable ? "sortable" : ""}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index} onClick={() => onRowClick && onRowClick(row)}>
            {columns.map((col, colIndex) => (
              <td key={colIndex}>{row[col.field]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Component with ref forwarding
export const CustomInput = React.forwardRef(
  ({ label, error, helper, ...inputProps }, ref) => {
    return (
      <div className="form-group">
        {label && <label className="form-label">{label}</label>}
        <input
          ref={ref}
          className={`form-control ${error ? "is-invalid" : ""}`}
          {...inputProps}
        />
        {error && <div className="invalid-feedback">{error}</div>}
        {helper && <small className="form-text text-muted">{helper}</small>}
      </div>
    );
  }
);

CustomInput.displayName = "CustomInput";
