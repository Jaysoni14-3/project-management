import * as fb from "./bug.firebase.service";
import * as api from "./bug.api.service";

const impl = import.meta.env.VITE_BACKEND === "api" ? api : fb;

export const listenToBugs = (...args) => impl.listenToBugs(...args);
export const listenToAllBugs = (...args) => impl.listenToAllBugs(...args);
export const listenToRecentBugs = (...args) => impl.listenToRecentBugs(...args);
export const createBug = (...args) => impl.createBug(...args);
export const updateBug = (...args) => impl.updateBug(...args);
export const patchBug = (...args) => impl.patchBug(...args);
export const deleteBug = (...args) => impl.deleteBug(...args);
