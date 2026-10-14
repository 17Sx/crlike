import { z } from "zod";

export const healthInputSchema = z.object({
  client: z.string().trim().min(1).max(64),
});

export const healthOutputSchema = z.object({
  status: z.literal("ok"),
  client: z.string(),
  serverTime: z.string().datetime(),
});
