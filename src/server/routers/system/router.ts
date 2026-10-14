import "server-only";
import { os } from "@orpc/server";
import { healthInputSchema, healthOutputSchema } from "./validators";

export const systemRouter = {
  health: os
    .input(healthInputSchema)
    .output(healthOutputSchema)
    .handler(({ input }) => ({
      status: "ok",
      client: input.client,
      serverTime: new Date().toISOString(),
    })),
};
