import { CARDS, DEFAULT_DECK, type CardId, type UnitStats } from "./cards";

export const STEP_MS = 100;
export const MATCH_MS = 180_000;
export const OVERTIME_MS = 60_000;
export type Team = "player" | "bot";
export type Lane = "left" | "right";
export type Outcome = Team | "draw";

export interface Entity {
  id: number;
  team: Team;
  lane: Lane;
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

export interface GameState {
  status: "ready" | "running" | "paused" | "finished";
  elapsedMs: number;
  sides: Record<Team, Side>;
  entities: Entity[];
  nextId: number;
  botMove: number;
  botCooldownMs: number;
  outcome: Outcome | null;
  effect: {
    lane: Lane;
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
  lane: Lane,
  y: number,
): DeployResult {
  if (state.status !== "running")
    return { ok: false, error: "La partie n’est pas en cours." };
  if (lane !== "left" && lane !== "right")
    return { ok: false, error: "Voie invalide." };
  const id = Number.isInteger(slot) ? state.sides[team].hand[slot] : undefined;
  if (!id) return { ok: false, error: "Carte invalide." };
  const card = CARDS[id];
  if (!Number.isFinite(y) || y < 4 || y > 96)
    return { ok: false, error: "Position invalide." };
  if (
    card.kind !== "spell" &&
    (team === "player" ? y < 55 || y > 88 : y > 45 || y < 12)
  ) {
    return {
      ok: false,
      error: "Déploie les unités et bâtiments dans ton camp.",
    };
  }
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
    for (const e of next.entities) {
      if (
        e.team !== team &&
        (e.lane === lane || e.kind === "king") &&
        Math.abs(e.y - y) <= card.radius
      ) {
        e.hp -=
          card.damage *
          (e.kind === "tower" || e.kind === "king" ? card.towerMultiplier : 1);
      }
    }
    next.effect = {
      lane,
      y,
      radius: card.radius,
      team,
      expiresMs: next.elapsedMs + 500,
    };
  } else {
    for (let i = 0; i < card.stats.count; i++) {
      next.entities.push({
        id: next.nextId++,
        team,
        lane,
        y: y + i * 0.7,
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

function targetFor(entity: Entity, all: Entity[]): Entity | undefined {
  const enemies = all.filter(
    (e) =>
      e.hp > 0 &&
      e.team !== entity.team &&
      (e.lane === entity.lane || e.kind === "king" || entity.kind === "king"),
  );
  const isTower = entity.kind === "tower" || entity.kind === "king";
  const eligible = enemies.filter((e) => {
    if (isTower) return e.kind === "troop" || e.kind === "building";
    if (entity.stats.targets === "buildings" && e.kind === "troop")
      return false;
    // A lane tower shields the king until destroyed, even for ranged attackers.
    if (
      e.kind === "king" &&
      enemies.some((t) => t.kind === "tower" && t.lane === entity.lane)
    )
      return false;
    return true;
  });
  return eligible.sort(
    (a, b) =>
      Math.abs(a.y - entity.y) - Math.abs(b.y - entity.y) || a.id - b.id,
  )[0];
}

/** One deterministic tick. The caller owns scheduling; hidden tabs pause rather than catch up. */
export function tick(state: GameState): GameState {
  if (state.status !== "running") return state;
  let next = copyGame(state);
  next.elapsedMs += STEP_MS;
  const doubleElixir = next.elapsedMs >= 120_000;
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
    const y = card && CARDS[card].kind === "spell" ? (target?.y ?? 78) : 35;
    const result = deploy(next, "bot", slot, lane, y);
    if (result.ok) {
      next = result.state;
      next.botMove++;
    }
    next.botCooldownMs = 3000;
  }
  if (next.status === "finished") return next;
  const damage = new Map<number, number>();
  for (const entity of next.entities) {
    entity.cooldownMs = Math.max(0, entity.cooldownMs - STEP_MS);
    if (entity.remainingMs !== null) {
      entity.remainingMs -= STEP_MS;
      if (entity.remainingMs <= 0) {
        entity.hp = 0;
        continue;
      }
    }
    const target = targetFor(entity, next.entities);
    if (!target) continue;
    const distance = Math.abs(target.y - entity.y);
    if (distance <= entity.stats.range) {
      if (entity.cooldownMs === 0) {
        const victims =
          entity.stats.splash > 0
            ? next.entities.filter(
                (e) =>
                  e.team !== entity.team &&
                  (e.lane === target.lane || e.kind === "king") &&
                  Math.abs(e.y - target.y) <= entity.stats.splash &&
                  (e.kind !== "king" || target.kind === "king"),
              )
            : [target];
        for (const victim of victims)
          damage.set(
            victim.id,
            (damage.get(victim.id) ?? 0) + entity.stats.damage,
          );
        entity.cooldownMs = entity.stats.attackMs;
      }
    } else if (entity.stats.speed > 0) {
      const movement = Math.min(
        (entity.stats.speed * STEP_MS) / 1000,
        distance - entity.stats.range,
      );
      entity.y += Math.sign(target.y - entity.y) * movement;
    }
  }
  // Resolve damage together so neither side wins solely from iteration order.
  for (const entity of next.entities) entity.hp -= damage.get(entity.id) ?? 0;
  next.entities = next.entities.filter((e) => e.hp > 0);
  if (next.effect && next.effect.expiresMs <= next.elapsedMs)
    next.effect = null;
  settle(next);
  return next;
}
