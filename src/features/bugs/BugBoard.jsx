import React, { useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

import BugColumn from "./components/BugColumn";
import { STATUS_ORDER } from "./constants";
import { patchBug } from "../../services/bug.service";

/* =============================================================
   Kanban board for bugs.
   - Groups bugs into the 4 status columns
   - Native HTML5 drag-and-drop, optimistic via Firestore (the
     realtime listener will reconcile if patchBug fails)
   - Horizontal scroll on overflow so the board never crops
============================================================= */

const BugBoard = ({ projectId, bugs, members, onAddBug, onEditBug }) => {
  const [draggingId, setDraggingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  // Track the column the cursor is *currently* over so we can update
  // dropTarget once and avoid flicker between header/spacer/empty hits.
  const lastEnterStatusRef = useRef(null);

  const grouped = useMemo(() => {
    const groups = Object.fromEntries(STATUS_ORDER.map((s) => [s, []]));
    bugs.forEach((b) => {
      const s = b.status && groups[b.status] ? b.status : "backlog";
      groups[s].push(b);
    });
    return groups;
  }, [bugs]);

  const handleCardDragStart = (e, bug) => {
    setDraggingId(bug.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", bug.id);
    // Hint the source status so we can skip the patch if dropped back home
    e.dataTransfer.setData("application/x-bug-status", bug.status || "backlog");
  };

  const handleCardDragEnd = () => {
    setDraggingId(null);
    setDropTarget(null);
    lastEnterStatusRef.current = null;
  };

  const handleColumnDragOver = (status) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (lastEnterStatusRef.current !== status) {
      lastEnterStatusRef.current = status;
      setDropTarget(status);
    }
  };

  const handleColumnDragLeave = (status) => (e) => {
    // dragleave fires when crossing child boundaries too — only clear if
    // the cursor is actually leaving the column rect.
    const next = e.relatedTarget;
    if (next && e.currentTarget.contains(next)) return;
    if (lastEnterStatusRef.current === status) {
      lastEnterStatusRef.current = null;
      setDropTarget(null);
    }
  };

  const handleColumnDrop = (status) => async (e) => {
    e.preventDefault();
    setDropTarget(null);
    setDraggingId(null);
    lastEnterStatusRef.current = null;

    const bugId = e.dataTransfer.getData("text/plain");
    const sourceStatus = e.dataTransfer.getData("application/x-bug-status");
    if (!bugId || sourceStatus === status) return;

    try {
      await patchBug(projectId, bugId, { status });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Couldn't move bug");
    }
  };

  return (
    <div
      className="flex gap-md overflow-x-auto pb-sm -mx-xs px-xs
        [scrollbar-gutter:stable]"
      role="list"
      aria-label="Bug board"
    >
      {STATUS_ORDER.map((status) => (
        <BugColumn
          key={status}
          status={status}
          bugs={grouped[status]}
          members={members}
          isDropTarget={dropTarget === status && draggingId != null}
          onDragOver={handleColumnDragOver(status)}
          onDragLeave={handleColumnDragLeave(status)}
          onDrop={handleColumnDrop(status)}
          onAddBug={onAddBug}
          onCardDragStart={handleCardDragStart}
          onCardDragEnd={handleCardDragEnd}
          onCardClick={onEditBug}
          draggingId={draggingId}
        />
      ))}
    </div>
  );
};

export default BugBoard;
