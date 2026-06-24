import { describe, expect, it } from "vitest";
import { resolvePeriod } from "./resolve";
import type { EngineState, EngineTank, Queues } from "./types";

function tank(id: string, x: number, y: number, over: Partial<EngineTank> = {}): EngineTank {
  return { id, x, y, hearts: 3, ap: 5, range: 1, kills: 0, status: "alive", ...over };
}
function mkState(tanks: EngineTank[], over: Partial<EngineState> = {}): EngineState {
  // apPerGrant defaults to 0 so AP assertions reflect spends, not the end-of-period grant.
  return { width: 10, height: 10, originX: 0, originY: 0, tanks, caches: [], heartSpawns: [], shrinkStep: 0, apPerGrant: 0, ...over };
}
const get = (s: EngineState, id: string): EngineTank => {
  const t = s.tanks.find((x) => x.id === id);
  if (!t) throw new Error(`no tank ${id}`);
  return t;
};

describe("resolvePeriod — slot/priority core", () => {
  it("a move dodges a same-slot shot (move bucket resolves before shoot)", () => {
    const queues: Queues = {
      A: [{ kind: "shoot", lockedAt: 1, target: { x: 1, y: 0 } }],
      B: [{ kind: "move", lockedAt: 1, to: { x: 1, y: 1 } }],
    };
    const { state } = resolvePeriod(mkState([tank("A", 0, 0, { range: 2 }), tank("B", 1, 0, { hearts: 1 })]), queues);
    expect(get(state, "B").status).toBe("alive");
    expect(get(state, "B")).toMatchObject({ x: 1, y: 1 });
  });

  it("heal resolves before shoot in the same slot", () => {
    const queues: Queues = {
      A: [{ kind: "heal", lockedAt: 1 }],
      B: [{ kind: "shoot", lockedAt: 1, target: { x: 0, y: 0 } }],
    };
    const { state } = resolvePeriod(mkState([tank("A", 0, 0, { hearts: 1 }), tank("B", 1, 0)]), queues);
    expect(get(state, "A").hearts).toBe(1); // 1 +1 heal −1 shot
    expect(get(state, "A").status).toBe("alive");
  });
});

