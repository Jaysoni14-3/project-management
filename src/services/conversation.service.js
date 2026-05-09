import * as fb from "./conversation.firebase.service";
import * as api from "./conversation.api.service";

const impl = import.meta.env.VITE_BACKEND === "api" ? api : fb;

export const listConversations = (...args) => impl.listConversations(...args);
export const getConversation = (...args) => impl.getConversation(...args);
export const findOrCreateDm = (...args) => impl.findOrCreateDm(...args);
export const listMessages = (...args) => impl.listMessages(...args);
export const sendMessage = (...args) => impl.sendMessage(...args);
export const editMessage = (...args) => impl.editMessage(...args);
export const deleteMessage = (...args) => impl.deleteMessage(...args);
export const toggleLike = (...args) => impl.toggleLike(...args);
export const searchMessages = (...args) => impl.searchMessages(...args);
export const markRead = (...args) => impl.markRead(...args);
