import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import {
  createDmSchema,
  sendMessageSchema,
  updateMessageSchema,
  markReadSchema,
} from "../schemas/conversations.schema.js";
import { notFound, forbidden, badRequest } from "../lib/errors.js";
import { emitToRoom } from "../lib/realtime.js";

const router = Router();
router.use(requireAuth);

const userMini = { id: true, name: true, avatar: true };

/* Verify the requester is a participant on this conversation. Returns
   the participant row so callers can also use its `lastReadAt`. */
const assertParticipant = async (conversationId, userId) => {
  const part = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!part) throw forbidden("Not a participant");
  return part;
};

/* Format a conversation for the list view. Computes:
   - peer (only for dms — the *other* participant)
   - title (project name for channels, peer name for dms)
   - lastMessage preview
   - unreadCount via lastReadAt
   The unread count is bounded by a single SELECT per conversation; for
   a workspace with hundreds of conversations a single user is unlikely
   to be in, this is fine. If it ever becomes hot, switch to a
   denormalized counter on ConversationParticipant. */
const formatConversation = async (convo, currentUserId) => {
  const myPart = convo.participants.find((p) => p.userId === currentUserId);
  const peerPart = convo.participants.find((p) => p.userId !== currentUserId);

  const lastMessage = convo.messages?.[0] ?? null;

  const unreadCount = await prisma.message.count({
    where: {
      conversationId: convo.id,
      authorId: { not: currentUserId },
      ...(myPart?.lastReadAt ? { createdAt: { gt: myPart.lastReadAt } } : {}),
    },
  });

  return {
    id: convo.id,
    type: convo.type,
    projectId: convo.projectId,
    projectName: convo.project?.name ?? null,
    title:
      convo.type === "project"
        ? convo.project?.name ?? "Project"
        : peerPart?.user?.name ?? "Direct message",
    peer:
      convo.type === "dm" && peerPart?.user
        ? {
            id: peerPart.user.id,
            name: peerPart.user.name,
            avatar: peerPart.user.avatar ?? null,
          }
        : null,
    /* For DMs, expose the peer's lastReadAt so the client can render
       a "Seen" indicator on the most recent own-message that the
       peer has read. Channels skip this — multi-recipient seen state
       is intentionally not surfaced. */
    peerLastReadAt:
      convo.type === "dm" ? peerPart?.lastReadAt ?? null : null,
    participants: convo.participants.map((p) => ({
      id: p.user.id,
      name: p.user.name,
      avatar: p.user.avatar ?? null,
    })),
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          body: lastMessage.body,
          authorId: lastMessage.authorId,
          authorName: lastMessage.author?.name ?? null,
          createdAt: lastMessage.createdAt,
        }
      : null,
    lastMessageAt: convo.lastMessageAt,
    lastReadAt: myPart?.lastReadAt ?? null,
    unreadCount,
    createdAt: convo.createdAt,
    updatedAt: convo.updatedAt,
  };
};

/* `likedByUserIds` is sent raw — the client computes `likedByMe` from
   it locally. We can't ship a per-viewer `likedByMe` flag because the
   same payload is broadcast over Socket.IO to many participants who
   each have a different perspective. */
const formatMessage = (m) => ({
  id: m.id,
  conversationId: m.conversationId,
  authorId: m.authorId,
  authorName: m.author?.name ?? null,
  authorAvatar: m.author?.avatar ?? null,
  body: m.body,
  createdAt: m.createdAt,
  editedAt: m.editedAt ?? null,
  likedByUserIds: (m.likes ?? []).map((l) => l.userId),
});

const messageInclude = {
  author: { select: userMini },
  likes: { select: { userId: true } },
};

