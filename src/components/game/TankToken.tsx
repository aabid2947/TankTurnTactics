import { Crown, Ghost, Skull } from "lucide-react";
import type { Tank } from "@/lib/mock";
import { bestTextOn, cn } from "@/lib/utils";

interface TankTokenProps {
  tank: Tank;
  size?: number;
  selected?: boolean;
  showHearts?: boolean;
  showName?: boolean;
  onClick?: () => void;
}

export function TankToken({ tank, size = 44, selected, showHearts, showName, onClick }: TankTokenProps) {
  const dead = tank.status === "dead";
  const haunted = tank.status === "haunted";

  const circle = (
    <button
      type="button"
      onClick={onClick}
      style={{ width: size, height: size, backgroundColor: dead ? undefined : tank.color, color: dead ? undefined : bestTextOn(tank.color) }}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full border-2 border-foreground font-mono text-xs font-bold text-ink shadow-brutal-sm transition-transform",
        dead && "bg-muted text-muted-foreground",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        onClick && "cursor-pointer hover:-translate-y-0.5",
      )}
      aria-label={`${tank.name}${dead ? " (dead)" : haunted ? " (haunted)" : ""}`}
    >
      {dead ? <Skull className="size-1/2" /> : tank.monogram}
      {tank.isLeader && !dead && (
        <Crown className="absolute -right-1.5 -top-2 size-4 fill-secondary text-foreground" />
      )}
      {haunted && <Ghost className="absolute -right-1.5 -top-2 size-4 text-haunted" />}
    </button>
  );

  if (!showHearts && !showName) return circle;

  return (
    <div className="flex flex-col items-center gap-1">
      {circle}
      {showHearts && !dead && (
        <div className="flex gap-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full border border-foreground",
                i < tank.hearts ? "bg-heart" : "bg-transparent",
              )}
            />
          ))}
        </div>
      )}
      {showName && <span className="font-mono text-[10px] font-bold uppercase tracking-wide">{tank.name}</span>}
    </div>
  );
}
