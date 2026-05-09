import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  Paperclip,
  X,
  ChevronDown,
  Check,
  Calendar,
  CircleAlert,
  FileText,
  FileImage,
  FileSpreadsheet,
  File as FileIcon,
  User,
} from "lucide-react";

import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import IconButton from "../../components/ui/IconButton";
import Spinner from "../../components/ui/Spinner";

import { useAuth } from "../../context/AuthContext";
import { createBug, updateBug } from "../../services/bug.service";
import {
  STATUS,
  STATUS_ORDER,
  PRIORITY,
  PRIORITY_ORDER,
  SEVERITY,
  SEVERITY_ORDER,
  TONE_DOT,
  TONE_ICON,
} from "./constants";

/* ============================================================
   Helpers
============================================================ */

const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatBytes = (bytes) => {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileTypeIcon = (type = "", name = "") => {
  if (type.startsWith("image/")) return FileImage;
  if (type.includes("spreadsheet") || /\.(xlsx?|csv)$/i.test(name))
    return FileSpreadsheet;
  if (type.includes("pdf") || /\.pdf$/i.test(name)) return FileText;
  if (type.includes("word") || /\.(docx?|txt|md)$/i.test(name)) return FileText;
  return FileIcon;
};

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

/* ============================================================
   Property menu — minimal popover anchored to a pill button.
   Closes on outside click + Escape. Used for status, priority,
   severity, assignee. Avoids native <select> for a cleaner feel.
============================================================ */

const PropertyMenu = ({ children, trigger, align = "left", menuClassName = "" }) => {
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
            ${align === "right" ? "right-0" : "left-0"}
            ${menuClassName}`}
          role="menu"
        >
          {typeof children === "function" ? children({ close }) : children}
        </div>
      )}
    </div>
  );
};

const MenuItem = ({ icon: Icon, iconClass = "", label, hint, selected, onClick }) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className="w-full flex items-center gap-sm px-md py-sm text-bodySm text-fg
      hover:bg-subtle transition-colors duration-fast text-left"
  >
    {Icon && <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />}
    <span className="flex-1 truncate">{label}</span>
    {hint && <span className="text-caption text-fg-subtle">{hint}</span>}
    {selected && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
  </button>
);

/* ============================================================
   Pill button — used as the trigger for every property menu.
============================================================ */

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

/* ============================================================
   Form
============================================================ */

const today = () => new Date().toISOString().slice(0, 10);

const BugFormModal = ({
  isOpen,
  onClose,
  projectId,
  members = [],
  bug,
  defaultStatus = "backlog",
}) => {
  const isEdit = Boolean(bug);
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [status, setStatus] = useState(defaultStatus);
  const [priority, setPriority] = useState("medium");
  const [severity, setSeverity] = useState("medium");
  const [assigneeId, setAssigneeId] = useState(null);
  const [dueDate, setDueDate] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [keepAttachments, setKeepAttachments] = useState([]);
  const [removedAttachments, setRemovedAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const titleRef = useRef(null);
  const dateRef = useRef(null);

  const assignee = useMemo(
    () => members.find((m) => m.id === assigneeId) || null,
    [members, assigneeId]
  );

  /* Prefill on open / reset on close */
  useEffect(() => {
    if (!isOpen) return;
    if (bug) {
      setTitle(bug.title || "");
      setDescription(bug.description || "");
      setSteps(bug.stepsToReproduce || "");
      setStatus(bug.status || "backlog");
      setPriority(bug.priority || "medium");
      setSeverity(bug.severity || "medium");
      setAssigneeId(bug.assigneeId || null);
      setDueDate(bug.dueDate || "");
      setKeepAttachments(bug.attachments || []);
      setRemovedAttachments([]);
      setPendingFiles([]);
    } else {
      setTitle("");
      setDescription("");
      setSteps("");
      setStatus(defaultStatus);
      setPriority("medium");
      setSeverity("medium");
      setAssigneeId(null);
      setDueDate("");
      setKeepAttachments([]);
      setRemovedAttachments([]);
      setPendingFiles([]);
    }
    setFormError("");
    // Defer focus until after the modal mounts
    requestAnimationFrame(() => titleRef.current?.focus());
  }, [isOpen, bug, defaultStatus]);

  const handleAddFiles = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (incoming.length === 0) return;
    setPendingFiles((prev) => [...prev, ...incoming]);
    e.target.value = "";
  };

  const handleRemovePending = (i) =>
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleRemoveExisting = (att) => {
    setKeepAttachments((prev) =>
      prev.filter((a) => a.storagePath !== att.storagePath)
    );
    setRemovedAttachments((prev) => [...prev, att]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setFormError("");

    if (!title.trim()) {
      setFormError("Give the bug a title — what's broken?");
      titleRef.current?.focus();
      return;
    }

    const payload = {
      title: title.trim(),
      description,
      stepsToReproduce: steps,
      status,
      priority,
      severity,
      assigneeId,
      dueDate: dueDate || null,
    };

    try {
      setSubmitting(true);
      if (isEdit) {
        await updateBug(
          projectId,
          bug.id,
          payload,
          pendingFiles,
          removedAttachments,
          keepAttachments
        );
        toast.success("Bug updated");
      } else {
        await createBug(projectId, payload, pendingFiles, {
          uid: user?.uid,
          name: user?.displayName,
          email: user?.email,
        });
        toast.success("Bug filed");
      }
      onClose();
    } catch (err) {
      console.error(err);
      const msg = err?.message || err?.code || "Couldn't save the bug";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Render helpers ---------------- */

  const StatusTrigger = ({ toggle, open }) => {
    const cfg = STATUS[status];
    const Icon = cfg.icon;
    return (
      <PillButton onClick={toggle} active={open}>
        <Icon className={`h-3.5 w-3.5 ${TONE_ICON[cfg.tone]}`} />
        <span>{cfg.label}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </PillButton>
    );
  };

  const PriorityTrigger = ({ toggle, open }) => {
    const cfg = PRIORITY[priority];
    const Icon = cfg.icon;
    return (
      <PillButton onClick={toggle} active={open}>
        <Icon className={`h-3.5 w-3.5 ${TONE_ICON[cfg.tone]}`} />
        <span>{cfg.label}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </PillButton>
    );
  };

  const SeverityTrigger = ({ toggle, open }) => {
    const cfg = SEVERITY[severity];
    return (
      <PillButton onClick={toggle} active={open}>
        <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[cfg.tone]}`} />
        <span>{cfg.label}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </PillButton>
    );
  };

  const AssigneeTrigger = ({ toggle, open }) => (
    <PillButton onClick={toggle} active={open}>
      {assignee ? (
        <>
          <span className="h-4 w-4 rounded-full bg-accent-soft text-accent
            text-[9px] font-semibold inline-flex items-center justify-center">
            {initials(assignee.name)}
          </span>
          <span className="truncate max-w-[140px]">{assignee.name}</span>
        </>
      ) : (
        <>
          <User className="h-3.5 w-3.5 text-fg-subtle" />
          <span className="text-fg-muted">Unassigned</span>
        </>
      )}
      <ChevronDown className="h-3 w-3 opacity-60" />
    </PillButton>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      closeOnBackdrop={!submitting}
      title={isEdit ? "Edit bug" : "New bug"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="bug-form" loading={submitting}>
            {isEdit ? "Save changes" : "File bug"}
          </Button>
        </>
      }
    >
      <form id="bug-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div
            role="alert"
            className="mb-md p-sm rounded-md bg-error-50 border border-error-200 text-error-800 text-bodySm
              flex items-start gap-sm"
          >
            <CircleAlert className="h-4 w-4 shrink-0 mt-[1px]" />
            <span>{formError}</span>
          </div>
        )}

        {/* Big borderless title — Linear-style */}
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Bug title — what's broken?"
          className="w-full bg-transparent border-0 outline-none p-0
            text-page text-fg placeholder:text-fg-subtle
            focus:ring-0"
        />

        {/* Property pills */}
        <div className="mt-md flex flex-wrap items-center gap-xs">
          <PropertyMenu
            trigger={(s) => <StatusTrigger {...s} />}
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
                    selected={status === key}
                    onClick={() => {
                      setStatus(key);
                      close();
                    }}
                  />
                );
              })
            }
          </PropertyMenu>

          <PropertyMenu
            trigger={(s) => <PriorityTrigger {...s} />}
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
                    hint="priority"
                    selected={priority === key}
                    onClick={() => {
                      setPriority(key);
                      close();
                    }}
                  />
                );
              })
            }
          </PropertyMenu>

          <PropertyMenu
            trigger={(s) => <SeverityTrigger {...s} />}
          >
            {({ close }) =>
              SEVERITY_ORDER.map((key) => {
                const cfg = SEVERITY[key];
                return (
                  <button
                    key={key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSeverity(key);
                      close();
                    }}
                    className="w-full flex items-center gap-sm px-md py-sm text-bodySm text-fg
                      hover:bg-subtle transition-colors duration-fast text-left"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[cfg.tone]}`} />
                    <span className="flex-1">{cfg.label}</span>
                    <span className="text-caption text-fg-subtle">severity</span>
                    {severity === key && (
                      <Check className="h-3.5 w-3.5 text-accent" />
                    )}
                  </button>
                );
              })
            }
          </PropertyMenu>

          <PropertyMenu
            trigger={(s) => <AssigneeTrigger {...s} />}
            menuClassName="max-h-72 overflow-y-auto"
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
                {members.length > 0 && (
                  <div className="my-xs border-t border-line-subtle" />
                )}
                {members.length === 0 ? (
                  <p className="px-md py-sm text-caption text-fg-subtle">
                    Add team members to this project first.
                  </p>
                ) : (
                  members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAssigneeId(m.id);
                        close();
                      }}
                      className="w-full flex items-center gap-sm px-md py-sm text-bodySm text-fg
                        hover:bg-subtle transition-colors duration-fast text-left"
                    >
                      <span className="h-5 w-5 rounded-full bg-accent-soft text-accent
                        text-[10px] font-semibold inline-flex items-center justify-center shrink-0">
                        {initials(m.name)}
                      </span>
                      <span className="flex-1 truncate capitalize">
                        {m.id === user?.uid ? `${m.name} (You)` : m.name}
                      </span>
                      {assigneeId === m.id && (
                        <Check className="h-3.5 w-3.5 text-accent" />
                      )}
                    </button>
                  ))
                )}
              </>
            )}
          </PropertyMenu>

          {/* Due date — wraps a hidden native date input behind a pill */}
          <div className="relative inline-flex">
            <PillButton onClick={() => dateRef.current?.showPicker?.() || dateRef.current?.focus()}>
              <Calendar className="h-3.5 w-3.5 text-fg-subtle" />
              <span className={dueDate ? "" : "text-fg-muted"}>
                {formatDueDate(dueDate) || "Due date"}
              </span>
              {dueDate && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Clear due date"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDueDate("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      setDueDate("");
                    }
                  }}
                  className="ml-xs -mr-xs h-4 w-4 inline-flex items-center justify-center
                    rounded-xs text-fg-subtle hover:text-fg hover:bg-subtle"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </PillButton>
            <input
              ref={dateRef}
              type="date"
              value={dueDate}
              min={today()}
              onChange={(e) => setDueDate(e.target.value)}
              className="absolute inset-0 opacity-0 pointer-events-none"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Description */}
        <div className="mt-lg">
          <label
            htmlFor="bug-description"
            className="text-fg-muted text-label mb-xs block"
          >
            Description
          </label>
          <textarea
            id="bug-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's happening? What did you expect instead?"
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-body text-fg
              placeholder:text-fg-subtle leading-relaxed
              focus:border-accent focus:shadow-focus-ring focus:outline-none transition"
          />
        </div>

        {/* Steps to reproduce */}
        <div className="mt-md">
          <label
            htmlFor="bug-steps"
            className="text-fg-muted text-label mb-xs block"
          >
            Steps to reproduce
          </label>
          <textarea
            id="bug-steps"
            rows={4}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder={"1. Go to…\n2. Click…\n3. Observe…"}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-body text-fg
              placeholder:text-fg-subtle leading-relaxed font-mono text-bodySm
              focus:border-accent focus:shadow-focus-ring focus:outline-none transition"
          />
        </div>

        {/* Attachments */}
        <div className="mt-md">
          <div className="flex items-center justify-between mb-xs">
            <label className="text-fg-muted text-label block">
              Attachments
            </label>
            <label className="inline-flex items-center gap-xs text-bodySm text-accent
              hover:text-accent-hover transition-colors duration-fast cursor-pointer">
              <Paperclip className="h-3.5 w-3.5" />
              Add file
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleAddFiles}
              />
            </label>
          </div>

          {keepAttachments.length === 0 && pendingFiles.length === 0 ? (
            <div className="rounded-md border border-dashed border-line bg-canvas px-md py-md
              text-caption text-fg-subtle text-center">
              Drop screenshots, recordings, or logs here. (Max ~10 MB each.)
            </div>
          ) : (
            <ul className="flex flex-col gap-xs">
              {keepAttachments.map((att) => {
                const Icon = fileTypeIcon(att.type, att.name);
                return (
                  <li
                    key={att.storagePath || att.url}
                    className="flex items-center gap-md px-md py-sm rounded-md bg-canvas border border-line-subtle"
                  >
                    <Icon className="h-4 w-4 text-fg-subtle shrink-0" />
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 text-bodySm text-fg hover:text-accent
                        transition-colors duration-fast truncate"
                    >
                      {att.name}
                    </a>
                    <span className="text-caption text-fg-subtle shrink-0">
                      {formatBytes(att.size)}
                    </span>
                    <IconButton
                      icon={X}
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${att.name}`}
                      onClick={() => handleRemoveExisting(att)}
                    />
                  </li>
                );
              })}
              {pendingFiles.map((f, i) => {
                const Icon = fileTypeIcon(f.type, f.name);
                return (
                  <li
                    key={`pending-${i}`}
                    className="flex items-center gap-md px-md py-sm rounded-md
                      bg-accent-soft/40 border border-accent-200"
                  >
                    <Icon className="h-4 w-4 text-accent shrink-0" />
                    <span className="flex-1 min-w-0 text-bodySm text-fg truncate">
                      {f.name}
                    </span>
                    <span className="text-caption text-accent shrink-0 font-medium">
                      Pending
                    </span>
                    <span className="text-caption text-fg-subtle shrink-0">
                      {formatBytes(f.size)}
                    </span>
                    <IconButton
                      icon={X}
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => handleRemovePending(i)}
                    />
                  </li>
                );
              })}
            </ul>
          )}

          {submitting && pendingFiles.length > 0 && (
            <p className="mt-xs text-caption text-fg-subtle inline-flex items-center gap-xs">
              <Spinner size="xs" /> Uploading files…
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default BugFormModal;
