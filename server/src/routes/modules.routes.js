import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { assertProjectAccess } from "../lib/access.js";
import {
  createModuleSchema,
  updateModuleSchema,
} from "../schemas/modules.schema.js";
import { notFound } from "../lib/errors.js";
import {
  notifyModuleAssigned,
  notifyModuleCompleted,
  notifyBugAssigned,
} from "../lib/notify.js";

const moduleInclude = {
  assignee: { select: { id: true, name: true, avatar: true } },
  createdBy: { select: { id: true, name: true, avatar: true } },
};

const formatModule = ({ assignee, createdBy, ...m }) => ({
  ...m,
  assigneeName: assignee?.name ?? null,
  assigneeAvatar: assignee?.avatar ?? null,
  createdByName: createdBy?.name ?? null,
  createdByAvatar: createdBy?.avatar ?? null,
});

const formatHistoryEntry = ({ changedBy, ...h }) => ({
  ...h,
  changedByName: changedBy?.name ?? null,
  changedByAvatar: changedBy?.avatar ?? null,
});

/* Build the description copied onto the auto-generated bug. Includes the
   module's own description plus a compact history log so the tester has
   the full "what was built" context in one place. */
const buildAutoBugDescription = (module, history) => {
  const lines = [];
  if (module.description) lines.push(module.description.trim());
  if (history.length) {
    lines.push("");
    lines.push("---");
    lines.push("Module history:");
    for (const h of history) {
      const ts = new Date(h.changedAt).toISOString();
      const who = h.changedBy?.name ?? "System";
      const change =
        h.fieldChanged === "status"
          ? `status: ${h.oldValue ?? "—"} → ${h.newValue ?? "—"}`
          : `${h.fieldChanged} updated`;
      lines.push(`- ${ts} · ${who} · ${change}`);
    }
  }
  return lines.join("\n") || null;
};

/* Resolve who the auto-generated bug should be assigned to when a module
   is completed. Preference order:
     1. All ProjectMembers with role = tester  (multi-assignee)
     2. All ProjectMembers with role = manager (multi-assignee fallback)
     3. The project's creator (last-resort, single assignee)
   Returns { primary, others } where `primary` becomes Bug.assigneeId and
   `others` become BugAssignee rows. Empty `primary` means no one to
   assign — caller should still create the bug so it's visible. */
const resolveBugAssignees = async (projectId) => {
  const members = await prisma.projectMember.findMany({
    where: { projectId, role: { in: ["tester", "manager"] } },
    select: { userId: true, role: true, joinedAt: true },
    orderBy: { joinedAt: "asc" },
  });
  const testers = members.filter((m) => m.role === "tester").map((m) => m.userId);
  if (testers.length) {
    return { primary: testers[0], others: testers.slice(1) };
  }
  const managers = members.filter((m) => m.role === "manager").map((m) => m.userId);
  if (managers.length) {
    return { primary: managers[0], others: managers.slice(1) };
  }
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdById: true },
  });
  return { primary: project?.createdById ?? null, others: [] };
};

/* Project managers receive `module_completed` notifications so they
   know when work is ready for QA. */
const findProjectManagerIds = async (projectId) => {
  const rows = await prisma.projectMember.findMany({
    where: { projectId, role: "manager" },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
};

/* ──────────────────────────────────────────────────────────────────
   Project-scoped routes: /api/projects/:projectId/modules
   ────────────────────────────────────────────────────────────────── */
export const projectModuleRoutes = Router({ mergeParams: true });
projectModuleRoutes.use(requireAuth);

projectModuleRoutes.get("/", async (req, res) => {
  const modules = await prisma.module.findMany({
    where: { projectId: req.params.projectId },
    orderBy: { createdAt: "desc" },
    include: moduleInclude,
  });
  res.json(modules.map(formatModule));
});

projectModuleRoutes.post(
  "/",
  validate({ body: createModuleSchema }),
  async (req, res) => {
    await assertProjectAccess(req.user, req.params.projectId);
    const data = {
      ...req.body,
      projectId: req.params.projectId,
      createdById: req.user.id,
    };
    if (data.status === "in_progress") data.startedAt = new Date();

    const module = await prisma.module.create({
      data,
      include: moduleInclude,
    });

    await prisma.moduleHistory.create({
      data: {
        moduleId: module.id,
        changedById: req.user.id,
        fieldChanged: "created",
        oldValue: null,
        newValue: module.status,
      },
    });

    if (module.assigneeId) {
      const project = await prisma.project.findUnique({
        where: { id: module.projectId },
        select: { id: true, name: true },
      });
      await notifyModuleAssigned({
        module,
        project,
        assigneeId: module.assigneeId,
        actorId: req.user.id,
        actorName: req.user.name,
      });
    }

    res.status(201).json(formatModule(module));
  }
);

/* ──────────────────────────────────────────────────────────────────
   Global routes: /api/modules
   ────────────────────────────────────────────────────────────────── */
const modulesRouter = Router();
modulesRouter.use(requireAuth);

/* Filters: ?assigneeId=me|<id> · ?status=… · ?projectId=… · ?mine=1
   `mine=1` and `assigneeId=me` both resolve to the current user — the
   client uses whichever is more readable at the call site. */
modulesRouter.get("/", async (req, res) => {
  const where = {};
  const { assigneeId, status, projectId, mine } = req.query;

  if (mine === "1" || assigneeId === "me") {
    where.assigneeId = req.user.id;
  } else if (assigneeId) {
    where.assigneeId = assigneeId;
  }
  if (status) where.status = status;
  if (projectId) where.projectId = projectId;

  const modules = await prisma.module.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      ...moduleInclude,
      project: { select: { id: true, name: true } },
    },
  });
  res.json(
    modules.map(({ project, ...m }) => ({
      ...formatModule(m),
      projectName: project?.name ?? null,
    }))
  );
});

