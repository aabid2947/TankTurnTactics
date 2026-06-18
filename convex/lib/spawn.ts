import { chebyshev, type Cell } from "./geometry";

/**
 * Spawn placement (Implementation.md §3.17): place `count` tanks on a width×height board with
 *  - no spawns in the outer 2 rings (inner region x ∈ [2, width-3], y ∈ [2, height-3]); and
 *  - pairwise Chebyshev distance ≥ 2 (≥ 1 empty cell between any two tanks).
 *
 * Rejection sampling with a retry cap; if strict spacing can't be met it relaxes (≥1, then any
 * free cell) so it always returns `count` cells. `rand` is injected for deterministic testing.
 */
export function placeSpawns(width: number, height: number, count: number, rand: () => number): Cell[] {
  const minX = 2;
  const maxX = width - 3;
  const minY = 2;
  const maxY = height - 3;
  const innerW = maxX - minX + 1;
  const innerH = maxY - minY + 1;
  if (innerW <= 0 || innerH <= 0) throw new Error("Board too small for the spawn region");
  if (count > innerW * innerH) throw new Error("Too many players for the spawn region");

  const placed: Cell[] = [];
  const attemptsPerPlayer = 3000;
  const free = (c: Cell) => !placed.some((p) => p.x === c.x && p.y === c.y);
  const spaced = (c: Cell, minDist: number) => placed.every((p) => chebyshev(p, c) >= minDist);

  for (let i = 0; i < count; i++) {
    let chosen: Cell | null = null;
    for (const minDist of [2, 1, 0]) {
      for (let a = 0; a < attemptsPerPlayer && !chosen; a++) {
        const cand: Cell = {
          x: minX + Math.floor(rand() * innerW),
          y: minY + Math.floor(rand() * innerH),
        };
        if (free(cand) && spaced(cand, minDist)) chosen = cand;
      }
      if (chosen) break;
    }
    if (!chosen) throw new Error("Could not place all spawns");
    placed.push(chosen);
  }
  return placed;
}
