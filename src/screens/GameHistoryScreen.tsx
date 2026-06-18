import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MATCH_HISTORY, MOVE_LOG, type EventKind } from "@/lib/mock";
import { cn } from "@/lib/utils";

const KIND_META: Record<EventKind, { color: string; label: string }> = {
  move: { color: "text-foreground", label: "MOVE" },
  shoot: { color: "text-destructive", label: "SHOOT" },
  death: { color: "text-muted-foreground", label: "DEATH" },
  revive: { color: "text-accent", label: "REVIVE" },
  heart: { color: "text-heart", label: "HEART" },
  upgrade: { color: "text-primary", label: "UPGRADE" },
  jury: { color: "text-haunted", label: "JURY" },
};

export function GameHistoryScreen() {
  const [selected, setSelected] = useState(MATCH_HISTORY[0].id);
  const periods = [...new Set(MOVE_LOG.map((e) => e.period))];

  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-3xl font-bold">Game history</h1>
      <p className="text-sm text-muted-foreground">Your past matches and a chess-style move log of the selected game.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-3">
          {MATCH_HISTORY.map((m) => (
            <button key={m.id} onClick={() => setSelected(m.id)} className="block text-left">
              <Card className={cn("p-4 transition-transform", selected === m.id ? "ring-2 ring-primary" : "hover:-translate-y-0.5")}>
                <div className="flex items-center justify-between">
                  <PlacementBadge place={m.placement} />
                  <span className="font-mono text-xs text-muted-foreground">{m.date}</span>
                </div>
                <h3 className="mt-2 font-display text-base font-bold leading-tight">{m.name}</h3>
                <p className="font-mono text-xs text-muted-foreground">
                  {m.players} players · {m.kills} kills
                </p>
              </Card>
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-4">
            <h2 className="font-display text-lg font-bold">Move log</h2>
            <div className="mt-3 flex flex-col gap-4">
              {periods.map((p) => (
                <div key={p}>
                  <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Period {p}</p>
                  <ul className="flex flex-col gap-1.5">
                    {MOVE_LOG.filter((e) => e.period === p).map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center gap-3 rounded-[8px] border-2 border-foreground bg-card px-3 py-1.5 shadow-brutal-sm"
                      >
                        <span className={cn("w-16 shrink-0 font-mono text-[10px] font-bold uppercase", KIND_META[e.kind].color)}>
                          {KIND_META[e.kind].label}
                        </span>
                        <span className="font-mono text-xs">{e.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PlacementBadge({ place }: { place: number }) {
  if (place === 1) return <Badge variant="secondary">1st 🥇</Badge>;
  if (place === 2) return <Badge variant="default">2nd 🥈</Badge>;
  if (place === 3) return <Badge variant="accent">3rd 🥉</Badge>;
  return <Badge variant="muted">#{place}</Badge>;
}
