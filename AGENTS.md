# Consignes CRLike

## Produit et périmètre

- Construire un jeu web de stratégie en temps réel inspiré de Clash Royale.
- Avancer étape par étape : socle technique, moteur jouable, dix cartes distinctes,
  puis travail visuel. Le setup seul ne constitue pas une V1 jouable.
- Respecter les demandes explicites de l'utilisateur. Garder le travail simple et ciblé.
- Ne pas anticiper comptes, paiements, base de données ou multijoueur sans besoin validé.

## Workflow

- Lire les règles pertinentes de `.cursor/rules/project/` avant de modifier le code.
- Examiner les fichiers et conventions existants, préserver les changements utilisateur.
- Une demande d'implémentation autorise les modifications nécessaires à son périmètre.
- Documenter les choix durables dans `docs/decisions.md` et actualiser les règles concernées.
- Avant commit, branche, PR ou restack, lire et appliquer
  `/Users/noa/.codex/skills/impulse-pr-workflow/SKILL.md` (ou le skill disponible).
  Une lecture ou une review seule reste en lecture seule.
- Utiliser `pnpm` dans la version du `packageManager`. Valider avec `pnpm checks`
  et `pnpm build`. Ajouter des tests pour les comportements du moteur au moment
  de son implémentation, avec horloge et hasard contrôlables.
- Limiter le tiret cadratin ; privilégier virgules, points ou parenthèses.

## Architecture

- `src/app` : routes Next.js App Router et intégration web.
- `src/components/ui` : primitives shadcn ; composants propres aux pages dans `_components`.
- `src/server` : procédures oRPC et logique serveur, protégées avec `server-only`.
- `src/lib` : utilitaires et client oRPC du navigateur, imports serveur uniquement de type.
- Le futur moteur sera indépendant de React, du DOM et du transport réseau.
- TypeScript strict, fichiers kebab-case, alias `@/*` vers `src/*`.
- Server Components par défaut, état local et frontières client limitées.
- Validation Zod aux frontières externes ; aucune confiance dans les actions du navigateur.
- Réutiliser shadcn et ses tokens. Prévoir clavier, focus, mobile, chargement et erreurs.

## Provenance des conventions

Règles adaptées d'Altiora (React, Next.js, TypeScript, Zod) et landing-website
(structure, oRPC, qualité, synchronisation des consignes). Les originaux complets
sont archivés dans `docs/rule-sources/` pour traçabilité et ne sont pas des
instructions actives. Les obligations liées à leurs produits, anciennes versions,
tRPC, Prisma, AlignUI, monorepo, Linear et Excalidraw ne sont pas transposées à CRLike.
