import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import {
  Paperclip,
  X,
  FileText,
  FileImage,
  FileSpreadsheet,
  File as FileIcon,
} from "lucide-react";

import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import IconButton from "../../components/ui/IconButton";
import Spinner from "../../components/ui/Spinner";

import { useAuth } from "../../context/AuthContext";
import {
  createMeetingNote,
  updateMeetingNote,
} from "../../services/meetingNotes.service";

const reactSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "36px",
    borderColor: state.isFocused ? "rgb(6 29 111)" : "rgb(228 228 231)",
    boxShadow: state.isFocused
      ? "0 0 0 3px rgba(59, 130, 246, 0.25)"
      : "none",
    borderRadius: "8px",
    fontSize: "14px",
    "&:hover": {
      borderColor: state.isFocused ? "rgb(6 29 111)" : "rgb(212 212 216)",
    },
  }),
  option: (base, state) => ({
    ...base,
    fontSize: "14px",
    backgroundColor: state.isSelected
      ? "rgb(239 246 255)"
      : state.isFocused
      ? "rgb(244 244 245)"
      : "white",
    color: "rgb(24 24 27)",
    cursor: "pointer",
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "rgb(239 246 255)",
    borderRadius: "4px",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "rgb(6 29 111)",
    fontSize: "12px",
    fontWeight: 500,
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "rgb(6 29 111)",
    ":hover": { backgroundColor: "rgb(219 234 254)", color: "rgb(6 29 111)" },
  }),
  placeholder: (base) => ({ ...base, fontSize: "14px", color: "rgb(113 113 122)" }),
  indicatorSeparator: () => ({ display: "none" }),
};

const today = () => new Date().toISOString().slice(0, 10);

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

/**
 * Reusable form modal — handles both create and edit.
 * Props:
 *  - isOpen, onClose
 *  - projectId
 *  - members: array of project member user objects (for the attendees picker)
 *  - note: existing note for edit mode (null/undefined = create mode)
 */
const MeetingNoteFormModal = ({ isOpen, onClose, projectId, members = [], note }) => {
  const isEdit = Boolean(note);
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [meetingDate, setMeetingDate] = useState(today());
  const [attendees, setAttendees] = useState([]); // react-select options
  const [pendingFiles, setPendingFiles] = useState([]); // File[] to upload
  const [keepAttachments, setKeepAttachments] = useState([]); // existing kept
  const [removedAttachments, setRemovedAttachments] = useState([]); // existing removed
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.id,
        label: m.id === user?.uid ? `${m.name} (You)` : m.name,
      })),
    [members, user?.uid]
  );

  /* Prefill on open / when note changes */
  useEffect(() => {
    if (!isOpen) return;
    if (note) {
      setTitle(note.title || "");
      setContent(note.content || "");
      setMeetingDate(note.meetingDate || today());
      setAttendees(
        (note.attendeeIds || [])
          .map((id) => {
            const m = members.find((mm) => mm.id === id);
            return m ? { value: m.id, label: m.name } : null;
          })
          .filter(Boolean)
      );
      setKeepAttachments(note.attachments || []);
      setRemovedAttachments([]);
      setPendingFiles([]);
    } else {
      setTitle("");
      setContent("");
      setMeetingDate(today());
      setAttendees([]);
      setKeepAttachments([]);
      setRemovedAttachments([]);
      setPendingFiles([]);
    }
    setFormError("");
  }, [isOpen, note, members]);

  const handleAddFiles = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (incoming.length === 0) return;
    setPendingFiles((prev) => [...prev, ...incoming]);
    // Reset the input so the same file can be re-added if removed and re-picked
    e.target.value = "";
  };

  const handleRemovePending = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

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
      setFormError("Give the meeting a title.");
      return;
    }

    const payload = {
      title: title.trim(),
      content,
      meetingDate,
      attendeeIds: attendees.map((a) => a.value),
    };

    try {
      setSubmitting(true);
      if (isEdit) {
        await updateMeetingNote(
          projectId,
          note.id,
          payload,
          pendingFiles,
          removedAttachments,
          keepAttachments
        );
        toast.success("Meeting note updated");
      } else {
        await createMeetingNote(projectId, payload, pendingFiles, {
          uid: user?.uid,
          name: user?.displayName,
          email: user?.email,
        });
        toast.success("Meeting note added");
      }
      onClose();
    } catch (err) {
      console.error(err);
      const msg = err?.message || err?.code || "Couldn't save meeting note";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      closeOnBackdrop={!submitting}
      title={isEdit ? "Edit meeting note" : "Add meeting note"}
      description={
        isEdit
          ? "Update the recap, attendees, or attachments."
          : "Capture decisions, attendees, and any files shared."
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="meeting-note-form"
            loading={submitting}
            leadingIcon={submitting ? undefined : undefined}
          >
            {isEdit ? "Save changes" : "Add note"}
          </Button>
        </>
      }
    >
      <form id="meeting-note-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div
            role="alert"
            className="mb-md p-sm rounded-md bg-error-50 border border-error-200 text-error-800 text-bodySm"
          >
            {formError}
          </div>
        )}

        <div className="flex flex-col gap-md">
          <div className="flex flex-row gap-md">
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sprint kickoff · April 12"
              wrapperClassName="!flex-[2]"
            />
            <Input
              label="Meeting date"
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              wrapperClassName="!flex-1"
            />
          </div>

          <div>
            <label className="text-fg-muted text-label mb-xs block">
              Attendees ({attendees.length})
            </label>
            <Select
              isMulti
              options={memberOptions}
              value={attendees}
              onChange={(opts) => setAttendees(opts || [])}
              placeholder={
                memberOptions.length === 0
                  ? "Assign team members to this project first"
                  : "Who was in the meeting?"
              }
              isDisabled={memberOptions.length === 0}
              styles={reactSelectStyles}
              classNamePrefix="react-select"
            />
          </div>

          <div>
            <label
              htmlFor="meeting-note-content"
              className="text-fg-muted text-label mb-xs block"
            >
              Notes
            </label>
            <textarea
              id="meeting-note-content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Decisions, blockers, action items…"
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-body text-fg
                placeholder:text-fg-subtle leading-relaxed
                focus:border-accent focus:shadow-focus-ring focus:outline-none transition"
            />
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-xs">
              <label className="text-fg-muted text-label block">
                Attachments
              </label>
              <label
                className="inline-flex items-center gap-xs text-bodySm text-accent hover:text-accent-hover transition-colors duration-fast cursor-pointer"
              >
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

            {keepAttachments.length === 0 &&
            pendingFiles.length === 0 ? (
              <div className="rounded-md border border-dashed border-line bg-canvas px-md py-md text-caption text-fg-subtle text-center">
                No files attached. Click "Add file" above to attach docs,
                screenshots, or recordings.
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
                        className="flex-1 min-w-0 text-bodySm text-fg hover:text-accent transition-colors duration-fast truncate"
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
                      className="flex items-center gap-md px-md py-sm rounded-md bg-accent-soft/40 border border-accent-200"
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
        </div>
      </form>
    </Modal>
  );
};

export default MeetingNoteFormModal;