/* ──────────────────────────────────────────────────────────────────
   GET /api/conversations/search?q=…&limit=
   Search messages across every conversation the user is a participant
   in. Returns hits with conversation context (id, title, peer/project)
   and the matching message snippet so the client can render a result
   list and deep-link to the conversation.

   Uses a simple case-insensitive substring match — fine for the
   workspace's message volume. If we ever need ranked relevance,
   switch to Postgres full-text search (`to_tsvector` / `to_tsquery`).
   ────────────────────────────────────────────────────────────────── */
router.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json([]);
  const limit = Math.min(Number(req.query.limit ?? 20), 100);

  /* Scope: only conversations this user belongs to. Without this filter
     a curious user could search the whole org's chat history. */
  const myParts = await prisma.conversationParticipant.findMany({
    where: { userId: req.user.id },
    select: { conversationId: true },
  });
  const conversationIds = myParts.map((p) => p.conversationId);
  if (!conversationIds.length) return res.json([]);

  const matches = await prisma.message.findMany({
    where: {
      conversationId: { in: conversationIds },
      body: { contains: q, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: { select: userMini },
      conversation: {
        include: {
          project: { select: { id: true, name: true } },
          participants: { include: { user: { select: userMini } } },
        },
      },
    },
  });

  res.json(
    matches.map((m) => {
      const convo = m.conversation;
      const peer =
        convo.type === "dm"
          ? convo.participants.find((p) => p.userId !== req.user.id)?.user
          : null;
      const title =
        convo.type === "project"
          ? convo.project?.name ?? "Project"
          : peer?.name ?? "Direct message";
      return {
        messageId: m.id,
        body: m.body,
        createdAt: m.createdAt,
        authorId: m.authorId,
        authorName: m.author?.name ?? null,
        authorAvatar: m.author?.avatar ?? null,
        conversationId: convo.id,
        conversationType: convo.type,
        conversationTitle: title,
        peer:
          convo.type === "dm" && peer
            ? { id: peer.id, name: peer.name, avatar: peer.avatar ?? null }
            : null,
      };
    })
  );
});

/* ──────────────────────────────────────────────────────────────────
   GET /api/conversations  — list mine
   ────────────────────────────────────────────────────────────────── */
router.get("/", async (req, res) => {
  const myParts = await prisma.conversationParticipant.findMany({
    where: { userId: req.user.id },
    select: { conversationId: true },
  });
  const ids = myParts.map((p) => p.conversationId);
  if (!ids.length) return res.json([]);

  const conversations = await prisma.conversation.findMany({
    where: { id: { in: ids } },
    orderBy: [
      { lastMessageAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    include: {
      project: { select: { id: true, name: true } },
      participants: {
        include: { user: { select: userMini } },
      },
      /* Last message for preview. Limit to 1, newest first. */
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { author: { select: userMini } },
      },
    },
  });

  const formatted = await Promise.all(
    conversations.map((c) => formatConversation(c, req.user.id))
  );
  res.json(formatted);
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/conversations/dm  — find-or-create a 1-on-1
   Body: { peerUserId }
   ────────────────────────────────────────────────────────────────── */
router.post("/dm", validate({ body: createDmSchema }), async (req, res) => {
  const { peerUserId } = req.body;
  if (peerUserId === req.user.id) {
    throw badRequest("Can't DM yourself");
  }

  const peer = await prisma.user.findUnique({
    where: { id: peerUserId },
    select: userMini,
  });
  if (!peer) throw notFound("User not found");

  /* Find an existing dm conversation that has BOTH users as
     participants. We look up via the smaller participant set first
     (the current user) and filter the other side in JS — keeps the
     query simple and avoids a self-join. */
  const myDms = await prisma.conversation.findMany({
    where: {
      type: "dm",
      participants: { some: { userId: req.user.id } },
    },
    include: {
      participants: { select: { userId: true } },
    },
  });
  const existing = myDms.find(
    (c) =>
      c.participants.length === 2 &&
      c.participants.some((p) => p.userId === peerUserId)
  );

  let conversationId;
  if (existing) {
    conversationId = existing.id;
  } else {
    const created = await prisma.conversation.create({
      data: {
        type: "dm",
        participants: {
          create: [{ userId: req.user.id }, { userId: peerUserId }],
        },
      },
    });
    conversationId = created.id;
  }

  /* Hydrate via the formatter so the client gets the same shape as the
     list endpoint. */
  const full = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      project: { select: { id: true, name: true } },
      participants: { include: { user: { select: userMini } } },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { author: { select: userMini } },
      },
    },
  });
  const payload = await formatConversation(full, req.user.id);
  res.status(existing ? 200 : 201).json(payload);
});

