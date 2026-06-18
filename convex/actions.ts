import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { actionValidator } from "./schema";
import { queueCost, type QueuedKind } from "./lib/cost";

async function requireMyPlayer(ctx: QueryCtx, gameId: Doc<"games">["_id"]): Promise<Doc<"players">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  const player = await ctx.db
    .query("players")
    .withIndex("by_game_user", (q) => q.eq("gameId", gameId).eq("userId", userId))
    .unique();
  if (!player) throw new Error("You're not in this game");
  return player;
}

/** Append an action to the caller's private queue for the current period (affordability-checked). */
export const queueAction = mutation({
  args: { gameId: v.id("games"), action: actionValidator },
  handler: async (ctx, { gameId, action }) => {
    const player = await requireMyPlayer(ctx, gameId);
    const game = await ctx.db.get(gameId);
    if (!game || game.status !== "active") throw new Error("Game is not active");
    if (player.status !== "alive") throw new Error("You're not alive");
    const period = game.periodNumber ?? 0;

    const existing = await ctx.db
      .query("queuedActions")
      .withIndex("by_player_period", (q) => q.eq("playerId", player._id).eq("periodNumber", period))
      .collect();
    existing.sort((a, b) => a.lockedAt - b.lockedAt);

    const kinds = [...existing.map((e) => e.action.kind), action.kind] as QueuedKind[];
    if (queueCost(kinds, player.range) > player.ap) {
      throw new Error("Not enough AP for that plan");
    }

    await ctx.db.insert("queuedActions", {
      gameId,
      playerId: player._id,
      periodNumber: period,
      action,
      lockedAt: Date.now(),
    });
  },
});

/** Remove one queued action (must be the caller's). */
export const cancelAction = mutation({
  args: { actionId: v.id("queuedActions") },
  handler: async (ctx, { actionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const row = await ctx.db.get(actionId);
    if (!row) return;
    const player = await ctx.db.get(row.playerId);
    if (!player || player.userId !== userId) throw new Error("Not your action");
    await ctx.db.delete(actionId);
  },
});

/** Clear the caller's whole queue for the current period. */
export const clearMyQueue = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const player = await requireMyPlayer(ctx, gameId);
    const game = await ctx.db.get(gameId);
    const period = game?.periodNumber ?? 0;
    const rows = await ctx.db
      .query("queuedActions")
      .withIndex("by_player_period", (q) => q.eq("playerId", player._id).eq("periodNumber", period))
      .collect();
    await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
  },
});

/** The caller's own queued actions for the current period (private), ordered by lock-in time. */
export const getMyQueue = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const player = await ctx.db
      .query("players")
      .withIndex("by_game_user", (q) => q.eq("gameId", gameId).eq("userId", userId))
      .unique();
    if (!player) return [];
    const game = await ctx.db.get(gameId);
    const period = game?.periodNumber ?? 0;
    const rows = await ctx.db
      .query("queuedActions")
      .withIndex("by_player_period", (q) => q.eq("playerId", player._id).eq("periodNumber", period))
      .collect();
    return rows.sort((a, b) => a.lockedAt - b.lockedAt);
  },
});
