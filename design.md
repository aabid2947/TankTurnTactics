# Tank Turn Tactics — Design System

> Derived from the visual reference in **`design-reference.jpeg`** (a CS:GO-themed betting
> dashboard). Style: **neo-brutalist tactical arcade** — bold flat color blocking, heavy ink
> outlines, hard offset shadows, a gridded "arena", circular bordered player tokens, and a
> monospace HUD. Color values below are sampled/normalized from the reference and defined here as
> the **canonical tokens**. Pairs with our existing Tailwind + shadcn setup (`src/index.css`).

---

## 1. North star
A board game that feels like a **tactical terminal crossed with a playful arcade cabinet**:
calm cream canvas so loud colors pop, thick black outlines on everything interactive, chunky
display type for moments of drama, and crisp monospace for the numbers that decide the game
(AP, range, timer, coordinates). Confident, legible, a little irreverent — never sleek/corporate.

## 2. How the reference maps to TTT
| In the reference | In Tank Turn Tactics |
|---|---|
| Gridded arena with players placed around it | The 20×20 **board** with **tanks** on cells |
| Circular bordered avatars w/ badges & numbers | **Tank tokens** (hearts pips, crown=leader, skull=dead, monogram) |
| Green skull / sniper / crosshair / "A" motifs | Death, **shooting**, range, kill-feed iconography |
| Coin-with-leaf tokens | **Action Points (AP)** currency |
| `00:15` timer chip | **Period countdown** |
| Purple-headed "Betting Time!" card + stepper | The **action-queue / action menu** panel |
| Center "44%" pot + "Goal", "Players 4/6" chips | **Game status HUD** (alive count, win progress) |
| Pill filter tags (Inferno / Dust II) | Room / lobby / mode tags |

---

## 3. Color

### 3.1 Brand palette
| Token | Name | Hex | Role |
|---|---|---|---|
| `violet` | Electric Violet | `#8B5CF6` | **Primary** — you/your tank, brand, range, primary CTAs, focus |
| `violet-dark` | Deep Violet | `#6D28D9` | Pressed/active violet, headers on light |
| `lavender` | Lavender | `#C9BCEC` | App backdrop wash (the page behind the cream surfaces) |
| `gold` | Volt Gold | `#F4D44E` | **Secondary** — AP/currency, highlights, "pot", win progress |
| `lime` | Lime Punch | `#9FD356` | **Accent** — alive/positive, valid-move, eco/coin glow |
| `coral` | Coral Red | `#F4524D` | **Danger** — hearts/health, damage, shots, destructive actions |
| `ink` | Ink | `#141414` | Text, the signature 2px outlines, icons |
| `bone` | Bone | `#F5F2EA` | App surface (warm off-white) |
| `paper` | Paper | `#FBFAF6` | Cards / raised surfaces |
| `sand` | Sand | `#ECE7DA` | Muted panels, grid fills, disabled |
| `white` | White | `#FFFFFF` | Token fills, text on violet/coral |

### 3.2 shadcn semantic tokens → drop into `src/index.css`
HSL (shadcn stores colors as bare `H S% L%`). **Replaces the default slate theme we scaffolded.**

**`:root` (light — the canonical theme):**
| Variable | Value | | Variable | Value |
|---|---|---|---|---|
| `--background` | `44 35% 94%` | | `--secondary` | `48 88% 63%` |
| `--foreground` | `0 0% 8%` | | `--secondary-foreground` | `0 0% 8%` |
| `--card` | `45 33% 98%` | | `--accent` | `85 58% 58%` |
| `--card-foreground` | `0 0% 8%` | | `--accent-foreground` | `0 0% 8%` |
| `--popover` | `45 33% 98%` | | `--muted` | `43 31% 89%` |
| `--popover-foreground` | `0 0% 8%` | | `--muted-foreground` | `0 0% 38%` |
| `--primary` | `258 90% 66%` | | `--destructive` | `2 88% 63%` |
| `--primary-foreground` | `0 0% 100%` | | `--destructive-foreground` | `0 0% 100%` |
| `--border` | `0 0% 12%` | | `--input` | `0 0% 12%` |
| `--ring` | `258 90% 66%` | | `--radius` | `0.875rem` |

**`.dark` (keeps the identity on a charcoal canvas):**
| Variable | Value | | Variable | Value |
|---|---|---|---|---|
| `--background` | `240 8% 9%` | | `--secondary` | `48 88% 60%` |
| `--foreground` | `44 35% 94%` | | `--secondary-foreground` | `240 8% 9%` |
| `--card` | `240 7% 12%` | | `--accent` | `85 60% 56%` |
| `--card-foreground` | `44 35% 94%` | | `--accent-foreground` | `240 8% 9%` |
| `--primary` | `258 92% 72%` | | `--muted` | `240 6% 18%` |
| `--primary-foreground` | `240 8% 9%` | | `--muted-foreground` | `44 12% 72%` |
| `--destructive` | `2 85% 62%` | | `--border` | `240 6% 26%` |
| `--destructive-foreground` | `0 0% 100%` | | `--input` | `240 6% 26%` |
| `--ring` | `258 92% 72%` | | | |

