import * as fb from "./dashboard.firebase.service";
import * as api from "./dashboard.api.service";

const impl = import.meta.env.VITE_BACKEND === "api" ? api : fb;

export const getManagers = (...args) => impl.getManagers(...args);
export const getDashboardStats = (...args) => impl.getDashboardStats(...args);
export const listenToTaskCounts = (...args) => impl.listenToTaskCounts(...args);
export const listenToBugCounts = (...args) => impl.listenToBugCounts(...args);
export const listenToMeetingNotesCount = (...args) => impl.listenToMeetingNotesCount(...args);
/* API-only — no Firebase counterpart. Pass through directly. */
export const listenToBugTrend = (...args) => api.listenToBugTrend(...args);
export const listenToWorkload = (...args) => api.listenToWorkload(...args);
