# CRLike

Jeu web de stratégie en temps réel inspiré de Clash Royale. Le développement
avance par étapes : gameplay d'abord, visuel ensuite, avec une cible V1 jouable
comportant dix cartes différentes.

Cette étape initialise le projet. Elle n'inclut pas encore de combat ni de cartes.

## Démarrer

Node.js 22 ou supérieur, pnpm 12.4.2 (version déclarée dans `package.json`).

```sh
pnpm install
pnpm dev
```

Ouvrir http://localhost:3000 et cliquer sur « Vérifier la connexion » pour appeler
la procédure oRPC `system.health` via HTTP. Aucune variable d'environnement ni
base de données n'est nécessaire.

## Commandes

```sh
pnpm checks        # ESLint, TypeScript strict, vérification Prettier
pnpm build         # Build de production
pnpm start         # Servir le build de production
pnpm format        # Formater les fichiers du projet
```

Les composants shadcn sont locaux et extensibles :

```sh
pnpm dlx shadcn@4.21.5 add dialog
```

## Structure

- `src/app` : routes et composants propres aux pages.
- `src/app/api/rpc/[[...rest]]/route.ts` : transport HTTP oRPC.
- `src/server/routers` : procédures serveur par domaine, contrats Zod.
- `src/lib/orpc/client.ts` : client navigateur typé.
- `src/components/ui` : primitives shadcn.
- `AGENTS.md` et `.cursor/rules/project/` : consignes adaptées d'Altiora et landing-website.
- `docs/rule-sources/` : copies intégrales des règles sources, pour référence uniquement.
- `docs/decisions.md` : choix techniques et suite proposée.

## Documentation technique

[Next.js](https://nextjs.org/docs/app/getting-started/installation),
[oRPC avec Next.js](https://orpc.dev/docs/adapters/next),
[shadcn](https://ui.shadcn.com/docs/installation/next).
