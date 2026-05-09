import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  avatar: z.string().nullable().optional(),
  role: z.enum(["admin", "manager", "employee", "hr"]).optional(),
  whatsapp: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  joinedDate: z.string().nullable().optional(),
  designation: z.string().nullable().optional(),
  isManager: z.boolean().optional(),
  managerId: z.string().nullable().optional(),
});
