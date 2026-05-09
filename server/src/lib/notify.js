import { prisma } from "./prisma.js";

/* Best-effort notification fan-out. Never throws — a failure to write a
   notification must not block the user-visible action that triggered it
   (creating a project, filing a bug, etc). Errors are logged and swallowed. */
const safeCreateMany = async (rows) => {
  if (!rows.length) return;
  try {
    await prisma.notification.createMany({ data: rows });
  } catch (err) {
    console.error("[notify] createMany failed:", err);
  }
};

const dedupe = (ids = []) =>
  Array.from(new Set(ids.filter(Boolean).map(String)));

export const notifyProjectAssigned = async ({
  project,
  recipientIds,
  actorId,
  actorName,
}) => {
  const recipients = dedupe(recipientIds).filter((id) => id !== actorId);
  if (!recipients.length) return;
  const rows = recipients.map((rid) => ({
    recipientId: rid,
    kind: "project_assigned",
    title: `Added to ${project.name}`,
    body: actorName ? `${actorName} added you to this project.` : null,
    payload: {
      projectId: project.id,
      projectName: project.name,
      actorId: actorId ?? null,
      actorName: actorName ?? null,
    },
  }));
  await safeCreateMany(rows);
};

/* Accepts either a single `assigneeId` (legacy single-assignee path) or
   an array of `recipientIds` (module-bug multi-assignee path). The actor
   is filtered out so users don't get notified about their own actions. */
export const notifyBugAssigned = async ({
  bug,
  project,
  assigneeId,
  recipientIds,
  actorId,
  actorName,
}) => {
  const targets = dedupe(
    recipientIds && recipientIds.length ? recipientIds : [assigneeId]
  ).filter((id) => id !== actorId);
  if (!targets.length) return;
  const rows = targets.map((rid) => ({
    recipientId: rid,
    kind: "bug_assigned",
    title: `Bug assigned: ${bug.title || "Untitled"}`,
    body: actorName
      ? `${actorName} assigned this to you on ${project?.name || "a project"}.`
      : null,
    payload: {
      bugId: bug.id,
      bugTitle: bug.title,
      projectId: bug.projectId,
      projectName: project?.name ?? null,
      moduleId: bug.moduleId ?? null,
      actorId: actorId ?? null,
      actorName: actorName ?? null,
    },
  }));
  await safeCreateMany(rows);
};

export const notifyModuleAssigned = async ({
  module,
  project,
  assigneeId,
  actorId,
  actorName,
}) => {
  if (!assigneeId || assigneeId === actorId) return;
  await safeCreateMany([
    {
      recipientId: assigneeId,
      kind: "module_assigned",
      title: `Module assigned: ${module.title || "Untitled"}`,
      body: actorName
        ? `${actorName} assigned this module to you on ${project?.name || "a project"}.`
        : null,
      payload: {
        moduleId: module.id,
        moduleTitle: module.title,
        projectId: module.projectId,
        projectName: project?.name ?? null,
        actorId: actorId ?? null,
        actorName: actorName ?? null,
      },
    },
  ]);
};

/* Fires when a module flips to `completed`. Recipients are the project's
   managers (ProjectMember.role === "manager"); the assignee who just
   completed it is filtered out via the actor check. */
export const notifyModuleCompleted = async ({
  module,
  project,
  recipientIds,
  actorId,
  actorName,
}) => {
  const recipients = dedupe(recipientIds).filter((id) => id !== actorId);
  if (!recipients.length) return;
  const rows = recipients.map((rid) => ({
    recipientId: rid,
    kind: "module_completed",
    title: `Module completed: ${module.title || "Untitled"}`,
    body: actorName
      ? `${actorName} marked this module complete on ${project?.name || "a project"}.`
      : null,
    payload: {
      moduleId: module.id,
      moduleTitle: module.title,
      projectId: module.projectId,
      projectName: project?.name ?? null,
      actorId: actorId ?? null,
      actorName: actorName ?? null,
    },
  }));
  await safeCreateMany(rows);
};

export const notifyMeetingNoteAttendees = async ({
  note,
  project,
  attendeeIds,
  actorId,
  actorName,
}) => {
  const recipients = dedupe(attendeeIds).filter((id) => id !== actorId);
  if (!recipients.length) return;
  const rows = recipients.map((rid) => ({
    recipientId: rid,
    kind: "meeting_note_attendee",
    title: `Meeting note: ${note.title || "Untitled"}`,
    body: actorName
      ? `${actorName} added you as an attendee on ${project?.name || "a project"}.`
      : null,
    payload: {
      noteId: note.id,
      noteTitle: note.title,
      projectId: note.projectId,
      projectName: project?.name ?? null,
      actorId: actorId ?? null,
      actorName: actorName ?? null,
    },
  }));
  await safeCreateMany(rows);
};

/* Mentions are typed by the user as plain `@FirstName` in the comment
   body — much friendlier in a textarea than the older markdown-link
   form. We extract candidate names here; the route resolves them to
   real user ids via a DB lookup before fanning out. Names match the
   first word of `User.name`, case-insensitive. */
const MENTION_NAME_RE = /(?:^|[\s\W])@([A-Za-z][A-Za-z0-9_-]*)/g;

export const extractMentionCandidates = (body = "") => {
  if (!body) return [];
  const names = new Set();
  let m;
  while ((m = MENTION_NAME_RE.exec(body)) !== null) {
    if (m[1]) names.add(m[1].toLowerCase());
  }
  return Array.from(names);
};

/* Look up the user id for each candidate name. First-word match on
   `User.name`, case-insensitive. If two users share a first name, the
   first match wins — same convention as the global search slug
   resolution. Returns an array of unique ids. */
export const resolveMentionUserIds = async (candidates, prismaClient) => {
  if (!candidates?.length) return [];
  const users = await prismaClient.user.findMany({
    select: { id: true, name: true },
  });
  const byFirst = new Map();
  for (const u of users) {
    const first = (u.name || "").split(/\s+/)[0]?.toLowerCase();
    if (first && !byFirst.has(first)) byFirst.set(first, u.id);
  }
  const ids = [];
  for (const c of candidates) {
    const id = byFirst.get(c);
    if (id) ids.push(id);
  }
  return Array.from(new Set(ids));
};

export const notifyCommentMentions = async ({
  comment,
  parentType,
  parentLabel,
  projectId,
  projectName,
  mentionedUserIds,
  actorId,
  actorName,
}) => {
  const recipients = dedupe(mentionedUserIds).filter((id) => id !== actorId);
  if (!recipients.length) return;
  const rows = recipients.map((rid) => ({
    recipientId: rid,
    kind: "comment_mention",
    title: actorName
      ? `${actorName} mentioned you`
      : "You were mentioned in a comment",
    body: parentLabel
      ? `In a comment on ${parentLabel}${projectName ? ` (${projectName})` : ""}.`
      : null,
    payload: {
      commentId: comment.id,
      parentType,
      parentId: comment.parentId,
      parentLabel: parentLabel ?? null,
      projectId: projectId ?? null,
      projectName: projectName ?? null,
      actorId: actorId ?? null,
      actorName: actorName ?? null,
    },
  }));
  await safeCreateMany(rows);
};
