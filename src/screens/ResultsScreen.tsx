import { Link } from "react-router-dom";
import { Heart, RotateCcw, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TankToken } from "@/components/game/TankToken";
import { FINAL_STANDINGS, type Standing, type Tank } from "@/lib/mock";
import { cn } from "@/lib/utils";

function toTank(s: Standing): Tank {
  return {
    id: s.name,
    name: s.name,
    monogram: s.monogram,
    color: s.color,
    x: 0,
    y: 0,
    hearts: s.hearts,
    status: "alive",
    isLeader: s.rank === 1,
  };
}

export function ResultsScreen() {
  const [first, second, third] = FINAL_STANDINGS;

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Game over</p>
        <h1 className="font-display text-3xl font-bold">Podium</h1>
      </div>

      <div className="flex items-end justify-center gap-3 sm:gap-6">
        <Pedestal standing={second} tank={toTank(second)} height="h-20" tokenSize={56} />
        <Pedestal standing={first} tank={toTank(first)} height="h-28" tokenSize={72} />
        <Pedestal standing={third} tank={toTank(third)} height="h-14" tokenSize={56} />
      </div>

      <Card className="mx-auto w-full max-w-xl p-4">
        <h2 className="mb-3 font-display text-lg font-bold">Final standings</h2>
        <ul className="flex flex-col gap-2">
          {FINAL_STANDINGS.map((s) => (
            <li
              key={s.name}
              className={cn(
                "flex items-center gap-3 rounded-[10px] border-2 border-foreground px-3 py-2 shadow-brutal-sm",
                s.rank <= 3 ? "bg-secondary/40" : "bg-card",
              )}
            >
              <span className="w-6 font-mono text-sm font-bold tabular-nums">{s.rank}</span>
              <TankToken tank={toTank(s)} size={34} />
              <span className="flex-1 font-display font-bold">{s.name}</span>
              <span className="inline-flex items-center gap-1 font-mono text-xs">
                <Heart className="size-3.5 text-heart" />
                {s.hearts}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-xs">
                <Swords className="size-3.5" />
                {s.kills}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex justify-center">
        <Button size="lg" asChild>
          <Link to="/">
            <RotateCcw className="size-4" />
            Play again
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Pedestal({
  standing,
  tank,
  height,
  tokenSize,
}: {
  standing: Standing;
  tank: Tank;
  height: string;
  tokenSize: number;
}) {
  return (
    <div className="flex w-24 flex-col items-center gap-2">
      <TankToken tank={tank} size={tokenSize} showName />
      <div
        className={cn(
          "flex w-full items-start justify-center rounded-t-[10px] border-2 border-foreground bg-card pt-2 font-display text-2xl font-bold shadow-brutal-sm",
          height,
        )}
      >
        {standing.rank}
      </div>
    </div>
  );
}
