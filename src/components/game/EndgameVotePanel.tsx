import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, ChevronDown, ChevronUp, Crown, Flag, X } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { displayName } from "@/lib/board";

/**
 * Shown at exactly 4 survivors (Implementation.md §3.13/§3.18): propose a 1→4 ranking; if all four
 * agree, the game ends at the next buzzer (4th to the odd one out). Otherwise play continues to 3.
 */
export function EndgameVotePanel({ gameId, mePlayerId }: { gameId: Id<"games">; mePlayerId?: Id<"players"> }) {
  const state = useQuery(api.endgame.getEndgameState, { gameId });
  const propose = useMutation(api.endgame.proposeEndgameRanking);
  const respond = useMutation(api.endgame.respondEndgameRanking);
  const [draft, setDraft] = useState<Id<"players">[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!state || !state.open) return null;

  const nameOf = (id: string) => state.four.find((f) => f._id === id)?.name ?? "a tank";
  const proposal = state.proposal;
  const iAccepted = !!mePlayerId && !!proposal && proposal.accepts.some((a) => a === mePlayerId);
  const order = draft ?? state.four.map((f) => f._id);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setDraft(next);
  };

  const doPropose = async () => {
    setError(null);
    try {
      await propose({ gameId, ranking: order });
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not propose");
    }
  };
  const doRespond = async (accept: boolean) => {
    setError(null);
    try {
      await respond({ gameId, accept });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not respond");
    }
  };

  return (
    <Card className="border-primary p-4">
      <h3 className="inline-flex items-center gap-2 font-display text-base font-bold">
        <Flag className="size-4" />
        Final four — end it here?
      </h3>
      <p className="mt-1 font-mono text-[11px] leading-snug text-muted-foreground">
        If all four agree on a 1–4 ranking, the game ends at the next buzzer. Otherwise play continues to the final 3.
      </p>

      {proposal ? (
        <div className="mt-3 flex flex-col gap-2">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Proposed by {displayName(nameOf(proposal.proposerId))} · {proposal.accepts.length}/4 agreed
          </p>
          <ol className="flex flex-col gap-1">
            {proposal.ranking.map((id, i) => (
              <li
                key={id}
                className="flex items-center gap-2 rounded-[10px] border-2 border-foreground bg-card px-3 py-1.5 font-mono text-xs shadow-brutal-sm"
              >
                <span className="w-5 font-bold tabular-nums">{i + 1}.</span>
                <span className="flex-1">{displayName(nameOf(id))}</span>
                {i === 0 && <Crown className="size-3.5" />}
              </li>
            ))}
          </ol>
          {state.iAmIn && (
            <div className="flex gap-2">
              <Button size="sm" variant="accent" disabled={iAccepted} onClick={() => void doRespond(true)}>
                <Check className="size-3.5" />
                {iAccepted ? "You agreed" : "Agree"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void doRespond(false)}>
                <X className="size-3.5" />
                Reject
              </Button>
            </div>
          )}
        </div>
      ) : state.iAmIn ? (
        <div className="mt-3 flex flex-col gap-2">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Propose a ranking (reorder, then send)
          </p>
          <ol className="flex flex-col gap-1">
            {order.map((id, i) => (
              <li
                key={id}
                className="flex items-center gap-2 rounded-[10px] border-2 border-foreground bg-card px-3 py-1.5 font-mono text-xs shadow-brutal-sm"
              >
                <span className="w-5 font-bold tabular-nums">{i + 1}.</span>
                <span className="flex-1">{displayName(nameOf(id))}</span>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ChevronDown className="size-4" />
                </button>
              </li>
            ))}
          </ol>
          <Button size="sm" onClick={() => void doPropose()}>
            <Flag className="size-3.5" />
            Propose this ranking
          </Button>
        </div>
      ) : (
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">The four survivors are negotiating the finish.</p>
      )}
      {error && <p className="mt-2 font-mono text-[11px] text-destructive">{error}</p>}
    </Card>
  );
}
