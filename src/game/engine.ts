import { CARDS, DEFAULT_DECK, type CardId, type UnitStats } from "./cards";

export const STEP_MS = 100;
export const DOUBLE_ELIXIR_MS = 60_000;
export const MATCH_MS = 180_000;
export const OVERTIME_MS = 60_000;
export type Team = "player" | "bot";
export type Lane = "left" | "right";
export type Outcome = Team | "draw";

export interface Entity {
  id: number;
  team: Team;
  lane: Lane;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  kind: "troop" | "building" | "tower" | "king";
  cardId: CardId | null;
  stats: UnitStats;
  cooldownMs: number;
  remainingMs: number | null;
}

interface Side {
  elixir: number;
  hand: CardId[];
  queue: CardId[];
}

export interface Projectile {
  id: number;
  team: Team;
  x: number;
  y: number;
  targetId: number | null;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  splash: number;
  towerMultiplier: number;
  kind: "arrow" | "bomb" | "cannon" | "spell";
}

export interface GameState {
  status: "ready" | "running" | "paused" | "finished";
  elapsedMs: number;
  sides: Record<Team, Side>;
  entities: Entity[];
  projectiles: Projectile[];
  nextId: number;
  botMove: number;
  botCooldownMs: number;
  outcome: Outcome | null;
  effect: {
    x: number;
    y: number;
    radius: number;
    expiresMs: number;
    team: Team;
  } | null;
}

const towerStats: UnitStats = {
  hp: 1800,
  damage: 65,
  range: 23,
  speed: 0,
  attackMs: 1000,
  projectileSpeed: 55,
  count: 1,
  splash: 0,
  targets: "all",
  lifetimeMs: null,
};

export function createGame(deck: CardId[] = DEFAULT_DECK): GameState {
  if (
    deck.length !== 8 ||
    new Set(deck).size !== 8 ||
    deck.some((id) => !(id in CARDS))
  ) {
    throw new Error("Un deck doit contenir 8 cartes différentes.");
  }
  const entities: Entity[] = [];
  for (const team of ["player", "bot"] as const) {
    for (const lane of ["left", "right"] as const) {
      entities.push({
        id: entities.length + 1,
        team,
        lane,
        x: lane === "left" ? 25 : 75,
        y: team === "player" ? 78 : 22,
        hp: 1800,
        maxHp: 1800,
        kind: "tower",
        cardId: null,
        stats: towerStats,
        cooldownMs: 0,
        remainingMs: null,
      });
    }
    entities.push({
      id: entities.length + 1,
      team,
      lane: "left",
      x: 50,
      y: team === "player" ? 94 : 6,
      hp: 2600,
      maxHp: 2600,
      kind: "king",
      cardId: null,
      stats: towerStats,
      cooldownMs: 0,
      remainingMs: null,
    });
  }
  return {
    status: "ready",
    elapsedMs: 0,
    sides: {
      player: { elixir: 5, hand: deck.slice(0, 4), queue: deck.slice(4) },
      bot: {
        elixir: 5,
        hand: DEFAULT_DECK.slice(0, 4),
        queue: DEFAULT_DECK.slice(4),
      },
    },
    entities,
    projectiles: [],
    nextId: 7,
    botMove: 0,
    botCooldownMs: 3000,
    outcome: null,
    effect: null,
  };
}

function copyGame(state: GameState): GameState {
  return {
    ...state,
    entities: state.entities.map((e) => ({ ...e })),
    projectiles: state.projectiles.map((p) => ({ ...p })),
    sides: {
      player: {
        ...state.sides.player,
        hand: [...state.sides.player.hand],
        queue: [...state.sides.player.queue],
      },
      bot: {
        ...state.sides.bot,
        hand: [...state.sides.bot.hand],
        queue: [...state.sides.bot.queue],
      },
    },
  };
}

export function crowns(state: GameState, team: Team): number {
  const enemy = team === "player" ? "bot" : "player";
  if (
    !state.entities.some(
      (e) => e.team === enemy && e.kind === "king" && e.hp > 0,
    )
  )
    return 3;
  return (
    2 -
    state.entities.filter(
      (e) => e.team === enemy && e.kind === "tower" && e.hp > 0,
    ).length
  );
}

