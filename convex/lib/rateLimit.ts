/**
 * Pure fixed-window rate-limit decision (Stage 6 anti-abuse). No Convex/IO — the stateful wrapper
 * (`convex/rateLimit.ts`) reads/writes the `rateLimits` table around this, so the math stays testable.
 */
export interface RateState {
  count: number;
  windowStart: number;
}

export interface RateDecision {
  allowed: boolean;
  /** State to persist when allowed; when denied, equals the unchanged previous state. */
  next: RateState;
}

/** Allow up to `max` events per `windowMs`. A missing or expired window resets the count. */
export function decideRateLimit(
  prev: RateState | null,
  now: number,
  max: number,
  windowMs: number,
): RateDecision {
  if (!prev || now - prev.windowStart >= windowMs) {
    return { allowed: true, next: { count: 1, windowStart: now } };
  }
  if (prev.count < max) {
    return { allowed: true, next: { count: prev.count + 1, windowStart: prev.windowStart } };
  }
  return { allowed: false, next: prev };
}
