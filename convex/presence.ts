import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Mark the caller present in this game (Stage 6 presence). The client calls this on a ~15s interval
 * while viewing a game; "online" is derived as `now - lastSeenAt < threshold`. No-op for non-members
 * (spectators) so it can be called unconditionally — never throws.
 */
export const heartbeat = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const player = await ctx.db
      .query("players")
      .withIndex("by_game_user", (q) => q.eq("gameId", gameId).eq("userId", userId))
      .unique();
    if (player) await ctx.db.patch(player._id, { lastSeenAt: Date.now() });
  },
});
