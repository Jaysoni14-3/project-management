import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import {
  createProjectSchema,
  updateProjectSchema,
  memberSchema,
} from "../schemas/projects.schema.js";
import {
  assertProjectAccess,
  assertProjectManageRights,
} from "../lib/access.js";
import { notFound } from "../lib/errors.js";
import { notifyProjectAssigned } from "../lib/notify.js";

const router = Router();

router.use(requireAuth);

const projectInclude = {
  members: {
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
  },
};

const formatProject = (p) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  clientName: p.clientName,
  status: p.status,
  currentPhase: p.currentPhase,
  createdById: p.createdById,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  memberIds: p.members.map((m) => m.userId),
  managerIds: p.members
    .filter((m) => m.role === "manager")
    .map((m) => m.userId),
  members: p.members.map((m) => ({ ...m.user, role: m.role })),
});

const buildMembersData = (memberIds = [], managerIds = []) => {
  const desired = new Map();
  memberIds.forEach((id) => desired.set(id, "member"));
  managerIds.forEach((id) => desired.set(id, "manager"));
  return Array.from(desired, ([userId, role]) => ({ userId, role }));
};

/* Projects are now read-visible to every authed user — listings and
   detail are open across the workspace. Mutations still require
   manage rights (admin/manager) via the helpers below. */
router.get("/", async (req, res) => {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: projectInclude,
  });
  res.json(projects.map(formatProject));
});

router.get("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: projectInclude,
  });
  if (!project) throw notFound("Project not found");
  res.json(formatProject(project));
});

router.post(
  "/",
  requireRole("admin", "manager"),
  validate({ body: createProjectSchema }),
  async (req, res) => {
    const {
      name,
      description,
      clientName,
      status,
      currentPhase,
      memberIds = [],
      managerIds = [],
    } = req.body;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        clientName,
        status: status ?? "active",
        currentPhase,
        createdById: req.user.id,
        members: {
          create: buildMembersData(memberIds, managerIds),
        },
      },
      include: projectInclude,
    });

    await notifyProjectAssigned({
      project,
      recipientIds: project.members.map((m) => m.userId),
      actorId: req.user.id,
      actorName: req.user.name,
    });

    res.status(201).json(formatProject(project));
  }
);

router.patch(
  "/:id",
  validate({ body: updateProjectSchema }),
  async (req, res) => {
    await assertProjectManageRights(req.user, req.params.id);
    const { memberIds, managerIds, ...data } = req.body;

    if (Object.keys(data).length > 0) {
      await prisma.project.update({
        where: { id: req.params.id },
        data,
      });
    }

    let addedMemberIds = [];
    if (memberIds !== undefined || managerIds !== undefined) {
      const previous = await prisma.projectMember.findMany({
        where: { projectId: req.params.id },
        select: { userId: true },
      });
      const previousIds = new Set(previous.map((p) => p.userId));
      const newMembers = buildMembersData(memberIds ?? [], managerIds ?? []);
      addedMemberIds = newMembers
        .map((m) => m.userId)
        .filter((id) => !previousIds.has(id));

      await prisma.$transaction([
        prisma.projectMember.deleteMany({
          where: { projectId: req.params.id },
        }),
        prisma.projectMember.createMany({
          data: newMembers.map((m) => ({
            projectId: req.params.id,
            ...m,
          })),
        }),
      ]);
    }

    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: projectInclude,
    });

    if (addedMemberIds.length > 0) {
      await notifyProjectAssigned({
        project,
        recipientIds: addedMemberIds,
        actorId: req.user.id,
        actorName: req.user.name,
      });
    }

    res.json(formatProject(project));
  }
);

router.delete("/:id", requireRole("admin", "manager"), async (req, res) => {
  await prisma.project.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

router.post(
  "/:id/members",
  validate({ body: memberSchema }),
  async (req, res) => {
    await assertProjectManageRights(req.user, req.params.id);
    const { userId, role = "member" } = req.body;
    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId } },
    });
    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: req.params.id, userId } },
      create: { projectId: req.params.id, userId, role },
      update: { role },
    });
    /* Only fire when this is a brand-new membership — role-change updates
       shouldn't re-notify. */
    if (!existing) {
      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
        select: { id: true, name: true },
      });
      if (project) {
        await notifyProjectAssigned({
          project,
          recipientIds: [userId],
          actorId: req.user.id,
          actorName: req.user.name,
        });
      }
    }
    res.status(201).json(member);
  }
);

router.delete("/:id/members/:userId", async (req, res) => {
  await assertProjectManageRights(req.user, req.params.id);
  await prisma.projectMember.delete({
    where: {
      projectId_userId: {
        projectId: req.params.id,
        userId: req.params.userId,
      },
    },
  });
  res.status(204).end();
});

export default router;
