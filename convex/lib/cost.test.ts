import { describe, expect, it } from "vitest";
import { queueCost } from "./cost";

describe("queueCost", () => {
  it("sums flat costs (move/shoot/collect = 1, heal = 3)", () => {
    expect(queueCost(["move", "move", "shoot"], 1)).toBe(3);
    expect(queueCost(["heal"], 1)).toBe(3);
  });

  it("scales upgrade cost with the range reached", () => {
    // from range 1: 1→2 costs 2, 2→3 costs 3
    expect(queueCost(["upgrade", "upgrade"], 1)).toBe(5);
    // from range 3: 3→4 costs 4
    expect(queueCost(["upgrade"], 3)).toBe(4);
  });

  it("mixes scaling upgrades with flat actions in order", () => {
    // move(1) + upgrade 1→2(2) + move(1) + upgrade 2→3(3) = 7
    expect(queueCost(["move", "upgrade", "move", "upgrade"], 1)).toBe(7);
  });

  it("treats transfers as free (0 AP)", () => {
    expect(queueCost(["give", "trade", "move"], 1)).toBe(1);
  });
});
