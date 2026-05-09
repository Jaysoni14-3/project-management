import * as fb from "./module.firebase.service";
import * as api from "./module.api.service";

const impl = import.meta.env.VITE_BACKEND === "api" ? api : fb;

export const listenToProjectModules = (...args) =>
  impl.listenToProjectModules(...args);
export const listenToAllModules = (...args) => impl.listenToAllModules(...args);
export const listenToMyModules = (...args) => impl.listenToMyModules(...args);
export const getModule = (...args) => impl.getModule(...args);
export const createModule = (...args) => impl.createModule(...args);
export const updateModule = (...args) => impl.updateModule(...args);
export const deleteModule = (...args) => impl.deleteModule(...args);
