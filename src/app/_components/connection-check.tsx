"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { orpc } from "@/lib/orpc/client";

type ConnectionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; serverTime: string }
  | { status: "error" };

export function ConnectionCheck() {
  const [state, setState] = useState<ConnectionState>({ status: "idle" });

  async function handleCheck() {
    setState({ status: "loading" });
    try {
      const result = await orpc.system.health({ client: "crlike-web" });
      setState({ status: "success", serverTime: result.serverTime });
    } catch {
      setState({ status: "error" });
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={handleCheck} disabled={state.status === "loading"}>
        {state.status === "loading" ? "Vérification…" : "Vérifier la connexion"}
      </Button>
      <p
        role="status"
        aria-live="polite"
        className="text-sm text-muted-foreground"
      >
        {state.status === "idle" &&
          "Vérifie la communication entre le navigateur et le serveur."}
        {state.status === "loading" && "Appel du serveur en cours…"}
        {state.status === "success" &&
          `Connexion établie à ${new Date(state.serverTime).toLocaleTimeString("fr-FR")}.`}
        {state.status === "error" &&
          "Le serveur ne répond pas. Tu peux réessayer."}
      </p>
    </div>
  );
}
