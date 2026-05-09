import React from "react";
import {
  Pencil,
  Trash2,
  Calendar,
  Paperclip,
  User,
  Download,
  FileText,
  FileImage,
  FileSpreadsheet,
  File as FileIcon,
} from "lucide-react";

import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Comments from "../../components/comments/Comments";
import Markdown from "../../components/ui/Markdown";

import {
  STATUS,
  PRIORITY,
  SEVERITY,
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

const formatBytes = (bytes) => {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileTypeIcon = (type = "", name = "") => {
  if (type.startsWith("image/")) return FileImage;
  if (type.includes("spreadsheet") || /\.(xlsx?|csv)$/i.test(name)) return FileSpreadsheet;
  if (type.includes("pdf") || /\.pdf$/i.test(name)) return FileText;
  if (type.includes("word") || /\.(docx?|txt|md)$/i.test(name)) return FileText;
  return FileIcon;
};

const formatDateLong = (raw) => {
  if (!raw) return null;
  const d = typeof raw?.toDate === "function" ? raw.toDate() : new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

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

const Pill = ({ children, className = "" }) => (
  <span
    className={`inline-flex items-center gap-xs h-controlSm px-md rounded-md
      border border-line bg-surface text-bodySm text-fg ${className}`}
  >
    {children}
  </span>
);

const SidebarField = ({ label, children }) => (
  <div className="flex flex-col gap-xs py-md first:pt-0 last:pb-0">
    <span className="text-eyebrow uppercase text-fg-subtle tracking-wider">
      {label}
    </span>
    <div className="text-bodySm text-fg min-w-0">{children}</div>
  </div>
);

const BugViewModal = ({
  isOpen,
  onClose,
  bug,
  members = [],
  projectId,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
}) => {
  if (!bug) return null;

  const statusCfg = STATUS[bug.status] || STATUS.backlog;
  const priorityCfg = PRIORITY[bug.priority] || PRIORITY.medium;
  const severityCfg = SEVERITY[bug.severity] || SEVERITY.medium;
  const StatusIcon = statusCfg.icon;
  const PriorityIcon = priorityCfg.icon;

  const assignee = members.find((m) => m.id === bug.assigneeId) || null;
  const due = formatDue(bug.dueDate);
  const attachments = bug.attachments || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={bug.title || "Untitled bug"}
      description={null}
      footer={
        <>
          {canDelete && (
            <Button
              variant="ghost"
              leadingIcon={Trash2}
              onClick={onDelete}
              className="text-error hover:bg-error-50 hover:text-error-700 mr-auto"
            >
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {canEdit && (
            <Button leadingIcon={Pencil} onClick={onEdit}>
              Edit
            </Button>
          )}
        </>
      }
    >
      {/* Two-column layout — main content left, properties sidebar right.
          The Modal body is the scroll container; the sidebar uses sticky
          positioning so it stays visible as the main column scrolls past. */}
      <div className="flex flex-col lg:flex-row gap-xl items-start">
        {/* Main column */}
        <div className="flex-1 min-w-0 w-full">
          {/* Description */}
          {bug.description?.trim() && (
            <div>
              <p className="text-eyebrow uppercase text-fg-subtle mb-xs">
                Description
              </p>
              <Markdown value={bug.description} />
            </div>
          )}

          {/* Steps to reproduce */}
          {bug.stepsToReproduce?.trim() && (
            <div className={bug.description?.trim() ? "mt-lg" : ""}>
              <p className="text-eyebrow uppercase text-fg-subtle mb-xs">
                Steps to reproduce
              </p>
              <Markdown value={bug.stepsToReproduce} />
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mt-lg">
              <p className="text-eyebrow uppercase text-fg-subtle mb-xs inline-flex items-center gap-xs">
                <Paperclip className="h-3 w-3" />
                Attachments ({attachments.length})
              </p>
              <ul className="flex flex-col gap-xs mt-xs">
                {attachments.map((att) => {
                  const Icon = fileTypeIcon(att.type, att.name);
                  return (
                    <li
                      key={att.storagePath || att.url}
                      className="flex items-center gap-md px-md py-sm rounded-md
                        bg-canvas border border-line-subtle hover:border-line-strong
                        transition-colors duration-fast"
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
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={att.name}
                        aria-label={`Download ${att.name}`}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-sm
                          text-fg-muted hover:bg-subtle hover:text-fg transition-colors duration-fast"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Comments */}
          <Comments parentPath={`projects/${projectId}/bugs/${bug.id}`} />
        </div>

        {/* Properties sidebar — sticky inside the modal scroll area on lg+,
            stacks above-content on small screens. */}
        <aside
          className="w-full lg:w-[240px] lg:shrink-0 lg:sticky lg:top-0
            lg:border-l lg:border-line-subtle lg:pl-xl
            divide-y divide-line-subtle"
        >
          <SidebarField label="Status">
            <Pill>
              <StatusIcon className={`h-3.5 w-3.5 ${TONE_ICON[statusCfg.tone]}`} />
              {statusCfg.label}
            </Pill>
          </SidebarField>

          <SidebarField label="Priority">
            <Pill>
              <PriorityIcon className={`h-3.5 w-3.5 ${TONE_ICON[priorityCfg.tone]}`} />
              {priorityCfg.label}
            </Pill>
          </SidebarField>

          <SidebarField label="Severity">
            <Pill>
              <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[severityCfg.tone]}`} />
              <span className="capitalize">{severityCfg.label}</span>
            </Pill>
          </SidebarField>

          {due && (
            <SidebarField label="Due date">
              <span
                className={`inline-flex items-center gap-xs ${
                  due.overdue ? "text-error-700" : "text-fg"
                }`}
              >
                <Calendar className="h-3.5 w-3.5 text-fg-subtle" />
                <span className="tabular-nums">{due.label}</span>
                {due.overdue && (
                  <span className="text-caption text-error">overdue</span>
                )}
              </span>
            </SidebarField>
          )}

          <SidebarField label={bug.assignees?.length > 1 ? "Assignees" : "Assignee"}>
            {bug.assignees?.length ? (
              <div className="flex flex-col gap-xs">
                {bug.assignees.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-xs">
                    {a.avatar ? (
                      <img
                        src={a.avatar.startsWith("http") ? a.avatar : `/images/${a.avatar}`}
                        alt={a.name}
                        className="h-5 w-5 rounded-full object-cover border border-line"
                      />
                    ) : (
                      <span
                        className="h-5 w-5 rounded-full bg-accent-soft text-accent
                          text-[10px] font-semibold inline-flex items-center justify-center"
                      >
                        {initials(a.name)}
                      </span>
                    )}
                    <span className="capitalize truncate">{a.name}</span>
                    {a.primary && bug.assignees.length > 1 && (
                      <span className="text-caption text-fg-subtle">(primary)</span>
                    )}
                  </span>
                ))}
              </div>
            ) : assignee ? (
              <span className="inline-flex items-center gap-xs">
                {assignee.avatar ? (
                  <img
                    src={`/images/${assignee.avatar}`}
                    alt={assignee.name}
                    className="h-5 w-5 rounded-full object-cover border border-line"
                  />
                ) : (
                  <span
                    className="h-5 w-5 rounded-full bg-accent-soft text-accent
                      text-[10px] font-semibold inline-flex items-center justify-center"
                  >
                    {initials(assignee.name)}
                  </span>
                )}
                <span className="capitalize truncate">{assignee.name}</span>
              </span>
            ) : (
              <span className="text-fg-subtle inline-flex items-center gap-xs">
                <User className="h-3.5 w-3.5" />
                Unassigned
              </span>
            )}
          </SidebarField>

          <SidebarField label="Reporter">
            <span className="capitalize">{bug.reporterName || "Unknown"}</span>
          </SidebarField>

          <SidebarField label="Created">
            <span className="tabular-nums">
              {formatDateLong(bug.createdAt) || "—"}
            </span>
          </SidebarField>

          {bug.updatedAt && (
            <SidebarField label="Last updated">
              <span className="tabular-nums">
                {formatDateLong(bug.updatedAt) || "—"}
              </span>
            </SidebarField>
          )}
        </aside>
      </div>
    </Modal>
  );
};

export default BugViewModal;
