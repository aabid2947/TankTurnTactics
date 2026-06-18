/** Shared helpers for rendering players/tanks (colors, display names, monograms). */

export const PLAYER_COLORS = [
  "#8B5CF6", "#F4D44E", "#9FD356", "#F4524D",
  "#5BAEF0", "#F59E42", "#EC6FB0", "#3FBFA8",
  "#C4B5FD", "#34D399",
] as const;

/** Stable categorical color for a player by index (e.g. spawn order). */
export function colorForIndex(i: number): string {
  const n = PLAYER_COLORS.length;
  return PLAYER_COLORS[((i % n) + n) % n];
}

/** Strip an email down to a friendly handle for display. */
export function displayName(name: string): string {
  return name.includes("@") ? name.split("@")[0] : name;
}

/** 1–2 char monogram for a tank token. */
export function monogram(name: string): string {
  const parts = displayName(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
