import assert from "node:assert/strict";
import test from "node:test";
import { CARD_IDS, DEFAULT_DECK } from "./cards";
import {
  createGame,
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
  const result = deploy(state, "player", slot, "left", y);
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

test("refuse élixir insuffisant, zone adverse, index et coordonnées invalides", () => {
  const state = playing();
  state.sides.player.elixir = 0;
  assert.equal(deploy(state, "player", 0, "left", 60).ok, false);
  state.sides.player.elixir = 10;
  for (const y of [NaN, Infinity, -1, 35, 99])
    assert.equal(deploy(state, "player", 0, "left", y).ok, false);
  for (const slot of [-1, 0.5, 7])
    assert.equal(deploy(state, "player", slot, "left", 60).ok, false);
  assert.equal(deploy(createGame(), "player", 0, "left", 60).ok, false);
});

test("pause et fin figent simulation et déploiement", () => {
  for (const status of ["ready", "paused", "finished"] as const) {
    const state = { ...playing(), status };
    assert.equal(tick(state), state);
    assert.equal(deploy(state, "player", 0, "left", 60).ok, false);
  }
});

test("régénération plafonnée à 10, doublée après deux minutes", () => {
  const base = playing();
  base.sides.player.elixir = 0;
  const normal = tick(base).sides.player.elixir;
  const late = { ...base, elapsedMs: 120_000 };
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
  const result = deploy(state, "bot", 0, "left", 45);
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
  const result = deploy(slow, "bot", 0, "left", 45);
  assert.ok(result.ok);
  const after = advance(result.state, 30);
  assert.equal(after.entities.find((e) => e.cardId === "sentinel")?.hp, 650);
});

test("les sorts infligent des dégâts de zone sans toucher les alliés et réduisent les dégâts aux tours", () => {
  let state = playing();
  state.sides.player.hand[0] = "fireball";
  const spawned = deploy(state, "bot", 3, "left", 22);
  assert.ok(spawned.ok);
  state = spawned.state;
  const next = play(state, 0, 22);
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
  const spawned = deploy(state, "bot", 3, "left", 44);
  assert.ok(spawned.ok);
  const after = advance(spawned.state, 5);
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
