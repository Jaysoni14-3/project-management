import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { updateUserSchema } from "../schemas/users.schema.js";
import { forbidden, notFound } from "../lib/errors.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      whatsapp: true,
      phoneNumber: true,
      joinedDate: true,
      designation: true,
      isManager: true,
      managerId: true,
      createdAt: true,
      projectMemberships: {
        select: {
          role: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
  });

  const shaped = users.map((u) => ({
    ...u,
    assignedProjects: u.projectMemberships.map((m) => ({
      id: m.project.id,
      name: m.project.name,
      role: m.role,
    })),
    projectMemberships: undefined,
  }));

  res.json(shaped);
});

router.get("/:id", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      whatsapp: true,
      phoneNumber: true,
      joinedDate: true,
      designation: true,
      isManager: true,
      managerId: true,
      createdAt: true,
      projectMemberships: {
        select: {
          role: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!user) throw notFound("User not found");

  res.json({
    ...user,
    assignedProjects: user.projectMemberships.map((m) => ({
      id: m.project.id,
      name: m.project.name,
      role: m.role,
    })),
    projectMemberships: undefined,
  });
});

router.patch(
  "/:id",
  validate({ body: updateUserSchema }),
  async (req, res) => {
    const isSelf = req.user.id === req.params.id;
    const isAdmin = req.user.role === "admin";
    const canManage = isAdmin || req.user.role === "manager";
    /* Anyone can edit their own profile; only admin or manager can edit
       another teammate's card. Employees stay locked out of foreign edits. */
    if (!isSelf && !canManage) throw forbidden();

    const data = { ...req.body };
    /* Role changes remain admin-only — managers can update profile fields
       on others but can't promote them. */
    if (!isAdmin) delete data.role;

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        whatsapp: true,
        phoneNumber: true,
        joinedDate: true,
        designation: true,
        isManager: true,
        managerId: true,
      },
    });
    res.json(updated);
  }
);

router.delete("/:id", requireRole("admin", "manager"), async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
