import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Plus, Users } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LobbyScreen() {
  const games = useQuery(api.games.listOpen);
  const joinGame = useMutation(api.games.joinGame);
  const joinByCode = useMutation(api.games.joinByCode);
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const join = async (gameId: Id<"games">) => {
    setError(null);
    try {
      await joinGame({ gameId });
      navigate(`/game/${gameId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join");
    }
  };

  const joinWithCode = async () => {
    setError(null);
    try {
      const id = await joinByCode({ code });
      navigate(`/game/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-[var(--radius)] border-2 border-foreground bg-secondary p-6 text-secondary-foreground shadow-brutal sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Find a game</h1>
          <p className="mt-1 max-w-md text-sm opacity-80">
            Join an open arena or start your own. 10–17 tanks; last three standing take the podium.
          </p>
        </div>
        <Button size="lg" onClick={() => navigate("/create")}>
          <Plus className="size-4" />
          Create game
        </Button>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Game code"
          placeholder="Enter code, e.g. TANK-7F3K"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="outline" onClick={() => void joinWithCode()} disabled={!code.trim()}>
          Join by code
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Open arenas</h2>
        {games === undefined ? (
          <p className="font-mono text-sm text-muted-foreground">Loading…</p>
        ) : games.length === 0 ? (
          <p className="font-mono text-sm text-muted-foreground">No open games yet — create one!</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((g) => (
              <Card key={g._id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="muted">lobby</Badge>
                    <span className="font-mono text-xs text-muted-foreground">{g.code}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold leading-tight">{g.name}</h3>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold">
                      <Users className="size-4" />
                      {g.players}/{g.maxPlayers}
                    </span>
                    <Button size="sm" onClick={() => void join(g._id)}>
                      Join
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
