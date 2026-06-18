# Tank Turn Tactics — Project Guide

> Read this every session. It holds the working rules, the locked decisions, and the
> implementation phases future Claude needs as context.

## Canonical documents
- **`Implementation.md`** — the canonical technical blueprint **and ruleset** (§3 is authoritative
  if any doc disagrees). Architecture, Convex schema, the pure engine, testing, and the roadmap.
- **`PRODUCT.md`** — player-facing game design & rules (clarified 2026-06-18).
- **`design.md`** — design system (colors, typography, UI/UX) derived from `design-reference.jpeg`.
- **`repo_structure.md`** — living index of every file/folder and what it does.

## Working rules (always follow)
1. **Keep `repo_structure.md` current.** After creating, moving, renaming, or deleting any file or
   folder, update `repo_structure.md` in the same change with a short description of each item's
   purpose, so future Claude knows what every file/feature is. **Organize code by feature** (feature
   folders) so the index stays meaningful — avoid dumping unrelated logic into one file.
2. **Read `repo_structure.md` before touching existing files** to learn where things live and each
   file's role. After any change that alters a file's function, feature, or exports, **update that
   file's entry** in `repo_structure.md`.
3. **Implement to the spec, don't assume.** Build to `Implementation.md §3`; if a rule is genuinely
   ambiguous, ask the host rather than guessing.
4. **Keep the engine pure.** The resolver in `convex/engine/` must stay backend-agnostic (no Convex
   or IO imports) and is built **test-first** — it's the riskiest component.

## Locked decisions (do not re-litigate)
- **Stack:** Convex + TypeScript; React + Vite + Tailwind + shadcn/ui. **Redux dropped** (Convex
  reactive queries replace it). Built **async-robust** (durable timers + notifications).
- **Defining mechanic:** period-based **simultaneous resolution**. Players queue an ordered action
  list per period; at the buzzer a deterministic **slot-based resolver** runs (everyone's 1st
  action, then 2nd…), bucketed by type in priority order
  **(heal → upgrade → trade/give → collect → move → shoot)**, with **lock-in time** breaking
  contention. Moves dodge shots; mutual kills possible; trains work, swaps fail; a bounced move
  still spends AP.
- **Health = 3 hearts** (1 dmg/shot). **Win = top-3** (play to final 3; optional 4-player unanimous
  vote). Old MERN + Socket.io build is **abandoned** — do not restore it.

## Implementation phases (status memory)
Build order de-risks the engine early; each stage ends with a demoable/testable artifact. Full
detail & acceptance criteria in `Implementation.md §11`.

- [x] **Stage 0 — Foundations:** Vite+React+TS+Tailwind+shadcn, Convex schema/auth/http, routing,
      CI — **complete** (Convex deployed, auth keys set, all gates green).
- [x] **Stage 1 — Lobby & lifecycle:** create/join/joinByCode/leave, waiting room, config form,
      `startGame` with spawn placement, live read-only board — **complete** (design system applied).
- [x] **Stage 2 — Core engine (critical path):** pure slot-based resolver + full deterministic test
      suite (33 tests) — **complete**. Not yet wired to Convex/UI (that's Stage 3).
- [x] **Stage 3 — Action queue & loop:** private queue (queue/cancel/clear, affordability), scheduled
      `resolvePeriod` + host `forceResolve`, AP grant, live countdown, interactive board, public
      history — **complete**. (Playwright E2E still pending — needs a `CONVEX_DEPLOY_KEY` CI secret.)
- [x] **Stage 4 — Full action set:** give/revive, jury & haunting, and the trade handshake surfaced
      through the queue/UI (engine already had shoot/upgrade/heal/collect/shrink/heart-spawn) — **complete**.
- [ ] **Stage 5 — Social & endgame:** global + 1:1 chat, alliance/betrayal UX, win detection,
      4-player vote, results screen, stats/match history.
- [ ] **Stage 6 — Async hardening:** notifications, offline/reconnect, presence, rate limiting,
      security/secrecy pass.
- [ ] **Stage 7 — Beta & launch:** playtest, balance-tune the configurable knobs, polish, deploy.

**Current status:** Stages 0–4 complete and on `main`. The full action set is playable: queue
move/shoot/heal/upgrade/collect/give, propose/accept trades, and (when dead) sit on the jury — all
resolved by the pure engine at the buzzer (or host `forceResolve`). All gates green (app + Convex
typecheck, lint, 41 tests, build). **Next: Stage 5 — social & endgame** (global + 1:1 chat,
alliance/betrayal UX, win detection + 4-player vote, results screen, stats) and **Playwright E2E in
CI**. Run `npx convex dev` + `npm run dev`; create a game (min players 1, short period) + Resolve now.
