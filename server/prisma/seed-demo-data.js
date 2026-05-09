import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

/* One-shot demo data seeder for bugs, tasks, and meeting notes across
   every existing project. Re-running adds another batch — there's no
   uniqueness constraint, so don't run blindly twice unless you want
   piles of duplicates. Run from server/:
     node prisma/seed-demo-data.js
*/

const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickMany = (arr, min, max) => {
  const n = Math.min(arr.length, min + Math.floor(Math.random() * (max - min + 1)));
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
};
const randInt = (min, max) =>
  min + Math.floor(Math.random() * (max - min + 1));

/* Date helpers — `daysFrom(-7)` is a week ago, `daysFrom(14)` is two
   weeks out. */
const daysFrom = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
};

const BUG_TITLES = [
  "Login button misaligned on mobile",
  "Form validation skips empty email",
  "Modal overflows viewport on iPad",
  "Notification badge stuck after read",
  "Sidebar collapses on tab switch",
  "Search dropdown clips behind header",
  "Date picker shows wrong year on Safari",
  "File upload silently fails over 5MB",
  "Avatar fallback initials wrong color in dark mode",
  "Pagination resets after filter applied",
  "Toast persists after navigation",
  "Profile save shows success but doesn't persist",
  "Password input autofills wrong account",
  "Drag-and-drop loses position on long lists",
  "Project member list shows duplicates after rename",
  "API errors not surfaced in UI",
  "Settings dark mode toggle delayed",
  "Comment box loses focus mid-typing",
  "Status drag glitches on Firefox",
  "Email link expires before page loads",
  "Phone number field accepts letters",
  "Sort order resets when navigating back",
];

const TASK_TITLES = [
  "Implement search debouncing",
  "Add audit log for bug status changes",
  "Refactor authentication middleware",
  "Set up CI for the staging branch",
  "Create dashboard charts component",
  "Migrate user table to new schema",
  "Write E2E tests for project flow",
  "Add export to CSV for bug list",
  "Optimize image upload pipeline",
  "Improve onboarding flow",
  "Configure rate limiting on API",
  "Document deployment process",
  "Add keyboard shortcuts to kanban",
  "Implement bulk-action menu",
  "Create email digest for daily summary",
  "Set up error tracking",
  "Refactor design tokens for dark mode",
  "Add pagination to task list",
  "Write API client tests",
  "Add favicon for prod environment",
  "Wire up role-based access checks",
  "Polish empty states across the app",
];

const NOTE_TITLES = [
  "Sprint planning kickoff",
  "Client demo dry run",
  "Backend architecture review",
  "Design handoff sync",
  "Sprint retro",
  "Roadmap planning",
  "Bug triage weekly",
  "Onboarding brief for new joiner",
  "Stakeholder check-in",
  "Pre-release smoke test pairing",
];

const NOTE_BODIES = [
  "Walked through the upcoming sprint scope and aligned on capacity.\nTop priority is wrapping up the auth refactor before client demo.",
  "Demo went smoothly, two follow-ups: improve loading skeletons and tighten button states.",
  "Reviewed the new event-driven notifications architecture; agreed to ship Phase 1 only this sprint.",
  "Design handoff covered the redesigned bug board, sidebar tweaks, and toast micro-interactions.",
  "Retro highlights: faster turnaround on PR reviews, more pairing on tricky migrations.",
  "Pulled forward the dashboard refresh into next sprint; pushed out the export feature to Q3.",
  "Triaged 14 incoming bugs — 5 were dupes, 3 closed as won't fix, 6 prioritized into next sprint.",
];

const STATUS_BUG = ["backlog", "in_progress", "in_review", "done"];
const PRIORITY_ALL = ["low", "medium", "high", "urgent"];
const SEVERITY_ALL = ["low", "medium", "high", "critical"];
const STATUS_TASK = ["todo", "in_progress", "in_review", "done"];

/* Weighted picker so the kanban looks alive instead of all-backlog or
   all-done. Roughly: a third in-flight, the rest spread. */
const pickStatus = (statusList) => {
  const r = Math.random();
  if (r < 0.35) return statusList[1]; // in_progress / equivalent
  if (r < 0.55) return statusList[0]; // backlog / todo
  if (r < 0.75) return statusList[2]; // in_review
  return statusList[3]; // done
};

const pickPriority = () => {
  const r = Math.random();
  if (r < 0.45) return "medium";
  if (r < 0.75) return "low";
  if (r < 0.93) return "high";
  return "urgent";
};

const pickSeverity = () => {
  const r = Math.random();
  if (r < 0.4) return "medium";
  if (r < 0.7) return "low";
  if (r < 0.92) return "high";
  return "critical";
};

