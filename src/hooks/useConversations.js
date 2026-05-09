import { useCallback, useEffect, useRef, useState } from "react";
import { listConversations } from "../services/conversation.service";
import { onSocketEvent } from "../services/chatSocket";

/* Conversation list with live updates.
   - Initial load via REST, then polled every 30s as a backstop.
   - Live updates via Socket.IO: every incoming `message:new` bumps the
     matching conversation's lastMessage and unreadCount; `conversation:read`
     resets the unread count for the read conversation.
   - The active conversation (passed in) gets unread cleared locally so the
     badge disappears the instant the user opens the thread. */
const useConversations = ({ activeConversationId, currentUserId } = {}) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const activeRef = useRef(activeConversationId);
  activeRef.current = activeConversationId;

  const refresh = useCallback(async () => {
    try {
      const data = await listConversations();
      setConversations(data || []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  /* Live: bump the conversation row when a new message lands. If the
     incoming message belongs to the currently-open thread we DON'T
     increment unread — the user is staring at it. */
  useEffect(() => {
    const offMessage = onSocketEvent("message:new", (msg) => {
      if (!msg?.conversationId) return;
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversationId);
        if (idx === -1) {
          /* Conversation we don't have yet (e.g., someone DM'd us for
             the first time). Trigger a full refresh on the next tick. */
          refresh();
          return prev;
        }
        const isActive = activeRef.current === msg.conversationId;
        const isOwn = msg.authorId === currentUserId;
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          lastMessage: {
            id: msg.id,
            body: msg.body,
            authorId: msg.authorId,
            authorName: msg.authorName,
            createdAt: msg.createdAt,
          },
          lastMessageAt: msg.createdAt,
          unreadCount:
            isActive || isOwn ? next[idx].unreadCount : (next[idx].unreadCount ?? 0) + 1,
        };
        /* Move to the top — newest activity first. */
        const [bumped] = next.splice(idx, 1);
        return [bumped, ...next];
      });
    });

    /* The same event covers two cases:
         - userId === current user → reader's other tabs clearing their unread
         - userId !== current user → the DM peer just read; bump peerLastReadAt
           so the seen indicator advances. unreadCount is left alone. */
    const offRead = onSocketEvent("conversation:read", ({ conversationId, userId, lastReadAt }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          if (userId === currentUserId) {
            return { ...c, unreadCount: 0, lastReadAt };
          }
          return { ...c, peerLastReadAt: lastReadAt };
        })
      );
    });

    return () => {
      offMessage();
      offRead();
    };
  }, [refresh, currentUserId]);

  /* Local clear when a thread becomes active — don't wait for the
     read API round-trip, just zero out the badge in the list. */
  useEffect(() => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId ? { ...c, unreadCount: 0 } : c
      )
    );
  }, [activeConversationId]);

  const upsertConversation = useCallback((conversation) => {
    if (!conversation?.id) return;
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conversation.id);
      if (idx === -1) return [conversation, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], ...conversation };
      return next;
    });
  }, []);

  return { conversations, loading, error, refresh, upsertConversation };
};

export default useConversations;
