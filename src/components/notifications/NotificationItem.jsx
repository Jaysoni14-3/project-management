import React from "react";
import { Link } from "react-router-dom";
import {
  AtSign,
  Bug,
  FolderKanban,
  StickyNote,
  Layers,
  CheckCircle2,
} from "lucide-react";

import { projectPathFromName } from "../../lib/slug";

/* Pure-presentational. Computes its own action URL from the payload so
   the server doesn't have to know about slugs. New kinds slot in by
   adding a case to KIND_META. */
/* Each `buildUrl` returns a path with a query param (e.g. `?bug=<id>`)
   so the destination page can pick up the param, look up the entity,
   and open the corresponding view/edit modal automatically. The pages
   strip the param after opening so refresh + back-button behaviour
   stay sensible. */
const KIND_META = {
  project_assigned: {
    icon: FolderKanban,
    tone: "bg-accent-soft text-accent",
    actionLabel: "View project",
    buildUrl: (p) => projectPathFromName(p?.projectName, p?.projectId),
  },
  bug_assigned: {
    icon: Bug,
    tone: "bg-error-50 text-error-700",
    actionLabel: "View bug",
    buildUrl: (p) => {
      const base = `${projectPathFromName(p?.projectName, p?.projectId)}/bugs`;
      return p?.bugId ? `${base}?bug=${p.bugId}` : base;
    },
  },
  meeting_note_attendee: {
    icon: StickyNote,
    tone: "bg-accent-soft text-accent",
    actionLabel: "View notes",
    buildUrl: (p) => {
      const base = projectPathFromName(p?.projectName, p?.projectId);
      return p?.noteId ? `${base}?note=${p.noteId}` : base;
    },
  },
  module_assigned: {
    icon: Layers,
    tone: "bg-accent-soft text-accent",
    actionLabel: "View module",
    /* Modules live on a dedicated page — link there with a query param
       so the destination can pop the matching detail modal. The Modules
       page picks up `?moduleId=…` and opens the view modal automatically. */
    buildUrl: (p) =>
      p?.moduleId ? `/modules?moduleId=${p.moduleId}` : "/modules",
  },
  module_completed: {
    icon: CheckCircle2,
    tone: "bg-success-50 text-success-700",
    actionLabel: "View module",
    buildUrl: (p) =>
      p?.moduleId ? `/modules?moduleId=${p.moduleId}` : "/modules",
  },
  comment_mention: {
    icon: AtSign,
    tone: "bg-accent-soft text-accent",
    actionLabel: "Open thread",
    /* Bug comments deep-link to the focus board; tasks and notes
       open the project page where their cards live. The query param
       carries the parent entity id so the destination page can pop
       the right modal. */
    buildUrl: (p) => {
      const projectBase = projectPathFromName(p?.projectName, p?.projectId);
      if (p?.parentType === "bug") {
        return p?.parentId
          ? `${projectBase}/bugs?bug=${p.parentId}`
          : `${projectBase}/bugs`;
      }
      if (p?.parentType === "meeting_note") {
        return p?.parentId
          ? `${projectBase}?note=${p.parentId}`
          : projectBase;
      }
      if (p?.parentType === "task") {
        return p?.parentId
          ? `${projectBase}?task=${p.parentId}`
          : projectBase;
      }
      return projectBase;
    },
  },
};

const FALLBACK_META = {
  icon: FolderKanban,
  tone: "bg-subtle text-fg-subtle",
  actionLabel: null,
  buildUrl: () => null,
};

const formatTimeAgo = (iso) => {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const NotificationItem = ({ notification, onClick, onActionClick }) => {
  const meta = KIND_META[notification.kind] || FALLBACK_META;
  const Icon = meta.icon;
  const url = meta.buildUrl(notification.payload);
  const unread = !notification.readAt;

  return (
    <li
      className={`group relative flex items-start gap-md px-lg py-md
        border-b border-line-subtle last:border-b-0
        transition-colors duration-fast hover:bg-subtle/40
        ${unread ? "bg-accent-soft/30" : ""}`}
    >
      {unread && (
        <span
          aria-label="Unread"
          className="absolute left-md top-md h-1.5 w-1.5 rounded-full bg-accent"
        />
      )}
      <div
        className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${meta.tone}`}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-bodySm text-fg font-medium leading-snug">
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-caption text-fg-muted mt-[2px] leading-snug">
            {notification.body}
          </p>
        )}
        <div className="flex items-center gap-md mt-xs">
          <span className="text-caption text-fg-subtle tabular-nums">
            {formatTimeAgo(notification.createdAt)}
          </span>
          {url && meta.actionLabel && (
            <Link
              to={url}
              onClick={() => onActionClick?.(notification)}
              className="text-caption text-accent hover:text-accent-hover font-medium transition-colors duration-fast"
            >
              {meta.actionLabel} →
            </Link>
          )}
          {unread && (
            <button
              type="button"
              onClick={() => onClick?.(notification)}
              className="text-caption text-fg-subtle hover:text-fg ml-auto transition-colors duration-fast"
            >
              Mark read
            </button>
          )}
        </div>
      </div>
    </li>
  );
};

export default NotificationItem;
