import type { GameEvent } from "@convex/engine/types";

export interface EventLabel {
  label: string;
  tone: string;
}

/** Human-readable label + color for a resolution event; null for noise (AP grants, skips). */
export function eventLabel(event: GameEvent, nameOf: (id: string) => string): EventLabel | null {
  switch (event.type) {
    case "move":
      return { label: `${nameOf(event.tankId)} moved`, tone: "text-foreground" };
    case "bounce":
      return { label: `${nameOf(event.tankId)} bumped — move blocked`, tone: "text-muted-foreground" };
    case "shoot":
      return event.hit
        ? { label: `${nameOf(event.tankId)} landed a shot`, tone: "text-destructive" }
        : { label: `${nameOf(event.tankId)} fired — missed`, tone: "text-muted-foreground" };
    case "death":
      return {
        label:
          event.cause === "shrink"
            ? `${nameOf(event.tankId)} was destroyed (board shrink)`
            : event.killerId
              ? `${nameOf(event.killerId)} destroyed ${nameOf(event.tankId)}`
              : `${nameOf(event.tankId)} was destroyed`,
        tone: "text-destructive",
      };
    case "heal":
      return { label: `${nameOf(event.tankId)} healed`, tone: "text-heart" };
    case "upgrade":
      return { label: `${nameOf(event.tankId)} upgraded to range ${event.range}`, tone: "text-primary" };
    case "collect":
      return { label: `${nameOf(event.tankId)} collected ${event.amount} AP`, tone: "text-ap" };
    case "heartPickup":
      return { label: `${nameOf(event.tankId)} grabbed a heart`, tone: "text-heart" };
    case "heartSpawn":
      return { label: "A heart spawned", tone: "text-heart" };
    case "shrink":
      return { label: `The board shrank to ${event.width}×${event.height}`, tone: "text-muted-foreground" };
    case "trade":
      return { label: `${nameOf(event.tankId)} traded with ${nameOf(event.partnerId)}`, tone: "text-accent" };
    case "give":
      return event.revived
        ? { label: `${nameOf(event.tankId)} revived ${nameOf(event.targetId)}`, tone: "text-accent" }
        : { label: `${nameOf(event.tankId)} gave a heart to ${nameOf(event.targetId)}`, tone: "text-accent" };
    case "jury":
      return { label: `Jury ${event.effect === "haunt" ? "haunted" : "gifted"} ${nameOf(event.targetId)}`, tone: "text-haunted" };
    case "apGrant":
    case "skip":
      return null;
    default:
      return null;
  }
}
