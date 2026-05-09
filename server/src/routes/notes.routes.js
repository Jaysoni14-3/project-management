import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { assertProjectAccess } from "../lib/access.js";
import {
  createNoteSchema,
  updateNoteSchema,
} from "../schemas/notes.schema.js";
import { notFound } from "../lib/errors.js";
import { deleteFromR2, publicUrl } from "../lib/r2.js";
import { notifyMeetingNoteAttendees } from "../lib/notify.js";

const formatAttachment = (a) => ({
  id: a.id,
  name: a.filename,
  size: a.size,
  type: a.mimeType,
  storagePath: a.storageKey,
  url: publicUrl(a.storageKey),
  uploadedAt: a.uploadedAt,
});

const noteInclude = {
  attachments: true,
  attendees: { select: { userId: true } },
  /* Pull the author's name + avatar inline so the view modal can
     render them without a separate user lookup. */
  createdBy: { select: { id: true, name: true, avatar: true } },
};

const formatNote = (n) => ({
  id: n.id,
  projectId: n.projectId,
  title: n.title,
  content: n.content,
  meetingDate: n.meetingDate,
  createdById: n.createdById,
  createdByName: n.createdBy?.name ?? null,
  createdByAvatar: n.createdBy?.avatar ?? null,
  createdAt: n.createdAt,
  updatedAt: n.updatedAt,
  attendeeIds: n.attendees?.map((a) => a.userId) ?? [],
  attachments: n.attachments?.map(formatAttachment) ?? [],
});

// /api/projects/:projectId/notes
export const projectNoteRoutes = Router({ mergeParams: true });
projectNoteRoutes.use(requireAuth);

/* Read open across the workspace. Mutations below stay membership-gated. */
projectNoteRoutes.get("/", async (req, res) => {
  const notes = await prisma.meetingNote.findMany({
    where: { projectId: req.params.projectId },
    orderBy: { meetingDate: "desc" },
    include: noteInclude,
  });
  res.json(notes.map(formatNote));
});

projectNoteRoutes.post(
  "/",
  validate({ body: createNoteSchema }),
  async (req, res) => {
    await assertProjectAccess(req.user, req.params.projectId);
    const {
      attachments = [],
      attendeeIds = [],
      meetingDate,
      ...rest
    } = req.body;

    const note = await prisma.meetingNote.create({
      data: {
        ...rest,
        projectId: req.params.projectId,
        createdById: req.user.id,
        meetingDate: new Date(meetingDate),
        attendees: {
          create: [...new Set(attendeeIds)].map((userId) => ({ userId })),
        },
        attachments: {
          create: attachments.map((a) => ({
            parentType: "meeting_note",
            filename: a.filename,
            storageKey: a.storageKey,
            size: a.size,
            mimeType: a.mimeType,
          })),
        },
      },
      include: noteInclude,
    });

    if (note.attendees?.length) {
      const project = await prisma.project.findUnique({
        where: { id: note.projectId },
        select: { id: true, name: true },
      });
      await notifyMeetingNoteAttendees({
        note,
        project,
        attendeeIds: note.attendees.map((a) => a.userId),
        actorId: req.user.id,
        actorName: req.user.name,
      });
    }

    res.status(201).json(formatNote(note));
  }
);

// /api/notes
const notesRouter = Router();
notesRouter.use(requireAuth);

notesRouter.get("/recent", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 5), 50);
  const notes = await prisma.meetingNote.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      ...noteInclude,
      project: { select: { id: true, name: true } },
    },
  });
  res.json(
    notes.map((n) => ({
      ...formatNote(n),
      project: n.project,
    }))
  );
});

notesRouter.get("/:id", async (req, res) => {
  const note = await prisma.meetingNote.findUnique({
    where: { id: req.params.id },
    include: noteInclude,
  });
  if (!note) throw notFound("Meeting note not found");
  res.json(formatNote(note));
});

notesRouter.patch(
  "/:id",
  validate({ body: updateNoteSchema }),
  async (req, res) => {
    const existing = await prisma.meetingNote.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw notFound("Meeting note not found");
    await assertProjectAccess(req.user, existing.projectId);

    const {
      attachments = [],
      removedAttachmentIds = [],
      attendeeIds,
      meetingDate,
      ...rest
    } = req.body;
    const data = { ...rest };
    if (meetingDate !== undefined) data.meetingDate = new Date(meetingDate);

    if (removedAttachmentIds.length > 0) {
      const toRemove = await prisma.attachment.findMany({
        where: { id: { in: removedAttachmentIds }, noteId: existing.id },
      });
      await prisma.attachment.deleteMany({
        where: { id: { in: toRemove.map((a) => a.id) } },
      });
      await Promise.allSettled(
        toRemove.map((a) => deleteFromR2(a.storageKey))
      );
    }

    let addedAttendeeIds = [];
    if (attendeeIds !== undefined) {
      const previous = await prisma.meetingAttendee.findMany({
        where: { noteId: existing.id },
        select: { userId: true },
      });
      const previousIds = new Set(previous.map((p) => p.userId));
      const nextIds = [...new Set(attendeeIds)];
      addedAttendeeIds = nextIds.filter((id) => !previousIds.has(id));

      await prisma.$transaction([
        prisma.meetingAttendee.deleteMany({ where: { noteId: existing.id } }),
        prisma.meetingAttendee.createMany({
          data: nextIds.map((userId) => ({
            noteId: existing.id,
            userId,
          })),
        }),
      ]);
    }

    if (attachments.length > 0) {
      data.attachments = {
        create: attachments.map((a) => ({
          parentType: "meeting_note",
          filename: a.filename,
          storageKey: a.storageKey,
          size: a.size,
          mimeType: a.mimeType,
        })),
      };
    }

    const note = await prisma.meetingNote.update({
      where: { id: req.params.id },
      data,
      include: noteInclude,
    });

    if (addedAttendeeIds.length > 0) {
      const project = await prisma.project.findUnique({
        where: { id: note.projectId },
        select: { id: true, name: true },
      });
      await notifyMeetingNoteAttendees({
        note,
        project,
        attendeeIds: addedAttendeeIds,
        actorId: req.user.id,
        actorName: req.user.name,
      });
    }

    res.json(formatNote(note));
  }
);

notesRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.meetingNote.findUnique({
    where: { id: req.params.id },
    include: { attachments: true },
  });
  if (!existing) throw notFound("Meeting note not found");
  await assertProjectAccess(req.user, existing.projectId);

  await prisma.meetingNote.delete({ where: { id: req.params.id } });
  await Promise.allSettled(
    existing.attachments.map((a) => deleteFromR2(a.storageKey))
  );
  res.status(204).end();
});

export default notesRouter;
