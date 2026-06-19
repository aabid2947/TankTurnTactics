# Repository Structure

> **Living index of every file and folder in this repo.** Keep it current: whenever you create,
> move, rename, or delete a file/folder — or change what a file *does* — update its entry here in
> the same change (see `CLAUDE.md`, rules 1 & 2). Organize code **by feature** so this index stays
> meaningful.
>
> Last updated: 2026-06-19 (Stage 5 complete — social & endgame: chat, win/ranking, 4-player vote, results, stats)

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
├── schema.ts          Schema: auth + games + players (incl. deathOrder/placement) + queuedActions +
│                      events + juryVotes + tradeOffers + chatMessages + endgameProposals.
├── auth.ts            Convex Auth setup (email+password provider).
├── auth.config.ts     Auth provider domain config for the deployment.
├── http.ts            HTTP router; registers Convex Auth endpoints.
├── users.ts           `viewer` (current user) + `myProfile` (derived stats + match history, by_user).
├── games.ts           Lifecycle: create/join/joinByCode/leave/startGame + listOpen/getGame/getMyPlayer.
│                      Public projection omits secret ap/range, exposes kills/deathOrder/placement.
├── actions.ts         Private queue: queueAction (affordability-checked) / cancel / clear / getMyQueue.
├── resolve.ts         Scheduled resolvePeriod() wires the pure engine into Convex; forceResolve (host,
│                      testing); getHistory. Writes state back (kills/deathOrder), logs events, reschedules;
│                      at game end assigns final placements + finalizes the unanimous 4-player endgame vote.
├── jury.ts            castJuryVote (dead players) + getJuryState; tally wired into the resolve loop.
├── trade.ts           propose/respond/cancel trade + getMyTradeOffers; accepted offers injected at resolve.
├── chat.ts            sendChat + getChat (global feed + only the caller's own DMs — secrecy at the query).
├── endgame.ts         4-player negotiation: propose/respond ranking + getEndgameState (finalize in resolve.ts).
├── lib/
│   ├── geometry.ts    Chebyshev distance (pure, shared backend geometry).
│   ├── rng.ts         Seeded PRNG (mulberry32) for deterministic spawn + tests.
│   ├── spawn.ts       Spawn placement: inner region, pairwise Chebyshev ≥ 2 (Implementation.md §3.17).
│   ├── spawn.test.ts  Vitest unit tests for spawn placement.
│   ├── cost.ts        AP cost model (mirrors the engine) for queue affordability.
│   ├── cost.test.ts   Vitest unit tests for queue cost (scaling upgrades).
│   ├── jury.ts        Jury tally (top (effect,target) wins; ties → null).
│   ├── jury.test.ts   Vitest unit tests for the jury tally.
│   ├── ranking.ts     Pure final-placement ranking (survivors tiebreak; eliminated by death order).
│   └── ranking.test.ts Vitest unit tests for placement ranking.
├── engine/            PURE slot-based resolver (no Convex/IO) — the full Stage 2 ruleset, test-first.
│   ├── types.ts       Engine model: EngineState, EngineTank (incl. kills), QueuedAction, GameEvent.
│   ├── resolve.ts     resolvePeriod(): slots × phases (heal/upgrade/transfer/collect/move/shoot),
│   │                  lock-in move tiebreak, simultaneous shots, trade/give/revive, board shrink,
│   │                  heart spawn, jury, AP grant, win check, earliest-lock kill credit. Pure & deterministic.
│   ├── resolve.test.ts         Core resolver tests (14).
│   ├── resolve.systems.test.ts Transfers, shrink, heart-spawn, jury, win, kill-attribution tests (16).
│   └── index.ts       Barrel export.
├── tsconfig.json      TS config scoped to the Convex backend (types: ["node"] for process.env).
└── _generated/        Convex-generated api/types — COMMITTED so CI typechecks without a deploy key.
```

## `src/` — React + Vite client (TypeScript)

```
src/
├── main.tsx                  Entry: ConvexAuthProvider + ConvexReactClient + Router.
├── App.tsx                   Auth-gated routes: SignIn (out) vs AppShell → lobby/create/profile/game.
├── index.css                 Neo-brutalist design tokens (light/dark) + game tokens.
├── vite-env.d.ts             Vite client types.
├── lib/
│   ├── utils.ts              `cn()` className merge.
│   ├── geometry.ts           Chebyshev / adjacency helpers (shared) + geometry.test.ts.
│   ├── board.ts              Player colors, display-name + monogram helpers.
│   ├── gameTypes.ts          Shared types from queries (GameDetail, MyPlayer, QueueRow).
│   ├── useCountdown.ts       Live period countdown hook + time formatter.
│   └── events.ts             Maps resolution events to readable history labels (killer-aware deaths).
├── test/setup.ts             Vitest setup (jest-dom matchers).
├── components/
│   ├── ui/                   Brutalist primitives: button, input, card, badge, stepper, progress, tabs.
│   ├── layout/
│   │   ├── AppShell.tsx      Header (logo + theme + avatar→profile + sign-out) + routed <Outlet/>.
│   │   └── AuthShell.tsx     Centered auth card on lavender backdrop + `Field` helper.
│   └── game/
│       ├── TankToken.tsx     Circular bordered tank token (monogram, hearts, leader/dead markers).
│       ├── BoardGrid.tsx     Read-only board (Stage 1 waiting/spectate).
│       ├── InGameBoard.tsx   Interactive board: click to queue moves/shots (origin-aware, range highlights).
│       ├── ActionQueue.tsx   Queue panel: AP meter, queued actions, move/shoot/give/heal/upgrade/collect, cancel/clear.
│       ├── HistoryPanel.tsx  Public event log grouped by period.
│       ├── JuryPanel.tsx     Eliminated players vote to haunt/gift a living tank.
│       ├── TradePanel.tsx    Propose mutual trades + accept/decline incoming offers (living players).
│       ├── ChatPanel.tsx     WhatsApp-style chat: global feed + 1:1 DMs (Global/Direct tabs); dead may chat.
│       ├── EndgameVotePanel.tsx  At 4 alive: propose/agree a 1–4 ranking to end the game early.
│       └── HudChip.tsx       Mono data chip with icon (AP, range, hearts, players…).
└── screens/
    ├── SignInScreen.tsx      Email+password sign-in / sign-up (Convex Auth, no verification).
    ├── LobbyScreen.tsx       Open games (listOpen) + create + join-by-code.
    ├── CreateGameScreen.tsx  Config form (period, AP, intervals, board, players) → createGame.
    ├── GameRoute.tsx         Routes /game/:id → WaitingRoom (lobby) / GameBoard (active) / ResultsScreen (done).
    ├── WaitingRoom.tsx       Live roster + invite code + host start (startGame).
    ├── GameBoard.tsx         In-game: board + queue + countdown + resolve-now + History|Chat tabs + endgame vote.
    ├── ResultsScreen.tsx     Final podium + standings for a completed game.
    └── ProfileScreen.tsx     Your derived stats + match history (users.myProfile).
```

## `.github/` · `.claude/`

```
.github/workflows/ci.yml      CI: npm ci → lint → typecheck (app + convex) → test → build.
.claude/settings.local.json   Claude Code local permissions (gitignored).
```

## Planned (upcoming stages — not yet created)

- Playwright E2E in CI (signup→create→start→queue→resolve), gated on a `CONVEX_DEPLOY_KEY` secret.
- `convex/notify.ts` — push/email notifications (Stage 6).
- Offline/reconnect polish, presence, rate limiting, security/secrecy pass (Stage 6).
- More `src/components/ui/*` primitives (dialog, …) as screens need them.
