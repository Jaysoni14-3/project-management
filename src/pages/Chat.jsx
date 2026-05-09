import React, { useCallback, useEffect, useRef, useState } from "react";
import { Hash, MessageSquare, Info, Users, ArrowLeft, Search } from "lucide-react";

import IconButton from "../components/ui/IconButton";

import { useAuth } from "../context/AuthContext";
import useEmployees from "../hooks/useEmployee";
import useConversations from "../hooks/useConversations";
import useMessages from "../hooks/useMessages";
import {
  markRead,
  findOrCreateDm,
} from "../services/conversation.service";

import ConversationList from "../features/chat/ConversationList";
import MessageThread from "../features/chat/MessageThread";
import MessageInput from "../features/chat/MessageInput";
import StartDmModal from "../features/chat/StartDmModal";
import ChatDetailsPanel from "../features/chat/ChatDetailsPanel";
import ThreadSearchBar from "../features/chat/ThreadSearchBar";

const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const Chat = () => {
  const { user } = useAuth();
  const { employees } = useEmployees();

  const [activeId, setActiveId] = useState(null);
  const [startDmOpen, setStartDmOpen] = useState(false);
  /* On mobile we navigate as a stack: list → thread → details. The
     active id flipping to non-null moves the user to thread view; the
     back button (or close on the details drawer) walks back. On
     desktop these states are ignored — all panes render together. */
  const [mobileView, setMobileView] = useState("list");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  /* Thread-search highlight state — owned here so MessageThread can
     style + scroll to matches without each re-render of the search
     bar producing a fresh callback reference. */
  const [searchState, setSearchState] = useState({
    query: "",
    activeMatchId: null,
  });
  const handleSearchChange = useCallback(
    (next) => setSearchState(next || { query: "", activeMatchId: null }),
    []
  );

  /* When a global-search hit selects a different conversation, we
     want to keep the highlight active across the conversation change.
     The reset effect below clears search state on `activeId` change,
     which would otherwise wipe the highlight we just set. This ref
     suppresses the next reset after a hit jump. */
  const skipNextSearchReset = useRef(false);

  /* Close + reset search when switching conversations (unless the
     conversation switch itself was triggered by a search-hit click). */
  useEffect(() => {
    if (skipNextSearchReset.current) {
      skipNextSearchReset.current = false;
      return;
    }
    setSearchOpen(false);
    setSearchState({ query: "", activeMatchId: null });
  }, [activeId]);

  const {
    conversations,
    loading: convLoading,
    upsertConversation,
  } = useConversations({
    activeConversationId: activeId,
    currentUserId: user?.uid,
  });

  const {
    messages,
    loading: messagesLoading,
    sending,
    send,
    editMessage,
    deleteMessage,
    toggleLike,
  } = useMessages(activeId);

  /* Default desktop: pick the first conversation so the right pane
     isn't empty. Don't auto-select on mobile — keep the user in the
     list view until they explicitly tap a conversation. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) {
      if (!activeId && conversations.length > 0) {
        setActiveId(conversations[0].id);
      }
    }
  }, [conversations, activeId]);

  const activeConversation = conversations.find((c) => c.id === activeId);

  useEffect(() => {
    if (!activeId) return;
    if (!messages.length && !activeConversation?.unreadCount) return;
    markRead(activeId).catch(() => {});
  }, [activeId, messages.length, activeConversation?.unreadCount]);

  const handleSelect = (c) => {
    setActiveId(c.id);
    setMobileView("thread");
  };

  const handleDmCreated = (conversation) => {
    upsertConversation(conversation);
    setActiveId(conversation.id);
    setMobileView("thread");
  };

  /* Global search hit click: jump to that conversation, then highlight
     the matched message. We open the in-thread search bar with the
     query pre-filled so the user can navigate other matches in the
     same conversation, and the active-match scroll lands on the hit. */
  const handleSelectMessageHit = (hit) => {
    if (!hit?.conversationId) return;
    /* Suppress the activeId-change reset so our highlight survives
       the conversation switch. */
    if (hit.conversationId !== activeId) {
      skipNextSearchReset.current = true;
    }
    setActiveId(hit.conversationId);
    setMobileView("thread");
    setSearchOpen(false);
    /* Pull the first few words of the hit's body as the highlight
       query — when messages for the new conversation load, the
       MessageThread highlights every match and scrolls the active
       one into view. */
    setSearchState({
      query: hit.body ? hit.body.split(/\s+/).slice(0, 3).join(" ") : "",
      activeMatchId: hit.messageId,
    });
  };

  const handleStartDmWithUser = async (peerUserId) => {
    try {
      const conversation = await findOrCreateDm(peerUserId);
      handleDmCreated(conversation);
    } catch (err) {
      console.error(err);
    }
  };

  const peerEmployee =
    activeConversation?.type === "dm" && activeConversation?.peer
      ? (employees || []).find((e) => e.id === activeConversation.peer.id)
      : null;

  const headerSubtitle = activeConversation
    ? activeConversation.type === "project"
      ? `${activeConversation.participants?.length ?? 0} members`
      : peerEmployee?.designation || "Direct message"
    : "";

  /* Break out of the dashboard's content padding so the chat surface
     fills the entire main area edge-to-edge. Height = viewport minus
     the impersonation banner (if any) and the dashboard header. */
  return (
    <div
      className="-mx-xl -my-xl flex bg-surface"
      style={{
        height: "calc(100vh - var(--app-top-offset, 0px) - 56px)",
      }}
    >
      {/* ──────────────────────────────────────────────────────────
          Conversation list
            mobile: full width, hidden once a thread is active
            desktop: fixed-width left rail, always visible
          ────────────────────────────────────────────────────────── */}
      <div
        className={`w-full md:w-[300px] md:shrink-0 md:flex border-r border-line-subtle min-h-0
          ${mobileView === "list" ? "flex" : "hidden md:flex"}`}
      >
        <ConversationList
          conversations={conversations}
          loading={convLoading}
          activeId={activeId}
          onSelect={handleSelect}
          onStartDm={() => setStartDmOpen(true)}
          onSelectMessageHit={handleSelectMessageHit}
        />
      </div>

      {/* ──────────────────────────────────────────────────────────
          Thread + composer
            mobile: full width when active, hidden in list view
            desktop: flex-1 fills the rest
          ────────────────────────────────────────────────────────── */}
      <div
        className={`flex-1 min-w-0 flex-col bg-surface
          ${mobileView === "thread" ? "flex" : "hidden md:flex"}`}
      >
        {activeConversation ? (
          <>
            <div className="shrink-0 flex items-center gap-sm md:gap-md border-b border-line-subtle px-md md:px-lg py-sm md:py-md bg-elevated">
              {/* Back arrow only on mobile — pushes the user back to
                  the list view. */}
              <IconButton
                icon={ArrowLeft}
                size="sm"
                variant="ghost"
                onClick={() => setMobileView("list")}
                aria-label="Back to conversations"
                className="md:hidden"
              />

              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="flex items-center gap-sm md:gap-md min-w-0 flex-1 text-left
                  hover:bg-subtle/40 -mx-sm px-sm py-xs rounded-md transition-colors duration-fast"
                title="View details"
              >
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden font-semibold text-bodySm
                    ${
                      activeConversation.type === "project"
                        ? "bg-warning-50 text-warning-700"
                        : "bg-accent-soft text-accent"
                    }`}
                >
                  {activeConversation.type === "project" ? (
                    <Hash className="h-4 w-4" />
                  ) : activeConversation.peer?.avatar ? (
                    <img
                      src={
                        activeConversation.peer.avatar.startsWith("http")
                          ? activeConversation.peer.avatar
                          : `/images/${activeConversation.peer.avatar}`
                      }
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials(activeConversation.title)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-section text-fg truncate leading-tight">
                    {activeConversation.title}
                  </h3>
                  {headerSubtitle && (
                    <p className="text-caption text-fg-subtle truncate capitalize">
                      {headerSubtitle}
                    </p>
                  )}
                </div>
              </button>

              <IconButton
                icon={Search}
                size="sm"
                variant="ghost"
                onClick={() => setSearchOpen((o) => !o)}
                aria-label={searchOpen ? "Close search" : "Search in chat"}
                title="Search in this chat"
              />
              <IconButton
                icon={activeConversation.type === "project" ? Users : Info}
                size="sm"
                variant="ghost"
                onClick={() => setDetailsOpen((o) => !o)}
                aria-label={detailsOpen ? "Hide details" : "Show details"}
                title={detailsOpen ? "Hide details" : "Show details"}
              />
            </div>

            {searchOpen && (
              <ThreadSearchBar
                messages={messages}
                conversationId={activeId}
                onClose={() => setSearchOpen(false)}
                onActiveChange={handleSearchChange}
              />
            )}

            <MessageThread
              conversation={activeConversation}
              messages={messages}
              loading={messagesLoading}
              currentUserId={user?.uid}
              highlightQuery={searchState.query}
              activeMatchId={searchState.activeMatchId}
              onEditMessage={editMessage}
              onDeleteMessage={deleteMessage}
              onToggleLike={toggleLike}
            />

            <MessageInput
              disabled={!activeId}
              sending={sending}
              placeholder={`Message ${activeConversation.title}…`}
              onSend={send}
            />
          </>
        ) : (
          <MessageThread
            conversation={null}
            messages={[]}
            loading={false}
            currentUserId={user?.uid}
          />
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────
          Details rail
            mobile: full-screen drawer, slides over the thread
            desktop: persistent right rail when open
          ────────────────────────────────────────────────────────── */}
      {activeConversation && detailsOpen && (
        <>
          {/* Mobile/tablet: full-screen overlay drawer */}
          <div className="lg:hidden fixed inset-0 z-modal flex">
            <div
              className="absolute inset-0 bg-overlay/40 backdrop-blur-[2px] animate-fade-in"
              onClick={() => setDetailsOpen(false)}
            />
            <aside className="relative ml-auto w-full max-w-[360px] h-full animate-slide-down shadow-modal">
              <ChatDetailsPanel
                conversation={activeConversation}
                employees={employees}
                currentUserId={user?.uid}
                onClose={() => setDetailsOpen(false)}
                onStartDm={(id) => {
                  setDetailsOpen(false);
                  handleStartDmWithUser(id);
                }}
              />
            </aside>
          </div>

          {/* Desktop: inline column */}
          <div className="hidden lg:flex w-[300px] shrink-0 min-h-0">
            <ChatDetailsPanel
              conversation={activeConversation}
              employees={employees}
              currentUserId={user?.uid}
              onClose={() => setDetailsOpen(false)}
              onStartDm={handleStartDmWithUser}
            />
          </div>
        </>
      )}

      <StartDmModal
        isOpen={startDmOpen}
        onClose={() => setStartDmOpen(false)}
        employees={employees}
        currentUserId={user?.uid}
        onCreated={handleDmCreated}
      />
    </div>
  );
};

export default Chat;
