import React from "react";
import { Calendar, User, CheckSquare } from "lucide-react";

import { PRIORITY, TONE_ICON } from "../constants";

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

const TaskCard = ({ task, assignee, isDragging, onDragStart, onDragEnd, onClick }) => {
  const priority = PRIORITY[task.priority] || PRIORITY.medium;
  const PriorityIcon = priority.icon;
  const due = formatDue(task.dueDate);
  const isDone = task.status === "done";

  /* Tiny inline progress when the task carries a checklist. We render
     "done/total" rather than a percentage so the meaning is obvious at
     a glance, even on a card with one or two items. */
  const checklist = Array.isArray(task.checklistItems) ? task.checklistItems : [];
  const checklistDone = checklist.filter((i) => i.done).length;
  const checklistComplete = checklist.length > 0 && checklistDone === checklist.length;

  return (
    <li
      draggable
      onDragStart={(e) => onDragStart?.(e, task)}
      onDragEnd={onDragEnd}
      onClick={() => onClick?.(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(task);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Task: ${task.title}`}
      className={`group relative flex flex-col gap-sm
        bg-surface border border-line rounded-md
        px-sm py-sm
        cursor-grab active:cursor-grabbing
        transition-[border-color,box-shadow,opacity,transform] duration-fast
        hover:border-line-strong hover:shadow-sm
        focus-visible:outline-none focus-visible:shadow-focus-ring
        ${isDragging ? "opacity-40 scale-[0.98]" : ""}`}
    >
      <div className="flex items-start gap-xs">
        <PriorityIcon
          className={`h-3.5 w-3.5 mt-[2px] shrink-0 ${TONE_ICON[priority.tone]}`}
          aria-label={`${priority.label} priority`}
        />
        <h3
          className={`text-bodySm leading-snug line-clamp-2 flex-1 ${
            isDone ? "text-fg-muted line-through decoration-fg-subtle" : "text-fg"
          }`}
        >
          {task.title}
        </h3>
      </div>

      <div className="flex items-center gap-sm text-caption text-fg-subtle">
        {due && (
          <span
            className={`inline-flex items-center gap-xs ${
              !isDone && due.overdue ? "text-error-700" : ""
            }`}
            title={due.overdue ? "Overdue" : "Due"}
          >
            <Calendar className="h-3 w-3" />
            <span className="tabular-nums">{due.label}</span>
          </span>
        )}

        {checklist.length > 0 && (
          <span
            className={`inline-flex items-center gap-xs ${
              checklistComplete ? "text-success-700" : ""
            }`}
            title={`${checklistDone} of ${checklist.length} checklist items done`}
          >
            <CheckSquare className="h-3 w-3" />
            <span className="tabular-nums">
              {checklistDone}/{checklist.length}
            </span>
          </span>
        )}

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

export default TaskCard;
