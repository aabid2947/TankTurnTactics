/**
 * Seeded PRNG (mulberry32) → a `() => number` in [0, 1). Lets spawn placement (and, later, the
 * engine) run deterministically in tests while production passes `Math.random`.
 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
