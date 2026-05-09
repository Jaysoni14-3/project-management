import { useCallback, useEffect, useRef, useState } from "react";
import {
  listMessages,
  sendMessage as sendMessageApi,
  editMessage as editMessageApi,
  deleteMessage as deleteMessageApi,
  toggleLike as toggleLikeApi,
} from "../services/conversation.service";
import { joinConversation, onSocketEvent } from "../services/chatSocket";

/* Per-conversation message thread.
   - Loads the most recent N messages via REST on mount/conversation change.
   - Subscribes to Socket.IO `message:new` for live appends. When the
     server broadcasts back our own optimistic message we merge by id so
     we don't render duplicates.
   - Late-joins the Socket.IO room — needed when the user just created
     a fresh DM, since the auto-join on connect only covered conversations
     that existed at connect time. */
const useMessages = (conversationId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const lastConversationId = useRef(null);

  /* Initial / conversation-change load. */
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    if (lastConversationId.current === conversationId) return;
    lastConversationId.current = conversationId;

    setLoading(true);
    setError(null);
    let cancelled = false;
    listMessages(conversationId, { limit: 50 })
      .then((data) => {
        if (cancelled) return;
        setMessages(data || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    /* Make sure this socket is subscribed to the conversation room.
       Idempotent on the server side — re-emits do nothing if we're
       already in the room. */
    joinConversation(conversationId);

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  /* Live appends. Filter to current conversation; merge by id to avoid
     dup rendering when our own POST response races the socket event. */
  useEffect(() => {
    if (!conversationId) return;
    return onSocketEvent("message:new", (msg) => {
      if (msg?.conversationId !== conversationId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
  }, [conversationId]);

  /* Live edits — replace the message body / editedAt in place. */
  useEffect(() => {
    if (!conversationId) return;
    return onSocketEvent("message:updated", (msg) => {
      if (msg?.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m))
      );
    });
  }, [conversationId]);

  /* Live deletes — drop the row entirely. */
  useEffect(() => {
    if (!conversationId) return;
    return onSocketEvent("message:deleted", ({ conversationId: cid, messageId }) => {
      if (cid !== conversationId) return;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });
  }, [conversationId]);

  const send = useCallback(
    async (body) => {
      if (!conversationId || !body?.trim()) return;
      setSending(true);
      try {
        const created = await sendMessageApi(conversationId, body.trim());
        /* Optimistic merge: if the socket event landed first, this is
           a no-op via the id check. Otherwise it appends here. */
        setMessages((prev) => {
          if (prev.some((m) => m.id === created.id)) return prev;
          return [...prev, created];
        });
      } finally {
        setSending(false);
      }
    },
    [conversationId]
  );

  /* Edit/delete return promises so callers can await + handle errors
     locally. The matching socket event will arrive shortly after the
     REST response; merging by id keeps everything consistent. */
  const editMessage = useCallback(
    async (messageId, body) => {
      if (!conversationId || !messageId || !body?.trim()) return;
      const updated = await editMessageApi(
        conversationId,
        messageId,
        body.trim()
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
      );
      return updated;
    },
    [conversationId]
  );

  const deleteMessage = useCallback(
    async (messageId) => {
      if (!conversationId || !messageId) return;
      await deleteMessageApi(conversationId, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    [conversationId]
  );

  /* Optimistic toggle: flip the like state locally, then call the API.
     The server broadcasts message:updated with the canonical
     likedByUserIds, so an over-eager double-click reconciles back. */
  const toggleLike = useCallback(
    async (messageId, currentUserId) => {
      if (!conversationId || !messageId || !currentUserId) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const ids = new Set(m.likedByUserIds ?? []);
          if (ids.has(currentUserId)) ids.delete(currentUserId);
          else ids.add(currentUserId);
          return { ...m, likedByUserIds: Array.from(ids) };
        })
      );
      try {
        const updated = await toggleLikeApi(conversationId, messageId);
        setMessages((prev) =>
          prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
        );
      } catch (err) {
        /* Roll back the optimistic flip on failure. */
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            const ids = new Set(m.likedByUserIds ?? []);
            if (ids.has(currentUserId)) ids.delete(currentUserId);
            else ids.add(currentUserId);
            return { ...m, likedByUserIds: Array.from(ids) };
          })
        );
        throw err;
      }
    },
    [conversationId]
  );

  return {
    messages,
    loading,
    error,
    sending,
    send,
    editMessage,
    deleteMessage,
    toggleLike,
  };
};

export default useMessages;
