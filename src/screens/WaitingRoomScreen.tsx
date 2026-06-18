import { Link } from "react-router-dom";
import { Copy, Play, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HudChip } from "@/components/game/HudChip";
import { TankToken } from "@/components/game/TankToken";
import { TANKS } from "@/lib/mock";

export function WaitingRoomScreen() {
  const roster = TANKS.slice(0, 8).map((t) => ({ ...t, status: "alive" as const, hearts: 3 }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-[var(--radius)] border-2 border-foreground bg-primary p-6 text-primary-foreground shadow-brutal sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide opacity-80">Waiting room</p>
          <h1 className="font-display text-2xl font-bold">Friday Night Skirmish</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border-2 border-foreground bg-card px-4 py-2 text-foreground shadow-brutal-sm">
          <span className="font-mono text-lg font-bold tracking-[0.2em]">TANK-7F3K</span>
          <button aria-label="Copy invite code" className="text-muted-foreground hover:text-foreground">
            <Copy className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <HudChip icon={Users} label="Players" value="8 / 17" />
        <Badge variant="muted">10 min periods</Badge>
        <Badge variant="muted">20×20 board</Badge>
        <Badge variant="muted">1 AP / period</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-5">
            {roster.map((t) => (
              <TankToken key={t.id} tank={t} showName size={52} />
            ))}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="grid size-[52px] place-items-center rounded-full border-2 border-dashed border-foreground/40 font-mono text-xs text-muted-foreground">
                  ?
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">open</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" asChild>
          <Link to="/game">
            <Play className="size-4" />
            Start game
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link to="/">Leave</Link>
        </Button>
        <p className="font-mono text-xs text-muted-foreground">Host can start once ≥10 players have joined.</p>
      </div>
    </div>
  );
}
