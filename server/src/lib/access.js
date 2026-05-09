import { prisma } from "./prisma.js";
import { forbidden } from "./errors.js";

const memberRecord = (userId, projectId) =>
  prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

export const isProjectMember = async (userId, projectId) => {
  const m = await memberRecord(userId, projectId);
  return Boolean(m);
};

export const isProjectManager = async (userId, projectId) => {
  const m = await memberRecord(userId, projectId);
  return m?.role === "manager";
};

export const assertProjectAccess = async (user, projectId) => {
  if (user.role === "admin") return;
  const member = await isProjectMember(user.id, projectId);
  if (!member) throw forbidden("Not a project member");
};

/* Project edit/management rights. Per product policy, only users with the
   global `admin` or `manager` role can manage projects — project-level
   manager assignments (projectMember.role === "manager") are no longer a
   shortcut for an employee to gain edit rights. */
export const assertProjectManageRights = async (user /*, projectId */) => {
  if (user.role === "admin" || user.role === "manager") return;
  throw forbidden("Manager or admin access required");
};

export const getParentProjectId = async (parentType, parentId) => {
  if (parentType === "task") {
    const t = await prisma.task.findUnique({
      where: { id: parentId },
      select: { projectId: true },
    });
    return t?.projectId ?? null;
  }
  if (parentType === "bug") {
    const b = await prisma.bug.findUnique({
      where: { id: parentId },
      select: { projectId: true },
    });
    return b?.projectId ?? null;
  }
  if (parentType === "meeting_note") {
    const n = await prisma.meetingNote.findUnique({
      where: { id: parentId },
      select: { projectId: true },
    });
    return n?.projectId ?? null;
  }
  return null;
};

/* Lighter context for notifications + activity feeds. Returns enough
   to render a one-line summary without the caller having to do its
   own joins. */
export const getParentContext = async (parentType, parentId) => {
  if (parentType === "task") {
    const t = await prisma.task.findUnique({
      where: { id: parentId },
      select: {
        title: true,
        projectId: true,
        project: { select: { name: true } },
      },
    });
    if (!t) return null;
    return {
      projectId: t.projectId,
      projectName: t.project?.name ?? null,
      parentLabel: t.title ? `task "${t.title}"` : "a task",
    };
  }
  if (parentType === "bug") {
    const b = await prisma.bug.findUnique({
      where: { id: parentId },
      select: {
        title: true,
        projectId: true,
        project: { select: { name: true } },
      },
    });
    if (!b) return null;
    return {
      projectId: b.projectId,
      projectName: b.project?.name ?? null,
      parentLabel: b.title ? `bug "${b.title}"` : "a bug",
    };
  }
  if (parentType === "meeting_note") {
    const n = await prisma.meetingNote.findUnique({
      where: { id: parentId },
      select: {
        title: true,
        projectId: true,
        project: { select: { name: true } },
      },
    });
    if (!n) return null;
    return {
      projectId: n.projectId,
      projectName: n.project?.name ?? null,
      parentLabel: n.title ? `note "${n.title}"` : "a meeting note",
    };
  }
  return null;
};
