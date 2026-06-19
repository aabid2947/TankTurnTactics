import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { type Doc, type Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { configValidator } from "./schema";
import { placeSpawns } from "./lib/spawn";

const DEFAULT_CONFIG = {
  periodSeconds: 600,
  apPerGrant: 1,
  heartSpawnEveryPeriods: 5,
  juryVoteEveryPeriods: 3,
  boardWidth: 20,
  boardHeight: 20,
  minPlayers: 10,
  maxPlayers: 17,
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newCode(): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `TANK-${s}`;
}

/** A player's public projection — never exposes the secret `ap` / `range`. */
function publicPlayer(p: Doc<"players">) {
  return {
    _id: p._id,
    userId: p.userId,
    name: p.name,
    x: p.x,
    y: p.y,
    hearts: p.hearts,
    status: p.status,
    spawnOrder: p.spawnOrder,
    kills: p.kills,
    deathOrder: p.deathOrder,
    placement: p.placement,
  };
}

async function addPlayer(ctx: MutationCtx, game: Doc<"games">, userId: Id<"users">): Promise<Id<"games">> {
  if (game.status !== "lobby") throw new Error("Game has already started");
  const existing = await ctx.db
    .query("players")
    .withIndex("by_game_user", (q) => q.eq("gameId", game._id).eq("userId", userId))
    .unique();
  if (existing) return game._id;

  const players = await ctx.db
    .query("players")
    .withIndex("by_game", (q) => q.eq("gameId", game._id))
    .collect();
  if (players.length >= game.config.maxPlayers) throw new Error("Game is full");

  const user = await ctx.db.get(userId);
  await ctx.db.insert("players", {
    gameId: game._id,
    userId,
    name: user?.name ?? user?.email ?? "Player",
    status: "alive",
    x: -1,
    y: -1,
    hearts: 3,
    ap: 0,
    range: 1,
    kills: 0,
    spawnOrder: -1,
    joinedAt: Date.now(),
  });
  return game._id;
}

// ---------- Queries ----------

export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "lobby"))
      .collect();
    return Promise.all(
      games.map(async (g) => {
        const players = await ctx.db
          .query("players")
          .withIndex("by_game", (q) => q.eq("gameId", g._id))
          .collect();
        return {
          _id: g._id,
          name: g.name,
          code: g.code,
          status: g.status,
          players: players.length,
          maxPlayers: g.config.maxPlayers,
          periodSeconds: g.config.periodSeconds,
        };
      }),
    );
  },
});

/** Public game state — board, config, and players' *public* fields only. */
export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return null;
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", game._id))
      .collect();
    players.sort((a, b) => a.joinedAt - b.joinedAt);
    // Public board state: cache *positions* only — amounts stay hidden until collected (§3.18).
    return {
      ...game,
      caches: (game.caches ?? []).map((c) => ({ x: c.x, y: c.y })),
      players: players.map(publicPlayer),
    };
  },
});

/** The caller's own player record (includes their secret ap/range). */
export const getMyPlayer = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("players")
      .withIndex("by_game_user", (q) => q.eq("gameId", args.gameId).eq("userId", userId))
      .unique();
  },
});

// ---------- Mutations ----------

export const createGame = mutation({
  args: { name: v.string(), config: v.optional(configValidator) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const config = args.config ?? DEFAULT_CONFIG;
    const name = args.name.trim() || "Untitled game";
    const gameId = await ctx.db.insert("games", {
      name,
      code: newCode(),
      status: "lobby",
      createdBy: userId,
      config,
    });
    const game = await ctx.db.get(gameId);
    await addPlayer(ctx, game!, userId);
    return gameId;
  },
});

export const joinGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    return addPlayer(ctx, game, userId);
  },
});

export const joinByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const game = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .unique();
    if (!game) throw new Error("No game with that code");
    return addPlayer(ctx, game, userId);
  },
});

export const leaveGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const game = await ctx.db.get(args.gameId);
    if (!game) return;
    if (game.status !== "lobby") throw new Error("Can't leave a game in progress");
    const player = await ctx.db
      .query("players")
      .withIndex("by_game_user", (q) => q.eq("gameId", args.gameId).eq("userId", userId))
      .unique();
    if (player) await ctx.db.delete(player._id);
  },
});

export const startGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.createdBy !== userId) throw new Error("Only the host can start the game");
    if (game.status !== "lobby") throw new Error("Game already started");

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", game._id))
      .collect();
    if (players.length < game.config.minPlayers) {
      throw new Error(`Need at least ${game.config.minPlayers} players to start`);
    }

    const { boardWidth: w, boardHeight: h } = game.config;
    const spawns = placeSpawns(w, h, players.length, Math.random);
    players.sort((a, b) => a.joinedAt - b.joinedAt);
    await Promise.all(
      players.map((p, i) =>
        ctx.db.patch(p._id, {
          x: spawns[i].x,
          y: spawns[i].y,
          spawnOrder: i,
          status: "alive",
          hearts: 3,
          ap: 0,
          range: 1,
        }),
      ),
    );

    const periodMs = game.config.periodSeconds * 1000;
    const nextResolveId = await ctx.scheduler.runAfter(periodMs, internal.resolve.resolvePeriod, {
      gameId: game._id,
    });
    await ctx.db.patch(game._id, {
      status: "active",
      board: { originX: 0, originY: 0, width: w, height: h, shrinkStep: 0 },
      caches: [],
      heartSpawns: [],
      periodNumber: 0,
      startedAt: Date.now(),
      currentPeriodEndsAt: Date.now() + periodMs,
      nextResolveId,
    });
    return game._id;
  },
});
