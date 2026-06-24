import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names and de-duplicate conflicting Tailwind classes. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Pick the higher-contrast text color (ink vs white) for a solid hex background —
 * keeps monograms on categorical player colors WCAG-legible.
 */
export function bestTextOn(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastInk = (L + 0.05) / 0.05;
  return contrastWhite >= contrastInk ? "#ffffff" : "#141414";
}
