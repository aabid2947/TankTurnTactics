/**
 * AP cost model — the single source of truth for action costs (Implementation.md §3.3),
 * imported by BOTH the affordability check (convex/actions.ts) and the pure engine
 * (convex/engine/resolve.ts) so resolution and queue-validation can never drift.
 *
 * Two costs escalate along the primes:
 *  - upgrade: the n-th range upgrade costs the n-th prime (n = your current range) — 2, 3, 5, 7,
 *             11, … Range is permanent, so this stacks across the whole game (no per-period reset).
 *  - move:    the n-th move of a period costs 1, then the primes — 1, 2, 3, 5, 7, 11, … The ladder
 *             resets every period; a bounced move is charged the current rung but does NOT advance
 *             it (see the engine), so the all-advance total below is the MAXIMUM a plan can cost —
 *             the safe figure to validate affordability against (a bouncing plan only costs less).
 */

export type QueuedKind = "heal" | "upgrade" | "collect" | "move" | "shoot" | "trade" | "give";

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

/** The n-th prime (1-based): nthPrime(1) = 2, nthPrime(2) = 3, nthPrime(3) = 5, … */
export function nthPrime(n: number): number {
  let found = 0;
  let candidate = 1;
  while (found < n) {
    candidate += 1;
    if (isPrime(candidate)) found += 1;
  }
  return candidate;
}

/**
 * AP cost of the n-th move of a period (1-based): 1, 2, 3, 5, 7, 11, … — the first move costs 1,
 * each later move costs the (n−1)-th prime.
 */
export function moveCost(n: number): number {
  return n <= 1 ? 1 : nthPrime(n - 1);
}

/**
 * AP cost to upgrade range from `currentRange` to currentRange+1: the (currentRange)-th prime, so
 * the upgrade-cost sequence is 2, 3, 5, 7, 11, … (1→2 = 2, 2→3 = 3, 3→4 = 5, …). Range is permanent,
 * so this stacks across the whole game.
 */
export function upgradeCost(currentRange: number): number {
  return nthPrime(currentRange);
}

/** Flat / scaled cost for the non-move actions. Move cost is positional → use moveCost(). */
export function actionCost(kind: Exclude<QueuedKind, "move">, range: number): number {
  switch (kind) {
    case "heal":
      return 3;
    case "upgrade":
      return upgradeCost(range); // n-th prime, n = current range
    case "collect":
    case "shoot":
      return 1;
    case "trade":
    case "give":
      return 0;
  }
}

/**
 * Per-action AP cost of an ordered plan, starting from `startRange`, mirroring resolution order:
 * upgrades raise the running range, and each move advances the per-period move ladder.
 */
export function queueCostBreakdown(kinds: QueuedKind[], startRange: number): number[] {
  let range = startRange;
  let moves = 0;
  return kinds.map((kind) => {
    if (kind === "move") {
      moves += 1;
      return moveCost(moves);
    }
    const c = actionCost(kind, range);
    if (kind === "upgrade") range += 1;
    return c;
  });
}

/** Total AP cost of an ordered list of action kinds, starting from `startRange`. */
export function queueCost(kinds: QueuedKind[], startRange: number): number {
  return queueCostBreakdown(kinds, startRange).reduce((sum, c) => sum + c, 0);
}
