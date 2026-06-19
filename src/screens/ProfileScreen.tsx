import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { Gamepad2, Swords, Target, Trophy } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HudChip } from "@/components/game/HudChip";

const ORDINALS = ["1st", "2nd", "3rd"];
const ordinal = (n: number): string => ORDINALS[n - 1] ?? `${n}th`;

/** The current user's derived stats + match history (from `users.myProfile`). */
export function ProfileScreen() {
  const profile = useQuery(api.users.myProfile);

  if (profile === undefined) return <p className="font-mono text-sm text-muted-foreground">Loading…</p>;
  if (profile === null) return <p className="font-mono text-sm text-muted-foreground">Sign in to see your stats.</p>;

  const { stats, history } = profile;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-[var(--radius)] border-2 border-foreground bg-primary p-6 text-primary-foreground shadow-brutal">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide opacity-80">Your record</p>
          <h1 className="font-display text-2xl font-bold">Profile</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <HudChip icon={Gamepad2} label="Games" value={stats.gamesPlayed} />
          <HudChip icon={Trophy} label="Top-3" value={stats.wins} />
          <HudChip icon={Swords} label="Kills" value={stats.kills} />
          <HudChip icon={Target} label="Best" value={stats.bestPlacement ? ordinal(stats.bestPlacement) : "—"} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Match history</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {history.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground">No finished games yet.</p>
          ) : (
            history.map((h) => (
              <Link
                key={h.gameId}
                to={`/game/${h.gameId}`}
                className="flex items-center gap-3 rounded-[10px] border-2 border-foreground bg-card px-3 py-2 shadow-brutal-sm transition-[transform,box-shadow] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                <span className="w-10 shrink-0 font-mono text-sm font-bold tabular-nums">
                  {h.placement ? ordinal(h.placement) : "—"}
                </span>
                <span className="flex-1 truncate font-display text-sm font-bold">{h.name}</span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <Swords className="size-3.5" />
                  {h.kills}
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
