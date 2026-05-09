import { z } from "zod";

export const presignSchema = z.object({
  files: z
    .array(
      z.object({
        filename: z.string().min(1),
        mimeType: z.string().min(1),
        size: z.number().int().nonnegative(),
      })
    )
    .min(1),
});
