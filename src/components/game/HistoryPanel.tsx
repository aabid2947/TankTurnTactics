import { Card } from "@/components/ui/card";
import { eventLabel } from "@/lib/events";
import type { GameEvent } from "@convex/engine/types";
import type { GamePlayer } from "@/lib/gameTypes";
import { cn } from "@/lib/utils";

interface EventRow {
  _id: string;
  periodNumber: number;
  index: number;
  event: unknown;
}

export function HistoryPanel({ players, events }: { players: GamePlayer[]; events: EventRow[] }) {
  const nameOf = (id: string) => players.find((p) => p._id === id)?.name ?? "a tank";
  const periods = [...new Set(events.map((e) => e.periodNumber))].sort((a, b) => b - a);

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <div className="border-b-2 border-foreground bg-secondary px-4 py-3">
        <h3 className="font-display text-base font-bold text-secondary-foreground">History</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {periods.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">No moves yet — the first buzzer hasn't fired.</p>
        ) : (
          periods.map((period) => (
            <div key={period} className="mb-4">
              <p className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Period {period}
              </p>
              <ul className="flex flex-col gap-1">
                {events
                  .filter((e) => e.periodNumber === period)
                  .sort((a, b) => a.index - b.index)
                  .map((e) => {
                    const labelled = eventLabel(e.event as GameEvent, nameOf);
                    if (!labelled) return null;
                    return (
                      <li key={e._id} className={cn("font-mono text-xs leading-snug", labelled.tone)}>
                        {labelled.label}
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
