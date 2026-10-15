import assert from "node:assert/strict";
import test from "node:test";
import { CARD_IDS, DEFAULT_DECK } from "./cards";
import {
  createGame,
  DOUBLE_ELIXIR_MS,
  crowns,
  deploy,
  MATCH_MS,
  OVERTIME_MS,
  tick,
  type GameState,
} from "./engine";

function playing(): GameState {
  return { ...createGame(), status: "running", botCooldownMs: Infinity };
}
function advance(state: GameState, count: number) {
  for (let i = 0; i < count; i++) state = tick(state);
  return state;
}
function play(state: GameState, slot = 0, y = 60) {
  const result = deploy(state, "player", slot, 25, y);
  assert.equal(result.ok, true);
  return result.state;
}

test("10 cartes disponibles et deck de 8 cartes uniques obligatoire", () => {
  assert.equal(CARD_IDS.length, 10);
  assert.throws(() => createGame(DEFAULT_DECK.slice(0, 7)));
  assert.throws(() => createGame(Array(8).fill("sentinel")));
});

test("déploiement immuable, coût et cycle de la main", () => {
  const initial = playing();
  const before = JSON.stringify(initial);
  const next = play(initial);
  assert.equal(JSON.stringify(initial), before);
  assert.equal(next.sides.player.elixir, 2);
  assert.equal(next.sides.player.hand[0], "lancer");
  assert.equal(next.sides.player.queue.at(-1), "sentinel");
  assert.equal(next.entities.length, 7);
});

test("refuse élixir insuffisant, index et coordonnées invalides", () => {
  const state = playing();
  state.sides.player.elixir = 0;
  assert.equal(deploy(state, "player", 0, 25, 60).ok, false);
  state.sides.player.elixir = 10;
  for (const y of [NaN, Infinity, -1, 101])
    assert.equal(deploy(state, "player", 0, 25, y).ok, false);
  for (const slot of [-1, 0.5, 7])
    assert.equal(deploy(state, "player", slot, 25, 60).ok, false);
  assert.equal(deploy(createGame(), "player", 0, 25, 60).ok, false);
});

test("pause et fin figent simulation et déploiement", () => {
  for (const status of ["ready", "paused", "finished"] as const) {
    const state = { ...playing(), status };
    assert.equal(tick(state), state);
    assert.equal(deploy(state, "player", 0, 25, 60).ok, false);
  }
});

test("régénération plafonnée à 10, doublée après une minute", () => {
  const base = playing();
  base.sides.player.elixir = 0;
  const normal = tick(base).sides.player.elixir;
  const late = { ...base, elapsedMs: DOUBLE_ELIXIR_MS - 100 };
  assert.ok(Math.abs(tick(late).sides.player.elixir - normal * 2) < 0.00001);
  assert.equal(advance(playing(), 1000).sides.player.elixir, 10);
});

test("le bot déploie et le combat endommage une tour sans intervention UI", () => {
  const bot = advance({ ...createGame(), status: "running" }, 30);
  assert.equal(bot.botMove, 1);
  assert.ok(bot.entities.some((e) => e.team === "bot" && e.kind === "troop"));
  const combat = advance(play(playing()), 100);
  assert.ok(
    combat.entities.some(
      (e) => e.team === "bot" && e.kind === "tower" && e.hp < e.maxHp,
    ),
  );
});

test("les troupes se combattent avant d'atteindre les tours", () => {
  const state = play(playing());
  const result = deploy(state, "bot", 0, 25, 45);
  assert.ok(result.ok);
  const after = advance(result.state, 30);
  assert.ok(
    after.entities
      .filter((e) => e.kind === "troop")
      .every((e) => e.hp < e.maxHp),
  );
});

test("le colosse ignore les troupes et le coureur avance plus vite", () => {
  let slow = playing();
  slow.sides.player.elixir = 10;
  slow.entities = slow.entities.map((e) =>
    e.team === "player" ? { ...e, stats: { ...e.stats, damage: 0 } } : e,
  );
  slow = play(slow, 2);
  let fast = playing();
  fast.sides.player.hand[0] = "runner";
  fast = play(fast);
  assert.ok(
    advance(fast, 10).entities.find((e) => e.cardId === "runner")!.y <
      advance(slow, 10).entities.find((e) => e.cardId === "colossus")!.y,
  );
  const unit = slow.entities.find((e) => e.cardId === "colossus");
  assert.ok(unit);
  const result = deploy(slow, "bot", 0, 25, 45);
  assert.ok(result.ok);
  const after = advance(result.state, 30);
  assert.equal(after.entities.find((e) => e.cardId === "sentinel")?.hp, 650);
});

