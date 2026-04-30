import React from "react";

/**
 * Single hairline-bordered surface. Use as a card, panel, or section.
 * - Default: flat (border-line, no shadow). Add `interactive` for hover lift.
 * - Composed with optional `header`, `footer` slots.
 * - `padded={false}` removes inner padding for custom layouts.
 */
const Card = React.forwardRef(
  (
    {
      children,
      header,
      footer,
      padded = true,
      interactive = false,
      onClick,
      className = "",
      ...rest
    },
    ref
  ) => {
    const isClickable = !!onClick;

    return (
      <div
        ref={ref}
        onClick={onClick}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        className={`bg-surface border border-line rounded-lg
          ${interactive || isClickable ? "transition-[box-shadow,border-color,transform] duration-fast hover:border-line-strong hover:shadow-md cursor-pointer" : ""}
          ${className}`}
        {...rest}
      >
        {header && (
          <div className="px-lg py-md border-b border-line-subtle flex items-center justify-between gap-md">
            {header}
          </div>
        )}
        <div className={padded && !header && !footer ? "p-lg" : padded ? "px-lg py-md" : ""}>
          {children}
        </div>
        {footer && (
          <div className="px-lg py-md border-t border-line-subtle">{footer}</div>
        )}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
