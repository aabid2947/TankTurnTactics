import { describe, expect, it } from "vitest";
import { decideRateLimit } from "./rateLimit";

describe("decideRateLimit", () => {
  it("allows the first event and opens a window", () => {
    expect(decideRateLimit(null, 1000, 3, 10_000)).toEqual({
      allowed: true,
      next: { count: 1, windowStart: 1000 },
    });
  });

  it("allows up to max within the window", () => {
    expect(decideRateLimit({ count: 2, windowStart: 1000 }, 5000, 3, 10_000)).toEqual({
      allowed: true,
      next: { count: 3, windowStart: 1000 },
    });
  });

  it("denies once max is reached, leaving state unchanged", () => {
    const d = decideRateLimit({ count: 3, windowStart: 1000 }, 5000, 3, 10_000);
    expect(d.allowed).toBe(false);
    expect(d.next).toEqual({ count: 3, windowStart: 1000 });
  });

  it("resets after the window elapses", () => {
    expect(decideRateLimit({ count: 3, windowStart: 1000 }, 11_000, 3, 10_000)).toEqual({
      allowed: true,
      next: { count: 1, windowStart: 11_000 },
    });
  });
});
