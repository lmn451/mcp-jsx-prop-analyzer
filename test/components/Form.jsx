import React from "react";

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
