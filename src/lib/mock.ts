/**
 * Mock data for the UI demo (no backend). Mirrors the shapes the real Convex queries will return,
 * so screens can be re-pointed at live data later with minimal change.
 */

export const PLAYER_COLORS = [
  "#7C3AED", "#F4D44E", "#9FD356", "#F4524D",
  "#5BAEF0", "#F59E42", "#EC6FB0", "#3FBFA8",
] as const;

export type TankStatus = "alive" | "dead" | "haunted";

export interface Tank {
  id: string;
  name: string;
  monogram: string;
  color: string;
  x: number;
  y: number;
  hearts: number;
  status: TankStatus;
  isYou?: boolean;
  isLeader?: boolean;
}

export const BOARD_SIZE = 14;

export const YOU = {
  name: "CyberNick",
  monogram: "CN",
  color: PLAYER_COLORS[0],
  ap: 7,
  range: 2,
  hearts: 3,
};

export const TANKS: Tank[] = [
  { id: "t1", name: "CyberNick", monogram: "CN", color: PLAYER_COLORS[0], x: 6, y: 7, hearts: 3, status: "alive", isYou: true },
  { id: "t2", name: "Vex", monogram: "VX", color: PLAYER_COLORS[1], x: 8, y: 6, hearts: 2, status: "alive", isLeader: true },
  { id: "t3", name: "Mara", monogram: "MA", color: PLAYER_COLORS[2], x: 4, y: 9, hearts: 3, status: "alive" },
  { id: "t4", name: "Juno", monogram: "JU", color: PLAYER_COLORS[3], x: 9, y: 10, hearts: 1, status: "alive" },
  { id: "t5", name: "Riot", monogram: "RI", color: PLAYER_COLORS[4], x: 3, y: 3, hearts: 2, status: "alive" },
  { id: "t6", name: "Pax", monogram: "PX", color: PLAYER_COLORS[5], x: 11, y: 4, hearts: 0, status: "dead" },
  { id: "t7", name: "Sable", monogram: "SB", color: PLAYER_COLORS[6], x: 7, y: 11, hearts: 1, status: "haunted" },
  { id: "t8", name: "Ozz", monogram: "OZ", color: PLAYER_COLORS[7], x: 10, y: 8, hearts: 2, status: "alive" },
];

export interface ApCache { x: number; y: number; amount: number; }
export const AP_CACHES: ApCache[] = [{ x: 11, y: 4, amount: 5 }];

export interface HeartSpawn { x: number; y: number; }
export const HEART_SPAWN: HeartSpawn = { x: 5, y: 5 };

export type ActionType = "heal" | "upgrade" | "trade" | "collect" | "move" | "shoot";

export interface QueuedAction {
  id: string;
  type: ActionType;
  label: string;
  cost: number;
}
export const QUEUED_ACTIONS: QueuedAction[] = [
  { id: "q1", type: "move", label: "Move → F8", cost: 1 },
  { id: "q2", type: "move", label: "Move → F9", cost: 1 },
  { id: "q3", type: "shoot", label: "Shoot ⌖ I6 · Vex", cost: 1 },
];

export interface ChatMessage {
  id: string;
  author: string;
  monogram: string;
  color: string;
  text: string;
  time: string;
  own?: boolean;
}
export const GLOBAL_CHAT: ChatMessage[] = [
  { id: "g1", author: "Vex", monogram: "VX", color: PLAYER_COLORS[1], text: "truce on the east side?", time: "17:02" },
  { id: "g2", author: "CyberNick", monogram: "CN", color: PLAYER_COLORS[0], text: "for one period. then we talk.", time: "17:03", own: true },
  { id: "g3", author: "Mara", monogram: "MA", color: PLAYER_COLORS[2], text: "Juno's down to 1 heart 👀", time: "17:04" },
  { id: "g4", author: "Riot", monogram: "RI", color: PLAYER_COLORS[4], text: "don't trust Vex", time: "17:05" },
];
export const DM_CHAT: ChatMessage[] = [
  { id: "d1", author: "Vex", monogram: "VX", color: PLAYER_COLORS[1], text: "send 2 AP and I hold fire", time: "17:01" },
  { id: "d2", author: "CyberNick", monogram: "CN", color: PLAYER_COLORS[0], text: "1 AP. final offer.", time: "17:02", own: true },
  { id: "d3", author: "Vex", monogram: "VX", color: PLAYER_COLORS[1], text: "deal.", time: "17:02" },
];

export interface GameSummary {
  id: string;
  code: string;
  name: string;
  status: "lobby" | "active";
  players: number;
  max: number;
  periodLabel: string;
}
export const OPEN_GAMES: GameSummary[] = [
  { id: "g-1", code: "TANK-7F3K", name: "Friday Night Skirmish", status: "lobby", players: 8, max: 17, periodLabel: "10 min periods" },
  { id: "g-2", code: "TANK-9QZ2", name: "Slow Burn", status: "lobby", players: 12, max: 17, periodLabel: "3 hr periods" },
  { id: "g-3", code: "TANK-4M8P", name: "Lunch Blitz", status: "active", players: 6, max: 10, periodLabel: "5 min periods" },
];

export interface MatchRecord {
  id: string;
  name: string;
  date: string;
  placement: number;
  players: number;
  kills: number;
}
export const MATCH_HISTORY: MatchRecord[] = [
  { id: "m1", name: "Friday Night Skirmish", date: "2026-06-12", placement: 1, players: 15, kills: 4 },
  { id: "m2", name: "Slow Burn", date: "2026-06-08", placement: 3, players: 17, kills: 2 },
  { id: "m3", name: "Lunch Blitz", date: "2026-06-05", placement: 7, players: 10, kills: 1 },
  { id: "m4", name: "Office League #4", date: "2026-05-30", placement: 2, players: 12, kills: 5 },
];

export type EventKind = "move" | "shoot" | "death" | "revive" | "heart" | "upgrade" | "jury";
export interface MoveEvent {
  id: string;
  period: number;
  kind: EventKind;
  text: string;
}
export const MOVE_LOG: MoveEvent[] = [
  { id: "e1", period: 12, kind: "shoot", text: "Vex shot G6 — CyberNick −1 heart" },
  { id: "e2", period: 12, kind: "move", text: "Mara moved D9 → D8" },
  { id: "e3", period: 12, kind: "death", text: "Pax destroyed at K4 — AP cache dropped" },
  { id: "e4", period: 11, kind: "heart", text: "Heart spawned at E5" },
  { id: "e5", period: 11, kind: "move", text: "Juno moved I9 → I10" },
  { id: "e6", period: 10, kind: "jury", text: "Jury haunted Sable — skips next AP grant" },
  { id: "e7", period: 10, kind: "revive", text: "Mara revived Ozz at K8 (+1 heart)" },
];

export interface Standing {
  rank: number;
  name: string;
  monogram: string;
  color: string;
  hearts: number;
  kills: number;
}
export const FINAL_STANDINGS: Standing[] = [
  { rank: 1, name: "CyberNick", monogram: "CN", color: PLAYER_COLORS[0], hearts: 3, kills: 4 },
  { rank: 2, name: "Vex", monogram: "VX", color: PLAYER_COLORS[1], hearts: 2, kills: 5 },
  { rank: 3, name: "Mara", monogram: "MA", color: PLAYER_COLORS[2], hearts: 1, kills: 2 },
  { rank: 4, name: "Juno", monogram: "JU", color: PLAYER_COLORS[3], hearts: 0, kills: 1 },
  { rank: 5, name: "Ozz", monogram: "OZ", color: PLAYER_COLORS[7], hearts: 0, kills: 3 },
];
