import { describe, expect, it } from "vitest";
import { resolvePeriod } from "./resolve";
import type { EngineState, EngineTank, Queues } from "./types";

function tank(id: string, x: number, y: number, over: Partial<EngineTank> = {}): EngineTank {
  return { id, x, y, hearts: 3, ap: 5, range: 1, status: "alive", ...over };
}
function mkState(tanks: EngineTank[], over: Partial<EngineState> = {}): EngineState {
  return { width: 10, height: 10, originX: 0, originY: 0, tanks, caches: [], heartSpawns: [], shrinkStep: 0, apPerGrant: 0, ...over };
}
const get = (s: EngineState, id: string): EngineTank => {
  const t = s.tanks.find((x) => x.id === id);
  if (!t) throw new Error(`no tank ${id}`);
  return t;
};

describe("transfers — trade", () => {
  it("executes an in-range, affordable trade (AP and hearts both ways; caps respected)", () => {
    const a = tank("A", 0, 0, { ap: 5, hearts: 2, range: 1 });
    const b = tank("B", 1, 0, { ap: 1, hearts: 3 });
    const q: Queues = {
      A: [{ kind: "trade", lockedAt: 1, partnerId: "B", giveAp: 2, giveHearts: 0, receiveAp: 0, receiveHearts: 1 }],
    };
    const { state } = resolvePeriod(mkState([a, b]), q);
    expect(get(state, "A")).toMatchObject({ ap: 3, hearts: 3 });
    expect(get(state, "B")).toMatchObject({ ap: 3, hearts: 2 });
  });

  it("a trade out of range is a no-op", () => {
    const a = tank("A", 0, 0, { ap: 5, range: 1 });
    const b = tank("B", 5, 0, { ap: 0 });
    const q: Queues = {
      A: [{ kind: "trade", lockedAt: 1, partnerId: "B", giveAp: 2, giveHearts: 0, receiveAp: 0, receiveHearts: 0 }],
    };
    const { state } = resolvePeriod(mkState([a, b]), q);
    expect(get(state, "A").ap).toBe(5);
    expect(get(state, "B").ap).toBe(0);
  });
});

describe("transfers — give & revive", () => {
  it("give-heart heals an ally below 3 (giver loses one)", () => {
    const { state } = resolvePeriod(mkState([tank("A", 0, 0, { hearts: 3 }), tank("B", 1, 0, { hearts: 1 })]), {
      A: [{ kind: "give", lockedAt: 1, targetId: "B" }],
    });
    expect(get(state, "A").hearts).toBe(2);
    expect(get(state, "B").hearts).toBe(2);
  });

  it("give-heart to a full-hearts ally is a no-op", () => {
    const { state } = resolvePeriod(mkState([tank("A", 0, 0, { hearts: 3 }), tank("B", 1, 0, { hearts: 3 })]), {
      A: [{ kind: "give", lockedAt: 1, targetId: "B" }],
    });
    expect(get(state, "A").hearts).toBe(3);
    expect(get(state, "B").hearts).toBe(3);
  });

  it("reviving a dead tank returns it to 1 heart / 0 AP / range 1; giver loses a heart", () => {
    const a = tank("A", 0, 0, { hearts: 2, range: 2 });
    const b = tank("B", 1, 0, { status: "dead", hearts: 0, ap: 0, range: 3 });
    const { state } = resolvePeriod(mkState([a, b]), { A: [{ kind: "give", lockedAt: 1, targetId: "B" }] });
    expect(get(state, "B")).toMatchObject({ status: "alive", hearts: 1, ap: 0, range: 1 });
    expect(get(state, "A").hearts).toBe(1);
  });

  it("revival is blocked when a living tank occupies the body's cell (≤1 living per cell)", () => {
    const a = tank("A", 5, 4, { hearts: 2, range: 2 });
    const b = tank("B", 5, 5, { status: "dead", hearts: 0, ap: 0 });
    const c = tank("C", 5, 5, { hearts: 3 }); // a living tank sits on the body's cell
    const { state } = resolvePeriod(mkState([a, b, c]), { A: [{ kind: "give", lockedAt: 1, targetId: "B" }] });
    expect(get(state, "B").status).toBe("dead"); // not revived
    expect(get(state, "A").hearts).toBe(2); // giver kept the heart
    expect(get(state, "C").hearts).toBe(3); // untouched
  });
});

