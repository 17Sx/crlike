"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CARDS, CARD_IDS, DEFAULT_DECK, type CardId } from "@/game/cards";
import {
  createGame,
  canPlaceInCamp,
  DOUBLE_ELIXIR_MS,
  crowns,
  deploy,
  MATCH_MS,
  OVERTIME_MS,
  STEP_MS,
  tick,
} from "@/game/engine";
import { cn } from "@/lib/utils";

export function Game() {
  const [deck, setDeck] = useState<CardId[]>([...DEFAULT_DECK]);
  const [game, setGame] = useState(createGame);
  const [aim, setAim] = useState({ x: 50, y: 60 });
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [message, setMessage] = useState(
    "Choisis 8 cartes, puis lance la partie.",
  );
  const doubleElixir = game.elapsedMs >= DOUBLE_ELIXIR_MS;
  const doubleIn = Math.max(
    0,
    Math.ceil((DOUBLE_ELIXIR_MS - game.elapsedMs) / 1000),
  );
  const running = game.status === "running";
  const selectedId =
    selectedSlot !== null ? game.sides.player.hand[selectedSlot] : undefined;
  const selectedCard = selectedId ? CARDS[selectedId] : undefined;
  const validAim =
    !selectedCard || canPlaceInCamp("player", selectedCard.kind, aim.y);
  const remainingMs =
    game.elapsedMs < MATCH_MS
      ? MATCH_MS - game.elapsedMs
      : MATCH_MS + OVERTIME_MS - game.elapsedMs;
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setGame(tick), STEP_MS);
    const handleVisibility = () => {
      if (document.hidden)
        setGame((previous) =>
          previous.status === "running"
            ? { ...previous, status: "paused" }
            : previous,
        );
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [running]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLElement &&
        event.target.matches("input, textarea, select")
      )
        return;
      if (event.key === "Escape") setSelectedSlot(null);
      if (running && /^[1-4]$/.test(event.key))
        setSelectedSlot(Number(event.key) - 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [running]);

  function handleDeploy(x: number, y: number) {
    if (selectedSlot === null) {
      setMessage("Sélectionne une carte de ta main avant de viser l’arène.");
      return;
    }
    const result = deploy(game, "player", selectedSlot, x, y);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setGame(result.state);
    setSelectedSlot(null);
    setMessage(
      `${selectedCard?.name} joué à la position ${Math.round(x)}, ${Math.round(y)}.`,
    );
  }

  function handleStart() {
    setGame({ ...createGame(deck), status: "running" });
    setSelectedSlot(null);
    setMessage(
      "Sélectionne une carte, puis vise un point dans ton camp (les sorts peuvent viser partout). Tu joues en bleu.",
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section
        className="mx-auto w-full max-w-xl space-y-4"
        aria-label="Partie contre le bot"
      >
        <div className="flex items-center justify-between gap-2 rounded-xl border p-3 text-sm">
          <span className="font-semibold text-blue-700">
            Toi · {crowns(game, "player")} ♛
          </span>
          <div
            className="text-center font-mono text-lg tabular-nums"
            aria-label="Temps restant"
          >
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            <span className="block font-sans text-xs text-muted-foreground">
              {game.elapsedMs >= MATCH_MS
                ? "Mort subite"
                : doubleElixir
                  ? "Élixir ×2"
                  : "Temps normal"}
            </span>
          </div>
          <span className="font-semibold text-red-700">
            Bot · {crowns(game, "bot")} ♛
          </span>
        </div>

        <div
          className="relative isolate h-[min(52svh,560px)] min-h-80 overflow-hidden rounded-2xl border-2 border-slate-300 bg-slate-50"
          aria-label="Arène : bot en haut, toi en bas"
        >
          <div className="absolute inset-x-0 top-0 h-1/2 bg-red-50" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-blue-50" />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-slate-300" />
          <div className="pointer-events-none absolute inset-x-0 top-[48%] h-[4%] bg-sky-200">
            <span className="absolute left-[18%] h-full w-[14%] bg-amber-200" />
            <span className="absolute right-[18%] h-full w-[14%] bg-amber-200" />
          </div>
          <button
            type="button"
            aria-label="Placer la carte dans l’arène"
            aria-describedby="placement-help"
            disabled={!running}
            onPointerMove={(event) => {
              if (!selectedCard) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              setAim({
                x: Math.max(
                  0,
                  Math.min(
                    100,
                    ((event.clientX - bounds.left) / bounds.width) * 100,
                  ),
                ),
                y: Math.max(
                  0,
                  Math.min(
                    100,
                    ((event.clientY - bounds.top) / bounds.height) * 100,
                  ),
                ),
              });
            }}
            onClick={(event) => {
              if (event.detail === 0) {
                handleDeploy(aim.x, aim.y);
                return;
              }
              const bounds = event.currentTarget.getBoundingClientRect();
              handleDeploy(
                Math.max(
                  0,
                  Math.min(
                    100,
                    ((event.clientX - bounds.left) / bounds.width) * 100,
                  ),
                ),
                Math.max(
                  0,
                  Math.min(
                    100,
                    ((event.clientY - bounds.top) / bounds.height) * 100,
                  ),
                ),
              );
            }}
            onKeyDown={(event) => {
              const movement = event.shiftKey ? 10 : 2;
              const directions: Record<string, { x: number; y: number }> = {
                ArrowLeft: { x: -movement, y: 0 },
                ArrowRight: { x: movement, y: 0 },
                ArrowUp: { x: 0, y: -movement },
                ArrowDown: { x: 0, y: movement },
              };
              const direction = directions[event.key];
              if (!direction) return;
              event.preventDefault();
              setAim((previous) => ({
                x: Math.max(0, Math.min(100, previous.x + direction.x)),
                y: Math.max(0, Math.min(100, previous.y + direction.y)),
              }));
            }}
            className={cn(
              "absolute inset-0 z-10 outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-600",
              selectedCard && running && "cursor-crosshair",
            )}
          />
          {selectedCard && running && (
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute z-30 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-dashed font-bold",
                validAim
                  ? "border-violet-700 bg-violet-100/80 text-violet-900"
                  : "border-red-700 bg-red-100/80 text-red-900",
              )}
              style={{ left: `${aim.x}%`, top: `${aim.y}%` }}
            >
              {validAim ? selectedCard.symbol : "×"}
            </div>
          )}
          {game.entities.map((entity) => {
            const isStructure =
              entity.kind === "tower" || entity.kind === "king";
            return (
              <div
                key={entity.id}
                aria-hidden="true"
                style={{
                  left: `${entity.x}%`,
                  top: `${entity.y}%`,
                }}
                className={cn(
                  "pointer-events-none absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center",
                  isStructure ? "w-16" : "w-9",
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center border-2 font-bold shadow-sm",
                    entity.team === "player"
                      ? "border-blue-700 bg-blue-100 text-blue-900"
                      : "border-red-700 bg-red-100 text-red-900",
                    isStructure
                      ? "h-9 w-11 rounded-lg text-xl"
                      : entity.kind === "building"
                        ? "h-7 w-7 rounded text-xs"
                        : "h-6 w-6 rounded-full text-xs",
                  )}
                >
                  {entity.kind === "king"
                    ? "♛"
                    : entity.kind === "tower"
                      ? "♜"
                      : entity.cardId
                        ? CARDS[entity.cardId].symbol
                        : "?"}
                </div>
                <div className="mt-0.5 h-1 w-full overflow-hidden rounded bg-slate-200">
                  <div
                    className={
                      entity.team === "player"
                        ? "h-full bg-blue-600"
                        : "h-full bg-red-600"
                    }
                    style={{
                      width: `${Math.max(0, entity.hp / entity.maxHp) * 100}%`,
                    }}
                  />
                </div>
                {isStructure && (
                  <span className="rounded bg-white/90 px-1 text-[10px] tabular-nums">
                    {Math.ceil(entity.hp)}
                  </span>
                )}
              </div>
            );
          })}
          {game.projectiles.map((projectile) => (
            <div
              key={projectile.id}
              aria-hidden="true"
              data-projectile={projectile.kind}
              className={cn(
                "pointer-events-none absolute z-30 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-[left,top] duration-100 ease-linear motion-reduce:transition-none",
                projectile.kind === "arrow"
                  ? "text-lg font-bold"
                  : "h-3 w-3 rounded-full border-2 shadow-sm",
                projectile.kind === "spell" || projectile.kind === "bomb"
                  ? "border-orange-700 bg-orange-400 shadow-orange-300"
                  : projectile.team === "player"
                    ? "border-blue-800 bg-blue-400 text-blue-800"
                    : "border-red-800 bg-red-400 text-red-800",
              )}
              style={{
                left: `${projectile.x}%`,
                top: `${projectile.y}%`,
                ...(projectile.kind === "arrow"
                  ? {
                      rotate: `${(Math.atan2(projectile.targetY - projectile.y, projectile.targetX - projectile.x) * 180) / Math.PI}deg`,
                    }
                  : {}),
              }}
            >
              {projectile.kind === "arrow" ? "➤" : null}
            </div>
          ))}
          {game.effect && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-orange-500 bg-orange-300/60"
              style={{
                left: `${game.effect.x}%`,
                width: `${game.effect.radius * 2}%`,
                height: `${game.effect.radius * 2}%`,
                top: `${game.effect.y}%`,
              }}
            />
          )}
          {game.status !== "running" && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-white/85 p-6 text-center">
              <p className="text-2xl font-semibold">
                {game.status === "ready"
                  ? "À toi de jouer"
                  : game.status === "paused"
                    ? "Partie en pause"
                    : game.outcome === "player"
                      ? "Victoire !"
                      : game.outcome === "bot"
                        ? "Défaite"
                        : "Match nul"}
              </p>
              <p className="max-w-xs text-sm text-muted-foreground">
                {game.status === "ready"
                  ? "Détruis la tour du roi adverse, ou termine avec plus de couronnes."
                  : game.status === "paused"
                    ? "Le temps et le bot sont arrêtés."
                    : "Ajuste ton deck et retente une partie."}
              </p>
              {game.status === "ready" && (
                <Button
                  size="lg"
                  disabled={deck.length !== 8}
                  onClick={handleStart}
                >
                  Lancer la partie
                </Button>
              )}
              {game.status === "paused" && (
                <Button
                  onClick={() =>
                    setGame((previous) => ({ ...previous, status: "running" }))
                  }
                >
                  Reprendre
                </Button>
              )}
              {game.status === "finished" && (
                <Button
                  onClick={() => {
                    setGame(createGame(deck));
                    setSelectedSlot(null);
                    setMessage("Tu peux ajuster ton deck avant de rejouer.");
                  }}
                >
                  Nouvelle partie
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-violet-700">
              Élixir
              <span
                role="status"
                aria-live="polite"
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  doubleElixir
                    ? "bg-violet-600 text-white"
                    : "bg-violet-100 text-violet-900",
                )}
              >
                {doubleElixir ? "ÉLIXIR ×2" : "ÉLIXIR ×1"}
              </span>
            </span>
            <span className="font-mono tabular-nums">
              {game.sides.player.elixir.toFixed(1)} / 10
            </span>
          </div>
          {!doubleElixir && (
            <p className="text-xs text-muted-foreground">
              ×2 dans {doubleIn} s (après 1 minute de jeu)
            </p>
          )}
          <progress
            className="h-3 w-full accent-violet-600"
            max={10}
            value={game.sides.player.elixir}
            aria-label="Élixir disponible"
          />
          <div className="grid grid-cols-4 gap-2" aria-label="Ta main">
            {game.sides.player.hand.map((id, slot) => (
              <Button
                key={slot}
                variant={selectedSlot === slot ? "default" : "outline"}
                className="h-auto min-h-20 flex-col gap-1 whitespace-normal px-1 py-2 text-center text-xs"
                disabled={!running || game.sides.player.elixir < CARDS[id].cost}
                aria-pressed={selectedSlot === slot}
                onClick={() => {
                  setSelectedSlot(slot);
                  setMessage(
                    `${CARDS[id].name} : ${CARDS[id].description} Choisis un point${CARDS[id].kind === "spell" ? " dans l’arène." : " dans ton camp, sous la rivière."}`,
                  );
                }}
              >
                <span className="text-base font-semibold">
                  {CARDS[id].symbol} · {CARDS[id].cost} ◈
                </span>
                <span>{CARDS[id].name}</span>
                <span className="opacity-60">Touche {slot + 1}</span>
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            À venir :{" "}
            {game.sides.player.queue[0] &&
              CARDS[game.sides.player.queue[0]].name}
          </p>
          <p role="status" aria-live="polite" className="min-h-10 text-sm">
            {message}
          </p>
        </div>
        <div className="flex gap-2">
          {running && (
            <Button
              variant="outline"
              onClick={() =>
                setGame((previous) => ({ ...previous, status: "paused" }))
              }
            >
              Pause
            </Button>
          )}
          {game.status !== "ready" && game.status !== "finished" && (
            <Button
              variant="ghost"
              onClick={() =>
                setGame((previous) => ({
                  ...previous,
                  status: "finished",
                  outcome: "bot",
                }))
              }
            >
              Abandonner
            </Button>
          )}
        </div>
      </section>

      <aside className="space-y-5 rounded-2xl border p-5">
        <div>
          <h2 className="text-lg font-semibold">
            Ton deck{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {deck.length} / 8
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            8 cartes parmi 10. Modifie le deck entre les parties.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {CARD_IDS.map((id) => (
            <button
              key={id}
              type="button"
              disabled={
                game.status !== "ready" ||
                (!deck.includes(id) && deck.length === 8)
              }
              aria-pressed={deck.includes(id)}
              onClick={() =>
                setDeck((previous) =>
                  previous.includes(id)
                    ? previous.filter((item) => item !== id)
                    : [...previous, id],
                )
              }
              className={cn(
                "rounded-lg border p-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-60",
                deck.includes(id) && "border-blue-500 bg-blue-50",
              )}
            >
              <span className="flex justify-between gap-2 font-medium">
                <span>{CARDS[id].name}</span>
                <span>{CARDS[id].cost} ◈</span>
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {CARDS[id].description}
              </span>
            </button>
          ))}
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <Badge variant="outline">Prototype local contre bot</Badge>
          <p id="placement-help">
            Sélectionne une carte (ou touches 1 à 4), puis clique ou touche un
            point dans ton camp, sous la rivière. Les sorts peuvent viser toute
            l’arène. Au clavier : Tab vers l’arène, flèches pour viser, Maj pour
            avancer plus vite et Entrée pour placer. Échap annule.
          </p>
          <p>
            Unités en bleu, bot en rouge. Les attaques à distance et les sorts
            ont des projectiles visibles ; les dégâts sont appliqués à l’impact.
          </p>
          <p>
            3 minutes, élixir doublé après 1 minute, puis 1 minute de mort
            subite en cas d’égalité. À égalité finale : match nul.
          </p>
          <p>
            Changer d’onglet met automatiquement en pause. Recharger la page
            remet la partie à zéro.
          </p>
        </div>
      </aside>
    </div>
  );
}
