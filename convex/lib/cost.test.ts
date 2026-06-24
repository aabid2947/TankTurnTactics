import { describe, expect, it } from "vitest";
import { moveCost, queueCost, upgradeCost } from "./cost";

describe("moveCost", () => {
  it("is 1 for the first move, then the primes (1, 2, 3, 5, 7, 11, 13)", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(moveCost)).toEqual([1, 2, 3, 5, 7, 11, 13]);
  });
});

describe("queueCost", () => {
  it("sums flat costs (shoot/collect = 1, heal = 3)", () => {
    expect(queueCost(["shoot", "collect"], 1)).toBe(2);
    expect(queueCost(["heal"], 1)).toBe(3);
  });

  it("escalates the n-th move along the prime ladder within a period", () => {
    expect(queueCost(["move"], 1)).toBe(1);
    expect(queueCost(["move", "move"], 1)).toBe(3); // 1 + 2
    expect(queueCost(["move", "move", "move"], 1)).toBe(6); // 1 + 2 + 3
    expect(queueCost(["move", "move", "move", "move"], 1)).toBe(11); // + 5
    expect(queueCost(["move", "move", "move", "move", "move"], 1)).toBe(18); // + 7
    // the ladder counts moves by position, even when other actions sit between them
    expect(queueCost(["move", "shoot", "move"], 1)).toBe(4); // 1 + 1 + 2
  });

  it("escalates upgrade cost along the prime ladder (2, 3, 5, 7, 11)", () => {
    expect([1, 2, 3, 4, 5].map(upgradeCost)).toEqual([2, 3, 5, 7, 11]);
    // from range 1: 1→2 costs 2 (1st prime), 2→3 costs 3, 3→4 costs 5
    expect(queueCost(["upgrade", "upgrade"], 1)).toBe(5); // 2 + 3
    expect(queueCost(["upgrade", "upgrade", "upgrade"], 1)).toBe(10); // 2 + 3 + 5
    // from range 3: 3→4 costs the 3rd prime = 5 (was 4 under the old linear rule)
    expect(queueCost(["upgrade"], 3)).toBe(5);
  });

  it("mixes the scaling upgrade + move ladders with flat actions in order", () => {
    // move#1(1) + upgrade 1→2(2) + move#2(2) + upgrade 2→3(3) = 8
    expect(queueCost(["move", "upgrade", "move", "upgrade"], 1)).toBe(8);
  });

  it("treats transfers as free (0 AP)", () => {
    expect(queueCost(["give", "trade", "move"], 1)).toBe(1);
  });
});
