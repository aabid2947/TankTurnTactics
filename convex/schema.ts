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
    deathOrder: v.optional(v.number()), // global elimination counter, set when the tank dies (Stage 5)
    placement: v.optional(v.number()), // final 1..N rank, set once at game end (Stage 5)
    hauntedNextGrant: v.optional(v.boolean()),
    joinedAt: v.number(),
    lastSeenAt: v.optional(v.number()), // presence heartbeat (Stage 6)
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

  // Mutual trade handshake for the current period. Amounts flow from→to (give*) and to→from
  // (receive*). Accepted offers are injected into resolution as engine `trade` actions, then cleared.
  tradeOffers: defineTable({
    gameId: v.id("games"),
    periodNumber: v.number(),
    fromPlayerId: v.id("players"),
    toPlayerId: v.id("players"),
    giveAp: v.number(),
    giveHearts: v.number(),
    receiveAp: v.number(),
    receiveHearts: v.number(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
    lockedAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_game_period", ["gameId", "periodNumber"])
    .index("by_to_player_period", ["toPlayerId", "periodNumber"])
    .index("by_from_player_period", ["fromPlayerId", "periodNumber"]),

  // Chat: global broadcast + 1:1 DMs. DMs carry a canonical `pairKey` (sorted player ids) so a thread
  // can be fetched directly; getChat returns global + only the caller's own DMs (secrecy at the query).
  chatMessages: defineTable({
    gameId: v.id("games"),
    scope: v.union(v.literal("global"), v.literal("dm")),
    fromPlayerId: v.id("players"),
    toPlayerId: v.optional(v.id("players")),
    pairKey: v.optional(v.string()),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_game_scope", ["gameId", "scope", "createdAt"])
    .index("by_game_pair", ["gameId", "pairKey", "createdAt"]),

  // 4-player endgame negotiation (Implementation.md §3.13/§3.18). One active proposal per game; a
  // unanimous accept among the four living players ends the game early at the next buzzer.
  endgameProposals: defineTable({
    gameId: v.id("games"),
    proposerId: v.id("players"),
    ranking: v.array(v.id("players")), // length 4, 1st → 4th
    accepts: v.array(v.id("players")),
    createdAt: v.number(),
  }).index("by_game", ["gameId"]),

  // Fixed-window rate-limit counters (Stage 6 anti-abuse). `key` namespaces the limit + subject,
  // e.g. `chat:<playerId>`, `queue:<playerId>`, `join:<userId>`.
  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    windowStart: v.number(),
  }).index("by_key", ["key"]),

  // Per-user in-app notifications (Stage 6): enqueued at resolution for events that target you.
  notifications: defineTable({
    userId: v.id("users"),
    gameId: v.optional(v.id("games")),
    type: v.string(),
    body: v.string(),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),
});
