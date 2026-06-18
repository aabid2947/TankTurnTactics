import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { GameBoard } from "./GameBoard";
import { WaitingRoom } from "./WaitingRoom";

/** Routes a game id to the waiting room (lobby) or the live board (active). */
export function GameRoute() {
  const { gameId } = useParams<{ gameId: string }>();
  const id = gameId as Id<"games"> | undefined;
  const game = useQuery(api.games.getGame, id ? { gameId: id } : "skip");
  const viewer = useQuery(api.users.viewer);

  if (!id) return <Msg>Invalid game link.</Msg>;
  if (game === undefined) return <Msg>Loading…</Msg>;
  if (game === null) return <Msg>Game not found.</Msg>;

  return game.status === "lobby" ? (
    <WaitingRoom game={game} meId={viewer?._id} />
  ) : (
    <GameBoard game={game} meId={viewer?._id} />
  );
}

function Msg({ children }: { children: ReactNode }) {
  return <p className="font-mono text-sm text-muted-foreground">{children}</p>;
}
