import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";

/** The shape returned by `api.games.getGame` (public game state), non-null. */
export type GameDetail = NonNullable<FunctionReturnType<typeof api.games.getGame>>;
export type GamePlayer = GameDetail["players"][number];
export type MyPlayer = NonNullable<FunctionReturnType<typeof api.games.getMyPlayer>>;
export type QueueRow = FunctionReturnType<typeof api.actions.getMyQueue>[number];
