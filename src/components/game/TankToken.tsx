import { Crown, Skull } from "lucide-react";
import { displayName, monogram } from "@/lib/board";
import { cn } from "@/lib/utils";

interface TankTokenProps {
  name: string;
  color: string;
  hearts: number;
  dead?: boolean;
  isYou?: boolean;
  isLeader?: boolean;
  size?: number;
  showHearts?: boolean;
  showName?: boolean;
}

/** A circular bordered tank token (monogram, hearts, leader/dead markers). Presentational. */
export function TankToken({
  name,
  color,
  hearts,
  dead = false,
  isYou = false,
  isLeader = false,
  size = 44,
  showHearts = false,
  showName = false,
}: TankTokenProps) {
  const circle = (
    <span
      style={{ width: size, height: size, backgroundColor: dead ? undefined : color }}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full border-2 border-foreground font-mono text-xs font-bold text-ink shadow-brutal-sm",
        dead && "bg-muted text-muted-foreground",
        isYou && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
      title={displayName(name)}
    >
      {dead ? <Skull className="size-1/2" /> : monogram(name)}
      {isLeader && !dead && <Crown className="absolute -right-1.5 -top-2 size-4 fill-secondary text-foreground" />}
    </span>
  );

  if (!showHearts && !showName) return circle;

  return (
    <span className="flex flex-col items-center gap-1">
      {circle}
      {showHearts && !dead && (
        <span className="flex gap-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full border border-foreground",
                i < hearts ? "bg-heart" : "bg-transparent",
              )}
            />
          ))}
        </span>
      )}
      {showName && (
        <span className="font-mono text-[10px] font-bold uppercase tracking-wide">{displayName(name)}</span>
      )}
    </span>
  );
}
