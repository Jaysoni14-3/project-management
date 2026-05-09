import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  clientName: z.string().optional(),
  status: z.string().optional(),
  currentPhase: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  managerIds: z.array(z.string()).optional(),
  testerIds: z.array(z.string()).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const memberSchema = z.object({
  userId: z.string(),
  role: z.enum(["manager", "member", "tester"]).optional(),
});