/* ──────────────────────────────────────────────────────────────────
   GET /api/conversations/:id  — single conversation (for deep link)
   ────────────────────────────────────────────────────────────────── */
router.get("/:id", async (req, res) => {
  await assertParticipant(req.params.id, req.user.id);
  const convo = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: {
      project: { select: { id: true, name: true } },
      participants: { include: { user: { select: userMini } } },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { author: { select: userMini } },
      },
    },
  });
  if (!convo) throw notFound("Conversation not found");
  res.json(await formatConversation(convo, req.user.id));
});

/* ──────────────────────────────────────────────────────────────────
   GET /api/conversations/:id/messages?before=<iso>&limit=50
   Returns oldest→newest so the client can append directly.
   ────────────────────────────────────────────────────────────────── */
router.get("/:id/messages", async (req, res) => {
  await assertParticipant(req.params.id, req.user.id);

  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const where = { conversationId: req.params.id };
  if (req.query.before) {
    const before = new Date(req.query.before);
    if (!Number.isNaN(before.getTime())) {
      where.createdAt = { lt: before };
    }
  }

  /* Fetch newest-first so `take: limit` gives us the most recent N,
     then reverse for the client which renders oldest at top. */
  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: messageInclude,
  });
  res.json(messages.reverse().map(formatMessage));
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/conversations/:id/messages
   Body: { body }
   Inserts the message, bumps lastMessageAt, and broadcasts to all
   participants over Socket.IO via the conversation:<id> room.
   ────────────────────────────────────────────────────────────────── */
router.post(
  "/:id/messages",
  validate({ body: sendMessageSchema }),
  async (req, res) => {
    await assertParticipant(req.params.id, req.user.id);

    const body = req.body.body.trim();
    if (!body) throw badRequest("Message can't be empty");

    const message = await prisma.message.create({
      data: {
        conversationId: req.params.id,
        authorId: req.user.id,
        body,
      },
      include: messageInclude,
    });

    await prisma.conversation.update({
      where: { id: req.params.id },
      data: { lastMessageAt: message.createdAt },
    });

    const payload = formatMessage(message);
    emitToRoom(`conversation:${req.params.id}`, "message:new", payload);

    res.status(201).json(payload);
  }
);

/* ──────────────────────────────────────────────────────────────────
   PATCH /api/conversations/:id/messages/:messageId
   Edit an existing message — author only. Sets editedAt to now() so
   the UI can render an "edited" tag. Broadcasts message:updated to
   all participants so other clients refresh their view.
   ────────────────────────────────────────────────────────────────── */
router.patch(
  "/:id/messages/:messageId",
  validate({ body: updateMessageSchema }),
  async (req, res) => {
    await assertParticipant(req.params.id, req.user.id);

    const existing = await prisma.message.findUnique({
      where: { id: req.params.messageId },
      select: { id: true, conversationId: true, authorId: true },
    });
    if (!existing || existing.conversationId !== req.params.id) {
      throw notFound("Message not found");
    }
    if (existing.authorId !== req.user.id) {
      throw forbidden("Only the author can edit this message");
    }

    const body = req.body.body.trim();
    if (!body) throw badRequest("Message can't be empty");

    const updated = await prisma.message.update({
      where: { id: existing.id },
      data: { body, editedAt: new Date() },
      include: messageInclude,
    });

    const payload = formatMessage(updated);
    emitToRoom(`conversation:${req.params.id}`, "message:updated", payload);
    res.json(payload);
  }
);

