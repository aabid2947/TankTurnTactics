/** A player is "online" if their presence heartbeat (players.lastSeenAt) is recent (Stage 6). */
export const PRESENCE_WINDOW_MS = 30_000;

export function isOnline(lastSeenAt: number | undefined, now: number = Date.now()): boolean {
  return lastSeenAt !== undefined && now - lastSeenAt < PRESENCE_WINDOW_MS;
}
