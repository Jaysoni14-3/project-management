/* Notifications are an API-only feature — there's no Firebase
   counterpart, so this shim just re-exports the API service directly.
   Kept for symmetry with the other service entry points. */
export {
  listenToNotifications,
  listenToNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "./notification.api.service";
