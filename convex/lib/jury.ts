/** Jury tally (Implementation.md §3.12). Pure & unit-tested. */

export type JuryEffect = "haunt" | "gift";
export interface JuryBallot {
  effect: JuryEffect;
  targetId: string;
}

/** The single (effect, target) with the most ballots wins; a tie or no ballots → null effect. */
export function tallyJury(ballots: JuryBallot[]): JuryBallot | null {
  if (ballots.length === 0) return null;
  const counts = new Map<string, { ballot: JuryBallot; n: number }>();
  for (const b of ballots) {
    const key = `${b.effect}:${b.targetId}`;
    const entry = counts.get(key) ?? { ballot: b, n: 0 };
    entry.n += 1;
    counts.set(key, entry);
  }
  let best: JuryBallot | null = null;
  let bestN = 0;
  let tied = false;
  for (const { ballot, n } of counts.values()) {
    if (n > bestN) {
      best = ballot;
      bestN = n;
      tied = false;
    } else if (n === bestN) {
      tied = true;
    }
  }
  return tied ? null : best;
}
