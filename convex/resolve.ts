import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { resolvePeriod as engineResolve } from "./engine";
import type { EngineState, GameEvent, QueuedAction, Queues } from "./engine/types";
import { tallyJury } from "./lib/jury";
import { computeFinalPlacements } from "./lib/ranking";
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
      kills: p.kills,
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

/** Delete the queued actions, trade offers, and jury votes left over for a finished period. */
async function clearPeriodRows(ctx: MutationCtx, gameId: Id<"games">, period: number): Promise<void> {
  const [queued, offers, votes] = await Promise.all([
    ctx.db.query("queuedActions").withIndex("by_game_period", (q) => q.eq("gameId", gameId).eq("periodNumber", period)).collect(),
    ctx.db.query("tradeOffers").withIndex("by_game_period", (q) => q.eq("gameId", gameId).eq("periodNumber", period)).collect(),
    ctx.db.query("juryVotes").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect(),
  ]);
  await Promise.all([...queued, ...offers, ...votes].map((r) => ctx.db.delete(r._id)));
}

/**
 * Endgame negotiation (Implementation.md §3.13/§3.18): if exactly 4 players are alive and they have
 * unanimously accepted a proposed 1→4 ranking, end the game now with that ranking (eliminated players
 * ranked below by death order). Resolves at the period boundary. Returns true if the game was ended.
 */
async function tryFinalizeByVote(
  ctx: MutationCtx,
  game: Doc<"games">,
  players: Doc<"players">[],
  period: number,
): Promise<boolean> {
  const living = players.filter((p) => p.status === "alive");
  if (living.length !== 4) return false;
  const proposal = await ctx.db
    .query("endgameProposals")
    .withIndex("by_game", (q) => q.eq("gameId", game._id))
    .first();
  if (!proposal) return false;

  const livingIds = new Set(living.map((p) => p._id as string));
  const rankingValid =
    proposal.ranking.length === 4 &&
    new Set(proposal.ranking.map((id) => id as string)).size === 4 &&
    proposal.ranking.every((id) => livingIds.has(id as string));
  const unanimous = rankingValid && living.every((p) => proposal.accepts.some((a) => a === p._id));
  if (!unanimous) return false;

  // Placements: 1..4 from the agreed ranking; eliminated players below, ordered by death order.
  const elimOrder = computeFinalPlacements(
    players
      .filter((p) => p.status !== "alive")
      .map((p) => ({
        id: p._id as string,
        status: p.status,
        hearts: p.hearts,
        kills: p.kills,
        ap: p.ap,
        spawnOrder: p.spawnOrder,
        deathOrder: p.deathOrder,
      })),
  );
  await Promise.all(proposal.ranking.map((id, i) => ctx.db.patch(id, { placement: i + 1 })));
  await Promise.all(
    elimOrder.map((id, i) => ctx.db.patch(id as Id<"players">, { placement: proposal.ranking.length + i + 1 })),
  );

  await clearPeriodRows(ctx, game._id, period);
  await ctx.db.delete(proposal._id);
  await ctx.db.patch(game._id, {
    status: "completed",
    endedAt: Date.now(),
    currentPeriodEndsAt: undefined,
    nextResolveId: undefined,
  });
  return true;
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

  // Endgame negotiation takes precedence: a unanimous 4-player ranking ends the game at this buzzer.
  if (await tryFinalizeByVote(ctx, game, players, period)) return;

  const queuedRows = await ctx.db
    .query("queuedActions")
    .withIndex("by_game_period", (q) => q.eq("gameId", gameId).eq("periodNumber", period))
    .collect();
  const queues: Queues = {};
  for (const row of queuedRows) {
    (queues[row.playerId] ??= []).push({ ...row.action, lockedAt: row.lockedAt } as QueuedAction);
  }
  // Inject accepted trades (the handshake) as engine `trade` actions on each initiator.
  const offerRows = await ctx.db
    .query("tradeOffers")
    .withIndex("by_game_period", (q) => q.eq("gameId", gameId).eq("periodNumber", period))
    .collect();
  for (const o of offerRows) {
    if (o.status !== "accepted") continue;
    (queues[o.fromPlayerId] ??= []).push({
      kind: "trade",
      lockedAt: o.acceptedAt ?? o.lockedAt,
      partnerId: o.toPlayerId,
      giveAp: o.giveAp,
      giveHearts: o.giveHearts,
      receiveAp: o.receiveAp,
      receiveHearts: o.receiveHearts,
    } as QueuedAction);
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
  // Only ballots from players still on the jury (dead) count — a juror revived before the tally is dropped.
  const stillDead = new Set(players.filter((p) => p.status === "dead").map((p) => p._id as string));
  const juryResult = voteDue
    ? tallyJury(voteRows.filter((r) => stillDead.has(r.voterId)).map((r) => ({ effect: r.effect, targetId: r.targetId })))
    : null;

  const result = engineResolve(buildEngineState(game, players), queues, {
    spawnHeart,
    rng: makeRng(hashSeed(gameId, period)),
    juryResult,
  });

  const byId = new Map(players.map((p) => [p._id as string, p]));

  // Global deathOrder for tanks eliminated this period (later death ranks higher); cleared on revival.
  let nextDeathOrder = Math.max(0, ...players.map((p) => p.deathOrder ?? 0));
  const newDeathOrder = new Map<string, number>();
  for (const id of result.deaths) newDeathOrder.set(id, (nextDeathOrder += 1));

  await Promise.all(
    result.state.tanks.map((t) => {
      const p = byId.get(t.id);
      if (!p) return Promise.resolve();
      const deathOrder = newDeathOrder.has(t.id)
        ? newDeathOrder.get(t.id)
        : p.status === "dead" && t.status === "alive"
          ? undefined
          : p.deathOrder;
      return ctx.db.patch(p._id, {
        x: t.x,
        y: t.y,
        hearts: t.hearts,
        ap: t.ap,
        range: t.range,
        kills: t.kills,
        status: t.status,
        hauntedNextGrant: t.hauntedNextGrant ?? false,
        deathOrder,
      });
    }),
  );

  await Promise.all(
    result.events.map((event: GameEvent, index: number) =>
      ctx.db.insert("events", { gameId, periodNumber: period, index, event }),
    ),
  );
  await Promise.all(queuedRows.map((row) => ctx.db.delete(row._id)));
  await Promise.all(voteRows.map((row) => ctx.db.delete(row._id)));
  await Promise.all(offerRows.map((row) => ctx.db.delete(row._id)));

  const board = {
    originX: result.state.originX,
    originY: result.state.originY,
    width: result.state.width,
    height: result.state.height,
    shrinkStep: result.state.shrinkStep,
  };

  if (result.gameOver) {
    // Final placements: survivors by tiebreak, eliminated by death order (Implementation.md §3.13).
    const ranked = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();
    const order = computeFinalPlacements(
      ranked.map((p) => ({
        id: p._id as string,
        status: p.status,
        hearts: p.hearts,
        kills: p.kills,
        ap: p.ap,
        spawnOrder: p.spawnOrder,
        deathOrder: p.deathOrder,
      })),
    );
    await Promise.all(order.map((id, i) => ctx.db.patch(id as Id<"players">, { placement: i + 1 })));
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
