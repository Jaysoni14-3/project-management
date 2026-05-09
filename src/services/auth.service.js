import * as fb from "./auth.firebase.service";
import * as api from "./auth.api.service";

const impl = import.meta.env.VITE_BACKEND === "api" ? api : fb;

export const onAuthChange = (...args) => impl.onAuthChange(...args);
export const login = (...args) => impl.login(...args);
export const logout = (...args) => impl.logout(...args);
export const updateMyProfile = (...args) => impl.updateMyProfile(...args);
export const changeMyPassword = (...args) => impl.changeMyPassword(...args);
export const createUserAccount = (...args) => impl.createUserAccount(...args);
/* Impersonation is API-only. Pass through directly. */
export const impersonateUser = (...args) => api.impersonateUser(...args);
export const stopImpersonating = (...args) => api.stopImpersonating(...args);