test("les sorts infligent des dégâts de zone sans toucher les alliés et réduisent les dégâts aux tours", () => {
  let state = playing();
  state.sides.player.hand[0] = "fireball";
  const spawned = deploy(state, "bot", 3, 25, 22);
  assert.ok(spawned.ok);
  state = spawned.state;
  state.entities = state.entities.map((e) =>
    e.kind === "troop" ? { ...e, stats: { ...e.stats, speed: 0 } } : e,
  );
  const launched = play(state, 0, 22);
  const next = advance(launched, 15);
  assert.equal(next.entities.filter((e) => e.cardId === "swarm").length, 0);
  assert.equal(
    next.entities.find(
      (e) => e.team === "bot" && e.kind === "tower" && e.lane === "left",
    )?.hp,
    1800 - 380 * 0.35,
  );
  assert.equal(
    next.entities.find((e) => e.team === "player" && e.kind === "tower")?.hp,
    1800,
  );
});

test("le bombardier blesse plusieurs ennemis et la tourelle expire", () => {
  let state = playing();
  state.sides.player.hand[0] = "bomber";
  state = play(state, 0, 56);
  const spawned = deploy(state, "bot", 3, 25, 44);
  assert.ok(spawned.ok);
  const after = advance(spawned.state, 10);
  assert.equal(after.entities.filter((e) => e.cardId === "swarm").length, 0);
  const turret = playing();
  turret.sides.player.hand[0] = "turret";
  const deployed = play(turret, 0, 85);
  assert.equal(
    advance(deployed, 299).entities.find((e) => e.cardId === "turret")?.y,
    85,
  );
  assert.equal(
    advance(deployed, 300).entities.some((e) => e.cardId === "turret"),
    false,
  );
});

test("couronnes, victoire immédiate sur le roi et gel après victoire", () => {
  const state = playing();
  state.entities = state.entities.filter(
    (e) => !(e.team === "bot" && e.kind === "king"),
  );
  const next = tick(state);
  assert.equal(crowns(next, "player"), 3);
  assert.equal(next.status, "finished");
  assert.equal(next.outcome, "player");
  assert.equal(tick(next), next);
});

test("fin au score, prolongation à égalité, mort subite et match nul", () => {
  const state = playing();
  state.elapsedMs = MATCH_MS - 100;
  const overtime = tick(state);
  assert.equal(overtime.status, "running");
  const leading = {
    ...state,
    entities: state.entities.filter(
      (e) => !(e.team === "bot" && e.kind === "tower" && e.lane === "left"),
    ),
  };
  assert.equal(tick(leading).outcome, "player");
  const sudden = { ...leading, elapsedMs: MATCH_MS + 1000 };
  assert.equal(tick(sudden).outcome, "player");
  assert.equal(
    tick({ ...state, elapsedMs: MATCH_MS + OVERTIME_MS - 100 }).outcome,
    "draw",
  );
});

test("deux simulations identiques donnent le même résultat, sans muter leur état initial", () => {
  const initial: GameState = { ...createGame(), status: "running" };
  const snapshot = JSON.stringify(initial);
  assert.deepEqual(advance(initial, 800), advance(initial, 800));
  assert.equal(JSON.stringify(initial), snapshot);
});

test("placement exact en deux dimensions dans son camp et aux bords", () => {
  for (const [x, y] of [
    [37.25, 58.75],
    [73.8, 89.4],
    [0, 52],
    [100, 100],
  ]) {
    const initial = playing();
    const result = deploy(initial, "player", 0, x!, y!);
    assert.ok(result.ok);
    const troop = result.state.entities.find((e) => e.cardId === "sentinel");
    assert.equal(troop?.x, x);
    assert.equal(troop?.y, y);
    assert.equal(result.state.sides.player.elixir, 2);
  }
  for (const coordinate of [NaN, Infinity, -1, 101]) {
    assert.equal(deploy(playing(), "player", 0, coordinate, 50).ok, false);
  }
});

test("la portée est radiale et les troupes se déplacent horizontalement", () => {
  const state = playing();
  state.entities = state.entities.map((e) =>
    e.team === "bot" && e.kind === "tower" && e.x === 75 ? { ...e, y: 78 } : e,
  );
  const result = deploy(state, "player", 0, 60, 78);
  assert.ok(result.ok);
  const next = tick(result.state);
  const troop = next.entities.find((e) => e.cardId === "sentinel");
  assert.ok(troop);
  assert.ok(troop.x > 60);
  assert.equal(troop.y, 78);
  assert.equal(
    next.entities.find(
      (e) => e.team === "bot" && e.kind === "tower" && e.x === 25,
    )?.hp,
    1800,
  );
});

