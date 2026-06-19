import type { GameEvent } from "../engine/types";

/** A notification addressed to the player a resolution event targets. */
export interface NotifySpec {
  targetTankId: string;
  type: string;
  body: string;
}

/**
 * Pure: map a resolution event to a notification for the player it targets, or null. Used by
 * `resolve.ts` to enqueue in-app notifications (Stage 6). Only events that *happen to you* notify —
 * being destroyed, revived/healed, or hit by a jury outcome.
 */
export function notificationForEvent(event: GameEvent, nameOf: (id: string) => string): NotifySpec | null {
  switch (event.type) {
    case "death":
      if (event.cause === "shrink") {
        return { targetTankId: event.tankId, type: "death", body: "The shrinking board caught you — you were eliminated." };
      }
      return {
        targetTankId: event.tankId,
        type: "death",
        body: event.killerId ? `You were destroyed by ${nameOf(event.killerId)}.` : "You were destroyed.",
      };
    case "give":
      return event.revived
        ? { targetTankId: event.targetId, type: "revive", body: `${nameOf(event.tankId)} revived you — back in with 1 heart.` }
        : { targetTankId: event.targetId, type: "heal", body: `${nameOf(event.tankId)} gave you a heart.` };
    case "jury":
      return event.effect === "haunt"
        ? { targetTankId: event.targetId, type: "jury", body: "The jury haunted you — you'll skip your next AP grant." }
        : { targetTankId: event.targetId, type: "jury", body: "The jury gifted you +1 AP." };
    default:
      return null;
  }
}
