import { prisma } from "./prisma.js";

/* One Conversation of type=project per project, kept in sync with
   ProjectMember. Roles (manager/member/tester) don't matter here —
   everyone on the project chats together.

   Best-effort: if any chat-side step fails, the project mutation
   that triggered the sync is already committed, so we log and move
   on. Worst case the channel falls out of sync and the next change
   reconciles it. */

const safeRun = async (label, fn) => {
  try {
    return await fn();
  } catch (err) {
    console.error(`[projectChannels] ${label} failed:`, err);
    return null;
  }
};

/* Find or create the channel for a project. Returns the channel id. */
const findOrCreateChannel = async (projectId) => {
  const existing = await prisma.conversation.findUnique({
    where: { projectId },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.conversation.create({
    data: { type: "project", projectId },
  });
  return created.id;
};

/* Sync the channel's participants to the given member id list. Adds
   missing members, removes extras. Idempotent. */
export const syncProjectChannel = (projectId, memberIds) =>
  safeRun("syncProjectChannel", async () => {
    const conversationId = await findOrCreateChannel(projectId);

    const current = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    const currentIds = new Set(current.map((c) => c.userId));
    const desiredIds = new Set(memberIds);

    const toAdd = [...desiredIds].filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));

    const ops = [];
    if (toAdd.length) {
      ops.push(
        prisma.conversationParticipant.createMany({
          data: toAdd.map((userId) => ({ conversationId, userId })),
          skipDuplicates: true,
        })
      );
    }
    if (toRemove.length) {
      ops.push(
        prisma.conversationParticipant.deleteMany({
          where: {
            conversationId,
            userId: { in: toRemove },
          },
        })
      );
    }
    if (ops.length) await prisma.$transaction(ops);

    return { conversationId, added: toAdd, removed: toRemove };
  });

/* Convenience for the single-add path on POST /api/projects/:id/members.
   No-op if the channel doesn't exist yet (it will the next time the
   project is mutated). */
export const addToProjectChannel = (projectId, userId) =>
  safeRun("addToProjectChannel", async () => {
    const channel = await prisma.conversation.findUnique({
      where: { projectId },
      select: { id: true },
    });
    if (!channel) {
      const id = await findOrCreateChannel(projectId);
      await prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: id, userId } },
        create: { conversationId: id, userId },
        update: {},
      });
      return;
    }
    await prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: { conversationId: channel.id, userId },
      },
      create: { conversationId: channel.id, userId },
      update: {},
    });
  });

export const removeFromProjectChannel = (projectId, userId) =>
  safeRun("removeFromProjectChannel", async () => {
    const channel = await prisma.conversation.findUnique({
      where: { projectId },
      select: { id: true },
    });
    if (!channel) return;
    await prisma.conversationParticipant.deleteMany({
      where: { conversationId: channel.id, userId },
    });
  });
