import React from "react";
import { Calendar, Paperclip, User } from "lucide-react";

import {
  PRIORITY,
  SEVERITY,
  TONE_DOT,
  TONE_ICON,
} from "../constants";

/* =============================================================
   Single bug card. Compact, draggable, click-to-open.
   The drag wiring lives on the parent column — this component
   just toggles `data-dragging` so the column can fade it slightly.
============================================================= */

const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatDue = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    label: d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    }),
    overdue: d.getTime() < Date.now() - 24 * 60 * 60 * 1000,
  };
};

const BugCard = ({ bug, assignee, isDragging, onDragStart, onDragEnd, onClick }) => {
  const priority = PRIORITY[bug.priority] || PRIORITY.medium;
  const severity = SEVERITY[bug.severity] || SEVERITY.medium;
  const PriorityIcon = priority.icon;
  const due = formatDue(bug.dueDate);
  const attachmentCount = bug.attachments?.length ?? 0;

  return (
    <li
      draggable
      onDragStart={(e) => onDragStart?.(e, bug)}
      onDragEnd={onDragEnd}
      onClick={() => onClick?.(bug)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(bug);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Bug: ${bug.title}`}
      className={`group relative flex flex-col gap-sm
        bg-surface border border-line rounded-md
        px-sm py-sm
        cursor-grab active:cursor-grabbing
        transition-[border-color,box-shadow,opacity,transform] duration-fast
        hover:border-line-strong hover:shadow-sm
        focus-visible:outline-none focus-visible:shadow-focus-ring
        ${isDragging ? "opacity-40 scale-[0.98]" : ""}`}
    >
      {/* Title row */}
      <div className="flex items-start gap-xs">
        <PriorityIcon
          className={`h-3.5 w-3.5 mt-[2px] shrink-0 ${TONE_ICON[priority.tone]}`}
          aria-label={`${priority.label} priority`}
        />
        <h3 className="text-bodySm text-fg leading-snug line-clamp-2 flex-1">
          {bug.title}
        </h3>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-sm text-caption text-fg-subtle">
        {/* Severity */}
        <span
          className="inline-flex items-center gap-xs"
          title={`${severity.label} severity`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[severity.tone]}`} />
          <span className="capitalize">{severity.label}</span>
        </span>

        {/* Due date */}
        {due && (
          <>
            <span className="opacity-50">·</span>
            <span
              className={`inline-flex items-center gap-xs ${
                due.overdue ? "text-error-700" : ""
              }`}
              title={due.overdue ? "Overdue" : "Due"}
            >
              <Calendar className="h-3 w-3" />
              <span className="tabular-nums">{due.label}</span>
            </span>
          </>
        )}

        {/* Attachments */}
        {attachmentCount > 0 && (
          <>
            <span className="opacity-50">·</span>
            <span className="inline-flex items-center gap-xs" title="Attachments">
              <Paperclip className="h-3 w-3" />
              <span className="tabular-nums">{attachmentCount}</span>
            </span>
          </>
        )}

        {/* Assignee — pushed to the end */}
        <span className="ml-auto shrink-0" title={assignee?.name ?? "Unassigned"}>
          {assignee ? (
            assignee.avatar ? (
              <img
                src={`/images/${assignee.avatar}`}
                alt={assignee.name}
                className="h-5 w-5 rounded-full object-cover border border-line"
              />
            ) : (
              <span className="h-5 w-5 rounded-full bg-accent-soft text-accent
                text-[10px] font-semibold inline-flex items-center justify-center">
                {initials(assignee.name)}
              </span>
            )
          ) : (
            <span className="h-5 w-5 rounded-full bg-subtle text-fg-subtle
              inline-flex items-center justify-center border border-dashed border-line">
              <User className="h-3 w-3" />
            </span>
          )}
        </span>
      </div>
    </li>
  );
};

export default BugCard;
