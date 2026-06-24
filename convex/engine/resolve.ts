import { chebyshev } from "../lib/geometry";
import { moveCost, upgradeCost } from "../lib/cost";
import type {
  Cell,
  EngineState,
  EngineTank,
  GameEvent,
  Queues,
  ResolveOptions,
  ResolveResult,
} from "./types";

/** Phase order within a slot (Implementation.md §3.5). */
const PHASES = ["heal", "upgrade", "transfer", "collect", "move", "shoot"] as const;

const HEAL_COST = 3;
const COLLECT_COST = 1;
const SHOOT_COST = 1;
const MAX_HEARTS = 3;
const BOARD_FLOOR = 3; // never shrink below 3×3

function cloneState(s: EngineState): EngineState {
  return {
    ...s,
    tanks: s.tanks.map((t) => ({ ...t })),
    caches: s.caches.map((c) => ({ ...c })),
    heartSpawns: s.heartSpawns.map((h) => ({ ...h })),
  };
}

/**
 * Resolve one period via the slot-based simultaneous model (Implementation.md §3.5):
 * slot-by-slot, each slot bucketed by type and run in PHASES order; moves resolve sequentially by
 * lock-in time (trains work, swaps fail), the n-th move of a period costs the escalating ladder
 * 1, 2, 3, 5, 7, … (§3.3) and a bounce still spends its rung's AP, shots resolve simultaneously
 * (mutual kills). After the slots: board shrink (per death, alternating edges), AP grant
 * (haunt-aware), heart spawn (if due), jury effect (if any), win check.
 *
 * Pure & deterministic given (state, queues, options); input is never mutated.
 */