describe("resolvePeriod — movement", () => {
  it("contested cell: earlier lock-in wins, the other bounces (AP still spent)", () => {
    const queues: Queues = {
      A: [{ kind: "move", lockedAt: 1, to: { x: 1, y: 0 } }],
      B: [{ kind: "move", lockedAt: 2, to: { x: 1, y: 0 } }],
    };
    const { state } = resolvePeriod(mkState([tank("A", 0, 0), tank("B", 2, 0)]), queues);
    expect(get(state, "A")).toMatchObject({ x: 1, y: 0 });
    expect(get(state, "B")).toMatchObject({ x: 2, y: 0 });
    expect(get(state, "B").ap).toBe(4); // bounce still costs 1
  });

  it("trains move in lock-in order (follower enters the vacated cell)", () => {
    const queues: Queues = {
      B: [{ kind: "move", lockedAt: 1, to: { x: 2, y: 0 } }],
      A: [{ kind: "move", lockedAt: 2, to: { x: 1, y: 0 } }],
    };
    const { state } = resolvePeriod(mkState([tank("A", 0, 0), tank("B", 1, 0)]), queues);
    expect(get(state, "B")).toMatchObject({ x: 2, y: 0 });
    expect(get(state, "A")).toMatchObject({ x: 1, y: 0 });
  });

  it("two tanks cannot swap cells (both bounce)", () => {
    const queues: Queues = {
      A: [{ kind: "move", lockedAt: 1, to: { x: 1, y: 0 } }],
      B: [{ kind: "move", lockedAt: 2, to: { x: 0, y: 0 } }],
    };
    const { state } = resolvePeriod(mkState([tank("A", 0, 0), tank("B", 1, 0)]), queues);
    expect(get(state, "A")).toMatchObject({ x: 0, y: 0 });
    expect(get(state, "B")).toMatchObject({ x: 1, y: 0 });
  });

  it("out-of-bounds move bounces and still spends AP", () => {
    const { state } = resolvePeriod(mkState([tank("A", 0, 0)]), {
      A: [{ kind: "move", lockedAt: 1, to: { x: -1, y: 0 } }],
    });
    expect(get(state, "A")).toMatchObject({ x: 0, y: 0, ap: 4 });
  });

  it("the n-th move of a period costs the escalating ladder 1, 2, 3, 5, …", () => {
    // three moves in a line (separate slots): 1 + 2 + 3 = 6 AP from 10 → 4 left.
    const queues: Queues = {
      A: [
        { kind: "move", lockedAt: 1, to: { x: 1, y: 0 } },
        { kind: "move", lockedAt: 1, to: { x: 2, y: 0 } },
        { kind: "move", lockedAt: 1, to: { x: 3, y: 0 } },
      ],
    };
    const { state } = resolvePeriod(mkState([tank("A", 0, 0, { ap: 10 })]), queues);
    expect(get(state, "A")).toMatchObject({ x: 3, y: 0, ap: 4 });
  });

  it("a bounced move is charged its current rung but does NOT advance the ladder", () => {
    // move#1 ok (rung 1 = 1); move#2 bounces off B (charged rung 2 = 2, no advance); the next
    // move is rung 2 again and succeeds (2). Total 1 + 2 + 2 = 5 from 10 → 5 left.
    const queues: Queues = {
      A: [
        { kind: "move", lockedAt: 1, to: { x: 1, y: 0 } },
        { kind: "move", lockedAt: 1, to: { x: 2, y: 0 } }, // blocked by B → bounce
        { kind: "move", lockedAt: 1, to: { x: 1, y: 1 } },
      ],
    };
    const { state } = resolvePeriod(mkState([tank("A", 0, 0, { ap: 10 }), tank("B", 2, 0, { hearts: 3 })]), queues);
    expect(get(state, "A")).toMatchObject({ x: 1, y: 1, ap: 5 });
  });
});

describe("resolvePeriod — combat & death", () => {
  it("simultaneous shots can kill mutually", () => {
    const queues: Queues = {
      A: [{ kind: "shoot", lockedAt: 1, target: { x: 1, y: 0 } }],
      B: [{ kind: "shoot", lockedAt: 1, target: { x: 0, y: 0 } }],
    };
    const { state, deaths } = resolvePeriod(mkState([tank("A", 0, 0, { hearts: 1 }), tank("B", 1, 0, { hearts: 1 })]), queues);
    expect(get(state, "A").status).toBe("dead");
    expect(get(state, "B").status).toBe("dead");
    expect([...deaths].sort()).toEqual(["A", "B"]);
  });

  it("out-of-range shots miss (AP still spent)", () => {
    const { state } = resolvePeriod(mkState([tank("A", 0, 0, { range: 1 }), tank("B", 3, 0, { hearts: 2 })]), {
      A: [{ kind: "shoot", lockedAt: 1, target: { x: 3, y: 0 } }],
    });
    expect(get(state, "B").hearts).toBe(2);
    expect(get(state, "A").ap).toBe(4);
  });

  it("a landed shot records the victim id on the shoot event (for the history log)", () => {
    const { events } = resolvePeriod(mkState([tank("A", 0, 0, { range: 1 }), tank("B", 1, 0, { hearts: 2 })]), {
      A: [{ kind: "shoot", lockedAt: 1, target: { x: 1, y: 0 } }],
    });
    const shot = events.find((e) => e.type === "shoot");
    expect(shot).toMatchObject({ type: "shoot", tankId: "A", hit: true, victimId: "B" });
  });

  it("a killed tank drops its AP as a cache; remaining queued actions are cancelled", () => {
    // Centered so the end-of-period shrink (one death) doesn't reclaim the cache's cell.
    const queues: Queues = {
      A: [
        { kind: "move", lockedAt: 1, to: { x: 5, y: 6 } },
        { kind: "move", lockedAt: 1, to: { x: 5, y: 7 } }, // cancelled — A is dead
      ],
      B: [{ kind: "shoot", lockedAt: 1, target: { x: 5, y: 6 } }],
    };
    const { state, deaths } = resolvePeriod(mkState([tank("A", 5, 5, { hearts: 1, ap: 7 }), tank("B", 6, 5)]), queues);
    expect(deaths).toContain("A");
    expect(get(state, "A")).toMatchObject({ status: "dead", x: 5, y: 6 });
    expect(state.caches).toContainEqual({ x: 5, y: 6, amount: 6 }); // 7 − 1 (move)
  });
});

