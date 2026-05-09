import React from "react";

const Input = React.forwardRef(
  (
    {
      label,
      id,
      type = "text",
      error,
      helperText,
      leadingIcon: LeadingIcon,
      trailingIcon: TrailingIcon,
      trailingSlot,
      disabled = false,
      className = "",
      wrapperClassName = "",
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
    const describedBy = error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined;

    return (
      <div className={`flex flex-col w-full mb-lg ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-fg-muted text-label mb-xs block"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {LeadingIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none">
              <LeadingIcon className="h-4 w-4" aria-hidden />
            </span>
          )}

          <input
            id={inputId}
            ref={ref}
            type={type}
            disabled={disabled}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={describedBy}
            className={`w-full h-control rounded-md border bg-surface text-body text-fg
              placeholder:text-fg-subtle
              transition-[border-color,box-shadow] duration-fast
              focus:outline-none
              disabled:bg-subtle disabled:text-fg-disabled disabled:cursor-not-allowed
              ${LeadingIcon ? "pl-9" : "pl-3"}
              ${TrailingIcon || trailingSlot ? "pr-9" : "pr-3"}
              ${
                error
                  ? "border-error focus:border-error focus:shadow-focus-ring-error"
                  : "border-line hover:border-line-strong focus:border-accent focus:shadow-focus-ring"
              }
              ${className}`}
            {...props}
          />

          {(TrailingIcon || trailingSlot) && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle">
              {trailingSlot ?? <TrailingIcon className="h-4 w-4" aria-hidden />}
            </span>
          )}
        </div>

        {error ? (
          <p id={`${inputId}-error`} className="text-caption text-error mt-xs">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-helper`} className="text-caption text-fg-subtle mt-xs">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
