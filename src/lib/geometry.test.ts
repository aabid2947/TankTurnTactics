import { describe, expect, it } from "vitest";
import { chebyshev, isAdjacent8, neighbors8, withinRange } from "./geometry";

describe("geometry (Chebyshev metric)", () => {
  it("chebyshev distance is the larger axis delta", () => {
    expect(chebyshev({ x: 0, y: 0 }, { x: 3, y: 1 })).toBe(3);
    expect(chebyshev({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
    expect(chebyshev({ x: 0, y: 0 }, { x: -2, y: 5 })).toBe(5);
  });

  it("range 1 covers exactly the 8 touching squares", () => {
    const center: { x: number; y: number } = { x: 5, y: 5 };
    const ns = neighbors8(center);
    expect(ns).toHaveLength(8);
    expect(ns.every((n) => withinRange(center, n, 1))).toBe(true);
  });

  it("adjacency is Chebyshev distance 1 (diagonals included)", () => {
    expect(isAdjacent8({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(true);
    expect(isAdjacent8({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(true);
    expect(isAdjacent8({ x: 0, y: 0 }, { x: 2, y: 0 })).toBe(false);
    expect(isAdjacent8({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(false);
  });
});
