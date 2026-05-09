import React, { useState } from "react";
import {
  Calendar,
  Pencil,
  Trash2,
  Download,
  FileText,
  FileImage,
  FileSpreadsheet,
  File as FileIcon,
  Users,
} from "lucide-react";

import IconButton from "../../components/ui/IconButton";

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

const formatMeetingDate = (raw) => {
  if (!raw) return "—";
  // raw is ISO date string (YYYY-MM-DD) from the form
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatRelative = (value) => {
  if (!value) return null;
  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
};

const fileTypeIcon = (type = "", name = "") => {
  if (type.startsWith("image/")) return FileImage;
  if (type.includes("spreadsheet") || /\.(xlsx?|csv)$/i.test(name))
    return FileSpreadsheet;
  if (type.includes("pdf") || /\.pdf$/i.test(name)) return FileText;
  if (type.includes("word") || /\.(docx?|txt|md)$/i.test(name)) return FileText;
  return FileIcon;
};

const Avatar = ({ user, size = "sm", title }) => {
  const sizeClass =
    size === "xs" ? "h-6 w-6 text-[10px]" :
    size === "md" ? "h-8 w-8 text-caption" :
    "h-7 w-7 text-caption"; // sm default

  return (
    <div
      title={title || user?.name}
      className={`shrink-0 rounded-full bg-accent-soft text-accent
        border-2 border-surface flex items-center justify-center font-semibold overflow-hidden ${sizeClass}`}
    >
      {user?.avatar ? (
        <img
          src={`/images/${user.avatar}`}
          alt={user.name}
          className="w-full h-full object-cover"
        />
      ) : (
        initials(user?.name || "?")
      )}
    </div>
  );
};

const CONTENT_CLAMP_CHARS = 320;

const MeetingNoteCard = ({
  note,
  members = [],         // resolved member user objects (id → user) for attendee lookup
  authorUser,           // resolved author user object
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
  onView,               // open the read-only view modal (with comments)
}) => {
  const [expanded, setExpanded] = useState(false);

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const attendees = (note.attendeeIds || [])
    .map((id) => memberMap.get(id))
    .filter(Boolean);

  const content = note.content || "";
  const isLong = content.length > CONTENT_CLAMP_CHARS;
  const visibleContent =
    expanded || !isLong ? content : `${content.slice(0, CONTENT_CLAMP_CHARS)}…`;

  const attachments = note.attachments || [];
  const showActions = canEdit || canDelete;

  const handleCardClick = () => onView?.();
  const handleCardKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onView?.();
    }
  };
  const stop = (e) => e.stopPropagation();

  return (
    <article
      role={onView ? "button" : undefined}
      tabIndex={onView ? 0 : undefined}
      onClick={onView ? handleCardClick : undefined}
      onKeyDown={onView ? handleCardKeyDown : undefined}
      className={`group relative bg-surface border border-line rounded-lg
        transition-[border-color,box-shadow] duration-fast hover:border-line-strong
        focus-visible:outline-none focus-visible:shadow-focus-ring
        ${onView ? "cursor-pointer" : ""}`}
    >
      {/* Header */}
      <header className="flex items-start gap-md px-lg pt-md pb-sm">
        {/* Author avatar */}
        <Avatar user={authorUser || { name: note.createdByName }} size="md" />

        <div className="flex-1 min-w-0">
          <h3 className="text-body text-fg font-semibold truncate">
            {note.title || "Untitled meeting"}
          </h3>
          <div className="flex flex-wrap items-center gap-x-sm gap-y-[2px] mt-[2px] text-caption text-fg-subtle">
            <span className="inline-flex items-center gap-xs">
              <Calendar className="h-3 w-3" />
              {formatMeetingDate(note.meetingDate)}
            </span>
            <span aria-hidden>·</span>
            <span className="truncate">
              <span className="text-fg-muted font-medium capitalize">
                {authorUser?.name || note.createdByName || "Unknown"}
              </span>
              {note.createdAt && (
                <>
                  {" "}
                  added{" "}
                  <span title={String(note.createdAt)}>
                    {formatRelative(note.createdAt) || ""}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center gap-xs opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
            {canEdit && (
              <IconButton
                icon={Pencil}
                size="sm"
                variant="ghost"
                aria-label="Edit note"
                onClick={(e) => {
                  stop(e);
                  onEdit?.();
                }}
              />
            )}
            {canDelete && (
              <IconButton
                icon={Trash2}
                size="sm"
                variant="destructive"
                aria-label="Delete note"
                onClick={(e) => {
                  stop(e);
                  onDelete?.();
                }}
              />
            )}
          </div>
        )}
      </header>

      {/* Content */}
      {content.trim() && (
        <div className="px-lg pb-md">
          <p className="text-body text-fg whitespace-pre-line leading-relaxed">
            {visibleContent}
          </p>
          {isLong && (
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                setExpanded((x) => !x);
              }}
              className="mt-xs text-bodySm text-accent hover:text-accent-hover transition-colors duration-fast"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {/* Attendees + attachments footer */}
      {(attendees.length > 0 || attachments.length > 0) && (
        <footer className="px-lg pb-md pt-sm border-t border-line-subtle flex flex-col gap-sm">
          {attendees.length > 0 && (
            <div className="flex items-center gap-md flex-wrap">
              <span className="text-eyebrow uppercase text-fg-subtle inline-flex items-center gap-xs">
                <Users className="h-3 w-3" />
                Attendees
              </span>
              <div className="flex items-center gap-sm">
                <div className="flex -space-x-2">
                  {attendees.slice(0, 6).map((u) => (
                    <Avatar key={u.id} user={u} size="xs" title={u.name} />
                  ))}
                </div>
                {attendees.length > 6 && (
                  <span className="text-caption text-fg-subtle">
                    +{attendees.length - 6} more
                  </span>
                )}
                <span className="text-caption text-fg-muted truncate">
                  {attendees
                    .slice(0, 3)
                    .map((u) => u.name?.split(" ")[0])
                    .filter(Boolean)
                    .join(", ")}
                  {attendees.length > 3 && ` +${attendees.length - 3}`}
                </span>
              </div>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="flex flex-col gap-xs">
              <span className="text-eyebrow uppercase text-fg-subtle">
                Attachments ({attachments.length})
              </span>
              <ul className="flex flex-col gap-xs">
                {attachments.map((att) => {
                  const Icon = fileTypeIcon(att.type, att.name);
                  return (
                    <li
                      key={att.storagePath || att.url}
                      className="flex items-center gap-md px-md py-sm rounded-md bg-canvas border border-line-subtle hover:border-line-strong transition-colors duration-fast"
                    >
                      <Icon className="h-4 w-4 text-fg-subtle shrink-0" />
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={stop}
                        className="flex-1 min-w-0 text-bodySm text-fg hover:text-accent transition-colors duration-fast truncate"
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
                        onClick={stop}
                        aria-label={`Download ${att.name}`}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-sm text-fg-muted hover:bg-subtle hover:text-fg transition-colors duration-fast"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </footer>
      )}
    </article>
  );
};

export default MeetingNoteCard;
