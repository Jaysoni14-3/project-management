import { ApiError, classifyByStatus, friendlyMessage } from "../lib/errors";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

/* Fetch wrapper hardening:
     - 30s timeout via AbortController so hung requests can't stall
       the UI forever (looking at you, cold-start Neon).
     - 401 → fire a single global "session expired" event the AuthContext
       listens for. Components don't have to do anything per-request.
     - Throws ApiError instances with a `kind` so consumers can
       discriminate (network / timeout / auth / forbidden / validation
       / conflict / server / etc).
     - Honors a caller-supplied AbortSignal by chaining it with the
       internal timeout signal (whichever fires first wins).
*/

const DEFAULT_TIMEOUT_MS = 30_000;

/* Single-shot global "session expired" event. The AuthContext (or a
   small listener at the layout level) subscribes once and decides
   what to do — typically log out and redirect to /login. We don't
   redirect here directly because apiClient shouldn't know about
   routing or the auth store. */
const SESSION_EXPIRED_EVENT = "app:session-expired";
let sessionExpiredFired = false;
const fireSessionExpired = () => {
  if (sessionExpiredFired) return;
  sessionExpiredFired = true;
  /* Reset the flag on the next tick so a future genuine session can
     also fire it. Otherwise after one expiry, no future re-login
     would re-arm it. */
  setTimeout(() => {
    sessionExpiredFired = false;
  }, 5_000);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
};

export const onSessionExpired = (handler) => {
  if (typeof window === "undefined") return () => {};
  const wrapped = () => handler();
  window.addEventListener(SESSION_EXPIRED_EVENT, wrapped);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, wrapped);
};

/* Combine an external AbortSignal with our timeout signal. The
   resulting controller aborts when either source aborts. */
const combineSignals = (external, timeoutMs) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (external) {
    if (external.aborted) {
      controller.abort();
    } else {
      external.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
};

const request = async (
  path,
  { method = "GET", body, headers, signal: externalSignal, timeoutMs, ...rest } = {}
) => {
  const { signal, cleanup } = combineSignals(
    externalSignal,
    timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  const opts = {
    method,
    credentials: "include",
    signal,
    headers: {
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(headers || {}),
    },
    ...rest,
  };
  if (body !== undefined) {
    opts.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, opts);
  } catch (err) {
    cleanup();
    if (err?.name === "AbortError") {
      /* Distinguish caller-cancelled vs our timeout. We can't tell
         them apart from the fetch result alone; default to "timeout"
         when the external signal wasn't already aborted. */
      const wasExternal = externalSignal?.aborted;
      throw new ApiError({
        kind: wasExternal ? "unknown" : "timeout",
        message: wasExternal ? "Request cancelled" : friendlyMessage("timeout"),
        cause: err,
      });
    }
    throw new ApiError({
      kind: "network",
      message: friendlyMessage("network"),
      cause: err,
    });
  }
  cleanup();

  if (res.status === 204) return null;

  let payload = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      payload = await res.json();
    } catch (err) {
      /* Server claimed JSON but sent garbage — surface as a server
         error rather than swallowing. */
      throw new ApiError({
        kind: "server",
        status: res.status,
        message: "Server sent a malformed response.",
        cause: err,
      });
    }
  } else {
    payload = await res.text();
  }

  if (!res.ok) {
    /* 401 fires the global session-expired event so the layout can
       react once instead of every component handling it. */
    if (res.status === 401) {
      fireSessionExpired();
    }

    const serverMessage =
      (payload && payload.error) ||
      (typeof payload === "string" && payload) ||
      null;
    const kind = classifyByStatus(res.status);
    let message =
      serverMessage ||
      friendlyMessage(kind) ||
      `Request failed (${res.status})`;
    if (Array.isArray(payload?.details) && payload.details.length > 0) {
      const issues = payload.details
        .map((d) => `${Array.isArray(d.path) ? d.path.join(".") : d.path}: ${d.message}`)
        .join(", ");
      message = `${message} — ${issues}`;
    }

    throw new ApiError({
      kind,
      status: res.status,
      code: payload?.code ?? null,
      details: payload?.details ?? null,
      requestId: payload?.requestId ?? null,
      message,
    });
  }

  return payload;
};

/**
 * Normalize a User object returned by the API so it matches the legacy
 * Firestore-style shape the existing components/forms expect:
 *   - `uid`     (alias of `id`)
 *   - `managerID` (legacy capital-ID, alias of `managerId`)
 */
export const normalizeUser = (u) =>
  u
    ? {
        ...u,
        uid: u.id,
        managerID: u.managerId ?? null,
      }
    : null;

export const normalizeUsers = (list) => (list || []).map(normalizeUser);

export const api = {
  get: (path, opts) => request(path, { ...(opts || {}), method: "GET" }),
  post: (path, body, opts) =>
    request(path, { ...(opts || {}), method: "POST", body }),
  patch: (path, body, opts) =>
    request(path, { ...(opts || {}), method: "PATCH", body }),
  put: (path, body, opts) =>
    request(path, { ...(opts || {}), method: "PUT", body }),
  delete: (path, opts) => request(path, { ...(opts || {}), method: "DELETE" }),
};

/**
 * Polling subscriber that mirrors Firestore's onSnapshot pattern but
 * also surfaces errors. Two callback shapes are supported for
 * backwards compatibility:
 *
 *   1. Legacy:  subscribe(fetcher, (data) => ...)
 *      → on success, callback(data); on error, callback([])
 *      Used by older hooks. Errors are swallowed.
 *
 *   2. New:     subscribe(fetcher, { onData, onError, intervalMs })
 *      → on success, onData(data); on error, onError(parsedError)
 *      Hooks should migrate to this shape so they can render proper
 *      error states.
 *
 * Includes simple exponential backoff on consecutive errors so a
 * down DB doesn't hammer the API every poll cycle.
 */
export const subscribe = (fetcher, callbackOrHandlers, intervalMs = 10000) => {
  const isHandlerObject =
    callbackOrHandlers &&
    typeof callbackOrHandlers === "object" &&
    !Array.isArray(callbackOrHandlers);

  const onData = isHandlerObject
    ? callbackOrHandlers.onData
    : callbackOrHandlers;
  const onError = isHandlerObject ? callbackOrHandlers.onError : null;
  const baseInterval = isHandlerObject
    ? callbackOrHandlers.intervalMs ?? intervalMs
    : intervalMs;

  let stopped = false;
  let consecutiveErrors = 0;
  let timer = null;

  const schedule = () => {
    if (stopped) return;
    /* Backoff capped at 60s so the UI eventually recovers fast when
       the backend comes back. */
    const delay = Math.min(
      baseInterval * Math.pow(2, Math.max(consecutiveErrors - 1, 0)),
      60_000
    );
    timer = setTimeout(tick, delay);
  };

  const tick = async () => {
    if (stopped) return;
    try {
      const data = await fetcher();
      if (stopped) return;
      consecutiveErrors = 0;
      onData?.(data);
    } catch (err) {
      if (stopped) return;
      consecutiveErrors += 1;
      if (onError) {
        onError(err);
      } else {
        /* Legacy path: emit empty list so existing hooks render an
           empty state. The new pattern (onError) is strictly better
           and should be preferred. */
        onData?.([]);
      }
    } finally {
      schedule();
    }
  };

  tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
};
