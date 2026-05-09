import React from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  WifiOff,
  Lock,
  ShieldOff,
  FileQuestion,
  ServerCrash,
  RefreshCw,
  Home,
} from "lucide-react";

import Button from "../ui/Button";
import { parseError, errorTitle, errorBody } from "../../lib/errors";

const KIND_ICON = {
  network: WifiOff,
  timeout: ServerCrash,
  auth: Lock,
  forbidden: ShieldOff,
  notFound: FileQuestion,
  server: ServerCrash,
  unknown: AlertTriangle,
};

const KIND_TONE = {
  network: "bg-subtle text-fg-muted",
  timeout: "bg-warning-50 text-warning-700",
  auth: "bg-warning-50 text-warning-700",
  forbidden: "bg-warning-50 text-warning-700",
  notFound: "bg-subtle text-fg-muted",
  server: "bg-error-50 text-error-700",
  unknown: "bg-error-50 text-error-700",
};

/* Full-page error layout — used by error boundaries when a render
   blew up, and by dedicated 404/403/500 routes. Centered card so it
   reads as "this page failed" rather than "something tiny went
   wrong." Always offers a way out (retry / go home). */
const FullPageError = ({
  error,
  title,
  description,
  onRetry,
  retryLabel = "Try again",
  homeHref = "/",
  homeLabel = "Go to dashboard",
  showHome = true,
  errorId,
}) => {
  const e = parseError(error);
  const Icon = KIND_ICON[e.kind] || KIND_ICON.unknown;
  const tone = KIND_TONE[e.kind] || KIND_TONE.unknown;

  const headline = title || errorTitle(e);
  const body = description || errorBody(e);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-lg py-3xl">
      <div className="w-full max-w-[560px] flex flex-col items-center text-center">
        <div
          className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-lg ${tone}`}
        >
          <Icon className="h-7 w-7" aria-hidden />
        </div>

        <h1 className="text-display text-fg mb-sm">{headline}</h1>
        <p className="text-body text-fg-muted max-w-prose mb-lg">{body}</p>

        {(e.status || e.code || errorId) && (
          <p className="text-caption text-fg-subtle font-mono mb-lg">
            {[
              e.kind !== "unknown" && e.kind,
              e.status && `HTTP ${e.status}`,
              e.code,
              errorId && `id ${errorId}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}

        <div className="flex flex-wrap gap-sm justify-center">
          {onRetry && (
            <Button leadingIcon={RefreshCw} onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
          {showHome && (
            <Link
              to={homeHref}
              className="inline-flex items-center justify-center gap-sm h-control px-lg rounded-md
                bg-surface text-fg border border-line text-body font-medium
                hover:bg-subtle hover:border-line-strong
                transition-colors duration-fast"
            >
              <Home className="h-4 w-4" aria-hidden />
              {homeLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullPageError;
