import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

/* One-shot backfill: writes a `bug_assigned` notification for every
   bug that has an assignee but no existing notification. Mirrors the
   payload shape of `lib/notify.js#notifyBugAssigned` so the panel
   renders these the same as live ones.

   Idempotent — checks for an existing notification with the same
   recipient + kind + payload.bugId before creating, so it's safe to
   re-run.

   Run from server/:
     node prisma/backfill-bug-notifications.js
*/

async function main() {
  const bugs = await prisma.bug.findMany({
    where: { assigneeId: { not: null } },
    select: {
      id: true,
      title: true,
      projectId: true,
      assigneeId: true,
      reporterId: true,
      project: { select: { name: true } },
      reporter: { select: { id: true, name: true } },
    },
  });

  let created = 0;
  let skippedSelfAction = 0;
  let skippedExisting = 0;

  for (const bug of bugs) {
    /* Match the live route's behaviour — never notify the actor about
       their own action. Here the "actor" is the reporter; if reporter
       and assignee are the same person, skip. */
    if (bug.assigneeId === bug.reporterId) {
      skippedSelfAction += 1;
      continue;
    }

    const existing = await prisma.notification.findFirst({
      where: {
        kind: "bug_assigned",
        recipientId: bug.assigneeId,
        payload: { path: ["bugId"], equals: bug.id },
      },
      select: { id: true },
    });
    if (existing) {
      skippedExisting += 1;
      continue;
    }

    await prisma.notification.create({
      data: {
        recipientId: bug.assigneeId,
        kind: "bug_assigned",
        title: `Bug assigned: ${bug.title || "Untitled"}`,
        body: bug.reporter?.name
          ? `${bug.reporter.name} assigned this to you on ${
              bug.project?.name || "a project"
            }.`
          : null,
        payload: {
          bugId: bug.id,
          bugTitle: bug.title,
          projectId: bug.projectId,
          projectName: bug.project?.name ?? null,
          actorId: bug.reporter?.id ?? null,
          actorName: bug.reporter?.name ?? null,
        },
      },
    });
    created += 1;
  }

  console.log(
    `Done. created=${created}  skipped-self=${skippedSelfAction}  skipped-existing=${skippedExisting}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