modulesRouter.get("/:id", async (req, res) => {
  const module = await prisma.module.findUnique({
    where: { id: req.params.id },
    include: {
      ...moduleInclude,
      project: { select: { id: true, name: true } },
      history: {
        orderBy: { changedAt: "desc" },
        include: {
          changedBy: { select: { id: true, name: true, avatar: true } },
        },
      },
    },
  });
  if (!module) throw notFound("Module not found");

  const { project, history, ...rest } = module;
  res.json({
    ...formatModule(rest),
    projectName: project?.name ?? null,
    history: history.map(formatHistoryEntry),
  });
});

modulesRouter.patch(
  "/:id",
  validate({ body: updateModuleSchema }),
  async (req, res) => {
    const existing = await prisma.module.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw notFound("Module not found");
    await assertProjectAccess(req.user, existing.projectId);

    const patch = { ...req.body };
    const historyRows = [];

    /* Status transitions get timestamp side effects + a history row. */
    if (patch.status && patch.status !== existing.status) {
      if (patch.status === "in_progress" && !existing.startedAt) {
        patch.startedAt = new Date();
      }
      if (patch.status === "completed") {
        patch.completedAt = new Date();
      }
      historyRows.push({
        moduleId: existing.id,
        changedById: req.user.id,
        fieldChanged: "status",
        oldValue: existing.status,
        newValue: patch.status,
      });
    }

    if ("assigneeId" in patch && patch.assigneeId !== existing.assigneeId) {
      historyRows.push({
        moduleId: existing.id,
        changedById: req.user.id,
        fieldChanged: "assignee",
        oldValue: existing.assigneeId ?? null,
        newValue: patch.assigneeId ?? null,
      });
    }
    if (patch.title !== undefined && patch.title !== existing.title) {
      historyRows.push({
        moduleId: existing.id,
        changedById: req.user.id,
        fieldChanged: "title",
        oldValue: existing.title,
        newValue: patch.title,
      });
    }
    if (
      patch.description !== undefined &&
      patch.description !== existing.description
    ) {
      historyRows.push({
        moduleId: existing.id,
        changedById: req.user.id,
        fieldChanged: "description",
        oldValue: existing.description ?? null,
        newValue: patch.description ?? null,
      });
    }

    const module = await prisma.module.update({
      where: { id: existing.id },
      data: patch,
      include: moduleInclude,
    });

    if (historyRows.length) {
      await prisma.moduleHistory.createMany({ data: historyRows });
    }

    /* Reassignment notification (only when assignee actually changed
       to someone new — re-saving same assignee is a no-op). */
    if (
      module.assigneeId &&
      module.assigneeId !== existing.assigneeId
    ) {
      const project = await prisma.project.findUnique({
        where: { id: module.projectId },
        select: { id: true, name: true },
      });
      await notifyModuleAssigned({
        module,
        project,
        assigneeId: module.assigneeId,
        actorId: req.user.id,
        actorName: req.user.name,
      });
    }

    /* Completion side effects: notify managers + auto-create bug for
       testers. Best-effort — failures here must not roll back the
       module update the user just performed. */
    if (
      patch.status === "completed" &&
      existing.status !== "completed"
    ) {
      const project = await prisma.project.findUnique({
        where: { id: module.projectId },
        select: { id: true, name: true },
      });
      const managerIds = await findProjectManagerIds(module.projectId);
      await notifyModuleCompleted({
        module,
        project,
        recipientIds: managerIds,
        actorId: req.user.id,
        actorName: req.user.name,
      });

      try {
        const history = await prisma.moduleHistory.findMany({
          where: { moduleId: module.id },
          orderBy: { changedAt: "asc" },
          include: {
            changedBy: { select: { name: true } },
          },
        });
        const description = buildAutoBugDescription(module, history);
        const { primary, others } = await resolveBugAssignees(module.projectId);

        const bug = await prisma.bug.create({
          data: {
            projectId: module.projectId,
            moduleId: module.id,
            title: module.title,
            description,
            severity: "medium",
            priority: "medium",
            status: "backlog",
            reporterId: req.user.id,
            assigneeId: primary,
            coAssignees: others.length
              ? { create: others.map((userId) => ({ userId })) }
              : undefined,
          },
          include: {
            reporter: { select: { id: true, name: true, avatar: true } },
            assignee: { select: { id: true, name: true, avatar: true } },
            coAssignees: {
              include: {
                user: { select: { id: true, name: true, avatar: true } },
              },
            },
          },
        });

        const recipientIds = [primary, ...others].filter(Boolean);
        if (recipientIds.length) {
          await notifyBugAssigned({
            bug,
            project,
            recipientIds,
            actorId: req.user.id,
            actorName: req.user.name,
          });
        }
      } catch (err) {
        console.error("[modules] auto-bug creation failed:", err);
      }
    }

    res.json(formatModule(module));
  }
);

modulesRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.module.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) throw notFound("Module not found");
  await assertProjectAccess(req.user, existing.projectId);

  await prisma.module.delete({ where: { id: existing.id } });
  res.status(204).end();
});

export default modulesRouter;
