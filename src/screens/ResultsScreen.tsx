import { useNavigate } from "react-router-dom";
import { Crown, Skull, Swords, Trophy } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TankToken } from "@/components/game/TankToken";
import { colorForIndex, displayName } from "@/lib/board";
import { cn } from "@/lib/utils";
import type { GameDetail } from "@/lib/gameTypes";

const ORDINALS = ["1st", "2nd", "3rd"];
const ordinal = (n: number): string => ORDINALS[n - 1] ?? `${n}th`;

/** Final results for a completed game — podium for the top 3, then full standings. */
export function ResultsScreen({ game, meId }: { game: GameDetail; meId?: Id<"users"> }) {
  const navigate = useNavigate();
  const ranked = [...game.players].sort(
    (a, b) => (a.placement ?? 99) - (b.placement ?? 99) || a.spawnOrder - b.spawnOrder,
  );
  const podium = ranked.filter((p) => (p.placement ?? 99) <= 3);
  const champion = ranked[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-[var(--radius)] border-2 border-foreground bg-primary p-6 text-primary-foreground shadow-brutal sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide opacity-80">Game over</p>
          <h1 className="font-display text-2xl font-bold">{game.name}</h1>
          {champion && (
            <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-sm">
              <Crown className="size-4" />
              {displayName(champion.name)} takes the crown
            </p>
          )}
        </div>
        <Button variant="secondary" size="lg" onClick={() => navigate("/")}>
          <Trophy className="size-4" />
          Back to lobby
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {podium.map((p) => (
          <Card
            key={p._id}
            className={cn("flex flex-col items-center gap-2 p-5", p.placement === 1 && "bg-secondary text-secondary-foreground")}
          >
            <span className="font-mono text-xs font-bold uppercase tracking-wide">{ordinal(p.placement ?? 0)}</span>
            <TankToken
              name={p.name}
              color={colorForIndex(p.spawnOrder)}
              hearts={p.hearts}
              dead={p.status === "dead"}
              isYou={p.userId === meId}
              isLeader={p.placement === 1}
              showName
              size={64}
            />
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="inline-flex items-center gap-1">
                <Swords className="size-3.5" />
                {p.kills}
              </span>
              <span>·</span>
              <span>{p.hearts}/3 ♥</span>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Final standings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {ranked.map((p) => (
            <div
              key={p._id}
              className="flex items-center gap-3 rounded-[10px] border-2 border-foreground bg-card px-3 py-2 shadow-brutal-sm"
            >
              <span className="w-10 shrink-0 font-mono text-sm font-bold tabular-nums">
                {p.placement ? ordinal(p.placement) : "—"}
              </span>
              <TankToken
                name={p.name}
                color={colorForIndex(p.spawnOrder)}
                hearts={p.hearts}
                dead={p.status === "dead"}
                isYou={p.userId === meId}
                size={36}
              />
              <span className="flex-1 truncate font-display text-sm font-bold">
                {displayName(p.name)}
                {p.userId === meId && " (you)"}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <Swords className="size-3.5" />
                {p.kills}
              </span>
              {p.status === "dead" ? (
                <Badge variant="muted">
                  <Skull className="size-3" />
                  out
                </Badge>
              ) : (
                <Badge variant="accent">survived</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
