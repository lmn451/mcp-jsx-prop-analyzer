import React from "react";

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

export const IconButton = ({ icon, onClick, size = "medium" }) => {
  return (
    <button onClick={onClick} className={`icon-btn icon-btn-${size}`}>
      <Icon name={icon} />
    </button>
  );
};

export const LinkButton = ({ href, children, external }) => {
  return (
    <a href={href} target={external ? "_blank" : "_self"} className="link-btn">
      {children}
    </a>
  );
};
