import React from "react";
import { Plus } from "lucide-react";

import BugCard from "./BugCard";
import IconButton from "../../../components/ui/IconButton";
import { STATUS, TONE_ICON } from "../constants";

/* =============================================================
   One column on the bug board. Owns the drop zone — its parent
   board passes drop handlers in. Cards inside drive their own
   drag-start; the column handles drag-over / drop / drag-leave.
============================================================= */

const BugColumn = ({
  status,
  bugs,
  members,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  onAddBug,
  onCardDragStart,
  onCardDragEnd,
  onCardClick,
  draggingId,
}) => {
  const cfg = STATUS[status];
  const Icon = cfg.icon;
  const memberById = React.useMemo(() => {
    const map = new Map();
    members?.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  return (
    <section
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      aria-label={`${cfg.label} column`}
      className={`shrink-0 w-[300px] flex flex-col rounded-lg
        border bg-canvas/40
        transition-[background-color,border-color,box-shadow] duration-fast
        ${isDropTarget
          ? "border-accent bg-accent-soft/40 shadow-sm"
          : "border-line-subtle"
        }`}
    >
      {/* Column header */}
      <header className="flex items-center justify-between gap-sm px-md pt-md pb-sm">
        <div className="flex items-center gap-xs min-w-0">
          <Icon className={`h-3.5 w-3.5 shrink-0 ${TONE_ICON[cfg.tone]}`} />
          <h3 className="text-eyebrow uppercase text-fg-muted tracking-wider truncate">
            {cfg.label}
          </h3>
          <span className="ml-xs inline-flex items-center justify-center min-w-[20px] h-5
            px-xs rounded-xs bg-subtle text-caption text-fg-muted font-medium tabular-nums">
            {bugs.length}
          </span>
        </div>
        <IconButton
          icon={Plus}
          size="sm"
          variant="ghost"
          aria-label={`Add bug to ${cfg.label}`}
          onClick={() => onAddBug?.(status)}
        />
      </header>

      {/* Cards */}
      <ul className="flex flex-col gap-xs px-sm pb-sm min-h-[80px]">
        {bugs.length === 0 ? (
          <li
            className={`flex items-center justify-center text-caption text-fg-subtle
              rounded-md border border-dashed py-lg
              transition-colors duration-fast
              ${isDropTarget ? "border-accent text-accent bg-accent-soft/60" : "border-line-subtle"}`}
          >
            {isDropTarget ? "Drop to move here" : "Empty"}
          </li>
        ) : (
          bugs.map((bug) => (
            <BugCard
              key={bug.id}
              bug={bug}
              assignee={bug.assigneeId ? memberById.get(bug.assigneeId) : null}
              isDragging={draggingId === bug.id}
              onDragStart={onCardDragStart}
              onDragEnd={onCardDragEnd}
              onClick={onCardClick}
            />
          ))
        )}
      </ul>

      {/* Spacer keeps the bottom drop area generous in tall columns */}
      <div className="flex-1 min-h-md" />
    </section>
  );
};

export default BugColumn;
