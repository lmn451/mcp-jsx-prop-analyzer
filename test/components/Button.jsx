import React from "react";

/**
 * Button component props
 * @typedef {Object} ButtonProps
 * @property {Function} onClick - Click event handler
 * @property {boolean} [disabled] - Whether the button is disabled
 * @property {React.ReactNode} children - Button content
 * @property {"primary" | "secondary"} [variant="primary"] - Button style variant
 */

/**
 * Primary button component
 * @param {ButtonProps} props - Component props
 * @returns {React.ReactElement} Rendered button
 */
export const Button = ({
  onClick,
  disabled,
  children,
  variant = "primary",
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
};

/**
 * Icon button props
 * @typedef {Object} IconButtonProps
 * @property {string} icon - Icon name
 * @property {Function} onClick - Click event handler
 * @property {"small" | "medium" | "large"} [size="medium"] - Button size
 */

/**
 * IconButton component with size variations
 * @param {IconButtonProps} props - Component props
 * @returns {React.ReactElement} Rendered icon button
 */
export const IconButton = ({ icon, onClick, size = "medium" }) => {
  return (
    <button onClick={onClick} className={`icon-btn icon-btn-${size}`}>
      <Icon name={icon} />
    </button>
  );
};

/**
 * Link button props
 * @typedef {Object} LinkButtonProps
 * @property {string} href - Link destination
 * @property {React.ReactNode} children - Link content
 * @property {boolean} [external] - Whether to open in new tab
 */

/**
 * Styled link component
 * @param {LinkButtonProps} props - Component props
 * @returns {React.ReactElement} Rendered link button
 */
export const LinkButton = ({ href, children, external }) => {
  return (
    <a href={href} target={external ? "_blank" : "_self"} className="link-btn">
      {children}
    </a>
  );
};
