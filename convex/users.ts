import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";

/** The currently authenticated user (or null). Wired into the client in Stage 1. */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

/**
 * Derived player stats + match history for the current user. Computed on read from the
 * `players.by_user` index joined to completed games — no materialized counters to keep in sync.
 */
export const myProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const rows = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const games = await Promise.all(rows.map((r) => ctx.db.get(r.gameId)));
    const history = rows
      .map((r, i) => ({ row: r, game: games[i] }))
      .filter((x): x is { row: Doc<"players">; game: Doc<"games"> } => !!x.game && x.game.status === "completed")
      .map((x) => ({
        gameId: x.game._id,
        name: x.game.name,
        placement: x.row.placement ?? null,
        kills: x.row.kills,
        endedAt: x.game.endedAt ?? 0,
      }))
      .sort((a, b) => b.endedAt - a.endedAt);

    const placements = history.map((h) => h.placement).filter((p): p is number => p !== null);
    const stats = {
      gamesPlayed: history.length,
      wins: placements.filter((p) => p <= 3).length,
      kills: history.reduce((sum, h) => sum + h.kills, 0),
      bestPlacement: placements.length ? Math.min(...placements) : null,
    };
    return { stats, history };
  },
});
