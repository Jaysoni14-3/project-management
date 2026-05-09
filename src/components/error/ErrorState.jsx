import React from "react";
import {
  AlertTriangle,
  WifiOff,
  Clock,
  Lock,
  ShieldOff,
  ServerCrash,
  FileQuestion,
  RefreshCw,
} from "lucide-react";

import Button from "../ui/Button";
import { parseError, errorTitle, errorBody, formatValidationDetails } from "../../lib/errors";

/* Inline error block — drop this anywhere a list/card/section failed
   to load. Mirrors the EmptyState shape so it slots into the same
   layout slots without weird gaps. The icon + tone shift to match the
   error kind so users get an instant visual cue (red for server, gray
   for network, amber for auth/permission, etc.). */

const KIND_ICON = {
  network: WifiOff,
  timeout: Clock,
  auth: Lock,
  forbidden: ShieldOff,
  notFound: FileQuestion,
  validation: AlertTriangle,
  conflict: AlertTriangle,
  rate_limit: Clock,
  server: ServerCrash,
  unknown: AlertTriangle,
};

const KIND_TONE = {
  network: "bg-subtle text-fg-muted",
  timeout: "bg-warning-50 text-warning-700",
  auth: "bg-warning-50 text-warning-700",
  forbidden: "bg-warning-50 text-warning-700",
  notFound: "bg-subtle text-fg-muted",
  validation: "bg-warning-50 text-warning-700",
  conflict: "bg-warning-50 text-warning-700",
  rate_limit: "bg-warning-50 text-warning-700",
  server: "bg-error-50 text-error-700",
  unknown: "bg-error-50 text-error-700",
};

const ErrorState = ({
  error,
  title,
  description,
  onRetry,
  retryLabel = "Try again",
  action,
  className = "",
  compact = false,
}) => {
  const e = parseError(error);
  const Icon = KIND_ICON[e.kind] || KIND_ICON.unknown;
  const tone = KIND_TONE[e.kind] || KIND_TONE.unknown;
  const fields = formatValidationDetails(e);

  const headline = title || errorTitle(e);
  const body = description || errorBody(e);

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center text-center
        ${compact ? "py-xl px-lg" : "py-3xl px-xl"}
        rounded-lg border border-line-subtle bg-surface ${className}`}
    >
      <div
        className={`h-12 w-12 rounded-lg flex items-center justify-center mb-md ${tone}`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="text-section text-fg mb-xs">{headline}</h3>
      <p className="text-bodySm text-fg-muted max-w-prose mb-md">{body}</p>

      {fields && fields.length > 0 && (
        <ul className="text-caption text-error-700 mb-md max-w-prose">
          {fields.map((f, i) => (
            <li key={i}>
              <span className="font-medium">{f.field}:</span> {f.message}
            </li>
          ))}
        </ul>
      )}

      {(e.status || e.code) && (
        <p className="text-caption text-fg-subtle font-mono mb-md">
          {[e.kind, e.status && `HTTP ${e.status}`, e.code]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      <div className="flex gap-sm">
        {onRetry && (
          <Button
            variant="secondary"
            leadingIcon={RefreshCw}
            onClick={onRetry}
          >
            {retryLabel}
          </Button>
        )}
        {action}
      </div>
    </div>
  );
};

export default ErrorState;
