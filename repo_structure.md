# Repository Structure

> **Living index of every file and folder in this repo.** Keep it current: whenever you create,
> move, rename, or delete a file/folder — or change what a file *does* — update its entry here in
> the same change (see `CLAUDE.md`, rules 1 & 2). Organize code **by feature**.
>
> Last updated: 2026-06-24 · **branch `ui-demo`** (applies `design.md`; standalone mock UI, no
> Convex wiring — the Convex-wired Stage 0 entry lives on `main`).

## Root — docs & config

```
TankTurnTactics/
├── PRODUCT.md             Player-facing game design & rules (clarified 2026-06-18).
├── Implementation.md      CANONICAL technical blueprint + ruleset (§3) + staged roadmap (§11).
├── CLAUDE.md              Auto-loaded project guide: working rules, locked decisions, phases.
├── design.md              Design system: colors, typography, UI/UX principles (the demo's base).
├── design-reference.jpeg  Visual reference the design system is derived from (neo-brutalist).
├── repo_structure.md      THIS file — living index of the repo.
├── ANSWERS.md             Host's locked Q&A answers that produced the design (historical record).
├── README.md              Setup & run instructions.
├── package.json           Scripts & dependencies (incl. audit:* gates from the UI-refinement kit).
├── index.html             Vite HTML entry; loads Space Grotesk + Space Mono (Google Fonts).
├── vite.config.ts         Vite config: React plugin, `@`→src alias, Vitest (jsdom).
├── tailwind.config.ts     Tailwind theme: Space Grotesk/Mono fonts, brand+game colors, brutal shadows.
├── postcss.config.js      PostCSS: tailwindcss + autoprefixer.
├── eslint.config.js       ESLint flat config (lints src/).
├── tsconfig*.json         TS project references (app + node).
├── components.json        shadcn/ui config.
├── REFERENCE.md           UI-refine Loop B exemplar (visual bar = design.md + design-reference.jpeg).
├── SIGNOFF.md             UI-refine human false-green checklist (visual + a11y + real-device).
├── lighthouserc.json      Lighthouse CI perf budgets — targets http://localhost:5173/game.
├── .pa11yci.json          pa11y-ci a11y config (WCAG2AA) — targets http://localhost:5173/game.
├── 3d-budget.json         3D asset budgets (unused — board is pure DOM, no WebGL).
└── mobile-budget.json     Mobile-audit budgets (UI-refinement kit).
```

## `convex/` — Convex backend (unchanged from `main`; not used by the demo)

```
convex/   schema.ts · auth.ts · auth.config.ts · http.ts · users.ts · games.ts · tsconfig.json
          (full game backend lands in Stage 1 — see Implementation.md §4–§6)
```

## `src/` — React + Vite client (demo)

```
src/
├── main.tsx                     Entry: Router only (no Convex provider) so the demo runs offline.
├── App.tsx                      Demo router: /login /signup + AppShell routes (home, create, …).
├── index.css                    design.md tokens (light/dark) + game tokens + base styles.
├── vite-env.d.ts                Vite client types.
├── lib/
│   ├── utils.ts                 `cn()` className merge.
│   ├── geometry.ts              Chebyshev distance / range / 8-dir adjacency (used by BoardGrid).
│   ├── geometry.test.ts         Geometry unit tests.
│   └── mock.ts                  Demo mock data + shared types (tanks, chat, games, history, …).
├── test/setup.ts                Vitest setup (jest-dom).
├── components/
│   ├── ui/                      Brutalist primitives: button, input, card, badge, stepper, progress.
│   ├── layout/
│   │   ├── AppShell.tsx         Header (logo + nav + theme toggle + avatar) + routed <Outlet/>.
│   │   └── AuthShell.tsx        Centered auth card on lavender backdrop + `Field` helper.
│   └── game/
│       ├── TankToken.tsx        Circular bordered tank token (monogram, hearts, leader/dead/haunted).
│       ├── BoardGrid.tsx        Grid board: tanks, range/move overlays, heart spawn, AP cache. `fill` prop maximizes the square (legend hidden) for focus mode.
│       ├── HudChip.tsx          Mono data chip with icon (AP, range, hearts, timer…).
│       ├── ActionQueuePanel.tsx Violet-headed action queue: AP meter, queue list, AP-action grid + distinct gold "Propose a trade" (opens DM); optional drawer close.
│       ├── ChatPanel.tsx        WhatsApp-style chat (Global / DM tabs, bubbles, composer); controllable tab + optional drawer close.
│       ├── Drawer.tsx           Reusable non-modal edge panel (slide-in, Esc-to-close, focus return) for queue/chat on mobile + focus mode.
│       └── useKiosk.ts          Focus-mode hook: native Fullscreen API + overlay fallback, scroll lock, auto-exit on Esc.
└── screens/
    ├── DemoIndex.tsx            Catalog linking to every demo screen.
    ├── LoginScreen.tsx          Email + password sign-in.
    ├── SignupScreen.tsx         Account creation.
    ├── HomeScreen.tsx           Lobby: open games, join-by-code, stats.
    ├── CreateGameScreen.tsx     Config form (period, AP, intervals, board, players) + summary.
    ├── WaitingRoomScreen.tsx    Invite code + roster + start.
    ├── GameScreen.tsx           In-game: HUD + board + queue + chat. Desktop 3-panel; mobile/focus mode = maximized board with queue/chat as edge drawers + a "Focus mode" (kiosk) toggle.
    ├── GameHistoryScreen.tsx    Match list + chess-style move log.
    ├── ResultsScreen.tsx        Podium + final standings.
    └── ProfileScreen.tsx        Player stats + recent matches.
```

## `.github/` · `.claude/`

```
.github/workflows/ci.yml      CI: lint → typecheck → test → build.
.claude/settings.local.json   Claude Code local permissions (gitignored).
```

## `scripts/` · `.loop/` — UI-refinement kit (`/ui-refine`)

```
scripts/   ui-audit.mjs (render→Lighthouse→pa11y gate) · 3d-perf-audit.mjs · mobile-audit.mjs ·
           loop-memory.mjs + loop-{body,hands,reflect,metabolism}.mjs (+ *-tests.mjs) loop engines.
.loop/     memory.md (project UI standards/lessons, append-only) · state.json · loop-*.mjs engines.
           npm scripts: audit:all · audit:render-check · audit:perf · audit:a11y · audit:mobile · loop:read.
```

## Notes
- The demo is intentionally backend-free (mock data in `src/lib/mock.ts`). When merging design into
  `main`, re-point screens at Convex queries and restore the Convex provider in `main.tsx`.
- Stage 1 will introduce `src/features/*` and `convex/engine/` per `Implementation.md`.
