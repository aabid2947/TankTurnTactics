import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { resolvePeriod as engineResolve } from "./engine";
import type { EngineState, GameEvent, QueuedAction, Queues } from "./engine/types";
import { tallyJury } from "./lib/jury";
import { makeRng } from "./lib/rng";

function buildEngineState(game: Doc<"games">, players: Doc<"players">[]): EngineState {
  const board = game.board!;
  return {
    width: board.width,
    height: board.height,
    originX: board.originX,
    originY: board.originY,
    shrinkStep: board.shrinkStep,
    apPerGrant: game.config.apPerGrant,
    caches: (game.caches ?? []).map((c) => ({ ...c })),
    heartSpawns: (game.heartSpawns ?? []).map((h) => ({ ...h })),
    tanks: players.map((p) => ({
      id: p._id,
      x: p.x,
      y: p.y,
      hearts: p.hearts,
      ap: p.ap,
      range: p.range,
      status: p.status,
      hauntedNextGrant: p.hauntedNextGrant ?? false,
    })),
  };
}

/** Stable per-(game, period) seed so heart-spawn placement is deterministic & reproducible. */
function hashSeed(gameId: string, period: number): number {
  let h = (2166136261 ^ period) >>> 0;
  for (let i = 0; i < gameId.length; i++) h = Math.imul(h ^ gameId.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Core resolution: run the pure engine, write results back, log events, reschedule the next period. */
async function doResolve(ctx: MutationCtx, gameId: Id<"games">): Promise<void> {
  const game = await ctx.db.get(gameId);
  if (!game || game.status !== "active" || !game.board) return;
  const period = game.periodNumber ?? 0;

  const players = await ctx.db
    .query("players")
    .withIndex("by_game", (q) => q.eq("gameId", gameId))
    .collect();

  const queuedRows = await ctx.db
    .query("queuedActions")
    .withIndex("by_game_period", (q) => q.eq("gameId", gameId).eq("periodNumber", period))
    .collect();
  const queues: Queues = {};
  for (const row of queuedRows) {
    (queues[row.playerId] ??= []).push({ ...row.action, lockedAt: row.lockedAt } as QueuedAction);
  }
  for (const id of Object.keys(queues)) queues[id].sort((a, b) => a.lockedAt - b.lockedAt);

  const heartEvery = game.config.heartSpawnEveryPeriods;
  const spawnHeart = heartEvery > 0 && (period + 1) % heartEvery === 0;

  // Jury vote (if due this period): tally eliminated players' ballots into an outcome the engine applies.
  const juryEvery = game.config.juryVoteEveryPeriods;
  const voteDue = juryEvery > 0 && (period + 1) % juryEvery === 0;
  const voteRows = voteDue
    ? await ctx.db.query("juryVotes").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect()
    : [];
  const juryResult = voteDue
    ? tallyJury(voteRows.map((r) => ({ effect: r.effect, targetId: r.targetId })))
    : null;

  const result = engineResolve(buildEngineState(game, players), queues, {
    spawnHeart,
    rng: makeRng(hashSeed(gameId, period)),
    juryResult,
  });

  const byId = new Map(players.map((p) => [p._id as string, p]));
  await Promise.all(
    result.state.tanks.map((t) => {
      const p = byId.get(t.id);
      return p
        ? ctx.db.patch(p._id, {
            x: t.x,
            y: t.y,
            hearts: t.hearts,
            ap: t.ap,
            range: t.range,
            status: t.status,
            hauntedNextGrant: t.hauntedNextGrant ?? false,
          })
        : Promise.resolve();
    }),
  );

  await Promise.all(
    result.events.map((event: GameEvent, index: number) =>
      ctx.db.insert("events", { gameId, periodNumber: period, index, event }),
    ),
  );
  await Promise.all(queuedRows.map((row) => ctx.db.delete(row._id)));
  await Promise.all(voteRows.map((row) => ctx.db.delete(row._id)));

  const board = {
    originX: result.state.originX,
    originY: result.state.originY,
    width: result.state.width,
    height: result.state.height,
    shrinkStep: result.state.shrinkStep,
  };

  if (result.gameOver) {
    await ctx.db.patch(gameId, {
      status: "completed",
      endedAt: Date.now(),
      board,
      caches: result.state.caches,
      heartSpawns: result.state.heartSpawns,
      periodNumber: period + 1,
      currentPeriodEndsAt: undefined,
      nextResolveId: undefined,
    });
    return;
  }

  const periodMs = game.config.periodSeconds * 1000;
  const nextResolveId = await ctx.scheduler.runAfter(periodMs, internal.resolve.resolvePeriod, { gameId });
  await ctx.db.patch(gameId, {
    board,
    caches: result.state.caches,
    heartSpawns: result.state.heartSpawns,
    periodNumber: period + 1,
    currentPeriodEndsAt: Date.now() + periodMs,
    nextResolveId,
  });
}

/** Scheduled buzzer — fires at the end of each period. */
export const resolvePeriod = internalMutation({
  args: { gameId: v.id("games") },
  handler: (ctx, { gameId }) => doResolve(ctx, gameId),
});

/** Host-only "resolve now" — cancels the pending timer and resolves immediately (great for testing). */
export const forceResolve = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.createdBy !== userId) throw new Error("Only the host can force-resolve");
    if (game.status !== "active") throw new Error("Game is not active");
    if (game.nextResolveId) await ctx.scheduler.cancel(game.nextResolveId);
    await doResolve(ctx, gameId);
  },
});

/** Public resolution history (chess-style move log), oldest first. */
export const getHistory = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return ctx.db
      .query("events")
      .withIndex("by_game_period", (q) => q.eq("gameId", gameId))
      .collect();
  },
});
