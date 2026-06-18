import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Ghost, Gift } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function JuryPanel({ gameId }: { gameId: Id<"games"> }) {
  const jury = useQuery(api.jury.getJuryState, { gameId });
  const castVote = useMutation(api.jury.castJuryVote);
  const [busy, setBusy] = useState(false);

  if (!jury) return null;

  const vote = async (effect: "haunt" | "gift", targetId: Id<"players">) => {
    setBusy(true);
    try {
      await castVote({ gameId, effect, targetId });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between border-b-2 border-foreground bg-card px-4 py-3">
        <h3 className="inline-flex items-center gap-2 font-display text-base font-bold text-haunted">
          <Ghost className="size-4" />
          The Jury
        </h3>
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {jury.periodsUntilVote === 0 ? "votes this buzzer" : `vote in ${jury.periodsUntilVote}`}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <p className="font-mono text-[11px] leading-snug text-muted-foreground">
          {jury.juryCount} on the jury. Pick a living tank to <strong>haunt</strong> (skips their next AP grant)
          or <strong>gift</strong> (+1 AP). The top choice wins; a tie does nothing.
        </p>
        {jury.candidates.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">No living players to target.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {jury.candidates.map((c) => {
              const mineHaunt = jury.myVote?.effect === "haunt" && jury.myVote.targetId === c._id;
              const mineGift = jury.myVote?.effect === "gift" && jury.myVote.targetId === c._id;
              return (
                <li key={c._id} className="flex items-center gap-2 rounded-[10px] border-2 border-foreground bg-card px-2.5 py-2 shadow-brutal-sm">
                  <span className="flex-1 truncate font-display text-sm font-bold">{c.name}</span>
                  <Button size="sm" variant={mineHaunt ? "default" : "outline"} disabled={busy} onClick={() => void vote("haunt", c._id)}>
                    <Ghost className="size-3.5" />
                    Haunt
                  </Button>
                  <Button size="sm" variant={mineGift ? "accent" : "outline"} disabled={busy} onClick={() => void vote("gift", c._id)}>
                    <Gift className="size-3.5" />
                    Gift
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
