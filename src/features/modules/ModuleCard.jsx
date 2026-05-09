import React from "react";
import { Layers, User as UserIcon, Clock } from "lucide-react";

import { STATUS, STATUS_DOT, STATUS_TONE } from "./constants";

const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatRelative = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/* Compact card for module lists. The whole card is a button that
   opens the module's detail modal; assignee + project name + last
   update time give enough context at a glance. */
const ModuleCard = ({ module, onOpen, showProject = false }) => {
  const status = (module.status || "not_started").toLowerCase();
  const meta = STATUS[status] || STATUS.not_started;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(module)}
      className="text-left w-full bg-surface border border-line rounded-lg
        px-lg py-md flex flex-col gap-sm
        hover:border-line-strong hover:shadow-sm
        transition-[border-color,box-shadow] duration-fast
        focus-visible:outline-none focus-visible:shadow-focus-ring"
    >
      <div className="flex items-start gap-md">
        <div className="h-8 w-8 rounded-md bg-accent-soft text-accent flex items-center justify-center shrink-0">
          <Layers className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body text-fg font-medium leading-snug truncate">
            {module.title || "Untitled module"}
          </p>
          {module.description && (
            <p className="text-caption text-fg-muted mt-[2px] leading-snug line-clamp-2">
              {module.description}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-xs h-controlSm px-sm rounded-md
            border text-caption font-medium ${STATUS_TONE[status]}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
          {meta.label}
        </span>
      </div>

      <div className="flex items-center gap-md text-caption text-fg-subtle">
        {showProject && module.projectName && (
          <span className="truncate">{module.projectName}</span>
        )}
        <span className="inline-flex items-center gap-xs min-w-0">
          {module.assigneeName ? (
            <>
              {module.assigneeAvatar ? (
                <img
                  src={module.assigneeAvatar}
                  alt=""
                  className="h-4 w-4 rounded-full object-cover"
                />
              ) : (
                <span className="h-4 w-4 rounded-full bg-subtle text-[9px] font-semibold text-fg-muted flex items-center justify-center">
                  {initials(module.assigneeName)}
                </span>
              )}
              <span className="truncate">{module.assigneeName}</span>
            </>
          ) : (
            <>
              <UserIcon className="h-3 w-3" />
              Unassigned
            </>
          )}
        </span>
        <span className="inline-flex items-center gap-xs ml-auto shrink-0">
          <Clock className="h-3 w-3" />
          {formatRelative(module.updatedAt) || "—"}
        </span>
      </div>
    </button>
  );
};

export default ModuleCard;
