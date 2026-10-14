# Consignes du projet

## Objectif et sources de vérité

Reconstruire Agency Website dans ce dépôt à partir de l'Ultimate Template
d'Impulse. `agency-website` est une référence métier et historique ; son
architecture, ses tables et ses contournements ne sont pas à recopier par défaut.

- Les demandes explicites de l'utilisateur, les décisions produit validées et
  les tableaux Excalidraw accessibles via le MCP font partie des sources de
  vérité. Consulter les scènes pertinentes avant le cadrage, l'implémentation
  ou la revue d'un domaine ; leurs références sont dans
  [docs/decisions.md](docs/decisions.md).
- Utiliser l'Excalidraw du MCP, pas le fichier historique du dépôt Agency comme
  substitut. Consigner la scène, sa version ou date de consultation et le statut
  de la décision retenue. Une proposition ou un point « à valider » dans le
  tableau ne constitue pas une décision validée. Si le MCP est inaccessible,
  signaler la limite et ne pas inventer le cadrage manquant.
- Distinguer décisions validées, hypothèses et questions ouvertes. Ne pas inventer
  une règle métier manquante. Signaler une contradiction avant d'implémenter le
  comportement concerné ; avancer sur les parties indépendantes.
- Ce fichier porte les conventions communes. Les règles `.cursor/rules/project/`
  apportent les détails techniques compatibles avec ces conventions et le code
  actuel. Corriger une règle obsolète plutôt que reproduire son exemple.

## Méthode de reconstruction

- Priorité actuelle : cadrer l'administration et le backend qui alimenteront
  le marketing. Le portage du front LP est retiré et reporté ; ne pas le relancer
  implicitement. Les domaines métier à gérer restent à définir avec l'utilisateur.

- Avant chaque fonctionnalité, créer son ticket Linear dans l'équipe
  **Landing Website** d'**Impulse-Lab**, avec périmètre, références et critères
  d'acceptation. Si un ticket existe, le préciser sans doublon, le passer en cours
  avant l'implémentation et y rapporter résultats et limites.
- Travailler par parcours métier : préciser le besoin cible, les comportements
  conservés, modifiés ou abandonnés, puis les critères de validation.
- Examiner les composants, services et patterns du template avant de créer un
  équivalent ou d'ajouter une dépendance. Justifier les nouvelles dépendances.
- Choisir des implémentations simples pour les besoins validés. Éviter les couches
  génériques et les fonctionnalités anticipées sans cas d'usage concret.
- Faire des changements ciblés et préserver le travail en cours de l'utilisateur.
- Consigner les décisions structurantes et leur raison dans `docs/decisions.md`.
  Mettre à jour les consignes concernées lorsqu'une convention durable change.
  Réserver `.agents/LEARNINGS.md` aux enseignements réutilisables et vérifiés.

## Architecture et conventions

- Appliquer les règles ciblées de `.cursor/rules/project/` :
  `typescript-quality.mdc`, `react-structure.mdc`, `orpc.mdc` et
  `orpc-claims.mdc`. Elles adaptent les standards Agency au template réel.

- `apps/web` : routes Next.js, interface et intégration web.
- `packages/server` : procédures oRPC et logique métier serveur, un module par
  besoin métier dans `src/routers/<module>` ; les autres modules et les exports
  du package ne passent que par son dossier `public/` (contrats purs), sauf
  l'assemblage `routers/_app.ts` qui monte les routers ; contrôlé par doctor.
  L’assemblage `src/workers.ts` expose seulement les entrées worker autorisées de Commercial et Notifications (LDW-45), voir `docs/decisions.md`.
  Un parcours entre modules vit dans `src/journeys/<parcours>`, monté par
  `routers/_app.ts`, et n'appelle que les `commands/` des propriétaires (LDW-43).
- `packages/database` : schéma Drizzle rangé par domaine (`schema/<domaine>/`),
  accès aux données et configuration auth. Un module serveur n'écrit que dans
  les tables de son domaine, ne lit que les domaines déclarés dans
  `.doctor/config/data-domains`, et une migration ne touche qu'un domaine
  (contrôles doctor, limites dans `docs/decisions.md`). À l'exécution, chaque
  module agit sous son rôle Postgres (`module_<module>`), dont les droits sont
  générés par `pnpm db:access:generate` (LDW-44). Les tables sensibles de
  `.doctor/config/private-tables` restent lisibles par leur seul domaine ;
  les journaux de `.doctor/config/append-only-tables` refusent les mises à jour
  et suppressions (LDW-73), en contrôles doctor et droits Postgres. Appliquer les
  conventions de [docs/data-conventions.md](docs/data-conventions.md) :
  montants en centimes avec devise, horodatages avec fuseau, `created_by` /
  `updated_by`, archivage ou suppression logique plutôt qu'effacement.
