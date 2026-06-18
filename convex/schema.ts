import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/** Host-configurable game settings (Implementation.md §3.15). Shared by the schema + createGame. */
export const configValidator = v.object({
  periodSeconds: v.number(),
  apPerGrant: v.number(),
  heartSpawnEveryPeriods: v.number(),
  juryVoteEveryPeriods: v.number(),
  boardWidth: v.number(),
  boardHeight: v.number(),
  minPlayers: v.number(),
  maxPlayers: v.number(),
});

/**
 * Stage 1 schema: Convex Auth tables + games (lobby/lifecycle) + players (membership → placed).
 * Gameplay tables (queuedActions, tradeOffers, apCaches, heartSpawns, events, chatMessages,
 * juryVotes) arrive in later stages — see Implementation.md §4.
 */
export default defineSchema({
  ...authTables,

  games: defineTable({
    name: v.string(),
    code: v.string(),
    status: v.union(v.literal("lobby"), v.literal("active"), v.literal("completed")),
    createdBy: v.id("users"),
    config: configValidator,
    board: v.optional(
      v.object({
        originX: v.number(),
        originY: v.number(),
        width: v.number(),
        height: v.number(),
        shrinkStep: v.number(),
      }),
    ),
    periodNumber: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_status", ["status"]),

  players: defineTable({
    gameId: v.id("games"),
    userId: v.id("users"),
    name: v.string(),
    status: v.union(v.literal("alive"), v.literal("dead")),
    // Position is (-1,-1) while in the lobby; assigned at startGame.
    x: v.number(),
    y: v.number(),
    hearts: v.number(),
    ap: v.number(), // SECRET — never returned by public queries
    range: v.number(), // SECRET
    kills: v.number(),
    spawnOrder: v.number(),
    joinedAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_game_user", ["gameId", "userId"])
    .index("by_user", ["userId"]),
});
