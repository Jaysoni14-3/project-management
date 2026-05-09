import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { CheckSquare, Plus, X } from "lucide-react";

import IconButton from "../../../components/ui/IconButton";
import {
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
} from "../../../services/task.service";

/* Inline checklist for an existing task. Manages its own optimistic
   state so the UI feels instant — the parent's realtime poll will
   reconcile the canonical list every 10s. */
const TaskChecklist = ({ taskId, initialItems = [] }) => {
  const [items, setItems] = useState(initialItems);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef(null);

  /* When the parent reloads (different task opened, realtime tick),
     replace local items with the authoritative list. We use the task
     id rather than items length as the trigger so unrelated taps
     don't clobber a half-typed draft. */
  useEffect(() => {
    setItems(initialItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  /* When new items arrive from a server poll while the panel is open,
     merge them in — but never drop or override locally-pending edits.
     Cheapest correct strategy: take server items as the source of
     truth, since our optimistic ops swap to server response on
     completion anyway. */
  useEffect(() => {
    setItems((prev) => {
      const incomingIds = new Set(initialItems.map((i) => i.id));
      const localPending = prev.filter((i) => !incomingIds.has(i.id));
      return [...initialItems, ...localPending];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialItems.map((i) => `${i.id}:${i.done}:${i.text}`))]);

  const handleAdd = async (e) => {
    e?.preventDefault?.();
    const text = draft.trim();
    if (!text || adding) return;

    /* Optimistic insert with a placeholder id; replaced when the
       server returns the real row. */
    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      text,
      done: false,
      order: items.length,
    };
    setItems((prev) => [...prev, optimistic]);
    setDraft("");
    setAdding(true);
    try {
      const real = await addChecklistItem(taskId, text);
      setItems((prev) => prev.map((i) => (i.id === tempId ? real : i)));
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Couldn't add item");
      setItems((prev) => prev.filter((i) => i.id !== tempId));
    } finally {
      setAdding(false);
      inputRef.current?.focus();
    }
  };

  const handleToggle = async (item) => {
    const next = !item.done;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, done: next } : i))
    );
    try {
      await updateChecklistItem(item.id, { done: next });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Couldn't update");
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, done: !next } : i))
      );
    }
  };

  const handleDelete = async (item) => {
    const snapshot = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await deleteChecklistItem(item.id);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Couldn't delete");
      setItems(snapshot);
    }
  };

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  return (
    <section
      aria-label="Checklist"
      className="flex flex-col gap-sm pt-md mt-md border-t border-line-subtle"
    >
      <header className="flex items-center gap-xs">
        <CheckSquare className="h-3.5 w-3.5 text-fg-subtle" />
        <h3 className="text-eyebrow uppercase text-fg-muted tracking-wider">
          Checklist
        </h3>
        {total > 0 && (
          <span className="text-caption text-fg-subtle tabular-nums">
            {doneCount}/{total}
          </span>
        )}
      </header>

      {total > 0 && (
        <div className="h-1 w-full bg-subtle rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-[width] duration-fast"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col gap-[2px]">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex items-start gap-sm py-[3px]"
            >
              <input
                type="checkbox"
                checked={!!item.done}
                onChange={() => handleToggle(item)}
                className="mt-[3px] h-3.5 w-3.5 shrink-0 rounded-sm border border-line
                  text-accent focus:ring-accent cursor-pointer"
                aria-label={item.text}
              />
              <span
                className={`flex-1 text-bodySm leading-snug ${
                  item.done
                    ? "line-through text-fg-muted decoration-fg-subtle"
                    : "text-fg"
                }`}
              >
                {item.text}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
                <IconButton
                  icon={X}
                  size="sm"
                  variant="ghost"
                  aria-label="Delete item"
                  onClick={() => handleDelete(item)}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex items-center gap-xs">
        <Plus className="h-3.5 w-3.5 text-fg-subtle shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a checklist item…"
          className="flex-1 bg-transparent text-bodySm text-fg
            border-0 focus:outline-none placeholder:text-fg-subtle"
        />
        {draft.trim() && (
          <button
            type="submit"
            disabled={adding}
            className="text-caption text-accent hover:text-accent-hover font-medium
              transition-colors duration-fast disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        )}
      </form>
    </section>
  );
};

export default TaskChecklist;
