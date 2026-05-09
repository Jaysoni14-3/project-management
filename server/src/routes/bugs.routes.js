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
   identical to what the legacy Firebase shape exposed.
   `assignees` is the flat list (primary + co-assignees) that newer UI
   code can consume; legacy `assigneeName`/`assigneeId` keep working. */
const formatBug = ({ reporter, assignee, coAssignees = [], ...bug }) => {
  const assignees = [];
  if (assignee) {
    assignees.push({
      id: assignee.id,
      name: assignee.name,
      avatar: assignee.avatar ?? null,
      primary: true,
    });
  }
  for (const c of coAssignees) {
    if (c.user) {
      assignees.push({
        id: c.user.id,
        name: c.user.name,
        avatar: c.user.avatar ?? null,
        primary: false,
      });
    }
  }
  return {
    ...bug,
    reporterName: reporter?.name ?? null,
    reporterAvatar: reporter?.avatar ?? null,
    assigneeName: assignee?.name ?? null,
    assigneeAvatar: assignee?.avatar ?? null,
    assignees,
    attachments: bug.attachments?.map(formatAttachment) ?? [],
  };
};

const bugInclude = {
  attachments: true,
  reporter: { select: { id: true, name: true, avatar: true } },
  assignee: { select: { id: true, name: true, avatar: true } },
  coAssignees: {
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
  },
};

const allRecipients = (bug) =>
  [bug.assigneeId, ...(bug.coAssignees ?? []).map((c) => c.userId)].filter(
    Boolean
  );

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
    const {
      attachments = [],
      coAssigneeIds = [],
      ...rest
    } = req.body;
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

    /* Drop duplicates and the primary assignee from co-assignees so a
       user can't appear twice in the assignee list. */
    const coIds = Array.from(
      new Set(coAssigneeIds.filter((id) => id && id !== data.assigneeId))
    );
    if (coIds.length) {
      data.coAssignees = {
        create: coIds.map((userId) => ({ userId })),
      };
    }

    const bug = await prisma.bug.create({
      data,
      include: bugInclude,
    });

    const recipientIds = allRecipients(bug);
    if (recipientIds.length) {
      const project = await prisma.project.findUnique({
        where: { id: bug.projectId },
        select: { id: true, name: true },
      });
      await notifyBugAssigned({
        bug,
        project,
        recipientIds,
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
      include: { coAssignees: { select: { userId: true } } },
    });
    if (!existing) throw notFound("Bug not found");
    await assertProjectAccess(req.user, existing.projectId);

    const {
      attachments = [],
      removedAttachmentIds = [],
      coAssigneeIds,
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

    /* Replace the co-assignee set when the client sends `coAssigneeIds`.
       Omitting the field leaves the existing set untouched — important
       so a partial PATCH (e.g., status-only) doesn't wipe the list. */
    const previousCoIds = new Set(
      existing.coAssignees.map((c) => c.userId)
    );
    let newCoIds = null;
    if (Array.isArray(coAssigneeIds)) {
      const primaryCandidate =
        data.assigneeId !== undefined ? data.assigneeId : existing.assigneeId;
      newCoIds = Array.from(
        new Set(coAssigneeIds.filter((id) => id && id !== primaryCandidate))
      );
      data.coAssignees = {
        deleteMany: {},
        create: newCoIds.map((userId) => ({ userId })),
      };
    }

    const bug = await prisma.bug.update({
      where: { id: req.params.id },
      data,
      include: bugInclude,
    });

    /* Notify on reassignment + any *newly added* co-assignees. The
       primary fires only when it changed to someone new; co-assignees
       fire only for ids that weren't already on the bug. Re-saving the
       same set is a no-op. */
    const toNotify = new Set();
    if (bug.assigneeId && bug.assigneeId !== existing.assigneeId) {
      toNotify.add(bug.assigneeId);
    }
    if (newCoIds) {
      for (const id of newCoIds) {
        if (!previousCoIds.has(id)) toNotify.add(id);
      }
    }
    if (toNotify.size) {
      const project = await prisma.project.findUnique({
        where: { id: bug.projectId },
        select: { id: true, name: true },
      });
      await notifyBugAssigned({
        bug,
        project,
        recipientIds: Array.from(toNotify),
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
