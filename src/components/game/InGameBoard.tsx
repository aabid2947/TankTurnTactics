import { Coins, Heart } from "lucide-react";
import { TankToken } from "./TankToken";
import { colorForIndex } from "@/lib/board";
import { chebyshev } from "@/lib/geometry";
import { cn } from "@/lib/utils";
import type { GameDetail, GamePlayer, MyPlayer } from "@/lib/gameTypes";

interface Props {
  game: GameDetail;
  me?: MyPlayer;
  meUserId?: string;
  mode: "move" | "shoot" | null;
  onPick: (cell: { x: number; y: number }) => void;
}

export function InGameBoard({ game, me, meUserId, mode, onPick }: Props) {
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
    return d >= 1 && d <= me.range; // shoot: any in-range cell (not self)
  };

  const tokenSize = Math.max(14, Math.floor(560 / Math.max(width, height)));

  return (
    <div className="rounded-[var(--radius)] border-2 border-foreground bg-paper p-3 shadow-brutal">
      <div
        className="grid aspect-square w-full overflow-hidden rounded-md border-2 border-foreground"
        style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}
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
              disabled={!isValid}
              onClick={() => onPick({ x, y })}
              className={cn(
                "relative grid place-items-center border-b border-r border-foreground/10",
                isValid && mode === "move" && "cursor-pointer bg-accent/30 hover:bg-accent/50",
                isValid && mode === "shoot" && "cursor-pointer bg-destructive/20 hover:bg-destructive/35",
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
                  size={tokenSize}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
