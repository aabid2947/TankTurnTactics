import { describe, expect, it } from "vitest";
import { computeFinalPlacements, type RankInput } from "./ranking";

function p(id: string, over: Partial<RankInput> = {}): RankInput {
  return { id, status: "alive", hearts: 3, kills: 0, ap: 0, spawnOrder: 0, ...over };
}

describe("computeFinalPlacements", () => {
  it("ranks survivors above the eliminated", () => {
    const order = computeFinalPlacements([
      p("dead", { status: "dead", hearts: 0, deathOrder: 1 }),
      p("alive", { status: "alive", hearts: 1 }),
    ]);
    expect(order).toEqual(["alive", "dead"]);
  });

  it("breaks survivor ties by hearts → kills → ap → spawn order", () => {
    const order = computeFinalPlacements([
      p("A", { hearts: 2, kills: 1, ap: 0, spawnOrder: 3 }),
      p("B", { hearts: 3, kills: 0, ap: 0, spawnOrder: 5 }), // most hearts → 1st
      p("C", { hearts: 2, kills: 1, ap: 9, spawnOrder: 4 }), // ties A on hearts+kills, more ap → above A
      p("D", { hearts: 2, kills: 0, ap: 99, spawnOrder: 1 }), // fewer kills than A/C
    ]);
    expect(order).toEqual(["B", "C", "A", "D"]);
  });

  it("uses spawn order as the final survivor tiebreak (earlier spawn wins)", () => {
    const order = computeFinalPlacements([
      p("late", { hearts: 2, kills: 1, ap: 4, spawnOrder: 9 }),
      p("early", { hearts: 2, kills: 1, ap: 4, spawnOrder: 2 }),
    ]);
    expect(order).toEqual(["early", "late"]);
  });

  it("orders the eliminated by death order (later death places higher)", () => {
    const order = computeFinalPlacements([
      p("first-out", { status: "dead", hearts: 0, deathOrder: 1 }),
      p("last-out", { status: "dead", hearts: 0, deathOrder: 3 }),
      p("mid-out", { status: "dead", hearts: 0, deathOrder: 2 }),
    ]);
    expect(order).toEqual(["last-out", "mid-out", "first-out"]);
  });

  it("breaks simultaneous deaths (same deathOrder) by kills then spawn order", () => {
    const order = computeFinalPlacements([
      p("x", { status: "dead", hearts: 0, deathOrder: 2, kills: 0, spawnOrder: 1 }),
      p("y", { status: "dead", hearts: 0, deathOrder: 2, kills: 1, spawnOrder: 7 }), // more kills → higher
    ]);
    expect(order).toEqual(["y", "x"]);
  });
});
