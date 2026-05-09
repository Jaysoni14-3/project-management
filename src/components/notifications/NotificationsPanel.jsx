import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell, X, CheckCheck } from "lucide-react";

import IconButton from "../ui/IconButton";
import EmptyState from "../ui/EmptyState";
import Skeleton from "../ui/Skeleton";
import NotificationItem from "./NotificationItem";
import useNotifications from "../../hooks/useNotifications";

/* Off-canvas panel that slides in from the right. Stays mounted while the
   user is inside the app so the polling loop keeps the bell badge fresh
   even when the panel is closed (count-only mode). When `isOpen` flips
   true the hook starts pulling the full list. */
const NotificationsPanel = ({ isOpen, onClose }) => {
  const { items, unreadCount, loading, markRead, markAllRead } =
    useNotifications({ enabled: isOpen });

  /* Lock body scroll + ESC handler — same affordances as Modal. */
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /* Portaled to document.body so the panel escapes the Sidebar's
     `overflow-hidden` (which otherwise clips it) and any stacking context
     created by ancestor flex/sticky layout.

     Layout split:
       • lg+ : anchored to the right edge of the sidebar
         (`lg:left-sidebar`) so the sidebar stays visible and
         interactive while the panel is open — Linear/Slack model.
       • < lg: spans from the left edge (`left-0`) since the sidebar
         is a hidden drawer on mobile and there's nothing to leave
         visible behind it.
     `top-[var(...)]` reserves the impersonation banner's height
     when active so the panel doesn't slide up over it. */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
      className="fixed top-[var(--app-top-offset,0px)] bottom-0
        left-0 lg:left-sidebar right-0
        z-modal flex justify-start"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-overlay/40 backdrop-blur-[2px] animate-fade-in"
      />

      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[400px] h-full bg-elevated border-r border-line
          shadow-modal flex flex-col animate-slide-down"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-md px-lg py-md border-b border-line-subtle">
          <div className="flex items-center gap-sm min-w-0">
            <Bell className="h-4 w-4 text-fg-subtle shrink-0" />
            <h2 className="text-section text-fg truncate">Notifications</h2>
            {unreadCount > 0 && (
              <span className="shrink-0 inline-flex items-center justify-center h-5 min-w-[20px] px-xs rounded-full bg-accent text-accent-fg text-caption font-semibold">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-xs shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-xs h-controlSm px-md rounded-md
                  text-bodySm text-fg-muted hover:bg-subtle hover:text-fg
                  transition-colors duration-fast"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
            <IconButton
              icon={X}
              size="sm"
              variant="ghost"
              onClick={onClose}
              aria-label="Close notifications"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading && items.length === 0 ? (
            <ul className="flex flex-col">
              {Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="flex items-start gap-md px-lg py-md border-b border-line-subtle"
                >
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <div className="flex-1 flex flex-col gap-xs">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            <div className="px-lg py-xl">
              <EmptyState icon={Bell} title="You're all caught up" />
            </div>
          ) : (
            (() => {
              /* Split into Mentions (priority) and the rest. Mentions
                 surface at the top with a small section heading; if
                 there are none, the heading + section disappear and
                 everything else renders as before. */
              const mentions = items.filter((n) => n.kind === "comment_mention");
              const other = items.filter((n) => n.kind !== "comment_mention");
              const renderItem = (n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onClick={(notif) => markRead(notif.id)}
                  onActionClick={(notif) => {
                    if (!notif.readAt) markRead(notif.id);
                    onClose?.();
                  }}
                />
              );
              return (
                <>
                  {mentions.length > 0 && (
                    <>
                      <p className="px-lg pt-md pb-xs text-eyebrow uppercase text-fg-subtle tracking-wider">
                        Mentions
                      </p>
                      <ul className="flex flex-col">{mentions.map(renderItem)}</ul>
                    </>
                  )}
                  {other.length > 0 && (
                    <>
                      {mentions.length > 0 && (
                        <p className="px-lg pt-md pb-xs text-eyebrow uppercase text-fg-subtle tracking-wider border-t border-line-subtle">
                          Activity
                        </p>
                      )}
                      <ul className="flex flex-col">{other.map(renderItem)}</ul>
                    </>
                  )}
                </>
              );
            })()
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
};

export default NotificationsPanel;
