import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** The currently authenticated user (or null). Wired into the client in Stage 1. */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});
