import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConnectionCheck } from "./_components/connection-check";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-4">
        <Badge variant="secondary">Prototype · Étape 1</Badge>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          CRLike
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Un jeu de stratégie en temps réel sur le web. On construit d’abord une
          partie jouable, puis son univers visuel.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Socle technique</CardTitle>
          <CardDescription>
            Next.js, oRPC et shadcn sont configurés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectionCheck />
        </CardContent>
      </Card>
      <section aria-labelledby="next-step" className="space-y-2">
        <h2 id="next-step" className="font-medium">
          Prochaine étape : la boucle de jeu
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Arène, tours, élixir et déploiement des unités. Objectif V1 : une
          partie complète avec 10 cartes différentes. Le combat n’est pas encore
          implémenté.
        </p>
      </section>
    </main>
  );
}
