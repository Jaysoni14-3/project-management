import { api, subscribe, normalizeUser, normalizeUsers } from "./apiClient";

export const getAllEmployees = async () => {
  const list = await api.get("/api/users");
  return normalizeUsers(list);
};

export const listenToEmployees = (callback) =>
  subscribe(
    () => api.get("/api/users"),
    (list) => callback(normalizeUsers(list))
  );

export const getUser = async (id) => {
  const u = await api.get(`/api/users/${id}`);
  return normalizeUser(u);
};

export const listenToUser = (id, callback) => {
  if (!id) {
    callback(null);
    return () => {};
  }
  return subscribe(
    () => api.get(`/api/users/${id}`),
    (u) => callback(normalizeUser(u))
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
