import { api } from "./apiClient";

export const listConversations = () => api.get("/api/conversations");

export const getConversation = (id) => api.get(`/api/conversations/${id}`);

export const findOrCreateDm = (peerUserId) =>
  api.post("/api/conversations/dm", { peerUserId });

export const listMessages = (conversationId, { before, limit = 50 } = {}) => {
  const qs = new URLSearchParams();
  if (before) qs.set("before", before);
  if (limit) qs.set("limit", String(limit));
  const tail = qs.toString() ? `?${qs.toString()}` : "";
  return api.get(`/api/conversations/${conversationId}/messages${tail}`);
};

export const sendMessage = (conversationId, body) =>
  api.post(`/api/conversations/${conversationId}/messages`, { body });

export const editMessage = (conversationId, messageId, body) =>
  api.patch(`/api/conversations/${conversationId}/messages/${messageId}`, {
    body,
  });

export const deleteMessage = (conversationId, messageId) =>
  api.delete(`/api/conversations/${conversationId}/messages/${messageId}`);

export const toggleLike = (conversationId, messageId) =>
  api.post(`/api/conversations/${conversationId}/messages/${messageId}/like`);

export const searchMessages = (q, { limit = 20 } = {}) => {
  const trimmed = (q || "").trim();
  if (!trimmed) return Promise.resolve([]);
  const qs = new URLSearchParams({ q: trimmed, limit: String(limit) });
  return api.get(`/api/conversations/search?${qs.toString()}`);
};

export const markRead = (conversationId, messageId) =>
  api.post(`/api/conversations/${conversationId}/read`, {
    messageId: messageId ?? undefined,
  });
