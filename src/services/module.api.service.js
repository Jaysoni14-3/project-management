import { api, subscribe } from "./apiClient";

export const listenToProjectModules = (projectId, callback) => {
  if (!projectId) {
    callback([]);
    return () => {};
  }
  return subscribe(
    () => api.get(`/api/projects/${projectId}/modules`),
    callback
  );
};

export const listenToAllModules = (filters, callback) => {
  const qs = new URLSearchParams();
  if (filters?.assigneeId) qs.set("assigneeId", filters.assigneeId);
  if (filters?.status) qs.set("status", filters.status);
  if (filters?.projectId) qs.set("projectId", filters.projectId);
  if (filters?.mine) qs.set("mine", "1");
  const path = `/api/modules${qs.toString() ? `?${qs.toString()}` : ""}`;
  return subscribe(() => api.get(path), callback);
};

export const listenToMyModules = (callback) =>
  listenToAllModules({ mine: true }, callback);

export const getModule = (moduleId) => api.get(`/api/modules/${moduleId}`);

export const createModule = (projectId, data) =>
  api.post(`/api/projects/${projectId}/modules`, data);

export const updateModule = (moduleId, patch) =>
  api.patch(`/api/modules/${moduleId}`, patch);

export const deleteModule = (moduleId) =>
  api.delete(`/api/modules/${moduleId}`);
