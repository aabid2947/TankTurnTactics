import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { Copy, LogOut, Play, Users } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HudChip } from "@/components/game/HudChip";
import { TankToken } from "@/components/game/TankToken";
import { colorForIndex } from "@/lib/board";
import type { GameDetail } from "@/lib/gameTypes";

export function WaitingRoom({ game, meId }: { game: GameDetail; meId?: Id<"users"> }) {
  const startGame = useMutation(api.games.startGame);
  const leaveGame = useMutation(api.games.leaveGame);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const isHost = meId !== undefined && game.createdBy === meId;
  const canStart = game.players.length >= game.config.minPlayers;

  const start = async () => {
    setError(null);
    try {
      await startGame({ gameId: game._id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start");
    }
  };

  const leave = async () => {
    try {
      await leaveGame({ gameId: game._id });
    } finally {
      navigate("/");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-[var(--radius)] border-2 border-foreground bg-primary p-6 text-primary-foreground shadow-brutal sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide opacity-80">Waiting room</p>
          <h1 className="font-display text-2xl font-bold">{game.name}</h1>
        </div>
        <button
          onClick={() => void navigator.clipboard?.writeText(game.code)}
          className="flex items-center gap-2 rounded-full border-2 border-foreground bg-card px-4 py-2 text-foreground shadow-brutal-sm"
          title="Copy invite code"
        >
          <span className="font-mono text-lg font-bold tracking-[0.2em]">{game.code}</span>
          <Copy className="size-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <HudChip icon={Users} label="Players" value={`${game.players.length} / ${game.config.maxPlayers}`} />
        <Badge variant="muted">
          {game.config.boardWidth}×{game.config.boardHeight} board
        </Badge>
        <Badge variant="muted">{Math.round(game.config.periodSeconds / 60)} min periods</Badge>
        <Badge variant="muted">{game.config.apPerGrant} AP / period</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-5">
            {game.players.map((p, i) => (
              <TankToken key={p._id} name={p.name} color={colorForIndex(i)} hearts={3} isYou={p.userId === meId} showName size={52} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        {isHost ? (
          <Button size="lg" onClick={() => void start()} disabled={!canStart}>
            <Play className="size-4" />
            Start game
          </Button>
        ) : (
          <Badge variant="muted">Waiting for the host to start…</Badge>
        )}
        <Button size="lg" variant="outline" onClick={() => void leave()}>
          <LogOut className="size-4" />
          Leave
        </Button>
        {!canStart && (
          <p className="font-mono text-xs text-muted-foreground">
            Need ≥ {game.config.minPlayers} players ({game.players.length} so far).
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
