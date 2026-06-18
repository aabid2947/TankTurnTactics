import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

async function requireAlivePlayer(ctx: QueryCtx, gameId: Doc<"games">["_id"]): Promise<Doc<"players">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  const player = await ctx.db
    .query("players")
    .withIndex("by_game_user", (q) => q.eq("gameId", gameId).eq("userId", userId))
    .unique();
  if (!player) throw new Error("You're not in this game");
  return player;
}

/** Propose a mutual trade to a living player (executes at the buzzer only if accepted + in range). */
export const proposeTrade = mutation({
  args: {
    gameId: v.id("games"),
    toPlayerId: v.id("players"),
    giveAp: v.number(),
    giveHearts: v.number(),
    receiveAp: v.number(),
    receiveHearts: v.number(),
  },
  handler: async (ctx, args) => {
    const me = await requireAlivePlayer(ctx, args.gameId);
    if (me.status !== "alive") throw new Error("You're not alive");
    if (args.toPlayerId === me._id) throw new Error("Can't trade with yourself");
    const game = await ctx.db.get(args.gameId);
    if (!game || game.status !== "active") throw new Error("Game is not active");
    const target = await ctx.db.get(args.toPlayerId);
    if (!target || target.gameId !== args.gameId || target.status !== "alive") {
      throw new Error("Pick a living player");
    }
    const amounts = [args.giveAp, args.giveHearts, args.receiveAp, args.receiveHearts];
    if (amounts.some((n) => n < 0 || !Number.isInteger(n))) throw new Error("Amounts must be whole and non-negative");
    if (args.giveHearts > 3 || args.receiveHearts > 3) throw new Error("Hearts are capped at 3");
    if (amounts.every((n) => n === 0)) throw new Error("Offer must move something");

    const period = game.periodNumber ?? 0;
    const existing = (
      await ctx.db
        .query("tradeOffers")
        .withIndex("by_from_player_period", (q) => q.eq("fromPlayerId", me._id).eq("periodNumber", period))
        .collect()
    ).find((o) => o.toPlayerId === args.toPlayerId);

    const fields = {
      giveAp: args.giveAp,
      giveHearts: args.giveHearts,
      receiveAp: args.receiveAp,
      receiveHearts: args.receiveHearts,
      status: "pending" as const,
      lockedAt: Date.now(),
      acceptedAt: undefined,
    };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert("tradeOffers", {
        gameId: args.gameId,
        periodNumber: period,
        fromPlayerId: me._id,
        toPlayerId: args.toPlayerId,
        ...fields,
      });
    }
  },
});

/** Recipient accepts or declines a pending offer. */
export const respondTrade = mutation({
  args: { offerId: v.id("tradeOffers"), accept: v.boolean() },
  handler: async (ctx, { offerId, accept }) => {
    const offer = await ctx.db.get(offerId);
    if (!offer) throw new Error("Offer not found");
    const me = await requireAlivePlayer(ctx, offer.gameId);
    if (offer.toPlayerId !== me._id) throw new Error("This offer isn't for you");
    if (offer.status !== "pending") throw new Error("Offer already resolved");
    await ctx.db.patch(offerId, {
      status: accept ? "accepted" : "declined",
      acceptedAt: accept ? Date.now() : undefined,
    });
  },
});

/** Initiator withdraws an offer they made. */
export const cancelTrade = mutation({
  args: { offerId: v.id("tradeOffers") },
  handler: async (ctx, { offerId }) => {
    const offer = await ctx.db.get(offerId);
    if (!offer) return;
    const me = await requireAlivePlayer(ctx, offer.gameId);
    if (offer.fromPlayerId !== me._id) throw new Error("Not your offer");
    await ctx.db.delete(offerId);
  },
});

/** Offers involving the caller this period (incoming + outgoing). */
export const getMyTradeOffers = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx);
    const empty = { incoming: [] as Doc<"tradeOffers">[], outgoing: [] as Doc<"tradeOffers">[] };
    if (!userId) return empty;
    const me = await ctx.db
      .query("players")
      .withIndex("by_game_user", (q) => q.eq("gameId", gameId).eq("userId", userId))
      .unique();
    if (!me) return empty;
    const game = await ctx.db.get(gameId);
    const period = game?.periodNumber ?? 0;
    const incoming = await ctx.db
      .query("tradeOffers")
      .withIndex("by_to_player_period", (q) => q.eq("toPlayerId", me._id).eq("periodNumber", period))
      .collect();
    const outgoing = await ctx.db
      .query("tradeOffers")
      .withIndex("by_from_player_period", (q) => q.eq("fromPlayerId", me._id).eq("periodNumber", period))
      .collect();
    return { incoming, outgoing };
  },
});
