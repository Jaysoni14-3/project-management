import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

const PER_GROUP_LIMIT = 6;

/* GET /api/search?q=foo
   Single-shot global search across users, projects, bugs, meeting notes.
   Workspace reads are open, so search is unfiltered for all authed
   users — matches the rest of the read endpoints. Each group is
   capped so the dropdown stays snappy; empty groups are omitted
   entirely so the client can hide the section without extra logic.
   Query strings under 2 chars short-circuit to empty results to avoid
   noisy autocomplete on every keystroke. */
router.get("/", async (req, res) => {
  const raw = String(req.query.q ?? "").trim();
  if (raw.length < 2) {
    return res.json({ users: [], projects: [], bugs: [], notes: [] });
  }

  const q = raw;
  const contains = { contains: q, mode: "insensitive" };

  const [users, projects, bugs, notes] = await Promise.all([
    prisma.user.findMany({
      where: { name: contains },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        designation: true,
      },
      take: PER_GROUP_LIMIT,
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { name: contains },
      select: {
        id: true,
        name: true,
        clientName: true,
        status: true,
      },
      take: PER_GROUP_LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.bug.findMany({
      /* Match either the bug's own title OR its parent project's name,
         so searching for a project also surfaces its bugs. */
      where: {
        OR: [
          { title: contains },
          { project: { name: contains } },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        projectId: true,
        project: { select: { id: true, name: true } },
      },
      take: PER_GROUP_LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.meetingNote.findMany({
      where: {
        OR: [
          { title: contains },
          { project: { name: contains } },
        ],
      },
      select: {
        id: true,
        title: true,
        meetingDate: true,
        projectId: true,
        project: { select: { id: true, name: true } },
      },
      take: PER_GROUP_LIMIT,
      orderBy: { meetingDate: "desc" },
    }),
  ]);

  res.json({ users, projects, bugs, notes });
});

export default router;
