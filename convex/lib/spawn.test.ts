import { describe, expect, it } from "vitest";
import { chebyshev } from "./geometry";
import { makeRng } from "./rng";
import { placeSpawns } from "./spawn";

describe("placeSpawns", () => {
  it("places the requested count inside the inner region (excludes the outer 2 rings)", () => {
    const spawns = placeSpawns(20, 20, 17, makeRng(1));
    expect(spawns).toHaveLength(17);
    for (const s of spawns) {
      expect(s.x).toBeGreaterThanOrEqual(2);
      expect(s.x).toBeLessThanOrEqual(17);
      expect(s.y).toBeGreaterThanOrEqual(2);
      expect(s.y).toBeLessThanOrEqual(17);
    }
  });

  it("keeps tanks at Chebyshev distance ≥ 2 when there's room", () => {
    const spawns = placeSpawns(20, 20, 12, makeRng(42));
    for (let i = 0; i < spawns.length; i++) {
      for (let j = i + 1; j < spawns.length; j++) {
        expect(chebyshev(spawns[i], spawns[j])).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("never overlaps two tanks on the same cell", () => {
    const spawns = placeSpawns(20, 20, 17, makeRng(99));
    const keys = new Set(spawns.map((s) => `${s.x},${s.y}`));
    expect(keys.size).toBe(spawns.length);
  });

  it("is deterministic for a given seed", () => {
    expect(placeSpawns(20, 20, 12, makeRng(7))).toEqual(placeSpawns(20, 20, 12, makeRng(7)));
  });
});
