import { z } from "zod";

const statusEnum = z.enum(["not_started", "in_progress", "completed"]);

export const createModuleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: statusEnum.optional(),
  assigneeId: z.string().nullable().optional(),
});

export const updateModuleSchema = createModuleSchema.partial();

export const transitionModuleStatusSchema = z.object({
  status: statusEnum,
});
