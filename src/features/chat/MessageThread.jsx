import React, { useEffect, useRef, useState } from "react";
import {
  Hash,
  MessageSquare,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  Heart,
  Eye,
} from "lucide-react";
import { toast } from "react-toastify";

import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import IconButton from "../../components/ui/IconButton";

const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDayDivider = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
};

const sameDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

const Avatar = ({ name, src, tone = "muted" }) => {
  const palette =
    tone === "own"
      ? "bg-accent text-accent-fg"
      : "bg-accent-soft text-accent";
  return (
    <div
      className={`h-8 w-8 rounded-full flex items-center justify-center text-bodySm font-semibold overflow-hidden shrink-0 ${palette}`}
    >
      {src ? (
        <img
          src={src.startsWith("http") ? src : `/images/${src}`}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </div>
  );
};

/* Chevron action menu — relies on its parent for absolute positioning.
   Only own-message version exposes Edit/Delete; others never get a
   chevron. Closes on outside click + Escape. */
const ActionMenu = ({ isOwn, onEdit, onDelete }) => {
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

  if (!onEdit && !onDelete) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`h-6 w-6 rounded-full flex items-center justify-center
          bg-elevated/90 backdrop-blur-sm border border-line shadow-sm
          text-fg-muted hover:text-fg
          transition-colors duration-fast`}
        aria-label="Message actions"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          className={`absolute mt-xs min-w-[140px] z-popover
            bg-elevated border border-line rounded-md shadow-lg py-xs
            animate-fade-in
            ${isOwn ? "right-0" : "left-0"}`}
          role="menu"
        >
          {onEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="w-full flex items-center gap-sm px-md py-sm text-bodySm text-fg
                hover:bg-subtle transition-colors duration-fast text-left"
            >
              <Pencil className="h-3.5 w-3.5 text-fg-subtle" />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-sm px-md py-sm text-bodySm text-error-700
                hover:bg-error-50 transition-colors duration-fast text-left"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* Wrap every case-insensitive `query` match in a <mark>. Returns
   `text` unchanged if `query` is empty. Used by the in-thread search
   bar to highlight hits inline. */
const highlightBody = (text, query) => {
  if (!text || !query) return text;
  const q = query.trim();
  if (!q) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark
        key={i}
        className="bg-warning-50 text-warning-700 rounded px-[1px]"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
};

const MessageBubble = ({
  message,
  isOwn,
  isEditing,
  currentUserId,
  highlightQuery,
  isActiveMatch,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onToggleLike,
}) => {
  const [draft, setDraft] = useState(message.body);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isEditing) setDraft(message.body);
  }, [isEditing, message.body]);

  const likedByUserIds = message.likedByUserIds ?? [];
  const likeCount = likedByUserIds.length;
  const likedByMe = likedByUserIds.includes(currentUserId);

  if (isEditing) {
    const submit = async () => {
      const trimmed = draft.trim();
      if (!trimmed || trimmed === message.body) {
        onCancelEdit();
        return;
      }
      try {
        setBusy(true);
        await onSaveEdit(trimmed);
      } catch (err) {
        toast.error(err?.message || "Couldn't save edit");
      } finally {
        setBusy(false);
      }
    };
    return (
      <div className="w-full flex flex-col gap-xs">
        <textarea
          autoFocus
          rows={Math.max(2, draft.split("\n").length)}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onCancelEdit();
            }
          }}
          className="w-full resize-none rounded-md border border-line bg-surface
            px-3 py-2 text-body text-fg
            focus:border-accent focus:shadow-focus-ring focus:outline-none transition leading-snug"
          style={{ minHeight: 60, maxHeight: 200 }}
        />
        <div className="flex items-center gap-xs justify-end">
          <span className="text-caption text-fg-subtle mr-auto">
            Enter to save · Esc to cancel
          </span>
          <IconButton
            icon={X}
            size="sm"
            variant="ghost"
            onClick={onCancelEdit}
            disabled={busy}
            aria-label="Cancel edit"
          />
          <IconButton
            icon={Check}
            size="sm"
            variant="primary"
            onClick={submit}
            disabled={busy || !draft.trim()}
            aria-label="Save edit"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative group/bubble flex flex-col gap-[2px]">
      {/* The bubble itself + the chevron overlay */}
      <div className="relative">
        <div
          className={`px-md py-sm rounded-lg whitespace-pre-wrap break-words leading-snug text-body
            ${
              isOwn
                ? "bg-accent-soft text-fg rounded-br-sm"
                : "bg-surface border border-line-subtle text-fg rounded-bl-sm"
            }
            ${isOwn ? "pr-lg" : ""}
            ${
              isActiveMatch
                ? "ring-2 ring-warning-500 ring-offset-2 ring-offset-bg/40"
                : ""
            }
            transition-shadow duration-fast`}
        >
          {highlightQuery ? highlightBody(message.body, highlightQuery) : message.body}
        </div>

        {/* Chevron action menu — own messages only. Hidden until the
            user hovers the bubble (or focuses any control inside). */}
        {isOwn && (
          <div className="absolute top-1 right-1 opacity-0 group-hover/bubble:opacity-100 focus-within:opacity-100 transition-opacity duration-fast">
            <ActionMenu
              isOwn={isOwn}
              onEdit={onStartEdit}
              onDelete={onDelete}
            />
          </div>
        )}
      </div>

      {/* Edited tag + reactions row */}
      <div
        className={`flex items-center gap-xs ${
          isOwn ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Like button — visible on hover for any message; pinned visible
            once at least one like exists. */}
        <button
          type="button"
          onClick={onToggleLike}
          className={`inline-flex items-center gap-xs px-sm py-[2px] rounded-full
            text-caption transition-all duration-fast
            ${
              likeCount > 0
                ? "opacity-100 bg-elevated border border-line"
                : "opacity-0 group-hover/bubble:opacity-100 hover:bg-subtle"
            }
            ${
              likedByMe
                ? "text-error border-error/30"
                : "text-fg-subtle hover:text-fg"
            }`}
          aria-label={likedByMe ? "Unlike" : "Like"}
        >
          <Heart
            className={`h-3 w-3 ${likedByMe ? "fill-error text-error" : ""}`}
          />
          {likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
        </button>

        {message.editedAt && (
          <span className="text-caption text-fg-subtle italic">edited</span>
        )}
      </div>
    </div>
  );
};

const MessageThread = ({
  conversation,
  messages,
  loading,
  currentUserId,
  highlightQuery,
  activeMatchId,
  onEditMessage,
  onDeleteMessage,
  onToggleLike,
}) => {
  const scrollRef = useRef(null);
  const wasAtBottom = useRef(true);
  const messageRefs = useRef(new Map());
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      wasAtBottom.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (wasAtBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    wasAtBottom.current = true;
  }, [conversation?.id]);

  /* Scroll the active search match into view whenever it changes —
     also re-attempts on `messages` changes, because a deep-linked hit
     from the global search arrives BEFORE the target conversation's
     messages have loaded. Once they render, the ref populates and we
     can scroll. `block: "center"` keeps the bubble visible. */
  useEffect(() => {
    if (!activeMatchId) return;
    const el = messageRefs.current.get(activeMatchId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeMatchId, messages]);

  /* Find the id of the most-recent OWN message that the DM peer has
     seen (createdAt <= peerLastReadAt). Renders a small "Seen" tag
     under that one bubble. Channels skip this entirely. */
  let lastSeenOwnMessageId = null;
  if (
    conversation?.type === "dm" &&
    conversation?.peerLastReadAt &&
    messages.length
  ) {
    const peerSeenAt = new Date(conversation.peerLastReadAt).getTime();
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (
        m.authorId === currentUserId &&
        new Date(m.createdAt).getTime() <= peerSeenAt
      ) {
        lastSeenOwnMessageId = m.id;
        break;
      }
    }
  }

  if (!conversation) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center px-lg">
        <EmptyState
          icon={MessageSquare}
          title="Pick a conversation"
          description="Choose a DM or project channel from the left to start chatting."
        />
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto bg-bg/40">
      {loading ? (
        <div className="flex flex-col gap-md px-md md:px-lg py-md">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-md">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 flex flex-col gap-xs">
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center h-full px-md md:px-lg">
          <EmptyState
            icon={Hash}
            title="No messages yet"
            description={
              conversation.type === "project"
                ? `Be the first to post in ${conversation.title}.`
                : `Send the first message to ${conversation.title}.`
            }
          />
        </div>
      ) : (
        <div className="min-h-full flex flex-col px-md md:px-lg py-md md:py-lg">
          <div className="mt-auto flex flex-col gap-xs">
            {messages.map((m, idx) => {
              const prev = messages[idx - 1];
              const isOwn = m.authorId === currentUserId;
              const showDivider =
                !prev || !sameDay(prev.createdAt, m.createdAt);
              const groupWithPrev =
                prev &&
                prev.authorId === m.authorId &&
                sameDay(prev.createdAt, m.createdAt) &&
                new Date(m.createdAt) - new Date(prev.createdAt) <
                  5 * 60 * 1000;
              const isLastSeen = m.id === lastSeenOwnMessageId;

              return (
                <React.Fragment key={m.id}>
                  {showDivider && (
                    <div className="flex items-center gap-md my-md first:mt-0">
                      <div className="h-px flex-1 bg-line-subtle" />
                      <span className="text-caption text-fg-subtle px-md py-[2px] rounded-full bg-subtle/60">
                        {formatDayDivider(m.createdAt)}
                      </span>
                      <div className="h-px flex-1 bg-line-subtle" />
                    </div>
                  )}

                  <div
                    ref={(el) => {
                      if (el) messageRefs.current.set(m.id, el);
                      else messageRefs.current.delete(m.id);
                    }}
                    className={`flex items-end gap-sm ${
                      isOwn ? "flex-row-reverse" : "flex-row"
                    } ${groupWithPrev ? "mt-[2px]" : "mt-md"}`}
                  >
                    <div className="w-8 shrink-0">
                      {!isOwn && !groupWithPrev && (
                        <Avatar name={m.authorName} src={m.authorAvatar} />
                      )}
                    </div>

                    <div
                      className={`flex flex-col max-w-[85%] sm:max-w-[80%] md:max-w-[75%] min-w-0 ${
                        isOwn ? "items-end" : "items-start"
                      }`}
                    >
                      {!groupWithPrev && (
                        <div
                          className={`flex items-baseline gap-sm mb-[2px] ${
                            isOwn ? "flex-row-reverse" : "flex-row"
                          }`}
                        >
                          {!isOwn && (
                            <span className="text-caption font-medium text-fg">
                              {m.authorName || "Unknown"}
                            </span>
                          )}
                          <span className="text-caption text-fg-subtle tabular-nums">
                            {formatTime(m.createdAt)}
                          </span>
                        </div>
                      )}

                      <MessageBubble
                        message={m}
                        isOwn={isOwn}
                        isEditing={editingId === m.id}
                        currentUserId={currentUserId}
                        highlightQuery={highlightQuery}
                        isActiveMatch={m.id === activeMatchId}
                        onStartEdit={
                          isOwn && onEditMessage ? () => setEditingId(m.id) : null
                        }
                        onCancelEdit={() => setEditingId(null)}
                        onSaveEdit={async (body) => {
                          await onEditMessage?.(m.id, body);
                          setEditingId(null);
                        }}
                        onDelete={
                          isOwn && onDeleteMessage
                            ? async () => {
                                if (
                                  !window.confirm(
                                    "Delete this message? This can't be undone."
                                  )
                                )
                                  return;
                                try {
                                  await onDeleteMessage(m.id);
                                } catch (err) {
                                  toast.error(
                                    err?.message ||
                                      "Couldn't delete message"
                                  );
                                }
                              }
                            : null
                        }
                        onToggleLike={
                          onToggleLike
                            ? async () => {
                                try {
                                  await onToggleLike(m.id, currentUserId);
                                } catch (err) {
                                  toast.error(
                                    err?.message || "Couldn't update like"
                                  );
                                }
                              }
                            : null
                        }
                      />

                      {/* Seen indicator — only on the most recent own
                          message the peer has read. */}
                      {isLastSeen && (
                        <span className="mt-[2px] inline-flex items-center gap-xs text-caption text-fg-subtle">
                          <Eye className="h-3 w-3" />
                          Seen
                        </span>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageThread;
