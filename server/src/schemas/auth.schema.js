import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(["admin", "manager", "employee", "hr"]).optional(),
  avatar: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  joinedDate: z.string().nullable().optional(),
  designation: z.string().nullable().optional(),
  isManager: z.boolean().optional(),
  managerId: z.string().nullable().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});
