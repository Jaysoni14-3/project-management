import { api, subscribe } from "./apiClient";

export const listenToProjects = (user, role, callback) => {
  return subscribe(() => api.get("/api/projects"), callback);
};

export const getProject = (projectId) => api.get(`/api/projects/${projectId}`);

export const listenToProject = (projectId, callback) => {
  if (!projectId) {
    callback(null);
    return () => {};
  }
  return subscribe(
    () => api.get(`/api/projects/${projectId}`),
    callback
  );
};

export const createProject = async (project, adminUid) => {
  const created = await api.post("/api/projects", project);
  return { docRef: { id: created.id }, syncFailures: [] };
};

export const updateProject = async (projectId, data) => {
  await api.patch(`/api/projects/${projectId}`, data);
  return { syncFailures: [] };
};

export const patchProject = async (projectId, patch) => {
  await api.patch(`/api/projects/${projectId}`, patch);
};

export const deleteProject = async (projectId) => {
  await api.delete(`/api/projects/${projectId}`);
  return { syncFailures: [] };
};
