import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import {
  createCommentSchema,
  updateCommentSchema,
  listCommentsQuerySchema,
} from "../schemas/comments.schema.js";
import {
  assertProjectAccess,
  getParentProjectId,
  getParentContext,
} from "../lib/access.js";
import { forbidden, notFound, badRequest } from "../lib/errors.js";
import {
  extractMentionCandidates,
  resolveMentionUserIds,
  notifyCommentMentions,
} from "../lib/notify.js";

const router = Router();
router.use(requireAuth);

const formatComment = (c) => ({
  id: c.id,
  parentType: c.parentType,
  parentId: c.parentId,
  body: c.body,
  edited: c.edited,
  authorId: c.authorId,
  authorName: c.author?.name ?? null,
  authorAvatar: c.author?.avatar ?? null,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

const commentInclude = {
  author: { select: { id: true, name: true, avatar: true } },
};

/* Read + write open across the workspace. Anyone authed can view a
   thread and chime in. Editing/deleting a comment still gates on
   author or admin (handled in the PATCH/DELETE handlers below). */
router.get("/", validate({ query: listCommentsQuerySchema }), async (req, res) => {
  const { parentType, parentId } = req.query;
  const projectId = await getParentProjectId(parentType, parentId);
  if (!projectId) throw notFound("Parent not found");

  const comments = await prisma.comment.findMany({
    where: { parentType, parentId },
    orderBy: { createdAt: "asc" },
    include: commentInclude,
  });
  res.json(comments.map(formatComment));
});

router.post("/", validate({ body: createCommentSchema }), async (req, res) => {
  const { parentType, parentId, body } = req.body;
  const ctx = await getParentContext(parentType, parentId);
  if (!ctx) throw notFound("Parent not found");

  const trimmed = body.trim();
  const comment = await prisma.comment.create({
    data: {
      parentType,
      parentId,
      body: trimmed,
      authorId: req.user.id,
    },
    include: commentInclude,
  });

  /* Fan out @-mention notifications. Best-effort — never block the
     create response on a notification write failure. */
  const candidates = extractMentionCandidates(trimmed);
  if (candidates.length > 0) {
    const mentionedIds = await resolveMentionUserIds(candidates, prisma);
    if (mentionedIds.length > 0) {
      await notifyCommentMentions({
        comment,
        parentType,
        parentLabel: ctx.parentLabel,
        projectId: ctx.projectId,
        projectName: ctx.projectName,
        mentionedUserIds: mentionedIds,
        actorId: req.user.id,
        actorName: req.user.name,
      });
    }
  }

  res.status(201).json(formatComment(comment));
});

router.patch("/:id", validate({ body: updateCommentSchema }), async (req, res) => {
  const existing = await prisma.comment.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) throw notFound("Comment not found");
  if (existing.authorId !== req.user.id && req.user.role !== "admin") {
    throw forbidden("Only the author can edit this comment");
  }
  const trimmed = req.body.body.trim();
  if (!trimmed) throw badRequest("Comment cannot be empty");

  const comment = await prisma.comment.update({
    where: { id: req.params.id },
    data: { body: trimmed, edited: true },
    include: commentInclude,
  });

  /* Notify only newly-added mentions on edits. Diff is computed at
     the candidate-name layer (cheap), then resolved to ids in one
     DB lookup against the freshly-typed body only. */
  const before = new Set(extractMentionCandidates(existing.body || ""));
  const after = extractMentionCandidates(trimmed);
  const newlyMentionedNames = after.filter((n) => !before.has(n));
  if (newlyMentionedNames.length > 0) {
    const ctx = await getParentContext(existing.parentType, existing.parentId);
    if (ctx) {
      const newlyMentioned = await resolveMentionUserIds(
        newlyMentionedNames,
        prisma
      );
      if (newlyMentioned.length > 0) {
        await notifyCommentMentions({
          comment,
          parentType: existing.parentType,
          parentLabel: ctx.parentLabel,
          projectId: ctx.projectId,
          projectName: ctx.projectName,
          mentionedUserIds: newlyMentioned,
          actorId: req.user.id,
          actorName: req.user.name,
        });
      }
    }
  }

  res.json(formatComment(comment));
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.comment.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) throw notFound("Comment not found");
  if (existing.authorId !== req.user.id && req.user.role !== "admin") {
    throw forbidden("Only the author can delete this comment");
  }
  await prisma.comment.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
