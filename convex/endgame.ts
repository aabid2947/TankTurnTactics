import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";

/** The caller's living player record — only living players take part in the endgame vote. */
async function requireAlivePlayer(ctx: QueryCtx, gameId: Id<"games">): Promise<Doc<"players">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  const player = await ctx.db
    .query("players")
    .withIndex("by_game_user", (q) => q.eq("gameId", gameId).eq("userId", userId))
    .unique();
  if (!player) throw new Error("You're not in this game");
  if (player.status !== "alive") throw new Error("Only living players vote on the endgame");
  return player;
}

async function livingPlayers(ctx: QueryCtx, gameId: Id<"games">): Promise<Doc<"players">[]> {
  const players = await ctx.db.query("players").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect();
  return players.filter((p) => p.status === "alive");
}

/** Propose a full 1→4 ranking of the four remaining players (auto-accepted by the proposer). */
export const proposeEndgameRanking = mutation({
  args: { gameId: v.id("games"), ranking: v.array(v.id("players")) },
  handler: async (ctx, { gameId, ranking }) => {
    const me = await requireAlivePlayer(ctx, gameId);
    const game = await ctx.db.get(gameId);
    if (!game || game.status !== "active") throw new Error("Game is not active");
    const living = await livingPlayers(ctx, gameId);
    if (living.length !== 4) throw new Error("The endgame vote opens only at 4 players");
    const livingIds = new Set(living.map((p) => p._id as string));
    const unique = new Set(ranking.map((id) => id as string));
    if (ranking.length !== 4 || unique.size !== 4 || !ranking.every((id) => livingIds.has(id as string))) {
      throw new Error("Ranking must list all four remaining players exactly once");
    }
    // One active proposal per game: replace any existing, proposer auto-accepts.
    const existing = await ctx.db.query("endgameProposals").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect();
    await Promise.all(existing.map((p) => ctx.db.delete(p._id)));
    await ctx.db.insert("endgameProposals", {
      gameId,
      proposerId: me._id,
      ranking,
      accepts: [me._id],
      createdAt: Date.now(),
    });
  },
});

/** Accept the current proposal, or decline (which clears it so a new one can be proposed). */
export const respondEndgameRanking = mutation({
  args: { gameId: v.id("games"), accept: v.boolean() },
  handler: async (ctx, { gameId, accept }) => {
    const me = await requireAlivePlayer(ctx, gameId);
    const proposal = await ctx.db.query("endgameProposals").withIndex("by_game", (q) => q.eq("gameId", gameId)).first();
    if (!proposal) throw new Error("No endgame ranking to respond to");
    if (!accept) {
      await ctx.db.delete(proposal._id);
      return;
    }
    if (proposal.accepts.some((a) => a === me._id)) return;
    await ctx.db.patch(proposal._id, { accepts: [...proposal.accepts, me._id] });
  },
});

/** State for the endgame-vote UI: whether it's open, the four players, and the live proposal. */
export const getEndgameState = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    const living = await livingPlayers(ctx, gameId);
    const userId = await getAuthUserId(ctx);
    const me = userId
      ? await ctx.db.query("players").withIndex("by_game_user", (q) => q.eq("gameId", gameId).eq("userId", userId)).unique()
      : null;

    const open = !!game && game.status === "active" && living.length === 4;
    const livingIds = new Set(living.map((p) => p._id as string));
    const four = open ? living.map((p) => ({ _id: p._id, name: p.name, spawnOrder: p.spawnOrder })) : [];

    let proposal: { ranking: Id<"players">[]; accepts: Id<"players">[]; proposerId: Id<"players"> } | null = null;
    if (open) {
      const row = await ctx.db.query("endgameProposals").withIndex("by_game", (q) => q.eq("gameId", gameId)).first();
      if (row && row.ranking.length === 4 && row.ranking.every((id) => livingIds.has(id as string))) {
        proposal = { ranking: row.ranking, accepts: row.accepts, proposerId: row.proposerId };
      }
    }
    return {
      open,
      iAmIn: open && !!me && me.status === "alive" && livingIds.has(me._id as string),
      four,
      proposal,
    };
  },
});
