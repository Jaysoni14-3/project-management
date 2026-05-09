import React, { useEffect, useMemo, useState } from "react";
import { MessageSquare, Hash, Plus, Search, X, Loader2 } from "lucide-react";

import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { searchMessages } from "../../services/conversation.service";

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
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/* Wraps every case-insensitive occurrence of `query` in a <mark> so the
   client can render highlighted snippets without dangerouslySetInnerHTML.
   Returns an array of React nodes (string + <mark>), safe to render. */
const highlight = (text, query) => {
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

const ConversationRow = ({ conversation, active, onSelect, queryHighlight }) => {
  const isProject = conversation.type === "project";
  const unread = conversation.unreadCount > 0;
  const preview = conversation.lastMessage?.body
    ? conversation.lastMessage.body.length > 60
      ? `${conversation.lastMessage.body.slice(0, 60)}…`
      : conversation.lastMessage.body
    : isProject
    ? "Project channel"
    : "Say hello";

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      className={`w-full text-left flex items-center gap-md px-md py-sm rounded-md
        transition-colors duration-fast
        ${active ? "bg-accent-soft" : "hover:bg-subtle/60"}`}
    >
      <div
        className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center
          ${
            isProject
              ? "bg-warning-50 text-warning-700"
              : "bg-accent-soft text-accent"
          }
          font-semibold text-bodySm overflow-hidden`}
      >
        {isProject ? (
          <Hash className="h-4 w-4" aria-hidden />
        ) : conversation.peer?.avatar ? (
          <img
            src={
              conversation.peer.avatar.startsWith("http")
                ? conversation.peer.avatar
                : `/images/${conversation.peer.avatar}`
            }
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          initials(conversation.title)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-sm">
          <p
            className={`text-bodySm truncate ${
              unread ? "text-fg font-semibold" : "text-fg font-medium"
            }`}
          >
            {queryHighlight
              ? highlight(conversation.title, queryHighlight)
              : conversation.title}
          </p>
          {conversation.lastMessageAt && (
            <span className="ml-auto shrink-0 text-caption text-fg-subtle tabular-nums">
              {formatRelative(conversation.lastMessageAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-sm">
          <p
            className={`text-caption truncate ${
              unread ? "text-fg-muted" : "text-fg-subtle"
            }`}
          >
            {preview}
          </p>
          {unread && (
            <span className="ml-auto shrink-0 inline-flex items-center justify-center h-4 min-w-[16px] px-[5px] rounded-full bg-accent text-accent-fg text-[10px] font-semibold tabular-nums">
              {conversation.unreadCount > 99
                ? "99+"
                : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

const MessageHitRow = ({ hit, onSelect, query }) => {
  const isProject = hit.conversationType === "project";
  return (
    <button
      type="button"
      onClick={() => onSelect(hit)}
      className="w-full text-left flex items-start gap-md px-md py-sm rounded-md hover:bg-subtle/60 transition-colors duration-fast"
    >
      <div
        className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center font-semibold text-bodySm overflow-hidden
          ${
            isProject
              ? "bg-warning-50 text-warning-700"
              : "bg-accent-soft text-accent"
          }`}
      >
        {isProject ? (
          <Hash className="h-4 w-4" aria-hidden />
        ) : hit.peer?.avatar ? (
          <img
            src={
              hit.peer.avatar.startsWith("http")
                ? hit.peer.avatar
                : `/images/${hit.peer.avatar}`
            }
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          initials(hit.conversationTitle)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-sm">
          <p className="text-bodySm font-medium text-fg truncate">
            {hit.conversationTitle}
          </p>
          <span className="ml-auto shrink-0 text-caption text-fg-subtle tabular-nums">
            {formatRelative(hit.createdAt)}
          </span>
        </div>
        <p className="text-caption text-fg-muted truncate">
          <span className="text-fg-subtle">{hit.authorName}: </span>
          {highlight(hit.body, query)}
        </p>
      </div>
    </button>
  );
};

const ConversationList = ({
  conversations = [],
  loading,
  activeId,
  onSelect,
  onSelectMessageHit,
  onStartDm,
}) => {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState([]);
  const [searching, setSearching] = useState(false);

  const trimmed = query.trim();
  const isSearching = trimmed.length > 0;

  /* Local title filter for the conversations themselves. Cheap, runs
     synchronously on every keystroke. */
  const filteredConversations = useMemo(() => {
    if (!isSearching) return conversations;
    const q = trimmed.toLowerCase();
    return conversations.filter((c) =>
      (c.title || "").toLowerCase().includes(q)
    );
  }, [conversations, trimmed, isSearching]);

  const dms = filteredConversations.filter((c) => c.type === "dm");
  const channels = filteredConversations.filter((c) => c.type === "project");

  /* Debounced server query for message-body hits. ~250ms feels snappy
     without spamming the API on every keystroke. */
  useEffect(() => {
    if (!isSearching) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      try {
        const data = await searchMessages(trimmed, { limit: 20 });
        if (!controller.signal.aborted) setHits(data || []);
      } catch (err) {
        if (!controller.signal.aborted) setHits([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [trimmed, isSearching]);

  const noConversationMatches = isSearching && filteredConversations.length === 0;
  const noResultsAtAll =
    isSearching && filteredConversations.length === 0 && hits.length === 0 && !searching;

  return (
    <div className="flex flex-col h-full bg-surface w-full">
      <div className="shrink-0 px-md py-md border-b border-line-subtle flex items-center justify-between gap-sm">
        <div className="flex items-center gap-sm min-w-0">
          <MessageSquare className="h-4 w-4 text-fg-subtle shrink-0" />
          <h2 className="text-section text-fg truncate">Chat</h2>
        </div>
        <button
          type="button"
          onClick={onStartDm}
          className="inline-flex items-center gap-xs h-controlSm px-md rounded-md
            border border-line bg-surface text-bodySm text-fg-muted
            hover:bg-subtle hover:text-fg hover:border-line-strong
            transition-colors duration-fast"
          title="Start a new direct message"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>

      {/* Search bar */}
      <div className="shrink-0 px-md pt-sm pb-sm border-b border-line-subtle">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats and messages…"
            className="w-full h-controlSm rounded-md border border-line bg-surface pl-9 pr-9 text-bodySm text-fg
              placeholder:text-fg-subtle
              focus:border-accent focus:shadow-focus-ring focus:outline-none transition"
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded
                inline-flex items-center justify-center
                text-fg-subtle hover:text-fg hover:bg-subtle transition-colors"
              aria-label="Clear search"
            >
              {searching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-sm py-sm flex flex-col gap-md">
        {loading ? (
          <div className="flex flex-col gap-xs px-sm">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-md" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-md py-lg">
            <EmptyState
              icon={MessageSquare}
              title="No conversations yet"
              description="Start a direct message with anyone in your workspace."
            />
          </div>
        ) : noResultsAtAll ? (
          <div className="px-md py-lg">
            <EmptyState
              icon={Search}
              title="No matches"
              description={`Nothing found for “${trimmed}”.`}
            />
          </div>
        ) : (
          <>
            {dms.length > 0 && (
              <section>
                <p className="px-sm pb-xs text-eyebrow uppercase text-fg-subtle tracking-wider">
                  Direct messages
                </p>
                <div className="flex flex-col gap-[2px]">
                  {dms.map((c) => (
                    <ConversationRow
                      key={c.id}
                      conversation={c}
                      active={c.id === activeId}
                      onSelect={onSelect}
                      queryHighlight={isSearching ? trimmed : null}
                    />
                  ))}
                </div>
              </section>
            )}

            {channels.length > 0 && (
              <section>
                <p className="px-sm pb-xs text-eyebrow uppercase text-fg-subtle tracking-wider">
                  Projects
                </p>
                <div className="flex flex-col gap-[2px]">
                  {channels.map((c) => (
                    <ConversationRow
                      key={c.id}
                      conversation={c}
                      active={c.id === activeId}
                      onSelect={onSelect}
                      queryHighlight={isSearching ? trimmed : null}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Message hits — separate section, only shown while searching. */}
            {isSearching && (
              <section>
                <p className="px-sm pb-xs text-eyebrow uppercase text-fg-subtle tracking-wider flex items-center gap-sm">
                  Messages
                  {searching && (
                    <Loader2 className="h-3 w-3 animate-spin text-fg-subtle" />
                  )}
                  {!searching && hits.length > 0 && (
                    <span className="ml-auto text-caption text-fg-subtle tabular-nums">
                      {hits.length}
                    </span>
                  )}
                </p>
                {hits.length === 0 && !searching ? (
                  <p className="px-md py-sm text-caption text-fg-subtle italic">
                    No messages match.
                  </p>
                ) : (
                  <div className="flex flex-col gap-[2px]">
                    {hits.map((h) => (
                      <MessageHitRow
                        key={h.messageId}
                        hit={h}
                        onSelect={(hit) => {
                          onSelectMessageHit?.(hit);
                          setQuery("");
                        }}
                        query={trimmed}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
