import { describe, expect, it } from "vitest";
import { notificationForEvent } from "./notify";

const nameOf = (id: string): string => ({ A: "Ada", B: "Bo" })[id] ?? id;

describe("notificationForEvent", () => {
  it("notifies the victim of a combat death, naming the killer", () => {
    const n = notificationForEvent(
      { type: "death", tankId: "B", at: { x: 0, y: 0 }, cache: 0, cause: "combat", killerId: "A" },
      nameOf,
    );
    expect(n).toEqual({ targetTankId: "B", type: "death", body: "You were destroyed by Ada." });
  });

  it("notifies a shrink-death victim with no killer", () => {
    const n = notificationForEvent({ type: "death", tankId: "A", at: { x: 0, y: 0 }, cache: 0, cause: "shrink" }, nameOf);
    expect(n?.targetTankId).toBe("A");
    expect(n?.type).toBe("death");
  });

  it("notifies the revived player", () => {
    const n = notificationForEvent({ type: "give", tankId: "A", targetId: "B", revived: true }, nameOf);
    expect(n).toMatchObject({ targetTankId: "B", type: "revive" });
  });

  it("notifies a jury target", () => {
    const n = notificationForEvent({ type: "jury", effect: "gift", targetId: "A" }, nameOf);
    expect(n).toMatchObject({ targetTankId: "A", type: "jury" });
  });

  it("ignores events that don't target a player", () => {
    expect(notificationForEvent({ type: "move", tankId: "A", from: { x: 0, y: 0 }, to: { x: 1, y: 0 } }, nameOf)).toBeNull();
    expect(notificationForEvent({ type: "apGrant", tankId: "A", amount: 1 }, nameOf)).toBeNull();
  });
});
