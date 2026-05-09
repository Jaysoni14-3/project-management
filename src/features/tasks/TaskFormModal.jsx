import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  ChevronDown,
  Check,
  Calendar,
  CircleAlert,
  User,
  Trash2,
} from "lucide-react";

import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Comments from "../../components/comments/Comments";
import TaskChecklist from "./components/TaskChecklist";

import { useAuth } from "../../context/AuthContext";
import { createTask, updateTask, deleteTask } from "../../services/task.service";
import {
  STATUS,
  STATUS_ORDER,
  PRIORITY,
  PRIORITY_ORDER,
  TONE_DOT,
  TONE_ICON,
} from "./constants";

const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatDueDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
};

/* Property menu — minimal popover anchored to a pill button */
const PropertyMenu = ({ children, trigger, align = "left" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative inline-flex">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={`absolute top-full mt-xs z-popover min-w-[200px]
            bg-elevated border border-line rounded-md shadow-lg
            py-xs animate-fade-in
            ${align === "right" ? "right-0" : "left-0"}`}
          role="menu"
        >
          {typeof children === "function" ? children({ close }) : children}
        </div>
      )}
    </div>
  );
};

const MenuItem = ({ icon: Icon, iconClass = "", label, selected, onClick }) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className="w-full flex items-center gap-sm px-md py-sm text-bodySm text-fg
      hover:bg-subtle transition-colors duration-fast text-left"
  >
    {Icon && <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />}
    <span className="flex-1 truncate">{label}</span>
    {selected && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
  </button>
);

const PillButton = React.forwardRef(
  ({ children, onClick, active, className = "" }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-xs h-controlSm px-md
        rounded-md border bg-surface text-bodySm text-fg
        transition-[background-color,border-color,box-shadow] duration-fast
        focus-visible:outline-none focus-visible:shadow-focus-ring
        ${active
          ? "border-line-strong bg-subtle"
          : "border-line hover:bg-subtle hover:border-line-strong"
        }
        ${className}`}
    >
      {children}
    </button>
  )
);
PillButton.displayName = "PillButton";

