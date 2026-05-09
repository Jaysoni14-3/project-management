import * as fb from "./employee.firebase.service";
import * as api from "./employee.api.service";

const impl = import.meta.env.VITE_BACKEND === "api" ? api : fb;

export const getAllEmployees = (...args) => impl.getAllEmployees(...args);
export const listenToEmployees = (...args) => impl.listenToEmployees(...args);
export const getUser = (...args) => impl.getUser(...args);
export const listenToUser = (...args) => impl.listenToUser(...args);
export const syncUserProjects = (...args) => impl.syncUserProjects(...args);
export const removeUserFromAllProjects = (...args) => impl.removeUserFromAllProjects(...args);
export const deleteUser = (...args) => impl.deleteUser(...args);
