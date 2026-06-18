import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * Stage 0 stub schema: Convex Auth tables + a minimal `games` table so the deployment has
 * something to validate. The full game schema (players, queuedActions, tradeOffers, apCaches,
 * heartSpawns, events, chatMessages, juryVotes) lands in Stage 1 — see Implementation.md §4.
 */
export default defineSchema({
  ...authTables,

  games: defineTable({
    name: v.string(),
    code: v.string(),
    status: v.union(
      v.literal("lobby"),
      v.literal("active"),
      v.literal("completed"),
    ),
    createdBy: v.id("users"),
  })
    .index("by_code", ["code"])
    .index("by_status", ["status"]),
});
