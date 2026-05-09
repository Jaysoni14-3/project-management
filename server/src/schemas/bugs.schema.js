import { z } from "zod";

const attachmentInputSchema = z.object({
  filename: z.string(),
  storageKey: z.string(),
  size: z.number().int().nonnegative(),
  mimeType: z.string(),
});

export const createBugSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  stepsToReproduce: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z
    .enum(["backlog", "in_progress", "in_review", "done", "resolved", "closed"])
    .optional(),
  assigneeId: z.string().nullable().optional(),
  /* Additional assignees beyond the primary. Stored in the BugAssignee
     join table; primary stays on Bug.assigneeId for legacy code paths. */
  coAssigneeIds: z.array(z.string()).optional(),
  dueDate: z.string().nullable().optional(),
  attachments: z.array(attachmentInputSchema).optional(),
});

export const updateBugSchema = createBugSchema.partial().extend({
  removedAttachmentIds: z.array(z.string()).optional(),
});
