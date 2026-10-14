import "server-only";
import { systemRouter } from "./routers/system/router";

export const router = { system: systemRouter };
export type AppRouter = typeof router;