- `packages/shared` : valeurs partagées pures (types, constantes) entre schéma,
  contrats et web ; il n'importe rien d'autre (contrôle doctor).
- `packages/ui` : composants UI réellement partagés.
- `packages/env` : validation des variables d'environnement.
- `packages/email`, `packages/analytics`, `packages/realtime` et `apps/realtime` :
  utiliser leurs responsabilités existantes lorsque le parcours le nécessite.
- Respecter les exports et alias réels du dépôt. Ne pas importer les anciens
  chemins `@repo/db`, `@repo/contracts` ou `apps/web/server` par habitude.
- Utiliser `pnpm`, dans la version déclarée par `packageManager`.
- Nommer les fichiers en `kebab-case`, sauf conventions imposées par les outils.
  Placer les composants propres à une page dans `_components` à proximité.
  Garder types et logique près de leur usage ; partager lorsque nécessaire.
- Garder TypeScript strict. Préférer l'inférence depuis les schémas ; ne pas
  masquer les erreurs avec `any`, des assertions ou des suppressions injustifiées.
- Valider les entrées externes avec Zod côté serveur. La validation navigateur ne
  remplace pas cette validation. Réutiliser les schémas sans exposer du code serveur.
- Utiliser les composants serveur par défaut et limiter `use client` aux besoins
  d'interactivité. Garder les accès sensibles et la logique métier côté serveur.
- Préférer l'état local ; utiliser l'URL pour les filtres partageables et les
  mécanismes oRPC/TanStack existants pour les données serveur. Ne pas dupliquer
  ces données dans un store global sans nécessité.
- Utiliser React Hook Form et Zod pour les formulaires métier. Afficher les erreurs
  et la progression, prévenir les doubles soumissions et préserver les saisies
  en cas d'échec. Optimiser les rendus seulement pour un besoin identifié.
- Réutiliser les primitives et tokens UI du template. Prévoir navigation clavier,
  labels, focus visible, adaptation mobile et états vide, chargement et erreur.
- Écrire des commentaires pour expliquer les raisons non évidentes, pas pour
  paraphraser le code. Limiter l'usage du tiret cadratin dans la documentation.

## Accès, environnement et données

- Vérifier côté serveur l'identité, les permissions et l'accès à l'organisation
  ou à la ressource pour chaque opération concernée. Masquer un bouton ne suffit pas.
- Utiliser les procédures d'authentification et d'autorisation du template.
- Passer par les schémas adaptés de `@repo/env`. Ne pas exposer de secrets au
  navigateur, dans les logs, la documentation ou les commits.
- La reconstruction du code ne vaut pas décision de supprimer les données.
  Documenter séparément reprise, transformations et stratégie de bascule.
- Générer les migrations de schéma avec les scripts Drizzle et examiner le SQL.
  Préparer explicitement les migrations de données lorsqu'elles sont nécessaires.
  Identifier la base cible avant toute application ; ne pas utiliser `db:push`
  ou une réinitialisation comme réparation automatique sur une base partagée.
- Attention : `pnpm db:stop` utilise `docker compose down -v` et supprime les
  volumes locaux. Ce n'est pas une simple commande d'arrêt.

## Validation et livraison

- Vérifier le parcours modifié et ses cas d'échec. Ajouter des tests pertinents
  pour les règles métier sensibles, permissions, régressions et transformations
  de données ; éviter les tests qui ne font que recopier l'implémentation.
- Utiliser les scripts présents : `pnpm types:check`, `pnpm lint` et `pnpm checks`
  (formatage, types, lint et doctor). Choisir les vérifications selon le changement
  et exécuter les contrôles requis avant livraison.
- `pnpm test` lance les tests des contrôles doctor (`pnpm test:doctor`), puis
  Vitest dans `@repo/database` et `@repo/server`, sans cache.
  Les tests qui touchent la base utilisent `createTestDatabase` de
  `@repo/database/testing` : un Postgres en mémoire (PGlite) construit depuis les
  migrations, jamais une base locale ou partagée. La CI lance `pnpm checks`
  puis `pnpm test` ; `pnpm checks` et le pre-push ne lancent pas `pnpm test`.
- Formater les fichiers touchés avec Prettier, sans reformater tout le dépôt.
- Rapporter les changements, les vérifications réellement exécutées et les
  limites restantes. Distinguer une erreur préexistante d'une régression.
- Avant toute action autorisée sur commits, branches, PR ou stacks, lire et
  appliquer le workflow personnel `impulse-pr-workflow` situé dans
  `/Users/noa/.codex/skills/impulse-pr-workflow/SKILL.md`. Si indisponible, le signaler
  avant l'action Git concernée. Une lecture ou une review reste en lecture seule.
