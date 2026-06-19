/**
 * Final-placement ranking (Implementation.md §3.13 / §3.18). Pure & unit-tested — no Convex/IO,
 * so it stays portable and deterministic like the engine.
 *
 * Survivors (still alive at game end) outrank everyone, ordered by the final-3 tiebreak:
 *   hearts ↓ → kills ↓ → ap ↓ → spawnOrder ↑ (earlier spawn wins).
 * Eliminated players follow, ordered by elimination recency:
 *   deathOrder ↓ (later death = higher placement) → kills ↓ → spawnOrder ↑.
 */
export interface RankInput {
  id: string;
  status: "alive" | "dead";
  hearts: number;
  kills: number;
  ap: number;
  spawnOrder: number;
  /** Global elimination counter; undefined for players who never died. */
  deathOrder?: number;
}

/** Returns player ids in final placement order (1st → last). Caller assigns placement = index + 1. */
export function computeFinalPlacements(players: RankInput[]): string[] {
  const survivors = players.filter((p) => p.status === "alive");
  const eliminated = players.filter((p) => p.status !== "alive");

  survivors.sort(
    (a, b) => b.hearts - a.hearts || b.kills - a.kills || b.ap - a.ap || a.spawnOrder - b.spawnOrder,
  );
  eliminated.sort(
    (a, b) =>
      (b.deathOrder ?? 0) - (a.deathOrder ?? 0) || b.kills - a.kills || a.spawnOrder - b.spawnOrder,
  );

  return [...survivors, ...eliminated].map((p) => p.id);
}
