import { Link } from "react-router-dom";
import { LogOut, type LucideIcon, Percent, Swords, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MATCH_HISTORY, YOU } from "@/lib/mock";
import { bestTextOn } from "@/lib/utils";

const STATS: { icon: LucideIcon; label: string; value: string }[] = [
  { icon: Swords, label: "Games", value: "42" },
  { icon: Trophy, label: "Wins", value: "9" },
  { icon: Target, label: "Top-3 finishes", value: "18" },
  { icon: Percent, label: "Win rate", value: "21%" },
];

export function ProfileScreen() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-center">
        <span
          className="grid size-20 shrink-0 place-items-center rounded-full border-2 border-foreground font-mono text-2xl font-bold shadow-brutal"
          style={{ backgroundColor: YOU.color, color: bestTextOn(YOU.color) }}
        >
          {YOU.monogram}
        </span>
        <div className="text-center sm:text-left">
          <h1 className="font-display text-2xl font-bold">{YOU.name}</h1>
          <p className="font-mono text-xs text-muted-foreground">Joined June 2026 · Rank: Tactician</p>
        </div>
        <Button variant="outline" className="sm:ml-auto" asChild>
          <Link to="/login">
            <LogOut className="size-4" />
            Sign out
          </Link>
        </Button>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-4">
              <Icon className="size-5 text-primary" />
              <p className="mt-2 font-display text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
            </Card>
          );
        })}
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Recent matches</h2>
        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            {MATCH_HISTORY.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-[10px] border-2 border-foreground bg-card px-3 py-2 shadow-brutal-sm"
              >
                <span className="grid size-8 place-items-center rounded-full border-2 border-foreground bg-secondary font-mono text-xs font-bold text-secondary-foreground">
                  {m.placement === 1 ? "🥇" : m.placement === 2 ? "🥈" : m.placement === 3 ? "🥉" : `#${m.placement}`}
                </span>
                <span className="flex-1 font-display font-bold">{m.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{m.date}</span>
                <span className="font-mono text-xs font-bold">{m.kills} kills</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