/* ──────────────────────────────────────────────────────────────────
   DELETE /api/conversations/:id/messages/:messageId
   Hard delete — author only. Broadcasts message:deleted with the
   deleted id so other clients can drop it from their thread.
   ────────────────────────────────────────────────────────────────── */
router.delete("/:id/messages/:messageId", async (req, res) => {
  await assertParticipant(req.params.id, req.user.id);

  const existing = await prisma.message.findUnique({
    where: { id: req.params.messageId },
    select: { id: true, conversationId: true, authorId: true },
  });
  if (!existing || existing.conversationId !== req.params.id) {
    throw notFound("Message not found");
  }
  if (existing.authorId !== req.user.id) {
    throw forbidden("Only the author can delete this message");
  }

  await prisma.message.delete({ where: { id: existing.id } });

  emitToRoom(`conversation:${req.params.id}`, "message:deleted", {
    conversationId: req.params.id,
    messageId: existing.id,
  });
  res.status(204).end();
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/conversations/:id/messages/:messageId/like
   Toggle like. If the requester already liked the message, the like
   is removed; otherwise it's added. Broadcasts message:updated with
   the refreshed like list so all clients converge.
   ────────────────────────────────────────────────────────────────── */
router.post("/:id/messages/:messageId/like", async (req, res) => {
  await assertParticipant(req.params.id, req.user.id);

  const existing = await prisma.message.findUnique({
    where: { id: req.params.messageId },
    select: { id: true, conversationId: true },
  });
  if (!existing || existing.conversationId !== req.params.id) {
    throw notFound("Message not found");
  }

  const myLike = await prisma.messageLike.findUnique({
    where: {
      messageId_userId: {
        messageId: existing.id,
        userId: req.user.id,
      },
    },
  });

  if (myLike) {
    await prisma.messageLike.delete({
      where: {
        messageId_userId: {
          messageId: existing.id,
          userId: req.user.id,
        },
      },
    });
  } else {
    await prisma.messageLike.create({
      data: { messageId: existing.id, userId: req.user.id },
    });
  }

  const refreshed = await prisma.message.findUnique({
    where: { id: existing.id },
    include: messageInclude,
  });
  const payload = formatMessage(refreshed);

  /* Reuse `message:updated` rather than a dedicated `message:liked`
     event — clients already merge by id on updates, and the new
     `likedByUserIds` flows through the same code path. */
  emitToRoom(`conversation:${req.params.id}`, "message:updated", payload);
  res.json(payload);
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/conversations/:id/read
   Body: { messageId? } — optional. Defaults to now().
   ────────────────────────────────────────────────────────────────── */
router.post(
  "/:id/read",
  validate({ body: markReadSchema }),
  async (req, res) => {
    await assertParticipant(req.params.id, req.user.id);

    let lastReadAt = new Date();
    if (req.body?.messageId) {
      const m = await prisma.message.findUnique({
        where: { id: req.body.messageId },
        select: { conversationId: true, createdAt: true },
      });
      if (m && m.conversationId === req.params.id) {
        lastReadAt = m.createdAt;
      }
    }

    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: req.params.id,
          userId: req.user.id,
        },
      },
      data: { lastReadAt },
    });

    /* Broadcast to the conversation room so all clients see this:
         - the reader's own other tabs clear the unread badge
         - other DM participants update peerLastReadAt to drive the
           "Seen" indicator on their messages
       Each receiving client checks `userId` to decide which case
       applies. */
    emitToRoom(`conversation:${req.params.id}`, "conversation:read", {
      conversationId: req.params.id,
      userId: req.user.id,
      lastReadAt,
    });

    res.json({ conversationId: req.params.id, lastReadAt });
  }
);

export default router;
