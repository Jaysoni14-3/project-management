import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { assertProjectAccess } from "../lib/access.js";
import {
  createBugSchema,
  updateBugSchema,
} from "../schemas/bugs.schema.js";
import { notFound } from "../lib/errors.js";
import { deleteFromR2, publicUrl } from "../lib/r2.js";
import { notifyBugAssigned } from "../lib/notify.js";

const parseDueDate = (v) => {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  return new Date(v);
};

const formatAttachment = (a) => ({
  id: a.id,
  name: a.filename,
  size: a.size,
  type: a.mimeType,
  storagePath: a.storageKey,
  url: publicUrl(a.storageKey),
  uploadedAt: a.uploadedAt,
});

/* Strip the joined user objects out of the response so the wire shape
   stays flat — frontend only needs the names. Keeps the contract
   identical to what the legacy Firebase shape exposed. */
const formatBug = ({ reporter, assignee, ...bug }) => ({
  ...bug,
  reporterName: reporter?.name ?? null,
  reporterAvatar: reporter?.avatar ?? null,
  assigneeName: assignee?.name ?? null,
  assigneeAvatar: assignee?.avatar ?? null,
  attachments: bug.attachments?.map(formatAttachment) ?? [],
});

const bugInclude = {
  attachments: true,
  reporter: { select: { id: true, name: true, avatar: true } },
  assignee: { select: { id: true, name: true, avatar: true } },
};

// /api/projects/:projectId/bugs
export const projectBugRoutes = Router({ mergeParams: true });
projectBugRoutes.use(requireAuth);

/* Read open across the workspace — everyone can see any project's
   bugs. Mutations still require project membership. */
projectBugRoutes.get("/", async (req, res) => {
  const bugs = await prisma.bug.findMany({
    where: { projectId: req.params.projectId },
    orderBy: { createdAt: "desc" },
    include: bugInclude,
  });
  res.json(bugs.map(formatBug));
});

projectBugRoutes.post(
  "/",
  validate({ body: createBugSchema }),
  async (req, res) => {
    await assertProjectAccess(req.user, req.params.projectId);
    const { attachments = [], ...rest } = req.body;
    const data = {
      ...rest,
      projectId: req.params.projectId,
      reporterId: req.user.id,
    };
    if (data.dueDate !== undefined) data.dueDate = parseDueDate(data.dueDate);

    if (attachments.length > 0) {
      data.attachments = {
        create: attachments.map((a) => ({
          parentType: "bug",
          filename: a.filename,
          storageKey: a.storageKey,
          size: a.size,
          mimeType: a.mimeType,
        })),
      };
    }

    const bug = await prisma.bug.create({
      data,
      include: bugInclude,
    });

    if (bug.assigneeId) {
      const project = await prisma.project.findUnique({
        where: { id: bug.projectId },
        select: { id: true, name: true },
      });
      await notifyBugAssigned({
        bug,
        project,
        assigneeId: bug.assigneeId,
        actorId: req.user.id,
        actorName: req.user.name,
      });
    }

    res.status(201).json(formatBug(bug));
  }
);

// /api/bugs
const bugsRouter = Router();
bugsRouter.use(requireAuth);

bugsRouter.get("/", async (req, res) => {
  const bugs = await prisma.bug.findMany({
    orderBy: { createdAt: "desc" },
    include: bugInclude,
  });
  res.json(bugs.map(formatBug));
});

bugsRouter.get("/recent", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 5), 50);
  const bugs = await prisma.bug.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: bugInclude,
  });
  res.json(bugs.map(formatBug));
});

bugsRouter.get("/:id", async (req, res) => {
  const bug = await prisma.bug.findUnique({
    where: { id: req.params.id },
    include: bugInclude,
  });
  if (!bug) throw notFound("Bug not found");
  res.json(formatBug(bug));
});

bugsRouter.patch(
  "/:id",
  validate({ body: updateBugSchema }),
  async (req, res) => {
    const existing = await prisma.bug.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw notFound("Bug not found");
    await assertProjectAccess(req.user, existing.projectId);

    const {
      attachments = [],
      removedAttachmentIds = [],
      ...rest
    } = req.body;
    const data = { ...rest };
    if (data.dueDate !== undefined) data.dueDate = parseDueDate(data.dueDate);

    if (removedAttachmentIds.length > 0) {
      const toRemove = await prisma.attachment.findMany({
        where: { id: { in: removedAttachmentIds }, bugId: existing.id },
      });
      await prisma.attachment.deleteMany({
        where: { id: { in: toRemove.map((a) => a.id) } },
      });
      await Promise.allSettled(
        toRemove.map((a) => deleteFromR2(a.storageKey))
      );
    }

    if (attachments.length > 0) {
      data.attachments = {
        create: attachments.map((a) => ({
          parentType: "bug",
          filename: a.filename,
          storageKey: a.storageKey,
          size: a.size,
          mimeType: a.mimeType,
        })),
      };
    }

    const bug = await prisma.bug.update({
      where: { id: req.params.id },
      data,
      include: bugInclude,
    });

    /* Notify on reassignment — but only when the assignee actually changed
       to someone new. Re-saving the same assignee or clearing it shouldn't
       fire a notification. */
    if (
      bug.assigneeId &&
      bug.assigneeId !== existing.assigneeId
    ) {
      const project = await prisma.project.findUnique({
        where: { id: bug.projectId },
        select: { id: true, name: true },
      });
      await notifyBugAssigned({
        bug,
        project,
        assigneeId: bug.assigneeId,
        actorId: req.user.id,
        actorName: req.user.name,
      });
    }

    res.json(formatBug(bug));
  }
);

bugsRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.bug.findUnique({
    where: { id: req.params.id },
    include: bugInclude,
  });
  if (!existing) throw notFound("Bug not found");
  await assertProjectAccess(req.user, existing.projectId);

  await prisma.bug.delete({ where: { id: req.params.id } });
  await Promise.allSettled(
    existing.attachments.map((a) => deleteFromR2(a.storageKey))
  );
  res.status(204).end();
});

export default bugsRouter;
