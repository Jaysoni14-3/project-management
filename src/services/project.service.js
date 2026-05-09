import * as fb from "./project.firebase.service";
import * as api from "./project.api.service";

const impl = import.meta.env.VITE_BACKEND === "api" ? api : fb;

export const listenToProjects = (...args) => impl.listenToProjects(...args);
export const getProject = (...args) => impl.getProject(...args);
export const listenToProject = (...args) => impl.listenToProject(...args);
export const createProject = (...args) => impl.createProject(...args);
export const updateProject = (...args) => impl.updateProject(...args);
export const patchProject = (...args) => impl.patchProject(...args);
export const deleteProject = (...args) => impl.deleteProject(...args);
