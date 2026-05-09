const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * Thin fetch wrapper:
 *  - Sends + receives the auth cookie (credentials: "include")
 *  - JSON in / JSON out by default
 *  - Throws an Error on non-2xx with the server's error message
 */
const request = async (path, { method = "GET", body, headers, ...rest } = {}) => {
  const opts = {
    method,
    credentials: "include",
    headers: {
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(headers || {}),
    },
    ...rest,
  };
  if (body !== undefined) {
    opts.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const res = await fetch(`${API_URL}${path}`, opts);

  if (res.status === 204) return null;

  let payload = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    payload = await res.json();
  } else {
    payload = await res.text();
  }

  if (!res.ok) {
    let message =
      (payload && payload.error) ||
      (typeof payload === "string" && payload) ||
      `Request failed (${res.status})`;
    if (Array.isArray(payload?.details) && payload.details.length > 0) {
      const issues = payload.details
        .map((d) => `${d.path}: ${d.message}`)
        .join(", ");
      message = `${message} — ${issues}`;
    }
    const err = new Error(message);
    err.status = res.status;
    err.details = payload?.details;
    throw err;
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
  post: (path, body, opts) => request(path, { ...(opts || {}), method: "POST", body }),
  patch: (path, body, opts) => request(path, { ...(opts || {}), method: "PATCH", body }),
  put: (path, body, opts) => request(path, { ...(opts || {}), method: "PUT", body }),
  delete: (path, opts) => request(path, { ...(opts || {}), method: "DELETE" }),
};

/**
 * Mimic Firestore's onSnapshot pattern: fetch immediately, then poll on an
 * interval. Returns an unsubscribe function. Used by the api.service files
 * so consumers (hooks) don't need to change.
 */
export const subscribe = (fetcher, callback, intervalMs = 10000) => {
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    try {
      const data = await fetcher();
      if (!stopped) callback(data);
    } catch (err) {
      if (!stopped) {
        console.error("subscribe poll failed:", err);
        callback([]);
      }
    }
  };

  tick();
  const id = setInterval(tick, intervalMs);

  return () => {
    stopped = true;
    clearInterval(id);
  };
};
