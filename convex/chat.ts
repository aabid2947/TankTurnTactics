import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";

const MAX_CHAT_LEN = 500;

/** The caller's player record in this game (alive OR dead — eliminated players may still chat). */
async function requireMember(ctx: QueryCtx, gameId: Doc<"games">["_id"]): Promise<Doc<"players">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  const player = await ctx.db
    .query("players")
    .withIndex("by_game_user", (q) => q.eq("gameId", gameId).eq("userId", userId))
    .unique();
  if (!player) throw new Error("You're not in this game");
  return player;
}

/** Canonical DM thread key — sorted pair of player ids, so both directions share one thread. */
function pairKeyOf(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

/** Send a global broadcast or a 1:1 DM. Eliminated players may chat. */
export const sendChat = mutation({
  args: {
    gameId: v.id("games"),
    scope: v.union(v.literal("global"), v.literal("dm")),
    content: v.string(),
    toPlayerId: v.optional(v.id("players")),
  },
  handler: async (ctx, args) => {
    const me = await requireMember(ctx, args.gameId);
    const content = args.content.trim();
    if (!content) throw new Error("Message is empty");
    if (content.length > MAX_CHAT_LEN) throw new Error(`Keep it under ${MAX_CHAT_LEN} characters`);

    if (args.scope === "dm") {
      if (!args.toPlayerId) throw new Error("Pick someone to DM");
      if (args.toPlayerId === me._id) throw new Error("Can't DM yourself");
      const target = await ctx.db.get(args.toPlayerId);
      if (!target || target.gameId !== args.gameId) throw new Error("No such player in this game");
      await ctx.db.insert("chatMessages", {
        gameId: args.gameId,
        scope: "dm",
        fromPlayerId: me._id,
        toPlayerId: args.toPlayerId,
        pairKey: pairKeyOf(me._id as string, args.toPlayerId as string),
        content,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert("chatMessages", {
        gameId: args.gameId,
        scope: "global",
        fromPlayerId: me._id,
        content,
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * The global feed + only the caller's own DMs. Secrecy is enforced here: others' DMs are read
 * server-side for filtering but never returned. Both lists come back oldest-first for rendering.
 */
export const getChat = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx);
    const empty = { global: [] as Doc<"chatMessages">[], dms: [] as Doc<"chatMessages">[] };
    if (!userId) return empty;
    const me = await ctx.db
      .query("players")
      .withIndex("by_game_user", (q) => q.eq("gameId", gameId).eq("userId", userId))
      .unique();
    if (!me) return empty;

    const global = await ctx.db
      .query("chatMessages")
      .withIndex("by_game_scope", (q) => q.eq("gameId", gameId).eq("scope", "global"))
      .order("desc")
      .take(200);
    const recentDms = await ctx.db
      .query("chatMessages")
      .withIndex("by_game_scope", (q) => q.eq("gameId", gameId).eq("scope", "dm"))
      .order("desc")
      .take(500);
    const dms = recentDms.filter((m) => m.fromPlayerId === me._id || m.toPlayerId === me._id);
    return { global: global.reverse(), dms: dms.reverse() };
  },
});
