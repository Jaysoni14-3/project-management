import React from "react";
import Spinner from "./Spinner";

const variantClasses = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-950 shadow-xs",
  secondary:
    "bg-surface text-fg border border-line hover:bg-subtle hover:border-line-strong",
  ghost:
    "bg-transparent text-fg hover:bg-subtle",
  destructive:
    "bg-error text-white hover:bg-error-700 active:bg-error-800 shadow-xs",
  link:
    "bg-transparent text-accent hover:text-accent-hover underline-offset-2 hover:underline px-0 h-auto",
};

const sizeClasses = {
  sm: "h-controlSm px-md text-bodySm gap-xs rounded-sm",
  md: "h-control px-lg text-body gap-sm rounded-md",
  lg: "h-controlLg px-xl text-body gap-sm rounded-md",
};

const Button = React.forwardRef(
  (
    {
      children,
      type = "button",
      className = "",
      onClick,
      disabled = false,
      loading = false,
      variant = "primary",
      size = "md",
      fullWidth = false,
      leadingIcon: LeadingIcon,
      trailingIcon: TrailingIcon,
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center font-medium select-none
          transition-[background-color,border-color,color,box-shadow,transform] duration-fast
          focus-visible:outline-none focus-visible:shadow-focus-ring
          active:scale-[0.99]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
          ${variantClasses[variant]}
          ${variant !== "link" ? sizeClasses[size] : ""}
          ${fullWidth ? "w-full" : ""}
          ${className}`}
        {...rest}
      >
        {loading ? (
          <>
            <Spinner size="sm" />
            <span>{typeof children === "string" ? children : "Loading"}</span>
          </>
        ) : (
          <>
            {LeadingIcon && <LeadingIcon className="h-4 w-4" aria-hidden />}
            {children}
            {TrailingIcon && <TrailingIcon className="h-4 w-4" aria-hidden />}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
