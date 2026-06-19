# Repository Structure

> **Living index of every file and folder in this repo.** Keep it current: whenever you create,
> move, rename, or delete a file/folder — or change what a file *does* — update its entry here in
> the same change (see `CLAUDE.md`, rules 1 & 2). Organize code **by feature** so this index stays
> meaningful.
>
> Last updated: 2026-06-19 (Stage 6 — async hardening: rate-limiting, presence, offline banner, in-app notifications)

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
├── playwright.config.ts   Playwright E2E config: boots `npm run dev` (or BASE_URL), Chromium, e2e/ tests.
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
├── schema.ts          Schema: auth + games + players (deathOrder/placement/lastSeenAt) + queuedActions +
│                      events + juryVotes + tradeOffers + chatMessages + endgameProposals + rateLimits + notifications.
├── auth.ts            Convex Auth setup (email+password provider).
├── auth.config.ts     Auth provider domain config for the deployment.
├── http.ts            HTTP router; registers Convex Auth endpoints.
├── users.ts           `viewer` (current user) + `myProfile` (derived stats + match history, by_user).
├── games.ts           Lifecycle: create/join/joinByCode/leave/startGame + listOpen/getGame/getMyPlayer.
│                      Public projection omits secret ap/range, exposes kills/placement/lastSeenAt; joinByCode rate-limited.
├── actions.ts         Private queue: queueAction (affordability + rate-limit + length cap) / cancel / clear / getMyQueue.
├── resolve.ts         Scheduled resolvePeriod() wires the pure engine into Convex; forceResolve (host,
│                      testing); getHistory. Writes state back (kills/deathOrder), logs events, reschedules;
│                      assigns final placements + finalizes the 4-player vote; enqueues in-app notifications.
├── jury.ts            castJuryVote (dead players) + getJuryState; tally wired into the resolve loop.
├── trade.ts           propose/respond/cancel trade + getMyTradeOffers; accepted offers injected at resolve.
├── chat.ts            sendChat (rate-limited) + getChat (global feed + only the caller's own DMs — secrecy).
├── endgame.ts         4-player negotiation: propose/respond ranking + getEndgameState (finalize in resolve.ts).
├── presence.ts        heartbeat mutation — marks the caller present in a game (Stage 6 presence).
├── notifications.ts   getMyNotifications + markRead/markAllRead (in-app notification center, Stage 6).
├── rateLimit.ts       enforceRateLimit(ctx, key, max, windowMs) — fixed-window anti-abuse (Stage 6).
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
│   ├── ranking.test.ts Vitest unit tests for placement ranking.
│   ├── rateLimit.ts   Pure fixed-window rate-limit decision (decideRateLimit).
│   ├── rateLimit.test.ts Vitest unit tests for the rate-limit window.
│   ├── notify.ts      Pure event→notification mapping (notificationForEvent) for in-app alerts.
│   └── notify.test.ts Vitest unit tests for the notification mapping.
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
├── index.css                 Neo-brutalist design tokens (light/dark) + game tokens + a11y base (focus ring, reduced-motion).
├── vite-env.d.ts             Vite client types.
├── lib/
│   ├── utils.ts              `cn()` className merge.
│   ├── geometry.ts           Chebyshev / adjacency helpers (shared) + geometry.test.ts.
│   ├── board.ts              Player colors, display-name + monogram helpers.
│   ├── gameTypes.ts          Shared types from queries (GameDetail, MyPlayer, QueueRow).
│   ├── useCountdown.ts       Live period countdown hook + time formatter.
│   ├── events.ts             Maps resolution events to readable history labels (killer-aware deaths).
│   ├── presence.ts           isOnline(lastSeenAt) helper + presence window (Stage 6).
│   ├── usePresenceHeartbeat.ts  Pings presence every ~15s while in a game (Stage 6).
│   └── useConnectionState.ts Polls the Convex socket to drive the offline banner (Stage 6).
├── test/setup.ts             Vitest setup (jest-dom matchers).
├── components/
│   ├── ui/                   Brutalist primitives: button, input, card, badge, stepper, progress, tabs.
│   ├── layout/
│   │   ├── AppShell.tsx      Header (logo + theme + notif bell + avatar→profile + sign-out) + offline banner + <Outlet/>.
│   │   ├── AuthShell.tsx     Centered auth card on lavender backdrop + `Field` helper.
│   │   └── NotificationBell.tsx  Bell + unread badge + dropdown; optional desktop notifications (Stage 6).
│   └── game/
│       ├── TankToken.tsx     Circular tank token (monogram, hearts, leader/dead/online markers).
│       ├── BoardGrid.tsx     Read-only board (Stage 1 waiting/spectate).
│       ├── InGameBoard.tsx   Interactive board: click to queue moves/shots; range highlights + online dots + zoom.
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
    ├── WaitingRoom.tsx       Live roster (with online dots) + invite code + host start (startGame).
    ├── GameBoard.tsx         In-game: board + queue + countdown + History|Chat tabs + endgame vote + presence/heartbeat.
    ├── ResultsScreen.tsx     Final podium + standings for a completed game.
    └── ProfileScreen.tsx     Your derived stats + match history (users.myProfile).
```

## `e2e/` — Playwright end-to-end tests

```
e2e/
├── helpers.ts          uniqueCredentials() + signUp() — real Convex Auth sign-up to the lobby.
├── smoke.spec.ts       App loads the sign-in screen; asserts no missing-Convex-function errors.
├── auth.spec.ts        Sign up → lobby → sign out.
└── create-game.spec.ts Sign up → create a game with default config → land in /game/:id.
```

## `.github/` · `.claude/`

```
.github/workflows/ci.yml      CI: npm ci → lint → typecheck (app + convex) → test → build.
.github/workflows/e2e.yml     CI: npm ci → (deploy Convex if key) → Playwright Chromium → upload report.
.claude/settings.local.json   Claude Code local permissions (gitignored).
```

## Planned (upcoming stages — not yet created)

- Optional web-push / email notifications (needs VAPID or an email-provider key) — extends the in-app layer.
- More `src/components/ui/*` primitives (dialog, …) as screens need them.
