import { api, subscribe } from "./apiClient";

export const listenToTasks = (projectId, callback) => {
  if (!projectId) {
    callback([]);
    return () => {};
  }
  return subscribe(() => api.get(`/api/projects/${projectId}/tasks`), callback);
};

export const listenToAllTasks = (callback) =>
  subscribe(() => api.get("/api/tasks"), callback);

export const createTask = async (projectId, data, creator) => {
  const task = await api.post(`/api/projects/${projectId}/tasks`, data);
  return { id: task.id };
};

export const updateTask = async (projectId, taskId, data) => {
  await api.patch(`/api/tasks/${taskId}`, data);
};

export const patchTask = async (projectId, taskId, patch) => {
  await api.patch(`/api/tasks/${taskId}`, patch);
};

export const deleteTask = async (projectId, taskId) => {
  await api.delete(`/api/tasks/${taskId}`);
};

/* Checklist CRUD. The item is the unit of mutation; the task fetches
   already include `checklistItems` so callers don't usually need a
   separate "list items" call. */
export const addChecklistItem = (taskId, text) =>
  api.post(`/api/tasks/${taskId}/checklist`, { text });

export const updateChecklistItem = (itemId, patch) =>
  api.patch(`/api/checklist/${itemId}`, patch);

export const deleteChecklistItem = (itemId) =>
  api.delete(`/api/checklist/${itemId}`);
