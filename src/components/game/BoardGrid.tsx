import { useEffect, useRef, useState } from "react";
import { Coins, Crosshair, Footprints, Heart, type LucideIcon, RotateCcw, Undo2, Zap } from "lucide-react";
import { TankToken } from "./TankToken";
import { AP_CACHES, BOARD_SIZE, HEART_SPAWN, TANKS, YOU, type Tank } from "@/lib/mock";
import { chebyshev, neighbors8 } from "@/lib/geometry";
import { bestTextOn, cn } from "@/lib/utils";

type Mode = "move" | "shoot" | null;
type Phase = "idle" | "moving" | "firing";
type Cell = { x: number; y: number };
interface ShotFx {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  targetKey: string;
}

const DEMO_AP = YOU.ap;

const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};
const nthPrime = (n: number) => {
  let found = 0;
  let c = 1;
  while (found < n) {
    c += 1;
    if (isPrime(c)) found += 1;
  }
  return c;
};
/** AP cost of the n-th move of a period: 1, 2, 3, 5, 7, … (1 then the primes) — mirrors the engine. */
const moveCost = (n: number) => (n <= 1 ? 1 : nthPrime(n - 1));

/**
 * Interactive demo board. Showcases the planning/resolution treatments:
 *  - stack MOVES   → chain X→Y→Z; each step extends from the projected end of the chain (a dashed
 *                    path + violet waypoints + a "shadow" ghost at the end). The chain is capped by
 *                    the escalating prime AP cost (1, 2, 3, 5, 7, …), just like the real engine.
 *  - queue a SHOOT → an animated coral reticle stamped on the targeted cell (fired from the chain end).
 *  - RESOLVE       → the tank steps through the chain, then fires a tank-shot (muzzle → tracer →
 *                    impact); the hit tank recoils + flashes as it loses a heart.
 * Pure DOM/CSS/SVG; all motion is disabled under prefers-reduced-motion (see index.css).
 */
