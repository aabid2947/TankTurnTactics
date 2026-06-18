import { query } from "./_generated/server";

/**
 * Stub. Full lobby/lifecycle functions (createGame, joinGame, leaveGame, startGame,
 * getGamePublic, ...) arrive in Stage 1 — see Implementation.md §5.
 */
export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "lobby"))
      .take(50);
  },
});
