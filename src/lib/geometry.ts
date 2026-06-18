/**
 * Shared board geometry. Tank Turn Tactics uses the **Chebyshev (chessboard) metric** for both
 * movement adjacency and shooting range — range 1 is the 8 touching squares (Implementation.md §3.6).
 * Pure functions only, so they can be reused by the resolver engine and unit-tested in isolation.
 */

export interface Cell {
  x: number;
  y: number;
}

/** Chebyshev distance: the larger of the horizontal and vertical deltas. */
export function chebyshev(a: Cell, b: Cell): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** True when `b` is within `range` (inclusive) of `a` under the Chebyshev metric. */
export function withinRange(a: Cell, b: Cell, range: number): boolean {
  return chebyshev(a, b) <= range;
}

/** The 8 cells orthogonally/diagonally adjacent to `c` (no bounds checking). */
export function neighbors8(c: Cell): Cell[] {
  const out: Cell[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx !== 0 || dy !== 0) out.push({ x: c.x + dx, y: c.y + dy });
    }
  }
  return out;
}

/** True when two cells are 8-directionally adjacent (exactly one move step apart). */
export function isAdjacent8(a: Cell, b: Cell): boolean {
  return chebyshev(a, b) === 1;
}