> `--border` is near-ink on light (the brutalist outline). On **dark**, high-emphasis elements
> (cards, tokens, buttons) should outline with `--foreground` (cream), not the subtle `--border`.

### 3.3 Game-specific tokens (add to `:root`/`.dark` + Tailwind)
| Token | Light | Meaning / use |
|---|---|---|
| `--heart` | `2 88% 63%` (coral) | Health pips, damage flashes |
| `--ap` | `48 88% 63%` (gold) | AP balance, costs, AP caches |
| `--range` | `258 90% 66%` (violet) | Range overlay (rendered at ~15% alpha) |
| `--alive` | `85 58% 58%` (lime) | Alive state, valid-move cell highlight |
| `--dead` | `0 0% 45%` | Dead bodies (ink outline + desaturated fill) |
| `--haunted` | `262 30% 55%` | Haunted state (muted, "spooky" violet) |
| `--grid-line` | `0 0% 8% / 0.08` | Board grid lines on the board surface |
| `--board` | `45 33% 98%` (paper) | Board surface |

**Player palette** (categorical, for telling tanks apart): `violet #8B5CF6 · gold #F4D44E ·
lime #9FD356 · coral #F4524D · sky #5BAEF0 · orange #F59E42 · pink #EC6FB0 · teal #3FBFA8`.
With up to **17 players, color alone isn't enough** → every token also carries a **monogram/number**
(as in the reference) and identity is read label-first, color-second.

### 3.4 Color usage rules
- **Ink does the structure.** Outlines, text, icons, dividers = ink (`--foreground`). It's what makes the style cohere.
- **Cream is the stage; bright colors are the actors.** Keep large areas bone/paper; deploy violet/gold/lime/coral as deliberate blocks (card headers, the pot, status chips), not everywhere.
- **Color = meaning:** violet=you/range/brand, gold=AP, coral=health/damage, lime=alive/valid, ink=neutral.
- **Never put light text on gold or lime** — always ink. White text is reserved for violet and coral fills.
- **Don't color-code by hue alone** for state — always add an icon/label (skull, crown, "DEAD", heart count).

---

## 4. Typography

### 4.1 Families
- **Display & body — `Space Grotesk`** (geometric grotesk; the chunky headline feel). Weights 400/500/700.
  Optional for the very largest hero only: a heavier display (`Clash Display` / `Archivo` 800).
- **HUD / data / labels — `Space Mono`** (monospace; the "techy terminal" numbers & tags).
- Two-font system: **Space Grotesk + Space Mono** (both free, Google Fonts / `@fontsource`).
  `JetBrains Mono` is an acceptable mono alternative.

### 4.2 Type scale
| Role | Font / weight | Size / line-height | Notes |
|---|---|---|---|
| Hero | Grotesk 700 | 48–64 / 1.02 | tracking −2%; the "Set Your … Game" moment |
| H1 | Grotesk 700 | 36 / 1.1 | |
| H2 | Grotesk 700 | 28 / 1.15 | |
| H3 / card title | Grotesk 600 | 20 / 1.2 | |
| Body | Grotesk 400/500 | 16 / 1.5 | prose, chat messages |
| Body small | Grotesk 400 | 14 / 1.45 | |
| Label / nav / tag | **Mono** 500 | 13 / 1.2 | UPPERCASE, tracking +6% |
| HUD data | **Mono** 500–700 | 14–20 / 1.1 | AP, timer, range, costs, coords — **tabular figures** |
| Caption | **Mono** 400 | 12 / 1.3 | timestamps, hints |
| Button | Grotesk 600 | 14–15 | "instrument" buttons may use Mono 500 |

### 4.3 Usage
- **Drama in Grotesk, data in Mono.** Headlines, chat, and prose use Space Grotesk; anything
  numeric or HUD-like (AP, range, timer, action costs, coordinates, player tags, kill-feed) uses
  Space Mono with tabular figures so digits don't jiggle as they tick.
- Mono labels are short, UPPERCASE, tracked-out. Don't set long paragraphs in mono (hurts chat readability).

---

## 5. Form language (the brutalist signature)
- **Borders:** 2px solid ink on every contained/interactive element (buttons, cards, inputs, tags, tokens). This is non-negotiable for the look.
- **Elevation = hard offset shadow**, no blur: `box-shadow: 3px 3px 0 0 hsl(var(--foreground))`. Larger surfaces may use `4px 4px 0`. No soft/diffuse shadows.
- **Radius:** cards/panels `--radius` (14px); inputs/buttons 10–12px; **pills/tags/avatars fully rounded** (`9999px`). Steppers use circular buttons.
- **Press feedback:** translate `2px,2px` and drop the shadow (the element "presses into" the page).

## 6. Iconography & motifs
- **Icons:** `lucide-react` (already installed) for UI; bold, consistent 2px stroke to match outlines. Game glyphs: **crosshair** (shoot/range), **heart** (health), **coin** (AP), **skull** (death), **crown** (leader), **timer** (period), **arrows** (move).
- **Decorative motifs** (halftone dots, starburst, diagonal stripes, plus-grid, concentric circles) — use **only** in marketing/hero, empty states, and section headers. **Never on the live board** (gameplay legibility wins).

