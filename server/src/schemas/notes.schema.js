import { z } from "zod";

const attachmentInputSchema = z.object({
  filename: z.string(),
  storageKey: z.string(),
  size: z.number().int().nonnegative(),
  mimeType: z.string(),
});

export const createNoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  meetingDate: z.string(),
  attendeeIds: z.array(z.string()).optional(),
  attachments: z.array(attachmentInputSchema).optional(),
});

export const updateNoteSchema = createNoteSchema.partial().extend({
  removedAttachmentIds: z.array(z.string()).optional(),
});