describe("resolvePeriod — economy", () => {
  it("range upgrades cost the prime ladder; healing caps at 3 hearts", () => {
    const queues: Queues = {
      A: [
        { kind: "upgrade", lockedAt: 1 }, // 1→2 costs 2
        { kind: "upgrade", lockedAt: 2 }, // 2→3 costs 3
        { kind: "heal", lockedAt: 3 }, // at 3 hearts → no-op, no spend
      ],
    };
    const { state } = resolvePeriod(mkState([tank("A", 0, 0, { range: 1, ap: 10, hearts: 3 })]), queues);
    expect(get(state, "A")).toMatchObject({ range: 3, hearts: 3, ap: 5 }); // 10 − 2 − 3
  });

  it("upgrade cost follows the primes at higher range (3→4 costs 5, not 4)", () => {
    const { state } = resolvePeriod(mkState([tank("A", 0, 0, { range: 3, ap: 10 })]), {
      A: [{ kind: "upgrade", lockedAt: 1 }],
    });
    expect(get(state, "A")).toMatchObject({ range: 4, ap: 5 }); // 10 − 5 (3rd prime)
  });

  it("collect grabs the AP cache on the tank's cell", () => {
    const s = mkState([tank("A", 3, 3, { ap: 2 })], { caches: [{ x: 3, y: 3, amount: 5 }] });
    const { state } = resolvePeriod(s, { A: [{ kind: "collect", lockedAt: 1 }] });
    expect(get(state, "A").ap).toBe(6); // 2 − 1 + 5
    expect(state.caches).toHaveLength(0);
  });

  it("grants AP to living tanks; a haunted tank skips one grant then clears", () => {
    const s = mkState([tank("A", 0, 0, { ap: 0 }), tank("B", 5, 5, { ap: 0, hauntedNextGrant: true })], { apPerGrant: 1 });
    const { state } = resolvePeriod(s, {});
    expect(get(state, "A").ap).toBe(1);
    expect(get(state, "B").ap).toBe(0);
    expect(get(state, "B").hauntedNextGrant).toBe(false);
  });
});

describe("resolvePeriod — purity & determinism", () => {
  it("does not mutate the input state", () => {
    const input = mkState([tank("A", 0, 0, { ap: 5 })]);
    const snapshot = structuredClone(input);
    resolvePeriod(input, { A: [{ kind: "move", lockedAt: 1, to: { x: 1, y: 0 } }] });
    expect(input).toEqual(snapshot);
  });

  it("is deterministic: identical inputs yield identical output", () => {
    const build = () => mkState([tank("A", 0, 0), tank("B", 2, 2, { hearts: 1 })]);
    const q: Queues = {
      A: [{ kind: "move", lockedAt: 1, to: { x: 1, y: 0 } }],
      B: [{ kind: "shoot", lockedAt: 1, target: { x: 1, y: 0 } }],
    };
    expect(resolvePeriod(build(), q)).toEqual(resolvePeriod(build(), q));
  });
});