## 7. Layout & spacing
- **8px spacing system** (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64). Comfortable density; let the cream breathe.
- **Sectioning:** thin ink divider rules between regions (as in the reference's header/hero/body splits).
- **In-game three-panel layout:**
  - **Center:** the board (gridded arena, the star of the screen).
  - **Left:** action panel — colored (violet) header + paper body, the action-queue + AP meter + steppers (the "Betting Time!" card analog).
  - **Right:** chat (WhatsApp-style global + 1:1) .
  - **Top / overlay:** HUD — period countdown, alive count, win-progress, your AP/range/hearts chips.
- **Board:** paper surface, faint ink grid lines; cells highlight on hover (violet tint), valid moves (lime tint), range area (violet @15%), target reticle on shoot-hover.

## 8. Components (reference → spec)
- **Buttons:** filled (violet primary / gold secondary / coral destructive) or outline/ghost; 2px ink border + hard shadow; press = translate + shadow drop. Pill or 10–12px radius.
- **Tags / filter pills:** pill, ink border, leading icon-circle, Mono UPPERCASE label.
- **Cards / panels:** paper, 2px ink border, 14px radius, hard shadow; optional colored header band.
- **Player token:** circle, categorical fill, 2px ink border, **monogram/number**; badges — coral heart-pips (×1–3), crown (leader), skull (dead), small AP/► markers; selected = violet ring.
- **Stepper:** Mono value flanked by circular ink-bordered +/− (allocate AP / pick range target / quantities).
- **Progress bar:** pill track, ink border, violet or gold fill (win progress / period elapsed).
- **Inputs:** paper bg, 2px ink border, Mono text, violet focus ring (2px, offset).
- **HUD chips:** Mono data + leading icon (coin=AP, heart, crosshair=range, timer), ink-bordered pills — e.g. `AP 7`, `RNG 2`, `00:15`, `ALIVE 6/17`.
- **Chat bubbles:** own = violet fill / white text; others = paper or gold-tinted / ink text; 2px ink border, Mono timestamp; Global vs DM as pill tabs.

## 9. Motion & interaction
- **Mechanical & snappy:** 120–200ms ease-out for most transitions. Buttons collapse their hard shadow on press.
- **Tokens "stamp"** into a cell on move (quick scale overshoot 1.0→1.06→1.0).
- **Resolution reveal** plays slot-by-slot in priority order (heal→upgrade→trade→collect→move→shoot) as staccato beats; shots flash **coral**; deaths stamp a **skull** and desaturate the token; AP grants pop a gold coin.
- **Countdown** pulses gold→coral in the final 5s.
- Always honor `prefers-reduced-motion` (drop overshoot/pulse; keep instant state changes).

## 10. Accessibility
- **Contrast:** ink-on-cream ≈ 14:1 ✓. White-on-violet ✓ (AA). For text **on gold/lime, use ink only**; treat coral as a fill/accent with ink or white per AA, not for small text on light.
- **Never state-by-color-only:** pair with icon/label (skull, crown, "DEAD", heart count).
- **Identity at 17 players:** monogram + color (+ optional pattern), never color alone.
- **Focus:** always-visible 2px violet focus ring with offset; full keyboard nav for the action queue.
- **Targets:** ≥ 36px (≥44px on touch). Board cells get an adequate hit area even when visually small.
- **Motion/secrecy:** reduced-motion respected; never animate/leak secret info (AP, range, queued actions) to other players.

## 11. Implementing in our stack
Concrete changes (not yet applied — this doc is the spec):
1. **Fonts:** add `@fontsource/space-grotesk` + `@fontsource/space-mono` (or a Google Fonts `<link>` in `index.html`); import in `main.tsx`.
2. **`src/index.css`:** replace `:root`/`.dark` token values with §3.2; add the §3.3 game tokens.
3. **`tailwind.config.ts`:** set `fontFamily` (`sans`/`display` → Space Grotesk, `mono` → Space Mono); add game colors (`heart`, `ap`, `range`, `alive`, `dead`, `haunted`, `grid`) referencing the CSS vars; add `boxShadow.brutal = '3px 3px 0 0 hsl(var(--foreground))'`; default bordered components to 2px.
4. **shadcn:** existing/added components inherit the new tokens automatically (they read the CSS vars). Set base border width on the shared variants.
5. **App backdrop:** page wash = `lavender`; surfaces = `bone`/`paper`.

> These supersede the default slate theme from the Stage 0 scaffold. I can apply them as a short
> follow-up (and wire the fonts) whenever you want — say the word.

## 12. To refine in playtest / with you
- Exact hero display weight (Space Grotesk 700 vs a heavier `Clash Display`).
- Whether chat stays in Grotesk (recommended for readability) or goes full-mono for theme purity.
- Dark mode as default vs light (the reference is light; I've specified both).
- Final categorical player palette ordering for max distinguishability at 17 players.
