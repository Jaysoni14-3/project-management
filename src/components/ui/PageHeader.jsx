import React from "react";

/**
 * Top-of-page header. Sits flush on canvas — NO border, NO shadow.
 * Use whitespace + typography for separation, not boxes.
 */
const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}) => {
  return (
    <header
      className={`flex flex-col gap-md md:flex-row md:items-end md:justify-between mb-xl ${className}`}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-eyebrow uppercase text-fg-subtle mb-xs">
            {eyebrow}
          </p>
        )}
        {title && (
          <h1 className="text-page text-fg truncate">{title}</h1>
        )}
        {description && (
          <p className="text-bodySm text-fg-muted mt-xs max-w-prose">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-sm shrink-0">{actions}</div>
      )}
    </header>
  );
};

export default PageHeader;
