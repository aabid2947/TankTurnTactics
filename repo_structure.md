# Repository Structure

> **Living index of every file and folder in this repo.** Keep it current: whenever you create,
> move, rename, or delete a file/folder — or change what a file *does* — update its entry here in
> the same change (see `CLAUDE.md`, rule 1 & 2). Organize code **by feature** so this index stays
> meaningful.
>
> Last updated: 2026-06-18

## Current files (what exists today)

```
TankTurnTactics/
├── .claude/
│   └── settings.local.json   Claude Code local settings (tool permissions). Machine-local.
├── .git/                     Git internals (not documented here).
├── CLAUDE.md                 Project guide auto-loaded into Claude's context every session:
│                             working rules, locked decisions, and the implementation phases.
├── Implementation.md         CANONICAL technical blueprint: architecture, Convex schema,
│                             server functions, the pure engine, testing, and the §3 ruleset
│                             (authoritative if any doc disagrees) + the staged roadmap (§11).
├── PRODUCT.md                Player-facing game design & rules, clarified after the 2026-06-18 Q&A.
├── ANSWERS.md                The host's locked answers to the rules Q&A that produced the design.
│                             (Historical record; design now lives in PRODUCT.md / Implementation.md.)
└── repo_structure.md         THIS file — the living index of the repo.
```

> No application code exists yet — the repo currently holds design/spec docs only. Code lands
> starting at **Stage 0** (see `CLAUDE.md` / `Implementation.md §11`).

## Planned structure (not yet created)

Target layout once scaffolding begins, organized by feature. Move items up to **Current files**
with a description as they are actually created.

```
TankTurnTactics/
├── convex/                   Convex backend (TypeScript)
│   ├── schema.ts             DB tables: users, games, players, queuedActions, tradeOffers,
│   │                         apCaches, heartSpawns, events, chatMessages, juryVotes.
│   ├── games.ts              Lifecycle mutations/queries: create/join/leave/start, public state.
│   ├── actions.ts            Queue/edit/cancel actions; affordability validation.
│   ├── trade.ts              propose/accept/decline trade; jury & endgame voting.
│   ├── chat.ts               Global + 1:1 messages.
│   ├── resolve.ts            Scheduled `resolvePeriod` heartbeat — runs the pure engine atomically.
│   ├── notify.ts             Convex actions for push/email notifications.
│   └── engine/               PURE, backend-agnostic resolver (NO Convex imports) — tested first.
│       ├── resolve.ts        Slot-based simultaneous resolver (Implementation.md §3.5).
│       ├── geometry.ts       Chebyshev distance, adjacency, range helpers.
│       ├── types.ts          GameState / Action / Event types & invariants.
│       └── *.test.ts         Deterministic unit tests for every rule (Implementation.md §10).
├── src/                      React + Vite client (TypeScript)
│   ├── routes/               Home, auth, Lobby, WaitingRoom, Game, Profile, Results.
│   ├── features/             Feature folders: board/, actions/, chat/, history/, timer/,
│   │                         jury/, endgame/ (components colocated by feature).
│   ├── lib/                  Convex client, auth, shared geometry helpers.
│   └── components/ui/        shadcn/ui primitives.
├── index.html                Vite entry.
├── package.json              Dependencies & scripts.
├── tsconfig*.json            TypeScript config.
├── tailwind.config.ts        Tailwind config.
├── vite.config.ts            Vite config.
└── .gitignore                Ignore node_modules, .env*, Convex local, build output.
```
