/**
 * Pure engine types (Implementation.md §3.5/§6). No Convex or IO imports — this module is
 * backend-agnostic and unit-tested in isolation.
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
  ap: number;
  range: number; // Chebyshev radius
  /** Combat kills — tiebreak for final placement & player stats. */
  kills: number;
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
  heartSpawns: Cell[];
  /** Alternating-edge counter for board shrink. */
  shrinkStep: number;
  apPerGrant: number;
}

/** One queued action. `lockedAt` is the lock-in timestamp used for contention tiebreaks. */
export type QueuedAction =
  | { kind: "heal"; lockedAt: number }
  | { kind: "upgrade"; lockedAt: number }
  | { kind: "collect"; lockedAt: number }
  // A pre-accepted trade (the offer/acceptance handshake is resolved by the backend before the
  // engine runs). `give*` flow initiator→partner, `receive*` flow partner→initiator.
  | {
      kind: "trade";
      lockedAt: number;
      partnerId: string;
      giveAp: number;
      giveHearts: number;
      receiveAp: number;
      receiveHearts: number;
    }
  // One-way: heal an ally (≤3) or revive a dead body (→ 1 heart, 0 AP, range 1). Giver loses 1 heart.
  | { kind: "give"; lockedAt: number; targetId: string }
  | { kind: "move"; lockedAt: number; to: Cell }
  | { kind: "shoot"; lockedAt: number; target: Cell };

/** Per-player ordered action lists for the period, keyed by tank id. */
export type Queues = Record<string, QueuedAction[]>;

/** Pre-tallied jury outcome the backend passes in when a vote is due. */
export interface JuryResult {
  effect: "haunt" | "gift";
  targetId: string;
}

export interface ResolveOptions {
  /** Required if `spawnHeart` is true — picks the spawn cell deterministically. */
  rng?: () => number;
  /** The scheduler sets this true when a heart is due this period. */
  spawnHeart?: boolean;
  /** The scheduler passes a tallied jury outcome when a vote is due. */
  juryResult?: JuryResult | null;
  /** AP granted by a jury "gift" (default 1). */
  giftAp?: number;
}

export type GameEvent =
  | { type: "heal"; tankId: string }
  | { type: "upgrade"; tankId: string; range: number }
  | { type: "collect"; tankId: string; amount: number }
  | { type: "trade"; tankId: string; partnerId: string }
  | { type: "give"; tankId: string; targetId: string; revived: boolean }
  | { type: "move"; tankId: string; from: Cell; to: Cell }
  | { type: "bounce"; tankId: string; at: Cell; attempted: Cell }
  | { type: "heartPickup"; tankId: string; at: Cell }
  | { type: "shoot"; tankId: string; target: Cell; hit: boolean }
  | { type: "death"; tankId: string; at: Cell; cache: number; cause: "combat" | "shrink"; killerId?: string }
  | { type: "shrink"; width: number; height: number; originX: number; originY: number }
  | { type: "heartSpawn"; at: Cell }
  | { type: "jury"; effect: "haunt" | "gift"; targetId: string }
  | { type: "apGrant"; tankId: string; amount: number }
  | { type: "skip"; tankId: string; reason: string };

export interface ResolveResult {
  state: EngineState;
  events: GameEvent[];
  /** Tank ids that died during this resolution (combat + shrink). */
  deaths: string[];
  /** True once ≤3 tanks remain alive (endgame). */
  gameOver: boolean;
  /** Ids of tanks still alive after resolution. */
  alive: string[];
}
