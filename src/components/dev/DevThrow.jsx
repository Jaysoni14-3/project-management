import { useSearchParams } from "react-router-dom";

import { ApiError } from "../../lib/errors";

/* Dev-only render-error trigger. Mount inside a RouteErrorBoundary so
   `?dev_throw=…` on any route fires a synthetic error and exercises
   the boundary's fallback UI without requiring real failures.

   Variants:
     ?dev_throw=1            → generic Error (boundary's default UI)
     ?dev_throw=network      → ApiError kind=network
     ?dev_throw=timeout      → ApiError kind=timeout
     ?dev_throw=auth         → ApiError kind=auth (401)
     ?dev_throw=forbidden    → ApiError kind=forbidden (403)
     ?dev_throw=notFound     → ApiError kind=notFound (404)
     ?dev_throw=validation   → ApiError kind=validation (400)
     ?dev_throw=server       → ApiError kind=server (500)

   Tree-shaken out of production builds via `import.meta.env.DEV`. */
const KINDS = new Set([
  "network",
  "timeout",
  "auth",
  "forbidden",
  "notFound",
  "validation",
  "conflict",
  "rate_limit",
  "server",
]);

const STATUS_BY_KIND = {
  auth: 401,
  forbidden: 403,
  notFound: 404,
  validation: 400,
  conflict: 409,
  rate_limit: 429,
  server: 500,
};

const DevThrow = () => {
  /* Hard-disabled in production builds. Vite replaces import.meta.env.DEV
     with `false` in `npm run build`, and the dead code is dropped. */
  if (!import.meta.env.DEV) return null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [params] = useSearchParams();
  const trigger = params.get("dev_throw");
  if (!trigger) return null;

  if (trigger === "1" || trigger === "true") {
    throw new Error(
      "dev_throw=1: synthetic render error (test the error boundary)"
    );
  }

  if (KINDS.has(trigger)) {
    throw new ApiError({
      kind: trigger,
      status: STATUS_BY_KIND[trigger] ?? null,
      message: `dev_throw=${trigger}: synthetic ${trigger} error for boundary testing`,
      requestId: "dev-throw",
    });
  }

  /* Unknown trigger value — log a hint instead of silently doing
     nothing so the dev knows their URL is wrong. */
  // eslint-disable-next-line no-console
  console.warn(
    `[DevThrow] Unknown trigger "${trigger}". Use ?dev_throw=1 for generic, or one of: ${[
      ...KINDS,
    ].join(", ")}`
  );
  return null;
};

export default DevThrow;
