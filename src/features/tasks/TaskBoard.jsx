import React, { useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

import TaskColumn from "./components/TaskColumn";
import { STATUS_ORDER } from "./constants";
import { patchTask } from "../../services/task.service";

const TaskBoard = ({ projectId, tasks, members, onAddTask, onEditTask }) => {
  const [draggingId, setDraggingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const lastEnterStatusRef = useRef(null);

  const grouped = useMemo(() => {
    const groups = Object.fromEntries(STATUS_ORDER.map((s) => [s, []]));
    tasks.forEach((t) => {
      const s = t.status && groups[t.status] ? t.status : "todo";
      groups[s].push(t);
    });
    return groups;
  }, [tasks]);

  const handleCardDragStart = (e, task) => {
    setDraggingId(task.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.setData("application/x-task-status", task.status || "todo");
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

    const taskId = e.dataTransfer.getData("text/plain");
    const sourceStatus = e.dataTransfer.getData("application/x-task-status");
    if (!taskId || sourceStatus === status) return;

    try {
      await patchTask(projectId, taskId, { status });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Couldn't move task");
    }
  };

  return (
    <div
      className="flex gap-md overflow-x-auto pb-sm -mx-xs px-xs
        [scrollbar-gutter:stable]"
      role="list"
      aria-label="Task board"
    >
      {STATUS_ORDER.map((status) => (
        <TaskColumn
          key={status}
          status={status}
          tasks={grouped[status]}
          members={members}
          isDropTarget={dropTarget === status && draggingId != null}
          onDragOver={handleColumnDragOver(status)}
          onDragLeave={handleColumnDragLeave(status)}
          onDrop={handleColumnDrop(status)}
          onAddTask={onAddTask}
          onCardDragStart={handleCardDragStart}
          onCardDragEnd={handleCardDragEnd}
          onCardClick={onEditTask}
          draggingId={draggingId}
        />
      ))}
    </div>
  );
};

export default TaskBoard;
