import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Coins, Crosshair, Heart, Skull, Users, Zap } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ActionQueue } from "@/components/game/ActionQueue";
import { HistoryPanel } from "@/components/game/HistoryPanel";
import { HudChip } from "@/components/game/HudChip";
import { InGameBoard } from "@/components/game/InGameBoard";
import { fmtTime, useCountdown } from "@/lib/useCountdown";
import { cn } from "@/lib/utils";
import type { GameDetail } from "@/lib/gameTypes";

type Cell = { x: number; y: number };
type ActionInput =
  | { kind: "heal" }
  | { kind: "upgrade" }
  | { kind: "collect" }
  | { kind: "move"; to: Cell }
  | { kind: "shoot"; target: Cell }
  | { kind: "give"; targetId: Id<"players"> };

export function GameBoard({ game, meId }: { game: GameDetail; meId?: Id<"users"> }) {
  const me = useQuery(api.games.getMyPlayer, { gameId: game._id });
  const queue = useQuery(api.actions.getMyQueue, { gameId: game._id }) ?? [];
  const events = useQuery(api.resolve.getHistory, { gameId: game._id }) ?? [];
  const queueAction = useMutation(api.actions.queueAction);
  const cancelAction = useMutation(api.actions.cancelAction);
  const clearMyQueue = useMutation(api.actions.clearMyQueue);
  const forceResolve = useMutation(api.resolve.forceResolve);

  const [mode, setMode] = useState<"move" | "shoot" | "give" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const secsLeft = useCountdown(game.currentPeriodEndsAt);
  const alive = game.players.filter((p) => p.status === "alive").length;
  const isHost = meId !== undefined && game.createdBy === meId;
  const amAlive = me?.status === "alive";
  const nameOf = (id: string) => game.players.find((p) => p._id === id)?.name ?? "a tank";

  const tryQueue = async (action: ActionInput) => {
    setError(null);
    try {
      await queueAction({ gameId: game._id, action });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not queue that action");
    }
  };

  const onPick = (cell: Cell) => {
    if (mode === "move") void tryQueue({ kind: "move", to: cell });
    else if (mode === "shoot") void tryQueue({ kind: "shoot", target: cell });
    else if (mode === "give") {
      const target = game.players.find(
        (p) => p.x === cell.x && p.y === cell.y && p._id !== me?._id && (p.status === "dead" || p.hearts < 3),
      );
      if (target) void tryQueue({ kind: "give", targetId: target._id });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-[var(--radius)] border-2 border-foreground bg-card p-4 shadow-brutal lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-12 place-items-center rounded-[10px] border-2 border-foreground font-mono text-lg font-bold tabular-nums shadow-brutal-sm",
              secsLeft <= 5 ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground",
            )}
          >
            {fmtTime(secsLeft)}
          </span>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              {game.name} · period {game.periodNumber ?? 0}
            </p>
            <p className="font-display text-sm font-bold">Queue your moves before the buzzer</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {me && <HudChip icon={Coins} label="AP" value={me.ap} tone="ap" />}
          {me && <HudChip icon={Crosshair} label="Range" value={me.range} tone="range" />}
          {me && <HudChip icon={Heart} label="Hearts" value={`${me.hearts}/3`} tone="heart" />}
          <HudChip icon={Users} label="Alive" value={`${alive}/${game.players.length}`} />
          {isHost && (
            <Button size="sm" variant="accent" onClick={() => void forceResolve({ gameId: game._id })}>
              <Zap className="size-4" />
              Resolve now
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {me && !amAlive && (
        <div className="rounded-[var(--radius)] border-2 border-foreground bg-muted p-3 text-center font-mono text-xs text-muted-foreground">
          <Skull className="mr-1 inline size-4" />
          You're down — spectating until a teammate revives you.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
        <div className="order-2 lg:order-1 lg:h-[560px]">
          <ActionQueue
            me={me ?? undefined}
            queue={queue}
            mode={mode}
            setMode={setMode}
            disabled={!amAlive}
            nameOf={nameOf}
            onSimple={(kind) => void tryQueue({ kind })}
            onCancel={(id) => void cancelAction({ actionId: id })}
            onClear={() => void clearMyQueue({ gameId: game._id })}
          />
        </div>
        <div className="order-1 lg:order-2">
          <InGameBoard
            game={game}
            me={me ?? undefined}
            meUserId={meId}
            mode={amAlive ? mode : null}
            onPick={onPick}
          />
          <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">
            {mode === "move"
              ? "Click a highlighted cell to queue a move."
              : mode === "shoot"
                ? "Click a cell in range to queue a shot."
                : mode === "give"
                  ? "Click a wounded ally or a fallen tank in range to give a heart / revive."
                  : "Pick Move, Shoot, or Give, then click the board. Everything resolves at the buzzer."}
          </p>
        </div>
        <div className="order-3 h-[560px] lg:order-3">
          <HistoryPanel players={game.players} events={events} />
        </div>
      </div>
    </div>
  );
}
