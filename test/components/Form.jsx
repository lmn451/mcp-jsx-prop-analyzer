import React from "react";

/**
 * Input component props
 * @typedef {Object} InputProps
 * @property {"text" | "email" | "password"} [type="text"] - Input field type
 * @property {string} [placeholder] - Placeholder text
 * @property {string | number} [value] - Current value
 * @property {Function} onChange - Change event handler
 * @property {boolean} [required] - Required field flag
 */

/**
 * Form input component
 * @param {InputProps} props - Component props
 * @returns {React.ReactElement} Rendered input
 */
export const Input = ({
  type = "text",
  placeholder,
  value,
  onChange,
  required,
}) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className="form-input"
    />
  );
};

/**
 * Text area props
 * @typedef {Object} TextAreaProps
 * @property {string} [placeholder] - Placeholder text
 * @property {string} [value] - Current value
 * @property {Function} onChange - Change event handler
 * @property {number} [rows=4] - Number of rows
 */

/**
 * Multi-line text input
 * @param {TextAreaProps} props - Component props
 * @returns {React.ReactElement} Rendered textarea
 */
export const TextArea = ({ placeholder, value, onChange, rows = 4 }) => {
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      className="form-textarea"
    />
  );
};

/**
 * Select component options
 * @typedef {{value: string, label: string}} SelectOption
 */

/**
 * Select component props
 * @typedef {Object} SelectProps
 * @property {SelectOption[]} options - Available options
 * @property {string} [value] - Currently selected value
 * @property {Function} onChange - Change event handler
 * @property {string} [placeholder] - Placeholder text
 */

/**
 * Dropdown select component
 * @param {SelectProps} props - Component props
 * @returns {React.ReactElement} Rendered select
 */
export const Select = ({ options, value, onChange, placeholder }) => {
  return (
    <select value={value} onChange={onChange} className="form-select">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

/**
 * Checkbox component props
 * @typedef {Object} CheckboxProps
 * @property {boolean} [checked] - Current checked state
 * @property {Function} onChange - Change event handler
 * @property {string} label - Checkbox label text
 */

/**
 * Checkbox input component
 * @param {CheckboxProps} props - Component props
 * @returns {React.ReactElement} Rendered checkbox
 */
export const Checkbox = ({ checked, onChange, label }) => {
  return (
    <label className="checkbox-label">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="checkbox-input"
      />
      {label}
    </label>
  );
};
