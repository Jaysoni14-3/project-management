import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { assertProjectAccess } from "../lib/access.js";
import {
  createTaskSchema,
  updateTaskSchema,
} from "../schemas/tasks.schema.js";
import { notFound } from "../lib/errors.js";

const parseDueDate = (v) => {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  return new Date(v);
};

/* Always pull checklist items in stable display order. Kept as a
   constant so list, single-fetch, and post-create reads share one
   shape and the frontend never has to guess. */
const taskInclude = {
  checklistItems: { orderBy: { order: "asc" } },
  createdBy: { select: { id: true, name: true, avatar: true } },
  assignee: { select: { id: true, name: true, avatar: true } },
};

/* Flatten the joined user objects to name fields on the wire so the
   client doesn't have to chase nested objects (and matches the bug
   + meeting note response shape). */
const formatTask = ({ createdBy, assignee, ...task }) => ({
  ...task,
  createdByName: createdBy?.name ?? null,
  createdByAvatar: createdBy?.avatar ?? null,
  assigneeName: assignee?.name ?? null,
  assigneeAvatar: assignee?.avatar ?? null,
});

// Routes mounted at /api/projects/:projectId/tasks
export const projectTaskRoutes = Router({ mergeParams: true });
projectTaskRoutes.use(requireAuth);

/* Read open across the workspace — everyone can see any project's
   tasks. Mutations below still require project membership. */
projectTaskRoutes.get("/", async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { projectId: req.params.projectId },
    orderBy: { createdAt: "desc" },
    include: taskInclude,
  });
  res.json(tasks.map(formatTask));
});

projectTaskRoutes.post(
  "/",
  validate({ body: createTaskSchema }),
  async (req, res) => {
    await assertProjectAccess(req.user, req.params.projectId);
    const data = {
      ...req.body,
      projectId: req.params.projectId,
      createdById: req.user.id,
    };
    if (data.dueDate !== undefined) data.dueDate = parseDueDate(data.dueDate);

    const task = await prisma.task.create({ data, include: taskInclude });
    res.status(201).json(formatTask(task));
  }
);

// Routes mounted at /api/tasks
const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.get("/", async (req, res) => {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
    include: taskInclude,
  });
  res.json(tasks.map(formatTask));
});

tasksRouter.get("/:id", async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: taskInclude,
  });
  if (!task) throw notFound("Task not found");
  res.json(formatTask(task));
});

tasksRouter.patch(
  "/:id",
  validate({ body: updateTaskSchema }),
  async (req, res) => {
    const existing = await prisma.task.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw notFound("Task not found");
    await assertProjectAccess(req.user, existing.projectId);

    const data = { ...req.body };
    if (data.dueDate !== undefined) data.dueDate = parseDueDate(data.dueDate);

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: taskInclude,
    });
    res.json(formatTask(task));
  }
);

tasksRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.task.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) throw notFound("Task not found");
  await assertProjectAccess(req.user, existing.projectId);
  await prisma.task.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

/* ──────────────────────────────────────────────────────────────────
   Checklist endpoints. Each item belongs to a task; project access is
   enforced via the parent task's projectId. Items are returned bundled
   with their task on every read, so the client doesn't usually need
   these directly except to add/toggle/delete.
   ────────────────────────────────────────────────────────────────── */

tasksRouter.post("/:id/checklist", async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    select: { id: true, projectId: true },
  });
  if (!task) throw notFound("Task not found");
  await assertProjectAccess(req.user, task.projectId);

  const text = String(req.body?.text ?? "").trim();
  if (!text) throw notFound("Item text is required");

  /* Append to the end — find the current max order and add 1. Doing it
     server-side avoids race conditions when two users add at once. */
  const last = await prisma.taskChecklistItem.findFirst({
    where: { taskId: task.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? -1) + 1;

  const item = await prisma.taskChecklistItem.create({
    data: { taskId: task.id, text, order },
  });
  res.status(201).json(item);
});

const checklistRouter = Router();
checklistRouter.use(requireAuth);

checklistRouter.patch("/:itemId", async (req, res) => {
  const existing = await prisma.taskChecklistItem.findUnique({
    where: { id: req.params.itemId },
    include: { task: { select: { projectId: true } } },
  });
  if (!existing) throw notFound("Checklist item not found");
  await assertProjectAccess(req.user, existing.task.projectId);

  const data = {};
  if (typeof req.body?.text === "string") {
    const trimmed = req.body.text.trim();
    if (!trimmed) throw notFound("Item text cannot be empty");
    data.text = trimmed;
  }
  if (typeof req.body?.done === "boolean") {
    data.done = req.body.done;
  }
  if (typeof req.body?.order === "number") {
    data.order = req.body.order;
  }

  const item = await prisma.taskChecklistItem.update({
    where: { id: existing.id },
    data,
  });
  res.json(item);
});

checklistRouter.delete("/:itemId", async (req, res) => {
  const existing = await prisma.taskChecklistItem.findUnique({
    where: { id: req.params.itemId },
    include: { task: { select: { projectId: true } } },
  });
  if (!existing) throw notFound("Checklist item not found");
  await assertProjectAccess(req.user, existing.task.projectId);

  await prisma.taskChecklistItem.delete({ where: { id: existing.id } });
  res.status(204).end();
});

export { checklistRouter };
export default tasksRouter;