export function BoardGrid({ fill = false, className }: { fill?: boolean; className?: string }) {
  const [tanks, setTanks] = useState<Tank[]>(TANKS);
  const [selectedId, setSelectedId] = useState("t1");
  const [mode, setMode] = useState<Mode>(null);
  const [plannedMoves, setPlannedMoves] = useState<Cell[]>([]);
  const [plannedShot, setPlannedShot] = useState<Cell | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [shotFx, setShotFx] = useState<ShotFx | null>(null);
  const [movedId, setMovedId] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  const selected = tanks.find((t) => t.id === selectedId);
  const range = selected?.isYou ? YOU.range : 2;
  const busy = phase !== "idle";
  const tokenSize = fill ? 22 : 26;

  const byCell = new Map<string, Tank>();
  for (const t of tanks) byCell.set(`${t.x},${t.y}`, t);

  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;

  // Where you'll stand after the queued chain resolves — the origin for the next move AND the shot.
  const projected: Cell = plannedMoves.length
    ? plannedMoves[plannedMoves.length - 1]
    : selected
      ? { x: selected.x, y: selected.y }
      : { x: 0, y: 0 };
  const plannedSet = new Set(plannedMoves.map((c) => `${c.x},${c.y}`));
  const moveCostSoFar = plannedMoves.reduce((s, _c, i) => s + moveCost(i + 1), 0);
  const canAddMove = moveCostSoFar + moveCost(plannedMoves.length + 1) <= DEMO_AP;

  const moveKeys = new Set<string>();
  const rangeKeys = new Set<string>();
  if (selected && !busy) {
    if (canAddMove) {
      for (const n of neighbors8(projected)) {
        const k = `${n.x},${n.y}`;
        const occ = byCell.get(k);
        if (inBounds(n.x, n.y) && !plannedSet.has(k) && (!occ || occ.id === selected.id)) moveKeys.add(k);
      }
    }
    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        const d = chebyshev(projected, { x, y });
        if (d > 0 && d <= range) rangeKeys.add(`${x},${y}`);
      }
    }
  }
  const isEnemy = (key: string) => {
    const t = byCell.get(key);
    return !!t && t.id !== selectedId && t.status !== "dead";
  };

  const reset = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    setTanks(TANKS);
    setMode(null);
    setPlannedMoves([]);
    setPlannedShot(null);
    setPhase("idle");
    setShotFx(null);
    setMovedId(null);
  };

  const undo = () => {
    if (busy) return;
    if (plannedMoves.length) setPlannedMoves((m) => m.slice(0, -1));
    else if (plannedShot) setPlannedShot(null);
  };

  const pickCell = (cell: Cell) => {
    if (busy || !selected) return;
    const key = `${cell.x},${cell.y}`;
    if (mode === "move" && moveKeys.has(key)) setPlannedMoves((m) => [...m, cell]);
    else if (mode === "shoot" && rangeKeys.has(key)) setPlannedShot(cell);
  };

  const resolve = () => {
    if (busy || !selected) return;
    const moves = plannedMoves;
    const shot = plannedShot;
    if (!moves.length && !shot) return;
    setMode(null);

    const stepMs = 280;
    let t = 0;
    if (moves.length) {
      setPhase("moving");
      setMovedId(selected.id);
      setPlannedMoves([]);
      // Step through the chain one cell at a time; each hop re-mounts the token in a new cell,
      // so the stamp animation replays X→Y→Z.
      moves.forEach((cell) => {
        timers.current.push(
          window.setTimeout(() => {
            setTanks((ts) => ts.map((tk) => (tk.id === selected.id ? { ...tk, x: cell.x, y: cell.y } : tk)));
          }, t),
        );
        t += stepMs;
      });
    }

    const shooter = moves.length ? moves[moves.length - 1] : { x: selected.x, y: selected.y };
    if (shot) {
      timers.current.push(
        window.setTimeout(() => {
          setShotFx({ sx: shooter.x + 0.5, sy: shooter.y + 0.5, tx: shot.x + 0.5, ty: shot.y + 0.5, targetKey: `${shot.x},${shot.y}` });
          setPhase("firing");
        }, t),
      );
      timers.current.push(
        window.setTimeout(() => {
          setTanks((ts) =>
            ts.map((tk) =>
              tk.x === shot.x && tk.y === shot.y && tk.status !== "dead"
                ? { ...tk, hearts: Math.max(0, tk.hearts - 1), status: tk.hearts - 1 <= 0 ? "dead" : tk.status }
                : tk,
            ),
          );
        }, t + 360),
      );
      timers.current.push(
        window.setTimeout(() => {
          setPhase("idle");
          setShotFx(null);
          setPlannedShot(null);
          setMovedId(null);
        }, t + 900),
      );
    } else {
      timers.current.push(window.setTimeout(() => {
        setPhase("idle");
        setMovedId(null);
      }, t + 100));
    }
  };

  const canResolve = !busy && (plannedMoves.length > 0 || !!plannedShot);
  const canUndo = !busy && (plannedMoves.length > 0 || !!plannedShot);

  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border-2 border-foreground bg-paper shadow-brutal",
        fill ? "flex h-full w-full flex-col p-2" : "p-3",
        className,
      )}
    >
      {/* Planning controls */}
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-1.5">
        <ModeButton active={mode === "move"} disabled={busy} onClick={() => setMode(mode === "move" ? null : "move")} icon={Footprints} label="Move" tone="accent" />
        <ModeButton active={mode === "shoot"} disabled={busy} onClick={() => setMode(mode === "shoot" ? null : "shoot")} icon={Crosshair} label="Shoot" tone="destructive" />
        <button
          type="button"
          disabled={!canResolve}
          onClick={resolve}
          className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-foreground bg-primary px-2.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wide text-primary-foreground shadow-brutal-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Zap className="size-4" />
          Resolve
        </button>
        {plannedMoves.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-[10px] border-2 border-foreground bg-card px-2 py-1.5 font-mono text-[11px] font-bold tabular-nums" title="Stacked moves · AP cost (1, 2, 3, 5, 7…)">
            <Footprints className="size-3.5" />
            {plannedMoves.length} · {moveCostSoFar} AP
          </span>
        )}
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo last queued action"
          className="ml-auto inline-flex items-center gap-1.5 rounded-[10px] border-2 border-foreground bg-card px-2.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wide shadow-brutal-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Undo2 className="size-4" />
          <span className="hidden sm:inline">Undo</span>
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-foreground bg-card px-2.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wide shadow-brutal-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <RotateCcw className="size-4" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      <div className={cn(fill && "flex min-h-0 flex-1 items-center justify-center")}>
        <div className={cn("relative mx-auto aspect-square", fill ? "h-full max-h-full max-w-full" : "w-full")}>
          <div
            className="grid h-full w-full overflow-hidden rounded-md border-2 border-foreground"
            style={{
              gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, i) => {
              const x = i % BOARD_SIZE;
              const y = Math.floor(i / BOARD_SIZE);
              const key = `${x},${y}`;
              const tank = byCell.get(key);
              const cache = AP_CACHES.find((c) => c.x === x && c.y === y);
              const isHeart = HEART_SPAWN.x === x && HEART_SPAWN.y === y;
              const isMoveTarget = mode === "move" && moveKeys.has(key);
              const isShootTarget = mode === "shoot" && rangeKeys.has(key);
              const moveIdx = plannedMoves.findIndex((c) => c.x === x && c.y === y);
              const isWaypoint = moveIdx >= 0;
              const isFinalGhost = isWaypoint && moveIdx === plannedMoves.length - 1 && phase === "idle";
              const isReticle = plannedShot && key === `${plannedShot.x},${plannedShot.y}`;
              const isHit = phase === "firing" && shotFx?.targetKey === key;
              const light = (x + y) % 2 === 0;
              const hl =
                isWaypoint && phase === "idle"
                  ? "bg-primary/12"
                  : isMoveTarget
                    ? "bg-accent/35"
                    : isShootTarget
                      ? isEnemy(key)
                        ? "bg-destructive/25"
                        : "bg-primary/12"
                      : "";
              return (
                <div key={key} className={cn("relative", light ? "bg-[hsl(var(--board-light))]" : "bg-[hsl(var(--board-dark))]")}>
                  {/* Highlight tints layer over the checker so the board texture shows through. */}
                  {hl && <span aria-hidden className={cn("pointer-events-none absolute inset-0", hl)} />}

                  <div className="relative z-10 grid h-full w-full place-items-center">
                    {isHeart && !tank && <Heart className="size-4 fill-heart text-foreground" />}
                    {cache && !tank && (
                      <span className="grid size-5 place-items-center rounded-full border-2 border-foreground bg-ap">
                        <Coins className="size-3 text-ink" />
                      </span>
                    )}
                    {tank && (
                      <div className={cn(movedId === tank.id && "ttt-stamp", isHit && "ttt-recoil")}>
                        <span className={cn("inline-grid rounded-full", isHit && "ttt-hit-flash")}>
                          <TankToken
                            tank={tank}
                            size={tokenSize}
                            selected={tank.id === selectedId}
                            onClick={
                              !mode && !busy
                                ? () => {
                                    setSelectedId(tank.id);
                                    setPlannedMoves([]);
                                    setPlannedShot(null);
                                  }
                                : undefined
                            }
                          />
                        </span>
                      </div>
                    )}

                    {/* Intermediate waypoint dot in the stacked-move path. */}
                    {isWaypoint && !isFinalGhost && phase === "idle" && (
                      <span aria-hidden className="pointer-events-none size-2.5 rounded-full border-2 border-foreground bg-primary" />
                    )}

                    {/* Translucent "shadow" tank at the END of the chain. */}
                    {isFinalGhost && selected && (
                      <div className="ttt-ghost pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
                        <span
                          style={{ width: tokenSize, height: tokenSize, backgroundColor: selected.color, color: bestTextOn(selected.color) }}
                          className="grid place-items-center rounded-full border-2 border-dashed border-foreground/80 font-mono text-xs font-bold"
                        >
                          {selected.monogram}
                        </span>
                      </div>
                    )}

                    {/* Queued-shot reticle on the targeted square. */}
                    {isReticle && (
                      <svg viewBox="0 0 24 24" className="ttt-reticle pointer-events-none absolute inset-[12%] text-destructive" aria-hidden>
                        <circle className="ttt-reticle-ring" cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 3.2" />
                        <path d="M12 0.5V5 M12 19V23.5 M0.5 12H5 M19 12H23.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="12" cy="12" r="1.8" fill="currentColor" />
                      </svg>
                    )}
                  </div>

                  {/* Targeting hit-area (separate from the tank's own button to avoid nesting). */}
                  {(isMoveTarget || isShootTarget) && (
                    <button
                      type="button"
                      onClick={() => pickCell({ x, y })}
                      aria-label={mode === "move" ? `Stack a move to column ${x}, row ${y}` : `Target column ${x}, row ${y}`}
                      className="absolute inset-0 z-20 cursor-pointer transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Overlay layer: stacked-move path + tank-shot tracer/flashes. 1 SVG unit = 1 board cell. */}
          <svg
            viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            aria-hidden
          >
            {plannedMoves.length > 0 && selected && phase === "idle" && (
              <polyline
                className="ttt-connector"
                points={[{ x: selected.x, y: selected.y }, ...plannedMoves].map((c) => `${c.x + 0.5},${c.y + 0.5}`).join(" ")}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="0.11"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="0.32 0.26"
              />
            )}
            {phase === "firing" && shotFx && (
              <>
                <line className="ttt-tracer-trail" x1={shotFx.sx} y1={shotFx.sy} x2={shotFx.tx} y2={shotFx.ty} stroke="hsl(var(--destructive))" strokeWidth="0.07" strokeLinecap="round" />
                <line
                  className="ttt-tracer-round"
                  x1={shotFx.sx}
                  y1={shotFx.sy}
                  x2={shotFx.tx}
                  y2={shotFx.ty}
                  pathLength={1}
                  stroke="hsl(var(--destructive))"
                  strokeWidth="0.16"
                  strokeLinecap="round"
                  strokeDasharray="0.2 1"
                />
                <circle className="ttt-muzzle" cx={shotFx.sx} cy={shotFx.sy} r="0.46" fill="hsl(var(--secondary))" stroke="hsl(var(--foreground))" strokeWidth="0.04" />
                <circle className="ttt-impact" cx={shotFx.tx} cy={shotFx.ty} r="0.42" fill="none" stroke="hsl(var(--destructive))" strokeWidth="0.16" />
              </>
            )}
          </svg>
        </div>
      </div>

      {!fill && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
          <Legend swatch="bg-accent/40" label="next move" />
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full border-2 border-foreground bg-primary" /> move path
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Crosshair className="size-3 text-destructive" /> target
          </span>
          <span className="ml-auto">
            {mode === "move"
              ? "click lime cells to stack moves — X→Y→Z (each step costs more AP)"
              : mode === "shoot"
                ? "click a cell in range to target (fires from the chain's end)"
                : "select a tank · stack Moves &/or Shoot · Resolve"}
          </span>
        </div>
      )}
    </div>
  );
}

function ModeButton({
  active,
  disabled,
  onClick,
  icon: Icon,
  label,
  tone,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  tone: "accent" | "destructive";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[10px] border-2 border-foreground px-2.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wide shadow-brutal-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active ? (tone === "destructive" ? "bg-destructive text-destructive-foreground" : "bg-accent text-accent-foreground") : "bg-card",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm border border-foreground", swatch)} />
      {label}
    </span>
  );
}