function settle(state: GameState): void {
  const player = crowns(state, "player");
  const bot = crowns(state, "bot");
  const timeUp = state.elapsedMs >= MATCH_MS + OVERTIME_MS;
  const overtime = state.elapsedMs >= MATCH_MS;
  if (player === 3 || bot === 3 || timeUp || (overtime && player !== bot)) {
    state.status = "finished";
    state.outcome = player === bot ? "draw" : player > bot ? "player" : "bot";
  }
}

export type DeployResult =
  { ok: true; state: GameState } | { ok: false; error: string };

export function deploy(
  state: GameState,
  team: Team,
  slot: number,
  x: number,
  y: number,
): DeployResult {
  if (state.status !== "running")
    return { ok: false, error: "La partie n’est pas en cours." };
  const id = Number.isInteger(slot) ? state.sides[team].hand[slot] : undefined;
  if (!id) return { ok: false, error: "Carte invalide." };
  const card = CARDS[id];
  if (
    ![x, y].every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 100,
    )
  )
    return { ok: false, error: "Position invalide." };
  if (state.sides[team].elixir < card.cost)
    return { ok: false, error: "Pas assez d’élixir." };
  const next = copyGame(state);
  const side = next.sides[team];
  const replacement = side.queue.shift();
  if (!replacement) return { ok: false, error: "Deck incomplet." };
  side.elixir -= card.cost;
  side.hand[slot] = replacement;
  side.queue.push(id);
  if (card.kind === "spell") {
    next.projectiles.push({
      id: next.nextId++,
      team,
      x: 50,
      y: team === "player" ? 94 : 6,
      targetId: null,
      targetX: x,
      targetY: y,
      speed: 65,
      damage: card.damage,
      splash: card.radius,
      towerMultiplier: card.towerMultiplier,
      kind: "spell",
    });
  } else {
    for (let i = 0; i < card.stats.count; i++) {
      const spawnX = Math.max(
        0,
        Math.min(100, x + (i - (card.stats.count - 1) / 2) * 2),
      );
      next.entities.push({
        id: next.nextId++,
        team,
        lane: spawnX < 50 ? "left" : "right",
        x: spawnX,
        y,
        hp: card.stats.hp,
        maxHp: card.stats.hp,
        kind: card.kind,
        cardId: id,
        stats: card.stats,
        cooldownMs: 500,
        remainingMs: card.stats.lifetimeMs,
      });
    }
  }
  next.entities = next.entities.filter((e) => e.hp > 0);
  settle(next);
  return { ok: true, state: next };
}

