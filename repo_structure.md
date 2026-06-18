# Repository Structure

> **Living index of every file and folder in this repo.** Keep it current: whenever you create,
> move, rename, or delete a file/folder — or change what a file *does* — update its entry here in
> the same change (see `CLAUDE.md`, rules 1 & 2). Organize code **by feature** so this index stays
> meaningful.
>
> Last updated: 2026-06-18 (Stage 2 in progress — engine core on `feat/engine`)

## Root — docs & config

```
TankTurnTactics/
├── PRODUCT.md             Player-facing game design & rules (clarified 2026-06-18).
├── Implementation.md      CANONICAL technical blueprint + ruleset (§3) + staged roadmap (§11).
├── CLAUDE.md              Auto-loaded project guide: working rules, locked decisions, phases.
├── repo_structure.md      THIS file — living index of the repo.
├── ANSWERS.md             Host's locked Q&A answers that produced the design (historical record).
├── design.md              Design system: colors, typography, UI/UX principles (from the reference).
├── design-reference.jpeg  Visual reference the design system is derived from (neo-brutalist).
├── README.md              Setup & run instructions (incl. the one-time Convex login step).
├── package.json           Scripts & dependencies (incl. typecheck:convex).
├── package-lock.json      Locked dependency tree.
├── .gitignore             Ignored paths (node_modules, dist, .env*, .convex). _generated IS committed.
├── components.json        shadcn/ui config (style, aliases, base color).
├── index.html             Vite HTML entry; loads Space Grotesk + Space Mono (Google Fonts).
├── vite.config.ts         Vite config: React plugin, `@`→src & `@convex`→convex aliases, Vitest.
├── eslint.config.js       ESLint flat config (lints src/; react-refresh off for components/ui).
├── postcss.config.js      PostCSS pipeline: tailwindcss + autoprefixer.
├── tailwind.config.ts     Tailwind theme: Space Grotesk/Mono fonts, brand+game colors, brutal shadows.
├── tsconfig.json          Root TS project references → app + node.
├── tsconfig.app.json      Client TS config (src/**), strict, `@/*` + `@convex/*` path aliases.
└── tsconfig.node.json     TS config for build tooling (vite.config.ts).
```

## `convex/` — Convex backend (TypeScript)

```
convex/
├── schema.ts          Schema: Convex Auth tables + games (lobby/lifecycle + config) + players.
├── auth.ts            Convex Auth setup (email+password provider).
├── auth.config.ts     Auth provider domain config for the deployment.
├── http.ts            HTTP router; registers Convex Auth endpoints.
├── users.ts           `viewer` query — the current authenticated user.
├── games.ts           Lifecycle: create/join/joinByCode/leave/startGame + listOpen/getGame/getMyPlayer.
│                      Public queries omit secret ap/range; startGame runs spawn placement.
├── lib/
│   ├── geometry.ts    Chebyshev distance (pure, shared backend geometry).
│   ├── rng.ts         Seeded PRNG (mulberry32) for deterministic spawn + tests.
│   ├── spawn.ts       Spawn placement: inner region, pairwise Chebyshev ≥ 2 (Implementation.md §3.17).
│   └── spawn.test.ts  Vitest unit tests for spawn placement.
├── engine/            PURE slot-based resolver (no Convex/IO) — Stage 2, built test-first.
│   ├── types.ts       Engine data model: EngineState, EngineTank, QueuedAction, GameEvent.
│   ├── resolve.ts     resolvePeriod(): slot loop + priority buckets (heal/upgrade/collect/move/shoot),
│   │                  lock-in move tiebreak, simultaneous shots, death→cache. (Increment 1.)
│   ├── resolve.test.ts Deterministic resolver tests (14 cases).
│   └── index.ts       Barrel export.
├── tsconfig.json      TS config scoped to the Convex backend (types: ["node"] for process.env).
└── _generated/        Convex-generated api/types — COMMITTED so CI typechecks without a deploy key.
```

## `src/` — React + Vite client (TypeScript)

```
src/
├── main.tsx                  Entry: ConvexAuthProvider + ConvexReactClient + Router.
├── App.tsx                   Auth-gated routes: SignIn (out) vs AppShell → lobby/create/game.
├── index.css                 Neo-brutalist design tokens (light/dark) + game tokens.
├── vite-env.d.ts             Vite client types.
├── lib/
│   ├── utils.ts              `cn()` className merge.
│   ├── geometry.ts           Chebyshev / adjacency helpers (shared) + geometry.test.ts.
│   ├── board.ts              Player colors, display-name + monogram helpers.
│   └── gameTypes.ts          Shared types derived from the getGame query (GameDetail).
├── test/setup.ts             Vitest setup (jest-dom matchers).
├── components/
│   ├── ui/                   Brutalist primitives: button, input, card, badge, stepper, progress.
│   ├── layout/
│   │   ├── AppShell.tsx      Header (logo + theme + avatar + sign-out) + routed <Outlet/>.
│   │   └── AuthShell.tsx     Centered auth card on lavender backdrop + `Field` helper.
│   └── game/
│       ├── TankToken.tsx     Circular bordered tank token (monogram, hearts, leader/dead markers).
│       ├── BoardGrid.tsx     Read-only board: places tanks on a width×height grid (props-driven).
│       └── HudChip.tsx       Mono data chip with icon (AP, range, hearts, players…).
└── screens/
    ├── SignInScreen.tsx      Email+password sign-in / sign-up (Convex Auth, no verification).
    ├── LobbyScreen.tsx       Open games (listOpen) + create + join-by-code.
    ├── CreateGameScreen.tsx  Config form (period, AP, intervals, board, players) → createGame.
    ├── GameRoute.tsx         Routes /game/:id → WaitingRoom (lobby) or GameBoard (active).
    ├── WaitingRoom.tsx       Live roster + invite code + host start (startGame).
    └── GameBoard.tsx         Live read-only board + HUD (your AP/range/hearts via getMyPlayer).
```

## `.github/` · `.claude/`

```
.github/workflows/ci.yml      CI: npm ci → lint → typecheck (app + convex) → test → build.
.claude/settings.local.json   Claude Code local permissions (gitignored).
```

## Planned (upcoming stages — not yet created)

- `convex/engine/` **increment 2** — transfers (trade / give-revive), board shrink, heart spawn,
  jury, win check (Stage 2; Implementation.md §3.5/§6). Core resolver landed in increment 1.
- `convex/resolve.ts` — scheduled `resolvePeriod` heartbeat wiring the engine (Stage 3).
- `convex/trade.ts`, `convex/chat.ts`, `convex/notify.ts` — trade/jury, chat, notifications (Stages 4–6).
- `src/components/game/` additions — ActionQueuePanel, ChatPanel, range/move overlays (Stages 3–5).
- More `src/components/ui/*` primitives (dialog, tabs, …) as screens need them.
