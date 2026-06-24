# Reference Standard — the quality bar to MATCH

> Loop B (visual polish) has no machine oracle. **This file is that oracle.** For Tank Turn Tactics the
> bar is already locked in-repo: the neo-brutalist system in **`design.md`**, derived from the visual
> reference **`design-reference.jpeg`** (a CS:GO-themed betting dashboard). Polish work matches *those*,
> not an external site.

## 1. Named exemplar(s)
- **Primary:** `design-reference.jpeg` (in repo root) + its codified system `design.md`.
- Secondary (optional): the existing demo screens on branch `ui-demo` (Home, Create, Results) — already
  on-system; the in-game screen must read as the same product.
- **Why this one:** the look is a deliberate "tactical terminal × arcade cabinet" — calm cream stage so
  loud blocks pop, 2px ink outlines on everything, hard offset shadows (no blur), chunky display type for
  drama and crisp mono for the numbers that decide the game. The bar is *confident, legible, a little
  irreverent — never sleek/corporate.*

## 2. What specifically to match (mark what matters most)
- [x] **Typography** — Space Grotesk (display/body) + Space Mono (HUD data, UPPERCASE, tracked-out,
  tabular figures for AP/range/timer). Drama in Grotesk, data in Mono.
- [x] **Color system** — cream/bone/paper surfaces; ink structure; violet=you/range/brand, gold=AP/secondary,
  lime=alive/valid, coral=health/damage. Color = meaning; never hue-only state (always icon/label too).
- [x] **Spacing & density** — 8px system; comfortable density; let the cream breathe.
- [x] **Layout & rhythm** — board is the star/center; action queue is the violet-headed card; chat to the
  side. In focus mode the board maximizes and the panels become edge drawers.
- [x] **Motion** — mechanical & snappy (120–200ms ease-out); press collapses the hard shadow; respect
  `prefers-reduced-motion` (drop overshoot/pulse).
- [x] **Component feel** — 2px ink border + hard offset shadow on every contained/interactive element;
  cards/panels radius `--radius` (14px); inputs/buttons 10–12px; pills/avatars fully round.

## 3. Product context
- This product is for: `online players of a turn-based, simultaneous-resolution tank battle royale`.
- Tone: `playful-tactical, terminal-meets-arcade`.
- It must NOT look like: `a sleek corporate SaaS dashboard, a soft Material app, or a generic dark gamer UI`.

## 4. Device & surface matrix (where it must hold up)
- Breakpoints in scope: `mobile 375 / tablet 768 / desktop 1440` — plus focus/kiosk mode at each.
- Dark mode required? `yes` (tokens defined in index.css `.dark`)   ·   RTL required? `no`

## 5. Definition of done for polish (this screen)
1. In focus mode the board is the unmistakable hero — largest centered square that fits, never cropped,
   with only a thin mono HUD strip above it.
2. The action queue + chat never dangle below the board; they sit as side rails (desktop) or slide-in edge
   drawers (mobile / focus mode) with the brutalist frame intact.
3. The **Trade** affordance reads as its own intentional, social action (gold, "negotiate in DM"), not one
   of six identical buttons.
4. Every new control carries the 2px ink border + hard shadow, Space Mono labels, and visible focus — it is
   indistinguishable in tier from the existing on-system screens.
5. Reduced-motion is honored; nothing leaks secret info; keyboard reaches every control.
