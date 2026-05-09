/* =============================================================
   Centralized error model for the frontend.

   Goal: every error in the app has a stable shape, a category, a
   human-readable message, and a place to render. Components don't
   inspect raw fetch errors — they look at `kind` and decide what UI
   to show.

   Categories (kind):
     - network    → no internet / offline / server unreachable
     - timeout    → fetch was aborted by our 30s timeout
     - auth       → 401, session expired
     - forbidden  → 403, missing permissions
     - notFound   → 404
     - validation → 400, structured field errors from Zod
     - conflict   → 409
     - rate_limit → 429
     - server     → 5xx
     - unknown    → anything else

   Use `parseError(err)` to normalize anything (Error, ApiError, Response,
   string) into an ApiError instance. Components can then read
   `.kind`, `.message`, `.status`, `.details`, `.code`.
============================================================= */

export class ApiError extends Error {
  constructor({
    kind = "unknown",
    message = "Something went wrong",
    status = null,
    code = null,
    details = null,
    requestId = null,
    cause = null,
  } = {}) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.cause = cause;
  }
}

const KIND_BY_STATUS = {
  400: "validation",
  401: "auth",
  403: "forbidden",
  404: "notFound",
  409: "conflict",
  413: "validation",
  422: "validation",
  429: "rate_limit",
};

const FRIENDLY_BY_KIND = {
  network:
    "Can't reach the server. Check your internet connection and try again.",
  timeout: "The request took too long. Please try again.",
  auth: "Your session has expired. Please sign in again.",
  forbidden: "You don't have permission to do that.",
  notFound: "We couldn't find what you were looking for.",
  validation: "Some details look off. Check the form and try again.",
  conflict: "That conflicts with existing data.",
  rate_limit: "You're going a bit fast — slow down and try again.",
  server: "Our server hit an error. We're looking into it.",
  unknown: "Something went wrong.",
};

export const friendlyMessage = (kind) =>
  FRIENDLY_BY_KIND[kind] || FRIENDLY_BY_KIND.unknown;

export const classifyByStatus = (status) => {
  if (!status) return "unknown";
  if (KIND_BY_STATUS[status]) return KIND_BY_STATUS[status];
  if (status >= 500) return "server";
  if (status >= 400) return "unknown";
  return "unknown";
};

/* Normalize any thrown thing into an ApiError. Idempotent — ApiError
   inputs pass through. The function never throws; it always returns
   a valid ApiError so callers can render without further checks. */
export const parseError = (err) => {
  if (err instanceof ApiError) return err;

  /* AbortController triggered by our timeout. */
  if (err?.name === "AbortError") {
    return new ApiError({
      kind: "timeout",
      message: friendlyMessage("timeout"),
      cause: err,
    });
  }

  /* Browser fetch network failure (DNS, no internet, CORS preflight
     blocked). These show up as TypeError with "Failed to fetch". */
  if (
    err instanceof TypeError &&
    /Failed to fetch|Network|NetworkError/i.test(err.message || "")
  ) {
    return new ApiError({
      kind: "network",
      message: friendlyMessage("network"),
      cause: err,
    });
  }

  if (err && typeof err === "object" && err.status) {
    const kind = classifyByStatus(err.status);
    return new ApiError({
      kind,
      status: err.status,
      code: err.code ?? null,
      details: err.details ?? null,
      message: err.message || friendlyMessage(kind),
      cause: err,
    });
  }

  if (err instanceof Error) {
    return new ApiError({ message: err.message, cause: err });
  }

  if (typeof err === "string") {
    return new ApiError({ message: err });
  }

  return new ApiError({ message: friendlyMessage("unknown") });
};

/* For UIs that want a one-line summary that's appropriate to show in
   a toast or error state. Falls back to friendly defaults but keeps
   any specific server message when present. */
export const errorTitle = (err) => {
  const e = parseError(err);
  switch (e.kind) {
    case "network":
      return "Network problem";
    case "timeout":
      return "Request timed out";
    case "auth":
      return "Signed out";
    case "forbidden":
      return "Permission denied";
    case "notFound":
      return "Not found";
    case "validation":
      return "Couldn't save";
    case "conflict":
      return "Already exists";
    case "rate_limit":
      return "Too many requests";
    case "server":
      return "Server error";
    default:
      return "Something went wrong";
  }
};

export const errorBody = (err) => {
  const e = parseError(err);
  return e.message || friendlyMessage(e.kind);
};

/* Pretty-print field-level validation errors when the server returns
   them as `details: [{ path, message }]`. Returns `null` if there
   aren't any. */
export const formatValidationDetails = (err) => {
  const e = parseError(err);
  if (!Array.isArray(e.details)) return null;
  return e.details.map((d) => ({
    field: Array.isArray(d.path) ? d.path.join(".") : String(d.path ?? ""),
    message: d.message || "",
  }));
};
