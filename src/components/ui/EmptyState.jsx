import React from "react";

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-3xl px-xl
        rounded-lg border border-line-subtle bg-surface
        ${className}`}
    >
      {Icon && (
        <div className="h-12 w-12 rounded-lg bg-subtle text-fg-subtle flex items-center justify-center mb-md">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      )}
      {title && (
        <h3 className="text-section text-fg mb-xs">{title}</h3>
      )}
      {description && (
        <p className="text-bodySm text-fg-muted max-w-prose mb-lg">
          {description}
        </p>
      )}
      {action && <div className="flex gap-sm">{action}</div>}
    </div>
  );
};

export default EmptyState;
