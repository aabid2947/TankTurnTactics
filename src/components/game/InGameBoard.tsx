import { useState } from "react";
import { Coins, Heart, Minus, Plus } from "lucide-react";
import { TankToken } from "./TankToken";
import { colorForIndex } from "@/lib/board";
import { chebyshev } from "@/lib/geometry";
import { cn } from "@/lib/utils";
import type { GameDetail, GamePlayer, MyPlayer } from "@/lib/gameTypes";

interface Props {
  game: GameDetail;
  me?: MyPlayer;
  meUserId?: string;
  mode: "move" | "shoot" | "give" | null;
  onPick: (cell: { x: number; y: number }) => void;
  onlineIds?: Set<string>;
}

export function InGameBoard({ game, me, meUserId, mode, onPick, onlineIds }: Props) {
  // Zoom 1 = fit-to-width (the desktop default); zooming in enlarges cells and scrolls the board,
  // which makes the dense 20×20 grid tappable on small/touch screens (Stage 7).
  const [zoom, setZoom] = useState(1);
  const board = game.board ?? {
    originX: 0,
    originY: 0,
    width: game.config.boardWidth,
    height: game.config.boardHeight,
  };
  const { originX, originY, width, height } = board;

  const livingAt = new Map<string, GamePlayer>();
  const deadAt = new Map<string, GamePlayer>();
  for (const p of game.players) {
    if (p.x < 0) continue;
    (p.status === "dead" ? deadAt : livingAt).set(`${p.x},${p.y}`, p);
  }
  const cacheAt = new Set((game.caches ?? []).map((c) => `${c.x},${c.y}`));
  const heartAt = new Set((game.heartSpawns ?? []).map((h) => `${h.x},${h.y}`));

  const valid = (x: number, y: number): boolean => {
    if (!me || me.status !== "alive" || !mode) return false;
    const d = chebyshev({ x: me.x, y: me.y }, { x, y });
    if (mode === "move") return d === 1 && !livingAt.has(`${x},${y}`);
    if (mode === "shoot") return d >= 1 && d <= me.range;
    // give: a tank in range that's a fallen body or a wounded ally (not me)
    if (d < 1 || d > me.range) return false;
    const target = livingAt.get(`${x},${y}`) ?? deadAt.get(`${x},${y}`);
    return !!target && target._id !== me._id && (target.status === "dead" || target.hearts < 3);
  };

  const tokenSize = Math.max(14, Math.floor((560 / Math.max(width, height)) * zoom));
  const zoomBtn =
    "grid size-7 place-items-center rounded-full border-2 border-foreground bg-card shadow-brutal-sm disabled:opacity-40";

  return (
    <div className="rounded-[var(--radius)] border-2 border-foreground bg-paper p-3 shadow-brutal">
      <div className="mb-2 flex items-center justify-end gap-1.5">
        <button
          type="button"
          aria-label="Zoom out"
          disabled={zoom <= 1}
          onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          className={zoomBtn}
        >
          <Minus className="size-3.5" />
        </button>
        <span className="w-10 text-center font-mono text-[11px] font-bold tabular-nums">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={zoom >= 3}
          onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
          className={zoomBtn}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      <div className="overflow-auto">
        <div
          className="grid aspect-square overflow-hidden rounded-md border-2 border-foreground"
          style={{ width: `${zoom * 100}%`, gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: width * height }).map((_, i) => {
            const x = originX + (i % width);
            const y = originY + Math.floor(i / width);
            const key = `${x},${y}`;
            const tank = livingAt.get(key) ?? deadAt.get(key);
            const isValid = valid(x, y);
            return (
              <button
                key={key}
                type="button"
                aria-label={`Cell ${x}, ${y}`}
                disabled={!isValid}
                onClick={() => onPick({ x, y })}
                className={cn(
                  "relative grid place-items-center border-b border-r border-foreground/10",
                  isValid && mode === "move" && "cursor-pointer bg-accent/30 hover:bg-accent/50",
                  isValid && mode === "shoot" && "cursor-pointer bg-destructive/20 hover:bg-destructive/35",
                  isValid && mode === "give" && "cursor-pointer bg-primary/25 hover:bg-primary/40",
                )}
              >
                {!tank && cacheAt.has(key) && (
                  <span className="grid size-4 place-items-center rounded-full border-2 border-foreground bg-ap">
                    <Coins className="size-2.5 text-ink" />
                  </span>
                )}
                {!tank && heartAt.has(key) && <Heart className="size-3.5 fill-heart text-foreground" />}
                {tank && (
                  <TankToken
                    name={tank.name}
                    color={colorForIndex(tank.spawnOrder >= 0 ? tank.spawnOrder : 0)}
                    hearts={tank.hearts}
                    dead={tank.status === "dead"}
                    isYou={tank.userId === meUserId}
                    isOnline={onlineIds?.has(tank._id) ?? false}
                    size={tokenSize}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