const TaskFormModal = ({
  isOpen,
  onClose,
  projectId,
  members = [],
  task,
  defaultStatus = "todo",
}) => {
  const isEdit = Boolean(task);
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(defaultStatus);
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState(null);
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState("");

  const titleRef = useRef(null);
  const dateRef = useRef(null);

  const assignee = useMemo(
    () => members.find((m) => m.id === assigneeId) || null,
    [members, assigneeId]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setStatus(task.status || "todo");
      setPriority(task.priority || "medium");
      setAssigneeId(task.assigneeId || null);
      setDueDate(task.dueDate || "");
    } else {
      setTitle("");
      setDescription("");
      setStatus(defaultStatus);
      setPriority("medium");
      setAssigneeId(null);
      setDueDate("");
    }
    setFormError("");
    requestAnimationFrame(() => titleRef.current?.focus());
  }, [isOpen, task, defaultStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setFormError("");

    if (!title.trim()) {
      setFormError("Give the task a title — what needs to get done?");
      titleRef.current?.focus();
      return;
    }

    const payload = {
      title: title.trim(),
      description,
      status,
      priority,
      assigneeId,
      dueDate: dueDate || null,
    };

    try {
      setSubmitting(true);
      if (isEdit) {
        await updateTask(projectId, task.id, payload);
        toast.success("Task updated");
      } else {
        await createTask(projectId, payload, {
          uid: user?.uid,
          name: user?.displayName,
          email: user?.email,
        });
        toast.success("Task created");
      }
      onClose();
    } catch (err) {
      console.error(err);
      const msg = err?.message || err?.code || "Couldn't save the task";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || deleting) return;
    if (!window.confirm(`Delete "${task.title}"? This can't be undone.`)) return;
    try {
      setDeleting(true);
      await deleteTask(projectId, task.id);
      toast.success("Task deleted");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Couldn't delete task");
    } finally {
      setDeleting(false);
    }
  };

  const statusCfg = STATUS[status] || STATUS.todo;
  const priorityCfg = PRIORITY[priority] || PRIORITY.medium;
  const StatusIcon = statusCfg.icon;
  const PriorityIcon = priorityCfg.icon;
  const dueLabel = formatDueDate(dueDate);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={isEdit ? "Edit task" : "New task"}
      footer={
        <>
          {isEdit && (
            <Button
              variant="ghost"
              leadingIcon={Trash2}
              onClick={handleDelete}
              loading={deleting}
              disabled={deleting || submitting}
              className="text-error hover:bg-error-50 hover:text-error-700 mr-auto"
            >
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={submitting}>
            {isEdit ? "Save changes" : "Create task"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-md">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="w-full text-section text-fg bg-transparent
            border-0 focus:outline-none placeholder:text-fg-subtle"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Add a bit of context — what does done look like?"
          className="w-full text-bodySm text-fg bg-transparent
            border-0 focus:outline-none placeholder:text-fg-subtle resize-none"
        />

        {/* Property pills */}
        <div className="flex flex-wrap items-center gap-sm pt-md border-t border-line-subtle">
          {/* Status */}
          <PropertyMenu
            trigger={({ toggle, open }) => (
              <PillButton onClick={toggle} active={open}>
                <StatusIcon className={`h-3.5 w-3.5 ${TONE_ICON[statusCfg.tone]}`} />
                {statusCfg.label}
                <ChevronDown className="h-3 w-3 text-fg-subtle" />
              </PillButton>
            )}
          >
            {({ close }) =>
              STATUS_ORDER.map((key) => {
                const cfg = STATUS[key];
                const Icon = cfg.icon;
                return (
                  <MenuItem
                    key={key}
                    icon={Icon}
                    iconClass={TONE_ICON[cfg.tone]}
                    label={cfg.label}
                    selected={key === status}
                    onClick={() => {
                      setStatus(key);
                      close();
                    }}
                  />
                );
              })
            }
          </PropertyMenu>

          {/* Priority */}
          <PropertyMenu
            trigger={({ toggle, open }) => (
              <PillButton onClick={toggle} active={open}>
                <PriorityIcon className={`h-3.5 w-3.5 ${TONE_ICON[priorityCfg.tone]}`} />
                {priorityCfg.label}
                <ChevronDown className="h-3 w-3 text-fg-subtle" />
              </PillButton>
            )}
          >
            {({ close }) =>
              PRIORITY_ORDER.map((key) => {
                const cfg = PRIORITY[key];
                const Icon = cfg.icon;
                return (
                  <MenuItem
                    key={key}
                    icon={Icon}
                    iconClass={TONE_ICON[cfg.tone]}
                    label={cfg.label}
                    selected={key === priority}
                    onClick={() => {
                      setPriority(key);
                      close();
                    }}
                  />
                );
              })
            }
          </PropertyMenu>

          {/* Assignee */}
          <PropertyMenu
            trigger={({ toggle, open }) => (
              <PillButton onClick={toggle} active={open}>
                {assignee ? (
                  <>
                    {assignee.avatar ? (
                      <img
                        src={`/images/${assignee.avatar}`}
                        alt={assignee.name}
                        className="h-4 w-4 rounded-full object-cover"
                      />
                    ) : (
                      <span className="h-4 w-4 rounded-full bg-accent-soft text-accent
                        text-[9px] font-semibold inline-flex items-center justify-center">
                        {initials(assignee.name)}
                      </span>
                    )}
                    <span className="capitalize truncate max-w-[140px]">
                      {assignee.name?.split(" ")[0]}
                    </span>
                  </>
                ) : (
                  <>
                    <User className="h-3.5 w-3.5 text-fg-subtle" />
                    Unassigned
                  </>
                )}
                <ChevronDown className="h-3 w-3 text-fg-subtle" />
              </PillButton>
            )}
            menuClassName="w-[260px]"
          >
            {({ close }) => (
              <>
                <MenuItem
                  icon={User}
                  iconClass="text-fg-subtle"
                  label="Unassigned"
                  selected={!assigneeId}
                  onClick={() => {
                    setAssigneeId(null);
                    close();
                  }}
                />
                <div className="my-xs border-t border-line-subtle" />
                {members.length === 0 ? (
                  <p className="px-md py-sm text-caption text-fg-subtle">
                    No teammates on this project yet
                  </p>
                ) : (
                  members.map((m) => (
                    <MenuItem
                      key={m.id}
                      label={m.name || m.email}
                      selected={m.id === assigneeId}
                      onClick={() => {
                        setAssigneeId(m.id);
                        close();
                      }}
                    />
                  ))
                )}
              </>
            )}
          </PropertyMenu>

          {/* Due date */}
          <PillButton
            onClick={() => dateRef.current?.showPicker?.() || dateRef.current?.click?.()}
            className="relative"
          >
            <Calendar className="h-3.5 w-3.5 text-fg-subtle" />
            {dueLabel || "Due date"}
            <input
              ref={dateRef}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </PillButton>
          {dueDate && (
            <button
              type="button"
              onClick={() => setDueDate("")}
              className="text-caption text-fg-subtle hover:text-fg"
            >
              clear
            </button>
          )}
        </div>

        {formError && (
          <div
            role="alert"
            className="flex items-center gap-xs text-bodySm text-error-700 bg-error-50 border border-error-200 rounded-md px-md py-sm"
          >
            <CircleAlert className="h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}

        {/* Submit on Enter via implicit form submit; provide a hidden trigger */}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>

      {isEdit && (
        <>
          <TaskChecklist
            taskId={task.id}
            initialItems={task.checklistItems || []}
          />
          <Comments parentPath={`projects/${projectId}/tasks/${task.id}`} />
        </>
      )}
    </Modal>
  );
};

export default TaskFormModal;
