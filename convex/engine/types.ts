/**
 * Pure engine types (Implementation.md §3.5/§6). No Convex or IO imports — this module is
 * backend-agnostic and unit-tested in isolation.
 *
 * This increment models the core action set: heal · upgrade · collect · move · shoot.
 * Transfers (trade / give-heart-revive) and end-of-period systems (board shrink, heart spawn,
 * jury, win check) land in the next engine increment.
 */

export interface Cell {
  x: number;
  y: number;
}

export type TankStatus = "alive" | "dead";

export interface EngineTank {
  id: string;
  x: number;
  y: number;
  hearts: number; // 0..3
  ap: number; // secret in-game, but the engine is authoritative
  range: number; // Chebyshev radius
  status: TankStatus;
  /** When set, the tank skips its next AP grant (jury haunt), then the flag clears. */
  hauntedNextGrant?: boolean;
}

export interface ApCache {
  x: number;
  y: number;
  amount: number;
}

export interface EngineState {
  /** Playable window: [originX, originX+width) × [originY, originY+height). */
  width: number;
  height: number;
  originX: number;
  originY: number;
  tanks: EngineTank[];
  caches: ApCache[];
  apPerGrant: number;
}

/** One queued action. `lockedAt` is the lock-in timestamp used for contention tiebreaks. */
export type QueuedAction =
  | { kind: "heal"; lockedAt: number }
  | { kind: "upgrade"; lockedAt: number }
  | { kind: "collect"; lockedAt: number }
  | { kind: "move"; lockedAt: number; to: Cell }
  | { kind: "shoot"; lockedAt: number; target: Cell };

/** Per-player ordered action lists for the period, keyed by tank id. */
export type Queues = Record<string, QueuedAction[]>;

export type GameEvent =
  | { type: "heal"; tankId: string }
  | { type: "upgrade"; tankId: string; range: number }
  | { type: "collect"; tankId: string; amount: number }
  | { type: "move"; tankId: string; from: Cell; to: Cell }
  | { type: "bounce"; tankId: string; at: Cell; attempted: Cell }
  | { type: "shoot"; tankId: string; target: Cell; hit: boolean }
  | { type: "death"; tankId: string; at: Cell; cache: number }
  | { type: "apGrant"; tankId: string; amount: number }
  | { type: "skip"; tankId: string; reason: string };

export interface ResolveResult {
  state: EngineState;
  events: GameEvent[];
  /** Tank ids that died during this resolution. */
  deaths: string[];
}
