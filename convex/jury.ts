import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { type Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

/** A dead player casts/updates their jury ballot for the current cycle. */
export const castJuryVote = mutation({
  args: {
    gameId: v.id("games"),
    effect: v.union(v.literal("haunt"), v.literal("gift")),
    targetId: v.id("players"),
  },
  handler: async (ctx, { gameId, effect, targetId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const me = await ctx.db
      .query("players")
      .withIndex("by_game_user", (q) => q.eq("gameId", gameId).eq("userId", userId))
      .unique();
    if (!me) throw new Error("You're not in this game");
    if (me.status !== "dead") throw new Error("Only eliminated players can vote");
    const target = await ctx.db.get(targetId);
    if (!target || target.gameId !== gameId || target.status !== "alive") {
      throw new Error("Pick a living player");
    }
    const existing = await ctx.db
      .query("juryVotes")
      .withIndex("by_game_voter", (q) => q.eq("gameId", gameId).eq("voterId", me._id))
      .unique();
    if (existing) await ctx.db.patch(existing._id, { effect, targetId, createdAt: Date.now() });
    else await ctx.db.insert("juryVotes", { gameId, voterId: me._id, effect, targetId, createdAt: Date.now() });
  },
});

/** Jury state for the caller: living candidates, my own ballot, jury size, periods until the vote. */
export const getJuryState = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) return null;
    const userId = await getAuthUserId(ctx);
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();
    const me = userId ? players.find((p) => p.userId === userId) : undefined;

    let myVote: { effect: "haunt" | "gift"; targetId: Id<"players"> } | null = null;
    if (me) {
      const v0 = await ctx.db
        .query("juryVotes")
        .withIndex("by_game_voter", (q) => q.eq("gameId", gameId).eq("voterId", me._id))
        .unique();
      if (v0) myVote = { effect: v0.effect, targetId: v0.targetId };
    }

    const period = game.periodNumber ?? 0;
    const every = game.config.juryVoteEveryPeriods;
    return {
      isJuror: me?.status === "dead",
      candidates: players.filter((p) => p.status === "alive").map((p) => ({ _id: p._id, name: p.name })),
      juryCount: players.filter((p) => p.status === "dead").length,
      every,
      periodsUntilVote: every > 0 ? (every - ((period + 1) % every)) % every : 0,
      myVote,
    };
  },
});
