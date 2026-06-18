/**
 * AP cost model — must mirror the engine (Implementation.md §3.3). Pure & unit-tested so queue
 * affordability validation can't drift from resolution. Upgrade cost scales with range, so cost
 * depends on the order actions are queued.
 */

export type QueuedKind = "heal" | "upgrade" | "collect" | "move" | "shoot" | "trade" | "give";

export function actionCost(kind: QueuedKind, range: number): number {
  switch (kind) {
    case "heal":
      return 3;
    case "upgrade":
      return range + 1; // scaling: cost = the range you reach
    case "collect":
    case "move":
    case "shoot":
      return 1;
    case "trade":
    case "give":
      return 0;
  }
}

/** Total AP cost of an ordered list of action kinds, starting from `startRange`. */
export function queueCost(kinds: QueuedKind[], startRange: number): number {
  let range = startRange;
  let total = 0;
  for (const kind of kinds) {
    total += actionCost(kind, range);
    if (kind === "upgrade") range += 1;
  }
  return total;
}
