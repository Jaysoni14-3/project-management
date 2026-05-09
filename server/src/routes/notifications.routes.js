import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

const formatRow = (n) => ({
  id: n.id,
  kind: n.kind,
  title: n.title,
  body: n.body,
  payload: n.payload,
  readAt: n.readAt,
  createdAt: n.createdAt,
});

/* List the current user's notifications, newest first. Capped to keep
   the panel snappy — older entries are dropped silently. */
router.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const rows = await prisma.notification.findMany({
    where: { recipientId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const unreadCount = await prisma.notification.count({
    where: { recipientId: req.user.id, readAt: null },
  });
  res.json({ items: rows.map(formatRow), unreadCount });
});

/* Lightweight unread-only endpoint — used by the polling loop so the
   sidebar bell can update its badge without paying for the full list
   payload on every tick. */
router.get("/unread-count", async (req, res) => {
  const unreadCount = await prisma.notification.count({
    where: { recipientId: req.user.id, readAt: null },
  });
  res.json({ unreadCount });
});

router.post("/:id/read", async (req, res) => {
  const updated = await prisma.notification.updateMany({
    where: { id: req.params.id, recipientId: req.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ updated: updated.count });
});

router.post("/read-all", async (req, res) => {
  const updated = await prisma.notification.updateMany({
    where: { recipientId: req.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ updated: updated.count });
});

export default router;
