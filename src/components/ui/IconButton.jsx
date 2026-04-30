import React from "react";
import { Link } from "react-router-dom";

const variantClasses = {
  ghost:
    "bg-transparent text-fg-muted hover:bg-subtle hover:text-fg",
  "ghost-dark":
    "bg-transparent text-white/60 hover:bg-white/10 hover:text-white",
  secondary:
    "bg-surface text-fg border border-line hover:bg-subtle hover:border-line-strong",
  destructive:
    "bg-transparent text-fg-muted hover:bg-error-50 hover:text-error",
  "destructive-dark":
    "bg-transparent text-white/60 hover:bg-error-500/20 hover:text-error-200",
};

const sizeClasses = {
  sm: "h-controlSm w-controlSm rounded-sm [&>svg]:h-3.5 [&>svg]:w-3.5",
  md: "h-control    w-control    rounded-md [&>svg]:h-4   [&>svg]:w-4",
  lg: "h-controlLg  w-controlLg  rounded-md [&>svg]:h-5   [&>svg]:w-5",
};

const baseClasses =
  "inline-flex items-center justify-center shrink-0 select-none " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-fast " +
  "focus-visible:outline-none focus-visible:shadow-focus-ring " +
  "active:scale-[0.96] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

const IconButton = React.forwardRef(
  (
    {
      icon: Icon,
      children,
      "aria-label": ariaLabel,
      onClick,
      to,
      type = "button",
      variant = "ghost",
      size = "md",
      disabled = false,
      className = "",
      ...rest
    },
    ref
  ) => {
    const finalClassName = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
    const content = Icon ? <Icon aria-hidden /> : children;

    if (to && !disabled) {
      return (
        <Link
          ref={ref}
          to={to}
          aria-label={ariaLabel}
          className={finalClassName}
          {...rest}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className={finalClassName}
        {...rest}
      >
        {content}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

export default IconButton;
