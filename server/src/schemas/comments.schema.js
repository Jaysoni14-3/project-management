import { z } from "zod";

export const parentTypeSchema = z.enum(["task", "bug", "meeting_note"]);

export const createCommentSchema = z.object({
  parentType: parentTypeSchema,
  parentId: z.string(),
  body: z.string().min(1),
});

export const updateCommentSchema = z.object({
  body: z.string().min(1),
});

export const listCommentsQuerySchema = z.object({
  parentType: parentTypeSchema,
  parentId: z.string(),
});
