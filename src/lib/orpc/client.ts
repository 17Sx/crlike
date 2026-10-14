import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "@/server/router";

const link = new RPCLink({
  url: () => {
    if (typeof window === "undefined") {
      throw new Error("Le client HTTP oRPC est réservé au navigateur.");
    }
    return new URL("/api/rpc", window.location.origin);
  },
});

export const orpc: RouterClient<AppRouter> = createORPCClient(link);
