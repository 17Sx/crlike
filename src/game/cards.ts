export interface UnitStats {
  hp: number;
  damage: number;
  range: number;
  speed: number;
  attackMs: number;
  projectileSpeed: number;
  count: number;
  splash: number;
  targets: "all" | "buildings";
  lifetimeMs: number | null;
}

type CardDefinition = {
  name: string;
  symbol: string;
  cost: number;
  description: string;
} & (
  | { kind: "troop" | "building"; stats: UnitStats }
  | { kind: "spell"; damage: number; radius: number; towerMultiplier: number }
);

const melee: UnitStats = {
  hp: 650,
  damage: 100,
  range: 3,
  speed: 7,
  attackMs: 1000,
  projectileSpeed: 0,
  count: 1,
  splash: 0,
  targets: "all",
  lifetimeMs: null,
};

export const CARDS = {
  sentinel: {
    name: "Sentinelle",
    symbol: "S",
    cost: 3,
    kind: "troop",
    description: "Combattant de mêlée équilibré.",
    stats: melee,
  },
  archers: {
    name: "Éclaireuses",
    symbol: "E",
    cost: 3,
    kind: "troop",
    description: "Deux tireuses à distance, fragiles.",
    stats: {
      ...melee,
      hp: 220,
      damage: 55,
      range: 17,
      speed: 6,
      count: 2,
      projectileSpeed: 50,
    },
  },
  colossus: {
    name: "Colosse",
    symbol: "C",
    cost: 5,
    kind: "troop",
    description: "Lent et résistant, ne cible que les bâtiments.",
    stats: {
      ...melee,
      hp: 1900,
      damage: 150,
      speed: 4,
      attackMs: 1500,
      targets: "buildings",
    },
  },
  swarm: {
    name: "Essaim",
    symbol: "e",
    cost: 2,
    kind: "troop",
    description: "Quatre petites unités rapides.",
    stats: { ...melee, hp: 95, damage: 40, speed: 10, count: 4, attackMs: 800 },
  },
  lancer: {
    name: "Lancier",
    symbol: "L",
    cost: 4,
    kind: "troop",
    description: "Frappe lente, dégâts élevés.",
    stats: { ...melee, hp: 800, damage: 290, attackMs: 1600 },
  },
  bomber: {
    name: "Bombardier",
    symbol: "B",
    cost: 3,
    kind: "troop",
    description: "Attaque à distance et dégâts de zone.",
    stats: {
      ...melee,
      hp: 270,
      damage: 95,
      range: 12,
      speed: 6,
      attackMs: 1500,
      splash: 7,
      projectileSpeed: 35,
    },
  },
  runner: {
    name: "Coureur",
    symbol: "R",
    cost: 4,
    kind: "troop",
    description: "Fonce sur les bâtiments en ignorant les troupes.",
    stats: {
      ...melee,
      hp: 750,
      damage: 160,
      speed: 13,
      attackMs: 1200,
      targets: "buildings",
    },
  },
  fireball: {
    name: "Météore",
    symbol: "M",
    cost: 4,
    kind: "spell",
    description: "Explosion ciblée, dégâts réduits sur les tours.",
    damage: 380,
    radius: 12,
    towerMultiplier: 0.35,
  },
  volley: {
    name: "Salve",
    symbol: "V",
    cost: 3,
    kind: "spell",
    description: "Large zone, efficace contre les essaims.",
    damage: 150,
    radius: 22,
    towerMultiplier: 0.25,
  },
  turret: {
    name: "Tourelle",
    symbol: "T",
    cost: 3,
    kind: "building",
    description: "Défense immobile pendant 30 secondes.",
    stats: {
      ...melee,
      hp: 750,
      damage: 90,
      range: 20,
      speed: 0,
      lifetimeMs: 30_000,
      projectileSpeed: 55,
    },
  },
} as const satisfies Record<string, CardDefinition>;

export type CardId = keyof typeof CARDS;
export const CARD_IDS = Object.keys(CARDS) as CardId[];
export const DEFAULT_DECK: CardId[] = [
  "sentinel",
  "archers",
  "colossus",
  "swarm",
  "lancer",
  "bomber",
  "fireball",
  "turret",
];
