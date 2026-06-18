import { useQuery } from "convex/react";
import { Coins, Crosshair, Heart, Users } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { BoardGrid } from "@/components/game/BoardGrid";
import { HudChip } from "@/components/game/HudChip";
import type { GameDetail } from "@/lib/gameTypes";

export function GameBoard({ game, meId }: { game: GameDetail; meId?: Id<"users"> }) {
  const me = useQuery(api.games.getMyPlayer, { gameId: game._id });
  const alive = game.players.filter((p) => p.status === "alive").length;
  const board = game.board ?? { width: game.config.boardWidth, height: game.config.boardHeight };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-[var(--radius)] border-2 border-foreground bg-card p-4 shadow-brutal sm:flex-row sm:items-center">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            {game.name} · period {game.periodNumber ?? 0}
          </p>
          <p className="font-display text-sm font-bold">Live board</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {me && <HudChip icon={Coins} label="AP" value={me.ap} tone="ap" />}
          {me && <HudChip icon={Crosshair} label="Range" value={me.range} tone="range" />}
          {me && <HudChip icon={Heart} label="Hearts" value={`${me.hearts}/3`} tone="heart" />}
          <HudChip icon={Users} label="Alive" value={`${alive}/${game.players.length}`} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <BoardGrid width={board.width} height={board.height} players={game.players} meUserId={meId} />
      </div>

      <p className="text-center font-mono text-xs text-muted-foreground">
        Everyone's spawned and live. The action queue, period buzzer, and simultaneous resolution arrive in Stage 3.
      </p>
    </div>
  );
}
