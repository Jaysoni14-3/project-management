import { api, subscribe, normalizeUser, normalizeUsers } from "./apiClient";

/* Forward to subscribe() in either shape:
   - legacy plain callback: `(data) => ...`
   - new handlers object:   `{ onData, onError, intervalMs }`
   Without this branch, an `{ onData, onError }` arg gets wrapped in
   `(list) => callback(normalize(list))` which then tries to invoke an
   object as a function — silently throws and `loading` never flips. */
const wrapHandlers = (handlers, transform) => {
  if (handlers && typeof handlers === "object" && !Array.isArray(handlers)) {
    return {
      ...handlers,
      onData: (data) => handlers.onData?.(transform(data)),
    };
  }
  return (data) => handlers(transform(data));
};

export const getAllEmployees = async () => {
  const list = await api.get("/api/users");
  return normalizeUsers(list);
};

export const listenToEmployees = (handlers) =>
  subscribe(() => api.get("/api/users"), wrapHandlers(handlers, normalizeUsers));

export const getUser = async (id) => {
  const u = await api.get(`/api/users/${id}`);
  return normalizeUser(u);
};

export const listenToUser = (id, handlers) => {
  if (!id) {
    if (typeof handlers === "function") handlers(null);
    else handlers?.onData?.(null);
    return () => {};
  }
  return subscribe(
    () => api.get(`/api/users/${id}`),
    wrapHandlers(handlers, normalizeUser)
  );
};

/**
 * Bi-directional project sync:
 *  - Add the user to memberIds on each newly-assigned project
 *  - Remove the user from memberIds on each de-assigned project
 * The project_member rows are the single source of truth in the new schema.
 */
export const syncUserProjects = async (
  userId,
  oldProjects = [],
  newProjects = []
) => {
  const oldIds = new Set(oldProjects.map((p) => p.id));
  const newIds = new Set(newProjects.map((p) => p.id));

  const added = newProjects.filter((p) => !oldIds.has(p.id));
  const removed = oldProjects.filter((p) => !newIds.has(p.id));

  await Promise.all([
    ...added.map((p) =>
      api.post(`/api/projects/${p.id}/members`, { userId, role: "member" })
    ),
    ...removed.map((p) =>
      api.delete(`/api/projects/${p.id}/members/${userId}`)
    ),
  ]);
};

/**
 * Cascade-on-delete in the database removes ProjectMember rows automatically
 * when a user is deleted, so this becomes a no-op in API mode.
 */
export const removeUserFromAllProjects = async () => {};

export const deleteUser = async (userId) => {
  await api.delete(`/api/users/${userId}`);
};
