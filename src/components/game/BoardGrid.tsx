import { TankToken } from "./TankToken";
import { colorForIndex } from "@/lib/board";

export interface BoardPlayer {
  _id: string;
  userId: string;
  name: string;
  x: number;
  y: number;
  hearts: number;
  status: "alive" | "dead";
  spawnOrder: number;
}

interface BoardGridProps {
  width: number;
  height: number;
  players: BoardPlayer[];
  meUserId?: string;
}

/** Read-only board: renders placed tanks on a width×height grid (Stage 1). */
export function BoardGrid({ width, height, players, meUserId }: BoardGridProps) {
  const byCell = new Map<string, BoardPlayer>();
  for (const p of players) {
    if (p.x >= 0 && p.y >= 0) byCell.set(`${p.x},${p.y}`, p);
  }
  const tokenSize = Math.max(14, Math.floor(560 / Math.max(width, height)));

  return (
    <div className="rounded-[var(--radius)] border-2 border-foreground bg-paper p-3 shadow-brutal">
      <div
        className="grid aspect-square w-full overflow-hidden rounded-md border-2 border-foreground"
        style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: width * height }).map((_, i) => {
          const x = i % width;
          const y = Math.floor(i / width);
          const p = byCell.get(`${x},${y}`);
          return (
            <div key={i} className="relative grid place-items-center border-b border-r border-foreground/10">
              {p && (
                <TankToken
                  name={p.name}
                  color={colorForIndex(p.spawnOrder >= 0 ? p.spawnOrder : 0)}
                  hearts={p.hearts}
                  dead={p.status === "dead"}
                  isYou={p.userId === meUserId}
                  size={tokenSize}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
