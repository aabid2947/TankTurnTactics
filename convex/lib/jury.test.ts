import { describe, expect, it } from "vitest";
import { tallyJury } from "./jury";

describe("tallyJury", () => {
  it("returns the clear winner", () => {
    expect(
      tallyJury([
        { effect: "haunt", targetId: "A" },
        { effect: "haunt", targetId: "A" },
        { effect: "gift", targetId: "B" },
      ]),
    ).toEqual({ effect: "haunt", targetId: "A" });
  });

  it("returns null on a tie", () => {
    expect(
      tallyJury([
        { effect: "haunt", targetId: "A" },
        { effect: "gift", targetId: "B" },
      ]),
    ).toBeNull();
  });

  it("returns null with no ballots", () => {
    expect(tallyJury([])).toBeNull();
  });

  it("treats (effect, target) as the unit — haunt A and gift A are different options", () => {
    expect(
      tallyJury([
        { effect: "haunt", targetId: "A" },
        { effect: "gift", targetId: "A" },
        { effect: "gift", targetId: "A" },
      ]),
    ).toEqual({ effect: "gift", targetId: "A" });
  });
});