describe("board shrink", () => {
  it("each combat death shrinks the board by a row + column (alternating from top-left)", () => {
    const a = tank("A", 2, 2, { range: 1 });
    const b = tank("B", 3, 2, { hearts: 1 });
    const { state } = resolvePeriod(mkState([a, b]), { A: [{ kind: "shoot", lockedAt: 1, target: { x: 3, y: 2 } }] });
    expect(state).toMatchObject({ originX: 1, originY: 1, width: 9, height: 9, shrinkStep: 1 });
  });

  it("a tank caught in the removed band dies and its AP cache is lost", () => {
    const a = tank("A", 5, 5, { range: 1 });
    const b = tank("B", 5, 6, { hearts: 1 });
    const c = tank("C", 5, 0, { ap: 9 }); // sits on the top row, which the shrink removes
    const { state, deaths } = resolvePeriod(mkState([a, b, c]), { A: [{ kind: "shoot", lockedAt: 1, target: { x: 5, y: 6 } }] });
    expect(get(state, "C").status).toBe("dead");
    expect(deaths).toContain("C");
    expect(state.caches.find((x) => x.x === 5 && x.y === 0)).toBeUndefined();
  });
});

describe("heart spawns", () => {
  it("spawns a heart on an empty cell when due", () => {
    const { state } = resolvePeriod(mkState([tank("A", 0, 0)]), {}, { spawnHeart: true, rng: () => 0 });
    expect(state.heartSpawns).toHaveLength(1);
  });

  it("moving onto a heart spawn picks it up (+1 heart)", () => {
    const s = mkState([tank("A", 0, 0, { hearts: 2 })], { heartSpawns: [{ x: 1, y: 0 }] });
    const { state } = resolvePeriod(s, { A: [{ kind: "move", lockedAt: 1, to: { x: 1, y: 0 } }] });
    expect(get(state, "A").hearts).toBe(3);
    expect(state.heartSpawns).toHaveLength(0);
  });

  it("a full-hearts tank leaves a heart spawn untouched", () => {
    const s = mkState([tank("A", 0, 0, { hearts: 3 })], { heartSpawns: [{ x: 1, y: 0 }] });
    const { state } = resolvePeriod(s, { A: [{ kind: "move", lockedAt: 1, to: { x: 1, y: 0 } }] });
    expect(get(state, "A").hearts).toBe(3);
    expect(state.heartSpawns).toHaveLength(1);
  });
});

describe("jury & win", () => {
  it("haunt flags the next AP grant; gift adds AP", () => {
    const haunt = resolvePeriod(
      mkState([tank("A", 0, 0, { ap: 0 }), tank("B", 5, 5)], { apPerGrant: 1 }),
      {},
      { juryResult: { effect: "haunt", targetId: "A" } },
    );
    expect(get(haunt.state, "A")).toMatchObject({ hauntedNextGrant: true, ap: 1 }); // grant this period, flagged for next

    const gift = resolvePeriod(
      mkState([tank("A", 0, 0), tank("B", 5, 5, { ap: 0 })], { apPerGrant: 1 }),
      {},
      { juryResult: { effect: "gift", targetId: "B" } },
    );
    expect(get(gift.state, "B").ap).toBe(2); // grant 1 + gift 1
  });

  it("reports gameOver only when ≤3 tanks remain alive", () => {
    const three = [tank("A", 0, 0), tank("B", 1, 0), tank("C", 2, 0), tank("D", 3, 0, { status: "dead", hearts: 0 })];
    expect(resolvePeriod(mkState(three), {}).gameOver).toBe(true);
    const four = [tank("A", 0, 0), tank("B", 1, 0), tank("C", 2, 0), tank("D", 3, 0)];
    expect(resolvePeriod(mkState(four), {}).gameOver).toBe(false);
  });
});
