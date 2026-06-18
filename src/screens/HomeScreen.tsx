import { Link } from "react-router-dom";
import { ArrowRight, Plus, Swords, Target, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HudChip } from "@/components/game/HudChip";
import { OPEN_GAMES } from "@/lib/mock";

export function HomeScreen() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-[var(--radius)] border-2 border-foreground bg-secondary p-6 text-secondary-foreground shadow-brutal sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Find a game</h1>
          <p className="mt-1 max-w-md text-sm opacity-80">Join an open arena or start your own. 10–17 tanks per match, last three standing take the podium.</p>
        </div>
        <Button size="lg" asChild>
          <Link to="/create">
            <Plus className="size-4" />
            Create game
          </Link>
        </Button>
      </section>

      <div className="flex flex-wrap gap-2">
        <HudChip icon={Swords} label="Games" value={42} />
        <HudChip icon={Trophy} label="Wins" value={9} tone="primary" />
        <HudChip icon={Target} label="Top-3" value={18} />
        <HudChip icon={Users} label="Online" value={213} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Enter code, e.g. TANK-7F3K" className="max-w-xs" />
        <Button variant="outline">Join by code</Button>
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Open arenas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OPEN_GAMES.map((g) => (
            <Card key={g.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <Badge variant={g.status === "active" ? "accent" : "muted"}>{g.status}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">{g.code}</span>
                </div>
                <h3 className="font-display text-lg font-bold leading-tight">{g.name}</h3>
                <p className="font-mono text-xs text-muted-foreground">{g.periodLabel}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold">
                    <Users className="size-4" />
                    {g.players}/{g.max}
                  </span>
                  <Button size="sm" asChild>
                    <Link to="/waiting">
                      Join
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
