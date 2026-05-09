import { api, subscribe } from "./apiClient";

/* Subscribe to the current user's notifications. The bell + panel use this
   so they share one polling loop and stay in sync. Server returns
   { items, unreadCount }. */
export const listenToNotifications = (callback, intervalMs = 30000) =>
  subscribe(() => api.get("/api/notifications"), callback, intervalMs);

/* Lighter polling for the sidebar bell only — fetches just the count.
   Used when the panel isn't open so we don't pull the full list 24/7. */
export const listenToNotificationCount = (callback, intervalMs = 30000) =>
  subscribe(
    () => api.get("/api/notifications/unread-count"),
    callback,
    intervalMs
  );

export const markNotificationRead = (id) =>
  api.post(`/api/notifications/${id}/read`);

export const markAllNotificationsRead = () =>
  api.post("/api/notifications/read-all");
