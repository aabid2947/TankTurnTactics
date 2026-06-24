import { useState } from "react";
import { Coins, Heart } from "lucide-react";
import { TankToken } from "./TankToken";
import { AP_CACHES, BOARD_SIZE, HEART_SPAWN, TANKS, type Tank } from "@/lib/mock";
import { chebyshev, neighbors8 } from "@/lib/geometry";
import { cn } from "@/lib/utils";

const DEMO_RANGE = 2;

export function BoardGrid({ fill = false, className }: { fill?: boolean; className?: string }) {
  const [selectedId, setSelectedId] = useState("t1");

  const byCell = new Map<string, Tank>();
  for (const t of TANKS) byCell.set(`${t.x},${t.y}`, t);
  const selected = TANKS.find((t) => t.id === selectedId);

  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;
  const rangeKeys = new Set<string>();
  const moveKeys = new Set<string>();
  if (selected) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        const d = chebyshev({ x: selected.x, y: selected.y }, { x, y });
        if (d > 0 && d <= DEMO_RANGE) rangeKeys.add(`${x},${y}`);
      }
    }
    for (const n of neighbors8({ x: selected.x, y: selected.y })) {
      if (inBounds(n.x, n.y) && !byCell.has(`${n.x},${n.y}`)) moveKeys.add(`${n.x},${n.y}`);
    }
  }

  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border-2 border-foreground bg-paper shadow-brutal",
        fill ? "flex h-full w-full flex-col items-center justify-center p-2" : "p-3",
        className,
      )}
    >
      <div
        className={cn(
          "grid overflow-hidden rounded-md border-2 border-foreground",
          fill ? "aspect-square h-full max-w-full" : "aspect-square w-full",
        )}
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, i) => {
          const x = i % BOARD_SIZE;
          const y = Math.floor(i / BOARD_SIZE);
          const key = `${x},${y}`;
          const tank = byCell.get(key);
          const cache = AP_CACHES.find((c) => c.x === x && c.y === y);
          const isHeart = HEART_SPAWN.x === x && HEART_SPAWN.y === y;
          return (
            <div
              key={key}
              className={cn(
                "relative grid place-items-center border-b border-r border-foreground/10",
                rangeKeys.has(key) && "bg-primary/10",
                moveKeys.has(key) && "bg-accent/30",
              )}
            >
              {isHeart && !tank && <Heart className="size-4 fill-heart text-foreground" />}
              {cache && !tank && (
                <span className="grid size-5 place-items-center rounded-full border-2 border-foreground bg-ap">
                  <Coins className="size-3 text-ink" />
                </span>
              )}
              {tank && (
                <TankToken tank={tank} size={26} selected={tank.id === selectedId} onClick={() => setSelectedId(tank.id)} />
              )}
            </div>
          );
        })}
      </div>

      {!fill && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
          <Legend swatch="bg-primary/20" label="range" />
          <Legend swatch="bg-accent/40" label="valid move" />
          <span className="inline-flex items-center gap-1.5"><Heart className="size-3 fill-heart text-foreground" /> heart spawn</span>
          <span className="inline-flex items-center gap-1.5"><Coins className="size-3 text-ap" /> AP cache</span>
          <span className="ml-auto">click a tank to inspect its range</span>
        </div>
      )}
    </div>
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