function distanceBetween(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function targetFor(entity: Entity, all: Entity[]): Entity | undefined {
  const isTower = entity.kind === "tower" || entity.kind === "king";
  return all
    .filter((e) => {
      if (e.hp <= 0 || e.team === entity.team) return false;
      if (isTower) return e.kind === "troop" || e.kind === "building";
      return entity.stats.targets !== "buildings" || e.kind !== "troop";
    })
    .sort(
      (a, b) =>
        distanceBetween(entity, a) - distanceBetween(entity, b) || a.id - b.id,
    )[0];
}

/** One deterministic tick. The caller owns scheduling; hidden tabs pause rather than catch up. */
export function tick(state: GameState): GameState {
  if (state.status !== "running") return state;
  let next = copyGame(state);
  next.elapsedMs += STEP_MS;
  const doubleElixir = next.elapsedMs >= DOUBLE_ELIXIR_MS;
  for (const side of Object.values(next.sides))
    side.elixir = Math.min(
      10,
      side.elixir + STEP_MS / (doubleElixir ? 1400 : 2800),
    );
  next.botCooldownMs -= STEP_MS;
  if (next.botCooldownMs <= 0) {
    const lane: Lane = next.botMove % 2 === 0 ? "left" : "right";
    const slot = next.sides.bot.hand.findIndex(
      (id) => CARDS[id].cost <= next.sides.bot.elixir,
    );
    const card = next.sides.bot.hand[slot];
    const target = next.entities.find(
      (e) => e.team === "player" && e.kind === "troop" && e.lane === lane,
    );
    const isSpell = card && CARDS[card].kind === "spell";
    const result = deploy(
      next,
      "bot",
      slot,
      isSpell ? (target?.x ?? 25) : lane === "left" ? 25 : 75,
      isSpell ? (target?.y ?? 78) : 35,
    );
    if (result.ok) {
      next = result.state;
      next.botMove++;
    }
    next.botCooldownMs = 3000;
  }
  const damage = new Map<number, number>();
  if (next.effect && next.effect.expiresMs <= next.elapsedMs)
    next.effect = null;
  // Expire buildings before choosing any targets, independent of iteration order.
  for (const entity of next.entities) {
    entity.cooldownMs = Math.max(0, entity.cooldownMs - STEP_MS);
    if (entity.remainingMs !== null) {
      entity.remainingMs -= STEP_MS;
      if (entity.remainingMs <= 0) entity.hp = 0;
    }
  }
  const snapshot = next.entities.map((e) => ({ ...e }));
  for (const entity of next.entities) {
    if (entity.hp <= 0) continue;
    const target = targetFor(entity, snapshot);
    if (!target) continue;
    const distance = distanceBetween(entity, target);
    if (distance <= entity.stats.range) {
      if (entity.cooldownMs === 0) {
        if (entity.stats.projectileSpeed > 0) {
          next.projectiles.push({
            id: next.nextId++,
            team: entity.team,
            x: entity.x,
            y: entity.y,
            targetId: target.id,
            targetX: target.x,
            targetY: target.y,
            speed: entity.stats.projectileSpeed,
            damage: entity.stats.damage,
            splash: entity.stats.splash,
            towerMultiplier: 1,
            kind:
              entity.cardId === "bomber"
                ? "bomb"
                : entity.cardId === "archers"
                  ? "arrow"
                  : "cannon",
          });
        } else {
          damage.set(
            target.id,
            (damage.get(target.id) ?? 0) + entity.stats.damage,
          );
        }
        entity.cooldownMs = entity.stats.attackMs;
      }
    } else if (entity.stats.speed > 0) {
      const movement = Math.min(
        (entity.stats.speed * STEP_MS) / 1000,
        distance - entity.stats.range,
      );
      entity.x += ((target.x - entity.x) / distance) * movement;
      entity.y += ((target.y - entity.y) / distance) * movement;
    }
  }
  const flying: Projectile[] = [];
  for (const projectile of next.projectiles) {
    const target =
      projectile.targetId === null
        ? undefined
        : next.entities.find((e) => e.id === projectile.targetId && e.hp > 0);
    // A shot already in flight survives its shooter, but disappears if its target is gone.
    if (projectile.targetId !== null && !target) continue;
    if (target) {
      projectile.targetX = target.x;
      projectile.targetY = target.y;
    }
    const destination = { x: projectile.targetX, y: projectile.targetY };
    const distance = distanceBetween(projectile, destination);
    const movement = (projectile.speed * STEP_MS) / 1000;
    if (distance <= movement) {
      const victims =
        projectile.splash > 0
          ? next.entities.filter(
              (e) =>
                e.hp > 0 &&
                e.team !== projectile.team &&
                distanceBetween(e, destination) <= projectile.splash,
            )
          : target
            ? [target]
            : [];
      for (const victim of victims) {
        const multiplier =
          victim.kind === "tower" || victim.kind === "king"
            ? projectile.towerMultiplier
            : 1;
        damage.set(
          victim.id,
          (damage.get(victim.id) ?? 0) + projectile.damage * multiplier,
        );
      }
      if (projectile.splash > 0)
        next.effect = {
          ...destination,
          radius: projectile.splash,
          expiresMs: next.elapsedMs + 400,
          team: projectile.team,
        };
    } else {
      projectile.x += ((destination.x - projectile.x) / distance) * movement;
      projectile.y += ((destination.y - projectile.y) / distance) * movement;
      flying.push(projectile);
    }
  }
  next.projectiles = flying;
  // Resolve all melee and impact damage together so both sides can trade kills.
  for (const entity of next.entities) entity.hp -= damage.get(entity.id) ?? 0;
  next.entities = next.entities.filter((e) => e.hp > 0);
  settle(next);
  return next;
}
