# Décisions

## 2026-10-14 : setup initial

Demande : Next.js, oRPC et shadcn, gameplay avant visuel, cible V1 de dix cartes.
Cette livraison est limitée au setup ; les cartes et le moteur viendront ensuite.

- Une application unique sous `src/`, pnpm et TypeScript strict. Le monorepo de
  landing-website apporterait une complexité inutile à cette étape.
- Next.js App Router et Tailwind CSS 4, composants shadcn locaux.
- oRPC via un Route Handler `/api/rpc`. Client navigateur typé, code serveur isolé.
- Une procédure `system.health` valide une entrée Zod et permet de vérifier le
  transport depuis la page. Aucun secret ni service externe requis.
- Pas de base, d'authentification, de moteur de rendu ou de serveur temps réel pour
  l'instant. Leur choix dépendra du mode de jeu validé à l'étape suivante.
- Le moteur de jeu sera découplé de React et testable avec temps et hasard contrôlés.
- Les règles des deux projets sont conservées dans `docs/rule-sources/` et adaptées
  dans `AGENTS.md` et `.cursor/rules/project/`. Les instructions SaaS et back-office
  ne s'appliquent pas au jeu. oRPC remplace les recommandations tRPC d'Altiora.

## Prochaines étapes (proposées)

1. Définir la première boucle jouable : arène, tours, élixir, déploiement et victoire.
2. Implémenter et tester le moteur, puis raccorder une interface de debug.
3. Ajouter dix cartes aux comportements distincts et équilibrer une partie complète.
4. Travailler le rendu, les animations, le son et l'ergonomie.

Le choix solo contre bot ou multijoueur reste à valider avant l'architecture des parties.

## Compilation locale

Les scripts dev et build utilisent Webpack, supporté par Next.js 16. Turbopack
échoue dans cet environnement lors de la compilation CSS (ouverture de port
interne refusée). Ce choix conserve un démarrage reproductible ici. Les polices
système évitent un téléchargement au build. La génération automatique de règles
Next.js est désactivée pour conserver les consignes adaptées du projet.

## 2026-10-14 : premier prototype jouable

La demande de poursuivre est traitée comme la construction d'une première boucle
locale contre un bot, sans introduire de transport multijoueur. Ce choix permet
de tester immédiatement une partie et reste réversible pour la suite.

- Moteur pur dans `src/game`, tick fixe de 100 ms, sans DOM, React, réseau ou hasard.
- Deux voies avec progression longitudinale ; pas de pathfinding libre ou de collisions.
- Trois tours par camp, roi protégé du ciblage des troupes tant que la tour de leur
  voie tient. Les sorts peuvent viser le roi directement avec dégâts réduits.
- Dix cartes distinctes : mêlée, duo à distance, tank, essaim, gros dégâts,
  zone à distance, attaquant rapide de bâtiments, deux sorts et bâtiment temporaire.
- Deck de huit cartes uniques, main de quatre et file de quatre ; chaque carte jouée
  rejoint la fin du cycle. Le bot joue toutes les trois secondes s'il a l'élixir.
- Élixir initial 5, plafond 10, régénération de 1 par 2,8 secondes puis double après
  deux minutes. Match de trois minutes, victoire au score ou au roi ; égalité :
  une minute de mort subite, puis match nul. Les dégâts de combat sont simultanés.
- Pause automatique à l'arrière-plan, reprise explicite et aucune persistance de partie.
- Le combat reste local ; oRPC conserve son rôle de socle serveur, sans être appelé
  à chaque tick. Un mode multijoueur nécessitera une simulation autoritaire au serveur.
- Tests avec Node et tsx (dépendance de développement), reliés à `pnpm checks` et la CI.
- Branche `dev` et PR vers `main` selon la demande ; dépôt distant initialement vide,
  avec un commit d'amorçage sur main. Pas de fusion automatique.

Le prototype est destiné à valider les interactions et le rythme. Le rendu, la
persistance, le multijoueur, la finesse du déplacement et l'équilibrage restent
à travailler dans les prochaines étapes.
