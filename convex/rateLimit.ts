import type { MutationCtx } from "./_generated/server";
import { decideRateLimit } from "./lib/rateLimit";

/**
 * Throw if `key` has exceeded `max` events per `windowMs`; otherwise record the event. Backed by the
 * `rateLimits` table. `key` namespaces the limit + subject, e.g. `chat:<playerId>` (Stage 6).
 */
export async function enforceRateLimit(
  ctx: MutationCtx,
  key: string,
  max: number,
  windowMs: number,
  message = "You're doing that too fast — give it a moment.",
): Promise<void> {
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  const { allowed, next } = decideRateLimit(
    existing ? { count: existing.count, windowStart: existing.windowStart } : null,
    Date.now(),
    max,
    windowMs,
  );
  if (!allowed) throw new Error(message);
  if (existing) await ctx.db.patch(existing._id, next);
  else await ctx.db.insert("rateLimits", { key, ...next });
}
