# Project Memory — loop architecture

Read on demand by `/council`, `/council-deep`, and `/ui-refine` when they run in **this** project, and
**auto-appended** by them via `scripts/loop-memory.mjs` (append-only, timestamped, provenance-tagged,
auto-compacted to the last ~25 entries per section). Newest entries sit at the top of each section. A line
marked `[superseded]` was overridden by a later one. Structured machine state lives alongside this in
`.loop/state.json` (including a `next` target naming the question to research / flow to verify / diff to review,
and a `budget` the metabolism governor reads + writes).

Format: `- [YYYY-MM-DD · organ] summary <!-- id -->`

## Decisions
<!-- Settled calls + the why. Auto-written by /council & /council-deep verdicts. -->

## Standards
- [2026-06-23 · ui-refine] Reference exemplar = design.md + design-reference.jpeg (neo-brutalist tactical-arcade). Stack: React+Vite+TS+Tailwind+shadcn; board is pure DOM CSS-grid (no WebGL, skip A-3D gate) <!-- ffd39e62 -->
<!-- The bar to hold (reference exemplar, stack, targets). Auto-written by /ui-refine. -->

## Lessons
- [2026-06-23 · ui-refine] axe color-contrast flags text that overflows its box or tiny text glyphs even at 12:1 (the 04:12 chip clipped a fixed-square; the text arrow). Fix the layout (auto-width) or swap the glyph for an SVG icon -- don't chase the ratio, find why axe can't read the bg <!-- 12b722bc -->
- [2026-06-23 · ui-refine] Brand violet --primary #8B5CF6 fails WCAG AA for small text (white-on-violet 4.32:1, ink-on-violet 4.35:1, need 4.5). Darkening helps white but hurts ink text -> it is a host design-token decision, do not silently change <!-- ef8c7d8a -->
- [2026-06-23 · ui-refine] Windows: lhci/chrome-launcher crashes cleaning the temp Chrome profile (EBUSY unlink). Workaround: run lighthouse with --chrome-flags=--user-data-dir=<persistent dir>, or run the perf gate in CI (Linux) <!-- 265889cb -->
- [2026-06-23 · ui-refine] Measure perf against the PROD build (vite preview :4173), not the Vite dev server: dev serves unbundled ESM so FCP/LCP run ~2-3s and fail budgets, while the prod build scores 99/100 <!-- 4d040307 -->
<!-- What bit us, so we don't repeat it. Auto-written by /ui-refine, /immune, /eyes. -->
