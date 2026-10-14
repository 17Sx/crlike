import { Badge } from "@/components/ui/badge";
import { Game } from "./_components/game";
import { ConnectionCheck } from "./_components/connection-check";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">CRLike</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Construis ton deck. Défends tes tours. Prends la couronne.
          </p>
        </div>
        <Badge variant="secondary">Prototype jouable · 10 cartes</Badge>
      </header>
      <Game />
      <details className="rounded-lg border p-4 text-sm">
        <summary className="cursor-pointer font-medium">
          Diagnostic du serveur
        </summary>
        <div className="pt-4">
          <ConnectionCheck />
        </div>
      </details>
    </main>
  );
}
