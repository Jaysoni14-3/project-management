import { useCallback, useEffect, useState } from "react";
import {
  listenToNotifications,
  listenToNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notification.service";
import { useAuth } from "../context/AuthContext";

/* Two modes — full list (when the off-canvas is open) or count-only
   (the default for the sidebar bell). Caller flips `enabled` when the
   panel opens so we stop fetching the full payload as soon as it closes. */
const useNotifications = ({ enabled = false } = {}) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  /* Count poll — always running once authed, cheap. Drives the bell badge
     even when the panel is closed. */
  useEffect(() => {
    if (!user) return undefined;
    const unsub = listenToNotificationCount((data) => {
      setUnreadCount(data?.unreadCount ?? 0);
    });
    return () => unsub?.();
  }, [user]);

  /* Full-list poll — only while the panel is open. */
  useEffect(() => {
    if (!user || !enabled) return undefined;
    setLoading(true);
    const unsub = listenToNotifications((data) => {
      setItems(data?.items ?? []);
      setUnreadCount(data?.unreadCount ?? 0);
      setLoading(false);
    });
    return () => unsub?.();
  }, [user, enabled]);

  const markRead = useCallback(async (id) => {
    /* Optimistic — flip locally so the UI feels instant; the next poll
       reconciles if the request fails. */
    setItems((prev) =>
      prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error("markRead failed:", err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) =>
      prev.map((n) =>
        n.readAt ? n : { ...n, readAt: new Date().toISOString() }
      )
    );
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error("markAllRead failed:", err);
    }
  }, []);

  return { items, unreadCount, loading, markRead, markAllRead };
};

export default useNotifications;
