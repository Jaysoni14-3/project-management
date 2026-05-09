import React from "react";
import {
  Pencil,
  Trash2,
  Calendar,
  Paperclip,
  Users as UsersIcon,
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
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

const fileTypeIcon = (type = "", name = "") => {
  if (type.startsWith("image/")) return FileImage;
  if (type.includes("spreadsheet") || /\.(xlsx?|csv)$/i.test(name)) return FileSpreadsheet;
  if (type.includes("pdf") || /\.pdf$/i.test(name)) return FileText;
  if (type.includes("word") || /\.(docx?|txt|md)$/i.test(name)) return FileText;
  return FileIcon;
};

const Avatar = ({ user, size = "sm", title }) => {
  const sizeClass =
    size === "xs" ? "h-6 w-6 text-[10px]" :
    size === "md" ? "h-9 w-9 text-bodySm" :
    "h-7 w-7 text-caption";
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

const DetailRow = ({ label, children }) => (
  <div className="flex items-center justify-between py-sm gap-md">
    <span className="text-caption text-fg-subtle">{label}</span>
    <span className="text-bodySm text-fg text-right truncate min-w-0">
      {children}
    </span>
  </div>
);

const MeetingNoteViewModal = ({
  isOpen,
  onClose,
  note,
  members = [],
  authorUser,
  projectId,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
}) => {
  if (!note) return null;

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const attendees = (note.attendeeIds || [])
    .map((id) => memberMap.get(id))
    .filter(Boolean);
  const attachments = note.attachments || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={note.title || "Untitled meeting"}
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
      {/* Header strip — author + meeting date */}
      <div className="flex items-center gap-md">
        <Avatar
          user={authorUser || { name: note.createdByName }}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <p className="text-bodySm text-fg font-medium capitalize truncate">
            {authorUser?.name || note.createdByName || "Unknown"}
          </p>
          <p className="text-caption text-fg-subtle inline-flex items-center gap-xs">
            <Calendar className="h-3 w-3" />
            {formatMeetingDate(note.meetingDate)}
          </p>
        </div>
      </div>

      {/* Content */}
      {note.content?.trim() && (
        <div className="mt-lg">
          <p className="text-eyebrow uppercase text-fg-subtle mb-xs">
            Notes
          </p>
          <Markdown value={note.content} />
        </div>
      )}

      {/* Attendees */}
      {attendees.length > 0 && (
        <div className="mt-lg">
          <p className="text-eyebrow uppercase text-fg-subtle mb-xs inline-flex items-center gap-xs">
            <UsersIcon className="h-3 w-3" />
            Attendees ({attendees.length})
          </p>
          <div className="flex items-center gap-sm flex-wrap mt-xs">
            <div className="flex -space-x-2">
              {attendees.slice(0, 8).map((u) => (
                <Avatar key={u.id} user={u} size="xs" title={u.name} />
              ))}
            </div>
            <span className="text-bodySm text-fg-muted truncate">
              {attendees
                .slice(0, 4)
                .map((u) => u.name?.split(" ")[0])
                .filter(Boolean)
                .join(", ")}
              {attendees.length > 4 && ` +${attendees.length - 4}`}
            </span>
          </div>
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

      {/* Detail strip */}
      <div className="mt-lg pt-md border-t border-line-subtle divide-y divide-line-subtle">
        <DetailRow label="Created">
          {formatDateLong(note.createdAt) || "—"}
        </DetailRow>
        {note.updatedAt && note.updatedAt !== note.createdAt && (
          <DetailRow label="Last updated">
            {formatDateLong(note.updatedAt) || "—"}
          </DetailRow>
        )}
      </div>

      {/* Comments */}
      <Comments parentPath={`projects/${projectId}/meetingNotes/${note.id}`} />
    </Modal>
  );
};

export default MeetingNoteViewModal;
