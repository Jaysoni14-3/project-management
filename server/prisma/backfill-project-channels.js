/* One-off backfill: create a chat channel for every existing project
   and seed it with current members. Idempotent — safe to re-run. New
   projects created after this PR will get their channel via the
   syncProjectChannel hook in projects.routes.js. */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const main = async () => {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      members: { select: { userId: true } },
    },
  });

  if (!projects.length) {
    console.log("No projects to backfill.");
    return;
  }

  console.log(`Backfilling channels for ${projects.length} projects…`);

  let created = 0;
  let participantsAdded = 0;
  let participantsRemoved = 0;

  for (const project of projects) {
    const memberIds = project.members.map((m) => m.userId);

    let channel = await prisma.conversation.findUnique({
      where: { projectId: project.id },
      select: { id: true },
    });

    if (!channel) {
      channel = await prisma.conversation.create({
        data: { type: "project", projectId: project.id },
        select: { id: true },
      });
      created += 1;
    }

    const current = await prisma.conversationParticipant.findMany({
      where: { conversationId: channel.id },
      select: { userId: true },
    });
    const currentIds = new Set(current.map((c) => c.userId));
    const desiredIds = new Set(memberIds);

    const toAdd = [...desiredIds].filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));

    if (toAdd.length) {
      await prisma.conversationParticipant.createMany({
        data: toAdd.map((userId) => ({
          conversationId: channel.id,
          userId,
        })),
        skipDuplicates: true,
      });
      participantsAdded += toAdd.length;
    }
    if (toRemove.length) {
      await prisma.conversationParticipant.deleteMany({
        where: {
          conversationId: channel.id,
          userId: { in: toRemove },
        },
      });
      participantsRemoved += toRemove.length;
    }

    console.log(
      `  · ${project.name}: ${memberIds.length} members ` +
        `(+${toAdd.length}, -${toRemove.length})`
    );
  }

  console.log(
    `\nDone. Channels created: ${created}. ` +
      `Participants added: ${participantsAdded}, removed: ${participantsRemoved}.`
  );
};

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