const maybeDueDate = () => {
  /* 70% of items get a due date — half past, half future. Past dates
     drive the "overdue" stat in the dashboard. */
  if (Math.random() > 0.7) return null;
  const offset = Math.random() < 0.5 ? randInt(-21, -1) : randInt(1, 45);
  return daysFrom(offset);
};

async function seedProject(project, testerIds) {
  const memberIds = project.members.map((m) => m.userId);
  if (memberIds.length === 0) {
    console.log(`· skipped ${project.name} — no members`);
    return { bugs: 0, tasks: 0, notes: 0 };
  }

  /* Half volume on completed projects so the workspace doesn't look
     equally noisy across active and shipped work. */
  const isWound = project.status === "completed" || project.status === "archived";
  const bugCount = isWound ? randInt(2, 4) : randInt(5, 8);
  const taskCount = isWound ? randInt(3, 5) : randInt(6, 12);
  const noteCount = isWound ? 1 : randInt(1, 3);

  /* Bugs — reporter must be a tester per the spec; assignee is any
     project member so the bug actually has someone to land on. */
  for (let i = 0; i < bugCount; i += 1) {
    const reporterId = pickOne(testerIds);
    const assigneeId = Math.random() < 0.85 ? pickOne(memberIds) : null;
    await prisma.bug.create({
      data: {
        projectId: project.id,
        title: pickOne(BUG_TITLES),
        description:
          "Reproduced on latest build. Capturing here so it doesn't slip through the next regression pass.",
        stepsToReproduce:
          "1. Open the affected screen.\n2. Trigger the action described above.\n3. Observe the unexpected state.",
        status: pickStatus(STATUS_BUG),
        priority: pickPriority(),
        severity: pickSeverity(),
        assigneeId,
        reporterId,
        dueDate: maybeDueDate(),
      },
    });
  }

  /* Tasks — both creator and assignee come from the project member
     pool. Self-assigned tasks (creator === assignee) happen naturally
     and that's fine. */
  for (let i = 0; i < taskCount; i += 1) {
    const createdById = pickOne(memberIds);
    const assigneeId = Math.random() < 0.9 ? pickOne(memberIds) : null;
    await prisma.task.create({
      data: {
        projectId: project.id,
        title: pickOne(TASK_TITLES),
        description:
          "Tracked as part of this sprint. Update the card with progress as you go.",
        status: pickStatus(STATUS_TASK),
        priority: pickPriority(),
        assigneeId,
        createdById,
        dueDate: maybeDueDate(),
      },
    });
  }

  /* Meeting notes — author plus 2-4 attendees pulled from the member
     pool. We always include the author in the attendee set since it'd
     be weird for someone to log a meeting they didn't attend. */
  for (let i = 0; i < noteCount; i += 1) {
    const createdById = pickOne(memberIds);
    const otherAttendees = pickMany(
      memberIds.filter((id) => id !== createdById),
      1,
      Math.min(3, Math.max(1, memberIds.length - 1))
    );
    const attendeeIds = [createdById, ...otherAttendees];
    await prisma.meetingNote.create({
      data: {
        projectId: project.id,
        title: pickOne(NOTE_TITLES),
        content: pickOne(NOTE_BODIES),
        meetingDate: daysFrom(-randInt(0, 30)),
        createdById,
        attendees: {
          create: attendeeIds.map((userId) => ({ userId })),
        },
      },
    });
  }

  return { bugs: bugCount, tasks: taskCount, notes: noteCount };
}

async function main() {
  const projects = await prisma.project.findMany({
    include: { members: { select: { userId: true } } },
  });
  if (projects.length === 0) {
    console.error("No projects found — nothing to seed against.");
    return;
  }

  const testers = await prisma.user.findMany({
    where: { designation: { contains: "Tester", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (testers.length === 0) {
    console.error(
      "No testers found (looked for designation containing 'Tester')."
    );
    return;
  }
  const testerIds = testers.map((t) => t.id);
  console.log(
    `Found ${testers.length} tester(s): ${testers.map((t) => t.name).join(", ")}`
  );

  let totals = { bugs: 0, tasks: 0, notes: 0 };
  for (const p of projects) {
    const counts = await seedProject(p, testerIds);
    totals.bugs += counts.bugs;
    totals.tasks += counts.tasks;
    totals.notes += counts.notes;
    console.log(
      `✔ ${p.name.padEnd(28)} bugs=${counts.bugs}  tasks=${counts.tasks}  notes=${counts.notes}`
    );
  }

  console.log(
    `\nDone. Total: bugs=${totals.bugs}  tasks=${totals.tasks}  notes=${totals.notes}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
