import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Send, MessageCircle, Pencil, Trash2, Check, X } from "lucide-react";

import IconButton from "../ui/IconButton";
import Skeleton from "../ui/Skeleton";
import Markdown from "../ui/Markdown";
import MentionTextarea from "./MentionTextarea";

import { useAuth } from "../../context/AuthContext";
import useUser from "../../hooks/useUser";
import useEmployees from "../../hooks/useEmployee";
import useComments from "../../hooks/useComments";
import {
  createComment,
  updateComment,
  deleteComment,
} from "../../services/comment.service";

const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatRelative = (value) => {
  if (!value) return "";
  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
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
  return `${mo}mo ago`;
};

/* ============================================================
   Single comment row
============================================================ */
const CommentRow = ({ comment, isMine, parentPath, members }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!draft.trim()) return;
    if (draft.trim() === comment.body) {
      setEditing(false);
      return;
    }
    try {
      setSaving(true);
      await updateComment(parentPath, comment.id, draft);
      setEditing(false);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Couldn't save comment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      setDeleting(true);
      await deleteComment(parentPath, comment.id);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Couldn't delete comment");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex gap-sm group">
      {/* Avatar */}
      <div className="h-8 w-8 shrink-0 rounded-full bg-accent-soft text-accent
        flex items-center justify-center text-caption font-semibold overflow-hidden">
        {comment.authorAvatar ? (
          <img
            src={`/images/${comment.authorAvatar}`}
            alt={comment.authorName}
            className="w-full h-full object-cover"
          />
        ) : (
          initials(comment.authorName)
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-xs flex-wrap">
          <span className="text-bodySm text-fg font-medium capitalize truncate">
            {comment.authorName}
          </span>
          <span className="text-caption text-fg-subtle">
            {formatRelative(comment.createdAt)}
          </span>
          {comment.edited && (
            <span className="text-caption text-fg-subtle">· edited</span>
          )}
          {isMine && !editing && (
            <span className="ml-auto inline-flex items-center gap-xs opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
              <IconButton
                icon={Pencil}
                size="sm"
                variant="ghost"
                aria-label="Edit comment"
                onClick={() => {
                  setDraft(comment.body || "");
                  setEditing(true);
                }}
              />
              <IconButton
                icon={Trash2}
                size="sm"
                variant="ghost"
                aria-label="Delete comment"
                onClick={handleDelete}
                disabled={deleting}
                className="text-error hover:text-error-700 hover:bg-error-50"
              />
            </span>
          )}
        </div>

        {editing ? (
          <div className="mt-xs flex flex-col gap-xs">
            <MentionTextarea
              value={draft}
              onChange={setDraft}
              members={members}
              rows={3}
              className="w-full rounded-md border border-line bg-surface
                text-bodySm text-fg px-sm py-sm resize-none
                focus:outline-none focus:border-accent focus:shadow-focus-ring"
            />
            <div className="flex items-center gap-xs">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !draft.trim()}
                className="inline-flex items-center gap-xs h-controlSm px-md rounded-sm
                  bg-accent text-accent-fg text-bodySm font-medium
                  hover:bg-accent-hover transition-colors duration-fast
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-3.5 w-3.5" />
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-xs h-controlSm px-md rounded-sm
                  text-bodySm text-fg-muted hover:text-fg hover:bg-subtle
                  transition-colors duration-fast"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <Markdown value={comment.body} members={members} className="mt-[2px]" />
        )}
      </div>
    </div>
  );
};

/* ============================================================
   Composer + thread
============================================================ */
const Comments = ({ parentPath }) => {
  const { user: authUser } = useAuth();
  const { user: profile } = useUser(authUser?.uid);
  const { comments, loading } = useComments(parentPath);
  const { employees } = useEmployees();

  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const endRef = useRef(null);

  // Scroll the latest comment into view when the list grows
  useEffect(() => {
    if (!loading && comments.length > 0) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [comments.length, loading]);

  const handlePost = async (e) => {
    e?.preventDefault?.();
    if (!draft.trim() || posting) return;
    try {
      setPosting(true);
      await createComment(parentPath, draft, {
        uid: authUser?.uid,
        name: profile?.name || authUser?.displayName,
        email: authUser?.email,
        avatar: profile?.avatar || null,
      });
      setDraft("");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Couldn't post comment");
    } finally {
      setPosting(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handlePost();
    }
  };

  return (
    <section
      aria-label="Comments"
      className="flex flex-col gap-md pt-md mt-md border-t border-line-subtle"
    >
      <header className="flex items-center gap-xs">
        <MessageCircle className="h-3.5 w-3.5 text-fg-subtle" />
        <h3 className="text-eyebrow uppercase text-fg-muted tracking-wider">
          Comments
        </h3>
        {!loading && comments.length > 0 && (
          <span className="text-caption text-fg-subtle tabular-nums">
            {comments.length}
          </span>
        )}
      </header>

      {/* Thread */}
      {loading ? (
        <ul className="flex flex-col gap-md">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i} className="flex gap-sm">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 flex flex-col gap-xs">
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </li>
          ))}
        </ul>
      ) : comments.length === 0 ? (
        <p className="text-bodySm text-fg-subtle">
          No comments yet. Start the discussion below.
        </p>
      ) : (
        <ul className="flex flex-col gap-md max-h-[280px] overflow-y-auto pr-xs">
          {comments.map((c) => (
            <li key={c.id}>
              <CommentRow
                comment={c}
                isMine={c.authorId === authUser?.uid}
                parentPath={parentPath}
                members={employees}
              />
            </li>
          ))}
          <div ref={endRef} />
        </ul>
      )}

      {/* Composer */}
      <form
        onSubmit={handlePost}
        className="flex items-start gap-sm pt-sm border-t border-line-subtle"
      >
        <div className="h-8 w-8 shrink-0 rounded-full bg-accent-soft text-accent
          flex items-center justify-center text-caption font-semibold overflow-hidden">
          {profile?.avatar ? (
            <img
              src={`/images/${profile.avatar}`}
              alt={profile?.name}
              className="w-full h-full object-cover"
            />
          ) : (
            initials(profile?.name || authUser?.email)
          )}
        </div>

        <div className="flex-1 flex flex-col gap-xs">
          <MentionTextarea
            value={draft}
            onChange={setDraft}
            onKeyDown={handleKeyDown}
            members={employees}
            rows={2}
            placeholder="Add a comment… type @ to mention"
            className="w-full rounded-md border border-line bg-surface
              text-bodySm text-fg px-sm py-sm resize-none
              focus:outline-none focus:border-accent focus:shadow-focus-ring
              placeholder:text-fg-subtle"
          />
          <div className="flex items-center justify-between">
            <span className="text-caption text-fg-subtle">
              Markdown · @ to mention · ⌘/Ctrl + Enter to post
            </span>
            <button
              type="submit"
              disabled={!draft.trim() || posting}
              className="inline-flex items-center gap-xs h-controlSm px-md rounded-sm
                bg-accent text-accent-fg text-bodySm font-medium
                hover:bg-accent-hover transition-colors duration-fast
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};

export default Comments;