export function resolvePeriod(
  input: EngineState,
  queues: Queues,
  options: ResolveOptions = {},
): ResolveResult {
  const state = cloneState(input);
  const events: GameEvent[] = [];
  const deaths: string[] = [];
  const byId = new Map<string, EngineTank>(state.tanks.map((t) => [t.id, t]));
  // Per-period count of each tank's SUCCESSFUL moves, driving the escalating move cost
  // (1, 2, 3, 5, 7, … — Implementation.md §3.3). A bounce is charged but does not advance it.
  const movesMade = new Map<string, number>();

  const inBounds = (c: Cell) =>
    c.x >= state.originX &&
    c.x < state.originX + state.width &&
    c.y >= state.originY &&
    c.y < state.originY + state.height;

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    chebyshev({ x: a.x, y: a.y }, { x: b.x, y: b.y });

  const livingAt = (c: Cell, exceptId?: string): EngineTank | undefined =>
    state.tanks.find(
      (t) => t.status === "alive" && t.id !== exceptId && t.x === c.x && t.y === c.y,
    );

  const skip = (tankId: string, reason: string) => events.push({ type: "skip", tankId, reason });

  // Shooters that hit each victim during the current slot's shoot phase (reset each slot), used to
  // attribute a kill to the earliest lock-in shooter when the victim dies.
  let slotHitters = new Map<string, { shooterId: string; lockedAt: number }[]>();

  const registerCombatDeaths = () => {
    for (const t of state.tanks) {
      if (t.status === "alive" && t.hearts <= 0) {
        t.status = "dead";
        t.hearts = 0;
        const amount = t.ap;
        t.ap = 0;
        // Kill credit: the earliest lock-in shooter that hit this victim this slot (tie → lowest id,
        // for determinism). Total kills stays equal to the number of combat deaths.
        let killerId: string | undefined;
        const hitters = slotHitters.get(t.id);
        if (hitters && hitters.length > 0) {
          const best = hitters.reduce((a, b) =>
            b.lockedAt < a.lockedAt || (b.lockedAt === a.lockedAt && b.shooterId < a.shooterId) ? b : a,
          );
          killerId = best.shooterId;
          const killer = byId.get(killerId);
          if (killer) killer.kills += 1;
        }
        if (amount > 0) {
          const existing = state.caches.find((c) => c.x === t.x && c.y === t.y);
          if (existing) existing.amount += amount;
          else state.caches.push({ x: t.x, y: t.y, amount });
        }
        deaths.push(t.id);
        events.push({ type: "death", tankId: t.id, at: { x: t.x, y: t.y }, cache: amount, cause: "combat", killerId });
      }
    }
  };

  const maxLen = Math.max(
    0,
    ...state.tanks.filter((t) => t.status === "alive").map((t) => queues[t.id]?.length ?? 0),
  );

  for (let slot = 0; slot < maxLen; slot++) {
    slotHitters = new Map();
    const slotActions = state.tanks
      .filter((t) => t.status === "alive" && queues[t.id]?.[slot])
      .map((t) => ({ tank: t, action: queues[t.id]![slot] }));

    for (const phase of PHASES) {
      if (phase === "heal") {
        for (const { tank, action } of slotActions) {
          if (action.kind !== "heal" || tank.status !== "alive") continue;
          if (tank.hearts >= MAX_HEARTS) skip(tank.id, "hearts-full");
          else if (tank.ap < HEAL_COST) skip(tank.id, "ap");
          else {
            tank.ap -= HEAL_COST;
            tank.hearts += 1;
            events.push({ type: "heal", tankId: tank.id });
          }
        }
      } else if (phase === "upgrade") {
        for (const { tank, action } of slotActions) {
          if (action.kind !== "upgrade" || tank.status !== "alive") continue;
          const cost = upgradeCost(tank.range); // cost = the (current range)-th prime: 2, 3, 5, 7, 11, …
          if (tank.ap < cost) skip(tank.id, "ap");
          else {
            tank.ap -= cost;
            tank.range += 1;
            events.push({ type: "upgrade", tankId: tank.id, range: tank.range });
          }
        }
      } else if (phase === "transfer") {
        // trade + give, processed together in lock-in order.
        const transfers = slotActions
          .filter((sa) => (sa.action.kind === "trade" || sa.action.kind === "give") && sa.tank.status === "alive")
          .sort((a, b) => a.action.lockedAt - b.action.lockedAt);
        for (const { tank, action } of transfers) {
          if (tank.status !== "alive") continue;
          if (action.kind === "trade") {
            const partner = byId.get(action.partnerId);
            const tankAfter = tank.hearts - action.giveHearts + action.receiveHearts;
            const partnerAfter = partner ? partner.hearts - action.receiveHearts + action.giveHearts : 0;
            const ok =
              partner !== undefined &&
              partner.status === "alive" &&
              partner.id !== tank.id &&
              dist(tank, partner) <= tank.range &&
              tank.ap >= action.giveAp &&
              tank.hearts >= action.giveHearts &&
              partner.ap >= action.receiveAp &&
              partner.hearts >= action.receiveHearts &&
              tankAfter >= 0 && tankAfter <= MAX_HEARTS &&
              partnerAfter >= 0 && partnerAfter <= MAX_HEARTS;
            if (!ok || !partner) {
              skip(tank.id, "trade-invalid");
              continue;
            }
            tank.ap += action.receiveAp - action.giveAp;
            partner.ap += action.giveAp - action.receiveAp;
            tank.hearts = tankAfter;
            partner.hearts = partnerAfter;
            events.push({ type: "trade", tankId: tank.id, partnerId: partner.id });
          } else if (action.kind === "give") {
            const target = byId.get(action.targetId);
            if (
              !target ||
              target.id === tank.id ||
              tank.hearts < 1 ||
              !inBounds({ x: target.x, y: target.y }) ||
              dist(tank, target) > tank.range
            ) {
              skip(tank.id, "give-invalid");
              continue;
            }
            if (target.status === "dead") {
              if (livingAt({ x: target.x, y: target.y })) {
                skip(tank.id, "revive-blocked"); // a living tank occupies the body's cell
                continue;
              }
              target.status = "alive";
              target.hearts = 1;
              target.ap = 0;
              target.range = 1;
              tank.hearts -= 1;
              events.push({ type: "give", tankId: tank.id, targetId: target.id, revived: true });
            } else if (target.hearts < MAX_HEARTS) {
              target.hearts += 1;
              tank.hearts -= 1;
              events.push({ type: "give", tankId: tank.id, targetId: target.id, revived: false });
            } else {
              skip(tank.id, "target-full");
            }
          }
        }
      } else if (phase === "collect") {
        for (const { tank, action } of slotActions) {
          if (action.kind !== "collect" || tank.status !== "alive") continue;
          const cache = state.caches.find((c) => c.x === tank.x && c.y === tank.y);
          if (cache && tank.ap >= COLLECT_COST) {
            tank.ap -= COLLECT_COST;
            tank.ap += cache.amount;
            state.caches = state.caches.filter((c) => c !== cache);
            events.push({ type: "collect", tankId: tank.id, amount: cache.amount });
          } else {
            skip(tank.id, cache ? "ap" : "no-cache");
          }
        }
      } else if (phase === "move") {
        const moves = slotActions
          .filter((sa) => sa.action.kind === "move" && sa.tank.status === "alive")
          .sort((a, b) => a.action.lockedAt - b.action.lockedAt);
        for (const { tank, action } of moves) {
          if (action.kind !== "move") continue;
          const moveStep = (movesMade.get(tank.id) ?? 0) + 1;
          const cost = moveCost(moveStep); // 1, 2, 3, 5, 7, … per period
          if (tank.ap < cost) {
            skip(tank.id, "ap");
            continue;
          }
          tank.ap -= cost; // spent even on a bounce (charged this rung, but a bounce does not advance it)
          const from = { x: tank.x, y: tank.y };
          const dest = action.to;
          if (inBounds(dest) && chebyshev(from, dest) === 1 && !livingAt(dest, tank.id)) {
            tank.x = dest.x;
            tank.y = dest.y;
            movesMade.set(tank.id, moveStep); // advance the move-cost ladder only on a successful move
            events.push({ type: "move", tankId: tank.id, from, to: dest });
            const heart = state.heartSpawns.find((h) => h.x === dest.x && h.y === dest.y);
            if (heart && tank.hearts < MAX_HEARTS) {
              tank.hearts += 1;
              state.heartSpawns = state.heartSpawns.filter((h) => h !== heart);
              events.push({ type: "heartPickup", tankId: tank.id, at: dest });
            }
          } else {
            events.push({ type: "bounce", tankId: tank.id, at: from, attempted: dest });
          }
        }
      } else {
        // shoot — simultaneous: tally then apply.
        const hits = new Map<string, number>();
        for (const { tank, action } of slotActions) {
          if (action.kind !== "shoot" || tank.status !== "alive") continue;
          if (tank.ap < SHOOT_COST) {
            skip(tank.id, "ap");
            continue;
          }
          tank.ap -= SHOOT_COST; // spent even on a miss
          const target = action.target;
          const inReach = inBounds(target) && dist(tank, target) <= tank.range;
          const victim = inReach ? livingAt(target, tank.id) : undefined;
          events.push({ type: "shoot", tankId: tank.id, target, hit: Boolean(victim), victimId: victim?.id });
          if (victim) {
            hits.set(victim.id, (hits.get(victim.id) ?? 0) + 1);
            const list = slotHitters.get(victim.id) ?? [];
            list.push({ shooterId: tank.id, lockedAt: action.lockedAt });
            slotHitters.set(victim.id, list);
          }
        }
        for (const [vid, dmg] of hits) {
          const v = byId.get(vid);
          if (v && v.status === "alive") v.hearts -= dmg;
        }
      }
    }

    registerCombatDeaths();
  }

  // ----- End of period -----

  // Board shrink: one row + column per combat death this period, alternating edges.
  const combatDeaths = deaths.length;
  for (let i = 0; i < combatDeaths; i++) {
    if (state.width <= BOARD_FLOOR || state.height <= BOARD_FLOOR) break;
    if (state.shrinkStep % 2 === 0) {
      state.originX += 1;
      state.originY += 1;
    }
    state.width -= 1;
    state.height -= 1;
    state.shrinkStep += 1;
  }
  if (combatDeaths > 0) {
    for (const t of state.tanks) {
      if (t.status === "alive" && !inBounds({ x: t.x, y: t.y })) {
        t.status = "dead";
        t.hearts = 0;
        t.ap = 0; // cache on a removed cell is lost
        deaths.push(t.id);
        events.push({ type: "death", tankId: t.id, at: { x: t.x, y: t.y }, cache: 0, cause: "shrink" });
      }
    }
    state.caches = state.caches.filter((c) => inBounds({ x: c.x, y: c.y }));
    state.heartSpawns = state.heartSpawns.filter((h) => inBounds({ x: h.x, y: h.y }));
    events.push({ type: "shrink", width: state.width, height: state.height, originX: state.originX, originY: state.originY });
  }

  // AP grant to living, non-haunted tanks.
  for (const t of state.tanks) {
    if (t.status !== "alive") continue;
    if (t.hauntedNextGrant) {
      t.hauntedNextGrant = false;
      skip(t.id, "haunted-ap-grant");
    } else {
      t.ap += state.apPerGrant;
      events.push({ type: "apGrant", tankId: t.id, amount: state.apPerGrant });
    }
  }

  // Heart spawn (if due): random empty in-bounds cell.
  if (options.spawnHeart && options.rng) {
    const empties: Cell[] = [];
    for (let x = state.originX; x < state.originX + state.width; x++) {
      for (let y = state.originY; y < state.originY + state.height; y++) {
        const occupied =
          state.tanks.some((t) => t.x === x && t.y === y) ||
          state.caches.some((c) => c.x === x && c.y === y) ||
          state.heartSpawns.some((h) => h.x === x && h.y === y);
        if (!occupied) empties.push({ x, y });
      }
    }
    if (empties.length > 0) {
      const cell = empties[Math.floor(options.rng() * empties.length)];
      state.heartSpawns.push(cell);
      events.push({ type: "heartSpawn", at: cell });
    }
  }

  // Jury effect (if a vote resolved this period).
  if (options.juryResult) {
    const target = byId.get(options.juryResult.targetId);
    if (target && target.status === "alive") {
      if (options.juryResult.effect === "haunt") target.hauntedNextGrant = true;
      else target.ap += options.giftAp ?? 1;
      events.push({ type: "jury", effect: options.juryResult.effect, targetId: target.id });
    }
  }

  const alive = state.tanks.filter((t) => t.status === "alive").map((t) => t.id);
  return { state, events, deaths, gameOver: alive.length <= 3, alive };
}
