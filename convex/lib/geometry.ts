/** Pure board geometry shared by backend logic (Chebyshev metric — Implementation.md §3.6). */

export interface Cell {
  x: number;
  y: number;
}

/** Chebyshev (chessboard) distance: the larger of the horizontal and vertical deltas. */
export function chebyshev(a: Cell, b: Cell): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
