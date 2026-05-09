import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

router.get("/stats", async (req, res) => {
  /* Workspace-wide reads — counts are unfiltered. `totalUsers` stays
     admin-only as a small privacy gate (employees don't need a user
     headcount). */
  const isAdmin = req.user.role === "admin";

  const [totalUsers, totalProjects, tasksByStatus, bugsByStatus, totalNotes] =
    await Promise.all([
      isAdmin ? prisma.user.count() : null,
      prisma.project.count(),
      prisma.task.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.bug.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.meetingNote.count(),
    ]);

  const tasks = Object.fromEntries(
    tasksByStatus.map((t) => [t.status, t._count._all])
  );
  const bugs = Object.fromEntries(
    bugsByStatus.map((b) => [b.status, b._count._all])
  );

  res.json({
    totalUsers,
    totalProjects,
    tasks,
    bugs,
    totalMeetingNotes: totalNotes,
  });
});

router.get("/counts", async (req, res) => {
  /* Workspace-wide counts. Employee dashboard sums across the
     user's project ids client-side, so unfiltered numbers here are
     fine — they map to the right scope at the consumer. */
  const [tasks, bugs, notes] = await Promise.all([
    prisma.task.groupBy({
      by: ["projectId", "status"],
      _count: { _all: true },
    }),
    prisma.bug.groupBy({
      by: ["projectId", "status"],
      _count: { _all: true },
    }),
    prisma.meetingNote.groupBy({
      by: ["projectId"],
      _count: { _all: true },
    }),
  ]);

  const bucket = (rows, isOpen) => {
    const byProject = {};
    let totalOpen = 0;
    let total = 0;
    for (const r of rows) {
      const open = isOpen(r.status);
      total += r._count._all;
      if (open) {
        byProject[r.projectId] = (byProject[r.projectId] || 0) + r._count._all;
        totalOpen += r._count._all;
      }
    }
    return { byProject, totalOpen, total };
  };

  const taskOpen = (s) => s !== "done";
  const bugOpen = (s) => s !== "resolved" && s !== "closed";

  const noteCounts = {};
  let noteTotal = 0;
  for (const n of notes) {
    noteCounts[n.projectId] = n._count._all;
    noteTotal += n._count._all;
  }

  res.json({
    tasks: bucket(tasks, taskOpen),
    bugs: bucket(bugs, bugOpen),
    meetingNotes: { byProject: noteCounts, total: noteTotal },
  });
});

/* Bug intake vs resolution over the past N days. Returns one bucket
   per day so the client can render directly without further math.
   "Resolved" is approximated by `updatedAt` within the window for
   bugs whose current status is a closed-state value — close enough
   for a trend chart, and avoids needing a separate audit log. */
router.get("/bug-trend", async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days ?? 30), 7), 90);

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const [created, resolvedRows] = await Promise.all([
    prisma.bug.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.bug.findMany({
      where: {
        updatedAt: { gte: since },
        status: { in: ["done", "resolved", "closed"] },
      },
      select: { updatedAt: true },
    }),
  ]);

  const dayKey = (d) => {
    const local = new Date(d);
    local.setHours(0, 0, 0, 0);
    return local.toISOString().slice(0, 10);
  };

  const buckets = new Map();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(dayKey(d), { date: dayKey(d), intake: 0, resolved: 0 });
  }
  for (const c of created) {
    const k = dayKey(c.createdAt);
    if (buckets.has(k)) buckets.get(k).intake += 1;
  }
  for (const r of resolvedRows) {
    const k = dayKey(r.updatedAt);
    if (buckets.has(k)) buckets.get(k).resolved += 1;
  }

  res.json(Array.from(buckets.values()));
});

/* Open work per assignee, sorted by total descending. Drives the
   workload chart on the admin dashboard — quick visual answer to
   "is the team balanced?" */
router.get("/workload", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 8), 1), 50);

  const [openBugRows, openTaskRows] = await Promise.all([
    prisma.bug.groupBy({
      by: ["assigneeId"],
      _count: { _all: true },
      where: {
        assigneeId: { not: null },
        status: { notIn: ["done", "resolved", "closed"] },
      },
    }),
    prisma.task.groupBy({
      by: ["assigneeId"],
      _count: { _all: true },
      where: {
        assigneeId: { not: null },
        status: { not: "done" },
      },
    }),
  ]);

  const tally = new Map();
  for (const r of openBugRows) {
    const id = r.assigneeId;
    const e = tally.get(id) || { assigneeId: id, openBugs: 0, openTasks: 0 };
    e.openBugs = r._count._all;
    tally.set(id, e);
  }
  for (const r of openTaskRows) {
    const id = r.assigneeId;
    const e = tally.get(id) || { assigneeId: id, openBugs: 0, openTasks: 0 };
    e.openTasks = r._count._all;
    tally.set(id, e);
  }

  const ids = Array.from(tally.keys());
  const users = ids.length
    ? await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, avatar: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const rows = Array.from(tally.values())
    .map((e) => {
      const u = userMap.get(e.assigneeId);
      return {
        ...e,
        name: u?.name ?? "Unknown",
        avatar: u?.avatar ?? null,
        total: e.openBugs + e.openTasks,
      };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  res.json(rows);
});

router.get("/recent", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 5), 50);

  const [bugs, notes] = await Promise.all([
    prisma.bug.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.meetingNote.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { project: { select: { id: true, name: true } } },
    }),
  ]);

  res.json({ bugs, notes });
});

export default router;
