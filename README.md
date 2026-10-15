# CRLike

Jeu web de stratégie en temps réel inspiré de Clash Royale. Le développement
avance par étapes : gameplay d'abord, visuel ensuite, avec une cible V1 jouable
comportant dix cartes différentes.

Le prototype local est jouable contre un bot : placement libre, trois tours par camp,
élixir, deck de huit cartes parmi dix et main cyclique de quatre cartes. Le visuel
est volontairement simple ; le moteur est indépendant de React et du DOM.

## Jouer

1. Choisir huit cartes dans le deck, puis lancer la partie.
2. Sélectionner une carte (ou touches 1 à 4), puis cliquer ou toucher un point exact de l'arène.
   Toutes les cartes peuvent être placées partout, y compris chez l'adversaire.
3. Détruire le roi adverse, ou obtenir plus de couronnes en trois minutes.
   L'élixir double après une minute. Un compte à rebours et un badge ×2 indiquent ce passage. À égalité, une minute de mort subite ;
   si personne ne prend l'avantage, la partie se termine sur un match nul.

Pause/reprise, abandon et nouvelle partie sont disponibles. Changer d'onglet
met automatiquement en pause. La partie n'est pas sauvegardée au rechargement.
Tab permet de focaliser l’arène, les flèches déplacent la visée (Maj accélère),
Entrée place la carte et Échap annule la sélection.

Cartes : Sentinelle, Éclaireuses, Colosse, Essaim, Lancier, Bombardier, Coureur,
Météore, Salve et Tourelle. Le bot utilise un deck fixe et un cycle déterministe.

Les unités se déplacent en deux dimensions vers la cible admissible la plus proche.
Les tirs à distance et les sorts ont des projectiles visibles, avec dégâts à l’impact.
Les sorts et bombes ont une zone circulaire ; les dégâts des sorts sont réduits sur les tours.

Il s'agit d'une simulation locale, sans multijoueur, serveur de combat,
obstacles, collisions physiques ni équilibrage final.

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
pnpm checks        # ESLint, TypeScript strict, tests du moteur et Prettier
pnpm test          # Tests déterministes via le runner natif Node et tsx
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
- `src/game` : cartes, moteur déterministe et tests, indépendants de React.
- `AGENTS.md` et `.cursor/rules/project/` : consignes adaptées d'Altiora et landing-website.
- `docs/rule-sources/` : copies intégrales des règles sources, pour référence uniquement.
- `docs/decisions.md` : choix techniques et suite proposée.

## Documentation technique

[Next.js](https://nextjs.org/docs/app/getting-started/installation),
[oRPC avec Next.js](https://orpc.dev/docs/adapters/next),
[shadcn](https://ui.shadcn.com/docs/installation/next).
