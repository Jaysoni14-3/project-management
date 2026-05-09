import { z } from "zod";

/* Anyone can DM anyone — only constraint is the peer is a real user.
   The route resolves "find-or-create" so opening the same DM twice
   returns the same conversation. */
export const createDmSchema = z.object({
  peerUserId: z.string().min(1),
});

export const sendMessageSchema = z.object({
  /* Trim guard is applied in the route as well; cap length here so the
     body doesn't grow unbounded if the client misbehaves. */
  body: z.string().min(1).max(10_000),
});

export const updateMessageSchema = z.object({
  body: z.string().min(1).max(10_000),
});

/* Mark-read advances the participant's `lastReadAt`. Optional cursor:
   if `messageId` is given the route resolves to that message's
   createdAt; otherwise it stamps now(). */
export const markReadSchema = z
  .object({
    messageId: z.string().optional(),
  })
  .optional();
