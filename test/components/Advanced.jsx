import React from "react";

/**
 * Modal component props
 * @typedef {Object} ModalProps
 * @property {boolean} isOpen - Controls modal visibility
 * @property {Function} onClose - Callback to close modal
 * @property {string} title - Modal title text
 * @property {React.ReactNode} children - Modal content
 * @property {"small" | "medium" | "large"} [size="medium"] - Modal size
 * @property {boolean} [backdrop=true] - Show backdrop overlay
 * @property {boolean} [keyboard=true] - Allow keyboard dismiss
 */

/**
 * Modal dialog component with configurable options
 * @param {ModalProps} props - Component props
 * @returns {React.ReactElement} Rendered modal
 */
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

/**
 * Flex container props
 * @typedef {Object} FlexBoxProps
 * @property {"row" | "column"} [direction="row"] - Flex direction
 * @property {boolean} [wrap=false] - Allow flex wrapping
 * @property {React.ReactNode} children - Content to layout
 */

/**
 * Flex container component with responsive options
 * @param {FlexBoxProps & React.HTMLProps<HTMLDivElement>} props - Component props including all div attributes
 * @returns {React.ReactElement} Rendered flex container
 */
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

/**
 * Alert component props
 * @typedef {Object} AlertProps
 * @property {"info" | "success" | "warning" | "error"} [type="info] - Alert severity
 * @property {boolean} [dismissible] - Show dismiss button
 * @property {Function} [onDismiss] - Callback for dismiss button
 * @property {React.ReactNode} children - Alert content
 */

/**
 * Alert message component with dismissible option
 * @param {AlertProps} props - Component props
 * @returns {React.ReactElement} Rendered alert
 */
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

/**
 * Table row click handler
 * @callback RowClickHandler
 * @param {Object} row - Clicked row data
 * @returns {void}
 */

/**
 * Data table props
 * @typedef {Object} DataTableProps
 * @property {Object[]} [data=[]] - Array of row data objects
 * @property {Object[]} [columns=[]] - Column configuration
 * @property {RowClickHandler} [onRowClick] - Row click handler
 * @property {boolean} [sortable=false] - Enable column sorting
 * @property {boolean} [paginate=false] - Enable pagination
 */

/**
 * Data table component with configurable columns and interactions
 * @param {DataTableProps} props - Component props
 * @returns {React.ReactElement} Rendered data table
 */
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

/**
 * Custom input component props
 * @typedef {Object} CustomInputProps
 * @property {string} [label] - Input label text
 * @property {string} [error] - Error message to display
 * @property {string} [helper] - Helper text below input
 * @property {React.Ref<HTMLInputElement>} ref - Forwarded ref to input element
 * @property {Object} [inputProps] - Additional input attributes
 */

/**
 * Custom input component with error and helper text
 * @type {React.ForwardRefExoticComponent<React.PropsWithoutRef<CustomInputProps> & React.RefAttributes<HTMLInputElement>>}
 */
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