function rangedCombat() {
  let state = playing();
  state.entities = state.entities.map((e) => ({ ...e, cooldownMs: Infinity }));
  state.sides.bot.hand[0] = "turret";
  const enemy = deploy(state, "bot", 0, 25, 45);
  assert.ok(enemy.ok);
  state = enemy.state;
  state.entities = state.entities.map((e) => ({ ...e, cooldownMs: Infinity }));
  state.sides.player.hand[0] = "archers";
  const ally = deploy(state, "player", 0, 25, 60);
  assert.ok(ally.ok);
  return ally.state;
}

test("les flèches voyagent avant de blesser, leurs positions sont immuables", () => {
  const fired = advance(rangedCombat(), 5);
  assert.equal(fired.projectiles.length, 2);
  assert.ok(
    fired.projectiles.every((p) => p.kind === "arrow" && p.y > 45 && p.y < 60),
  );
  assert.equal(fired.entities.find((e) => e.cardId === "turret")?.hp, 750);
  const snapshot = JSON.stringify(fired);
  const hit = advance(fired, 3);
  assert.equal(JSON.stringify(fired), snapshot);
  assert.equal(hit.entities.find((e) => e.cardId === "turret")?.hp, 640);
  assert.equal(hit.projectiles.length, 0);
});

test("un projectile survit au tireur mais disparaît si la cible meurt", () => {
  const fired = advance(rangedCombat(), 5);
  const withoutShooter = {
    ...fired,
    entities: fired.entities.filter((e) => e.cardId !== "archers"),
  };
  assert.equal(
    advance(withoutShooter, 3).entities.find((e) => e.cardId === "turret")?.hp,
    640,
  );
  const withoutTarget = {
    ...withoutShooter,
    entities: withoutShooter.entities.filter((e) => e.cardId !== "turret"),
  };
  assert.equal(tick(withoutTarget).projectiles.length, 0);
  const paused: GameState = { ...fired, status: "paused" };
  assert.equal(tick(paused), paused);
});

test("les sorts suivent la position choisie et ne blessent pas avant l’impact", () => {
  const state = playing();
  state.sides.player.hand[0] = "fireball";
  const result = deploy(state, "player", 0, 25, 22);
  assert.ok(result.ok);
  assert.equal(result.state.projectiles[0]?.targetX, 25);
  assert.equal(result.state.projectiles[0]?.targetY, 22);
  assert.equal(
    result.state.entities.find(
      (e) => e.team === "bot" && e.kind === "tower" && e.x === 25,
    )?.hp,
    1800,
  );
  const hit = advance(result.state, 15);
  assert.equal(
    hit.entities.find(
      (e) => e.team === "bot" && e.kind === "tower" && e.x === 25,
    )?.hp,
    1667,
  );
  assert.equal(
    hit.entities.find(
      (e) => e.team === "bot" && e.kind === "tower" && e.x === 75,
    )?.hp,
    1800,
  );
});

test("×2 démarre à 60 secondes exactement pour les deux camps", () => {
  const state = playing();
  state.elapsedMs = DOUBLE_ELIXIR_MS - 200;
  state.sides.player.elixir = 0;
  state.sides.bot.elixir = 0;
  const before = tick(state);
  const after = tick(before);
  for (const team of ["player", "bot"] as const) {
    assert.ok(Math.abs(before.sides[team].elixir - 100 / 2800) < 1e-8);
    assert.ok(
      Math.abs(
        after.sides[team].elixir - before.sides[team].elixir - 100 / 1400,
      ) < 1e-8,
    );
  }
});

test("unités et bâtiments refusés dans le camp adverse et la rivière sans coût ni cycle", () => {
  for (const team of ["player", "bot"] as const) {
    for (const id of ["sentinel", "turret"] as const) {
      for (const y of team === "player"
        ? [0, 25, 49, 50, 51.9]
        : [48.1, 50, 51, 75, 100]) {
        const state = playing();
        state.sides[team].hand[0] = id;
        const before = JSON.stringify(state);
        assert.equal(deploy(state, team, 0, 37, y).ok, false);
        assert.equal(JSON.stringify(state), before);
      }
    }
  }
});

test("les sorts restent autorisés dans les deux camps et sur la rivière", () => {
  for (const team of ["player", "bot"] as const) {
    for (const y of [0, 25, 50, 75, 100]) {
      const state = playing();
      state.sides[team].hand[0] = "fireball";
      assert.equal(deploy(state, team, 0, 37, y).ok, true);
    }
  }
});
