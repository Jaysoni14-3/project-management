/* =============================================================
   Single point of error/warning logging.

   Every catch block in the app should call `logger.error(scope, err,
   meta?)` instead of `console.error` directly. Reasons:
     - Consistent format with a scope tag, so origins are easy to grep
     - Prefixed with a request id when available
     - One place to plug Sentry / Datadog / a custom endpoint later
       without touching call sites

   `scope` is a short identifier like "useBugs" or "ProjectFormModal"
   so log lines read as `[useBugs] something failed { meta }`. Keep
   them stable — they become breadcrumb tags.
============================================================= */

import { parseError } from "./errors";

/* Allow consumers to install a handler (e.g. Sentry's
   `captureException`). The default is a no-op so the logger is safe
   to call before any handler is attached. */
let externalReporter = null;

export const installErrorReporter = (fn) => {
  externalReporter = typeof fn === "function" ? fn : null;
};

const emit = (level, scope, err, meta) => {
  const e = err ? parseError(err) : null;
  const tag = scope ? `[${scope}]` : "";
  const fields = {
    kind: e?.kind,
    status: e?.status,
    code: e?.code,
    ...meta,
  };
  /* Strip undefined/null so dev console output is tidy. */
  const clean = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v != null)
  );

  // eslint-disable-next-line no-console
  const out = console[level] || console.log;
  if (e) {
    out(tag, e.message, clean, e.cause || e);
  } else {
    out(tag, clean);
  }

  if (externalReporter && level === "error" && e) {
    try {
      externalReporter(e, { scope, ...clean });
    } catch (reporterErr) {
      // eslint-disable-next-line no-console
      console.warn("[logger] reporter failed:", reporterErr);
    }
  }
};

const logger = {
  debug: (scope, meta) => emit("debug", scope, null, meta),
  info: (scope, meta) => emit("info", scope, null, meta),
  warn: (scope, err, meta) => emit("warn", scope, err, meta),
  error: (scope, err, meta) => emit("error", scope, err, meta),
};

export default logger;
