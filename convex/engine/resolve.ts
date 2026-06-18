import { chebyshev } from "../lib/geometry";
import type {
  Cell,
  EngineState,
  EngineTank,
  GameEvent,
  QueuedAction,
  Queues,
  ResolveResult,
} from "./types";

/**
 * Bucket priority within a slot (Implementation.md §3.5). Transfers (trade/give) will slot
 * between `upgrade` and `collect` in the next increment.
 */
const PRIORITY: QueuedAction["kind"][] = ["heal", "upgrade", "collect", "move", "shoot"];

const HEAL_COST = 3;
const COLLECT_COST = 1;
const MOVE_COST = 1;
const SHOOT_COST = 1;
const MAX_HEARTS = 3;

function cloneState(s: EngineState): EngineState {
  return {
    ...s,
    tanks: s.tanks.map((t) => ({ ...t })),
    caches: s.caches.map((c) => ({ ...c })),
  };
}

/**
 * Resolve one period via the slot-based simultaneous model:
 *  - process everyone's 1st action, then 2nd, …;
 *  - within a slot, bucket by type and run buckets in PRIORITY order;
 *  - moves resolve sequentially by lock-in time (trains work, swaps fail, earlier-lock wins a
 *    contested cell, a bounce still spends AP); shots resolve simultaneously (mutual kills);
 *  - a tank that dies drops all its AP as a cache and its remaining actions are cancelled.
 * Pure & deterministic: same (state, queues) → same result. Input is never mutated.
 */
export function resolvePeriod(input: EngineState, queues: Queues): ResolveResult {
  const state = cloneState(input);
  const events: GameEvent[] = [];
  const deaths: string[] = [];
  const byId = new Map<string, EngineTank>(state.tanks.map((t) => [t.id, t]));

  const inBounds = (c: Cell) =>
    c.x >= state.originX &&
    c.x < state.originX + state.width &&
    c.y >= state.originY &&
    c.y < state.originY + state.height;

  const livingAt = (c: Cell, exceptId?: string): EngineTank | undefined =>
    state.tanks.find(
      (t) => t.status === "alive" && t.id !== exceptId && t.x === c.x && t.y === c.y,
    );

  const registerDeaths = () => {
    for (const t of state.tanks) {
      if (t.status === "alive" && t.hearts <= 0) {
        t.status = "dead";
        t.hearts = 0;
        const amount = t.ap;
        t.ap = 0;
        if (amount > 0) {
          const existing = state.caches.find((c) => c.x === t.x && c.y === t.y);
          if (existing) existing.amount += amount;
          else state.caches.push({ x: t.x, y: t.y, amount });
        }
        deaths.push(t.id);
        events.push({ type: "death", tankId: t.id, at: { x: t.x, y: t.y }, cache: amount });
      }
    }
  };

  const maxLen = Math.max(
    0,
    ...state.tanks.filter((t) => t.status === "alive").map((t) => queues[t.id]?.length ?? 0),
  );

  for (let slot = 0; slot < maxLen; slot++) {
    const slotActions: { tank: EngineTank; action: QueuedAction }[] = [];
    for (const t of state.tanks) {
      if (t.status !== "alive") continue;
      const action = queues[t.id]?.[slot];
      if (action) slotActions.push({ tank: t, action });
    }

    for (const kind of PRIORITY) {
      const bucket = slotActions.filter((sa) => sa.action.kind === kind && sa.tank.status === "alive");

      if (kind === "heal") {
        for (const { tank } of bucket) {
          if (tank.hearts >= MAX_HEARTS) {
            events.push({ type: "skip", tankId: tank.id, reason: "hearts-full" });
          } else if (tank.ap >= HEAL_COST) {
            tank.ap -= HEAL_COST;
            tank.hearts += 1;
            events.push({ type: "heal", tankId: tank.id });
          } else {
            events.push({ type: "skip", tankId: tank.id, reason: "ap" });
          }
        }
      } else if (kind === "upgrade") {
        for (const { tank } of bucket) {
          const cost = tank.range + 1; // scaling: cost = the range you reach
          if (tank.ap >= cost) {
            tank.ap -= cost;
            tank.range += 1;
            events.push({ type: "upgrade", tankId: tank.id, range: tank.range });
          } else {
            events.push({ type: "skip", tankId: tank.id, reason: "ap" });
          }
        }
      } else if (kind === "collect") {
        for (const { tank } of bucket) {
          const cache = state.caches.find((c) => c.x === tank.x && c.y === tank.y);
          if (cache && tank.ap >= COLLECT_COST) {
            tank.ap -= COLLECT_COST;
            tank.ap += cache.amount;
            state.caches = state.caches.filter((c) => c !== cache);
            events.push({ type: "collect", tankId: tank.id, amount: cache.amount });
          } else {
            events.push({ type: "skip", tankId: tank.id, reason: cache ? "ap" : "no-cache" });
          }
        }
      } else if (kind === "move") {
        // Sequential by lock-in time, each checked against the live board.
        const moves = bucket
          .slice()
          .sort((a, b) => a.action.lockedAt - b.action.lockedAt);
        for (const { tank, action } of moves) {
          if (action.kind !== "move") continue;
          if (tank.ap < MOVE_COST) {
            events.push({ type: "skip", tankId: tank.id, reason: "ap" });
            continue;
          }
          tank.ap -= MOVE_COST; // spent even on a bounce
          const from = { x: tank.x, y: tank.y };
          const dest = action.to;
          const legal = inBounds(dest) && chebyshev(from, dest) === 1 && !livingAt(dest, tank.id);
          if (legal) {
            tank.x = dest.x;
            tank.y = dest.y;
            events.push({ type: "move", tankId: tank.id, from, to: dest });
          } else {
            events.push({ type: "bounce", tankId: tank.id, at: from, attempted: dest });
          }
        }
      } else if (kind === "shoot") {
        // Simultaneous: tally hits against current positions, then apply together.
        const hits = new Map<string, number>();
        for (const { tank, action } of bucket) {
          if (action.kind !== "shoot") continue;
          if (tank.ap < SHOOT_COST) {
            events.push({ type: "skip", tankId: tank.id, reason: "ap" });
            continue;
          }
          tank.ap -= SHOOT_COST; // spent even on a miss
          const target = action.target;
          const inReach = inBounds(target) && chebyshev({ x: tank.x, y: tank.y }, target) <= tank.range;
          const victim = inReach ? livingAt(target, tank.id) : undefined;
          events.push({ type: "shoot", tankId: tank.id, target, hit: Boolean(victim) });
          if (victim) hits.set(victim.id, (hits.get(victim.id) ?? 0) + 1);
        }
        for (const [vid, dmg] of hits) {
          const v = byId.get(vid);
          if (v && v.status === "alive") v.hearts -= dmg;
        }
      }
    }

    registerDeaths();
  }

  // End of period: grant AP to living, non-haunted tanks.
  for (const t of state.tanks) {
    if (t.status !== "alive") continue;
    if (t.hauntedNextGrant) {
      t.hauntedNextGrant = false;
      events.push({ type: "skip", tankId: t.id, reason: "haunted-ap-grant" });
    } else {
      t.ap += state.apPerGrant;
      events.push({ type: "apGrant", tankId: t.id, amount: state.apPerGrant });
    }
  }

  return { state, events, deaths };
}
