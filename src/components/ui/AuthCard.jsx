import React from "react";

const AuthCard = ({ title, subtitle, children, footer }) => {
  return (
    <div className="w-full max-w-narrow">
      {(title || subtitle) && (
        <div className="text-center mb-xl">
          {title && (
            <h1 className="text-page text-fg mb-xs">{title}</h1>
          )}
          {subtitle && (
            <p className="text-bodySm text-fg-muted">{subtitle}</p>
          )}
        </div>
      )}

      <div className="bg-surface border border-line rounded-lg shadow-sm p-xl">
        {children}
      </div>

      {footer && (
        <p className="text-bodySm text-fg-muted text-center mt-lg">
          {footer}
        </p>
      )}
    </div>
  );
};

export default AuthCard;
