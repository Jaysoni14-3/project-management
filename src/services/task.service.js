import * as fb from "./task.firebase.service";
import * as api from "./task.api.service";

const impl = import.meta.env.VITE_BACKEND === "api" ? api : fb;

export const listenToTasks = (...args) => impl.listenToTasks(...args);
export const listenToAllTasks = (...args) => impl.listenToAllTasks(...args);
export const createTask = (...args) => impl.createTask(...args);
export const updateTask = (...args) => impl.updateTask(...args);
export const patchTask = (...args) => impl.patchTask(...args);
export const deleteTask = (...args) => impl.deleteTask(...args);

/* Checklist features are API-only; pass through to the api impl
   regardless of which backend the rest of the task service is using. */
export const addChecklistItem = (...args) => api.addChecklistItem(...args);
export const updateChecklistItem = (...args) => api.updateChecklistItem(...args);
export const deleteChecklistItem = (...args) => api.deleteChecklistItem(...args);
