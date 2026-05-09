import { AppError } from "../lib/errors.js";

/* Centralised error responder. Goals:
     - Every error response has `{ error, code, requestId }` at minimum
       so the client can render a useful message + the user can quote
       the id when reporting a bug.
     - AppError instances pass through with their status/code/details.
     - Prisma-known error codes get translated to friendly HTTP statuses.
     - Body-parser/JSON syntax errors return 400 instead of leaking a
       generic 500.
     - Anything else is logged with the request id and returns a generic
       500 — we don't leak stack traces or implementation details. */
export const errorHandler = (err, req, res, _next) => {
  const requestId = req.id ?? null;

  /* AppError — controlled errors thrown by route handlers. */
  if (err instanceof AppError) {
    const body = { error: err.message, requestId };
    if (err.code) body.code = err.code;
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  /* express.json() throws SyntaxError when the body is malformed. The
     request never reached our route handlers; bounce with 400. */
  if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({
      error: "Request body is not valid JSON.",
      code: "BAD_JSON",
      requestId,
    });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      error: "Request body is too large.",
      code: "PAYLOAD_TOO_LARGE",
      requestId,
    });
  }

  /* Prisma error codes — see https://www.prisma.io/docs/reference/api-reference/error-reference

     Two error classes carry codes on different fields:
       - PrismaClientKnownRequestError → `err.code`
       - PrismaClientInitializationError → `err.errorCode`
     We check both so connection failures (P1001/P1002) caught at
     init time also map to a 503 instead of leaking through as 500. */
  const prismaCode = err?.code ?? err?.errorCode ?? null;
  switch (prismaCode) {
    case "P2002":
      return res.status(409).json({
        error: "That resource already exists.",
        code: "DUPLICATE",
        details: err?.meta?.target ?? null,
        requestId,
      });
    case "P2003":
      return res.status(409).json({
        error: "Can't complete: it's still referenced elsewhere.",
        code: "FOREIGN_KEY_CONSTRAINT",
        details: err?.meta?.field_name ?? null,
        requestId,
      });
    case "P2025":
      return res.status(404).json({
        error: "Not found.",
        code: "NOT_FOUND",
        requestId,
      });
    case "P2014":
      return res.status(409).json({
        error: "That change would violate a relation.",
        code: "RELATION_VIOLATION",
        requestId,
      });
    case "P2000":
      return res.status(400).json({
        error: "A field value is too long.",
        code: "VALUE_TOO_LONG",
        details: err?.meta?.column_name ?? null,
        requestId,
      });
    case "P1001":
    case "P1002":
    case "P1008":
    case "P1017":
      return res.status(503).json({
        error: "Database is unreachable. Try again in a moment.",
        code: "DB_UNAVAILABLE",
        requestId,
      });
    default:
      break;
  }

  /* Last-resort connection-failure detection. Some Prisma errors
     don't carry a code (e.g., the underlying Postgres driver throws
     ECONNREFUSED before Prisma classifies it). Match by class name +
     message so we still return a friendly 503 instead of 500. */
  const errName = err?.name || "";
  const errMessage = err?.message || "";
  if (
    errName === "PrismaClientInitializationError" ||
    /Can't reach database server|Connection refused|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(
      errMessage
    )
  ) {
    console.error(`[${requestId ?? "no-req-id"}] DB unreachable:`, errName, errMessage);
    return res.status(503).json({
      error: "Database is unreachable. Try again in a moment.",
      code: "DB_UNAVAILABLE",
      requestId,
    });
  }

  console.error(`[${requestId ?? "no-req-id"}]`, err);
  res.status(500).json({
    error: "Internal server error.",
    code: "INTERNAL",
    requestId,
  });
};

/* 404 handler for any URL the router didn't match. Mounted AFTER all
   routes and BEFORE errorHandler so unknown paths return a structured
   404 instead of express's bare HTML default. */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND",
    requestId: req.id ?? null,
  });
};
