import * as fb from "./comment.firebase.service";
import * as api from "./comment.api.service";

const impl = import.meta.env.VITE_BACKEND === "api" ? api : fb;

export const listenToComments = (...args) => impl.listenToComments(...args);
export const createComment = (...args) => impl.createComment(...args);
export const updateComment = (...args) => impl.updateComment(...args);
export const deleteComment = (...args) => impl.deleteComment(...args);
