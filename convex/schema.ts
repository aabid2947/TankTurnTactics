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

const cellValidator = v.object({ x: v.number(), y: v.number() });

/** A queued action. `give` is one-way (heal an ally / revive a body). Mutual trades use a handshake. */
export const actionValidator = v.union(
  v.object({ kind: v.literal("heal") }),
  v.object({ kind: v.literal("upgrade") }),
  v.object({ kind: v.literal("collect") }),
  v.object({ kind: v.literal("move"), to: cellValidator }),
  v.object({ kind: v.literal("shoot"), target: cellValidator }),
  v.object({ kind: v.literal("give"), targetId: v.id("players") }),
);

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
    caches: v.optional(v.array(v.object({ x: v.number(), y: v.number(), amount: v.number() }))),
    heartSpawns: v.optional(v.array(cellValidator)),
    periodNumber: v.optional(v.number()),
    currentPeriodEndsAt: v.optional(v.number()),
    nextResolveId: v.optional(v.id("_scheduled_functions")),
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
    x: v.number(),
    y: v.number(),
    hearts: v.number(),
    ap: v.number(), // SECRET
    range: v.number(), // SECRET
    kills: v.number(),
    spawnOrder: v.number(),
    hauntedNextGrant: v.optional(v.boolean()),
    joinedAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_game_user", ["gameId", "userId"])
    .index("by_user", ["userId"]),

  // Private per-player queue for the current period. `lockedAt` orders a player's own actions AND
  // breaks cross-player contention (Implementation.md §3.5). Never exposed to other players.
  queuedActions: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    periodNumber: v.number(),
    action: actionValidator,
    lockedAt: v.number(),
  })
    .index("by_game_period", ["gameId", "periodNumber"])
    .index("by_player_period", ["playerId", "periodNumber"]),

  // Public resolution history (chess-style move log).
  events: defineTable({
    gameId: v.id("games"),
    periodNumber: v.number(),
    index: v.number(),
    event: v.any(),
  }).index("by_game_period", ["gameId", "periodNumber"]),

  // Jury ballots from eliminated players for the current cycle (secret; cleared after each tally).
  juryVotes: defineTable({
    gameId: v.id("games"),
    voterId: v.id("players"),
    effect: v.union(v.literal("haunt"), v.literal("gift")),
    targetId: v.id("players"),
    createdAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_game_voter", ["gameId", "voterId"]),
});
