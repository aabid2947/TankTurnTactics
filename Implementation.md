# Tank Turn Tactics — Implementation Plan

> **Status:** Design locked via Q&A on **2026-06-18**. This document is the **canonical
> source of truth** for game rules and architecture. Where it conflicts with `PRODUCT.md`
> or the old `System Architecture.txt`, **this file wins** (see §1.2 Decision Log).
>
> **Repo state:** working tree was intentionally wiped to a fresh start (only `PRODUCT.md`
> remained). The previous MERN + Redis + Socket.io build is **abandoned** — its game logic
> was never finished (commented out) and conflicted with the product on health, range, and
> win conditions. We rebuild fresh on the stack below.

---

## Table of contents
1. [Product summary & decision log](#1-product-summary--decision-log)
2. [Architecture & tech stack](#2-architecture--tech-stack)
3. [Canonical game ruleset](#3-canonical-game-ruleset) ← the spec
4. [Data model (Convex schema)](#4-data-model-convex-schema)
5. [Server functions](#5-server-functions)
6. [The engine module (pure & testable)](#6-the-engine-module-pure--testable)
7. [Client architecture](#7-client-architecture)
8. [Async hardening: real-time, notifications, offline](#8-async-hardening)
9. [Security & integrity](#9-security--integrity)
10. [Testing strategy](#10-testing-strategy)
11. [Multi-stage delivery plan](#11-multi-stage-delivery-plan) ← the roadmap
12. [Risks & micro-decisions to confirm](#12-risks--micro-decisions-to-confirm)

---

## 1. Product summary & decision log

**Tank Turn Tactics** is a multiplayer, grid-based strategy game. Each player is a tank on a
shrinking board. Players accrue **Action Points (AP)** over real time and spend them to move,
shoot, upgrade range, heal, trade, and revive. Position and hearts are **public**; AP and range
are **secret**. Dead players join a **jury** that periodically haunts a living player or gifts AP.
The game is won by securing a **top-3 finish**. Social play (global + 1:1 chat, alliances,
betrayals) is central.

**The defining mechanic** (decided with the user): the game is **simultaneous-resolution
("we-go")**. Time is divided into **periods** of admin-set length. During a period players chat,
plan, and privately **queue a sequence of actions**. At the period buzzer, all queued actions
resolve together via a deterministic **slot-based resolver** (§3.5).

### 1.1 Foundational decisions (locked)

| Area | Decision |
|---|---|
| Backend / realtime | **Convex** (reactive DB + scheduled functions + transactional mutations) |
| Language | **TypeScript** everywhere |
| Client | **React + Vite + TailwindCSS + shadcn/ui** |
| Tempo | **Configurable, async-robust** — periods can be minutes→hours; players may be offline |
| Turn model | **Period-based simultaneous resolution** (slot-based, priority within each slot) |
| Health | **3 hearts** (1 damage per shot) — *not* the old 100HP/25dmg model |
| Win | **Top-3 finish** with a 4-player negotiation rule — *not* last-man-standing |

### 1.2 Decision log — where this supersedes the source docs

- **Stack:** `PRODUCT.md` named Convex; the architecture doc/old code used Node+Socket.io+Mongo+Redis+K8s. → **Convex** chosen.
- **State management:** `PRODUCT.md` suggested Redux/Recoil. → **Dropped** in favor of Convex's reactive `useQuery` for server state + light local state. See §2.3 for the rationale (this is a deliberate deviation worth your sign-off).
- **Health:** old code used 100HP/25dmg. → **3 hearts**, shot = −1 heart.
- **Win condition:** old code was last-man-standing. → **Top-3** per `PRODUCT.md` + jury.
- **Language:** old client was `.jsx`. → **TypeScript**.

---

## 2. Architecture & tech stack

### 2.1 Why Convex fits this game unusually well
- **Scheduled functions** are a perfect match for the "every X" timers (period resolution, AP grants, heart spawns, jury votes) — durable, server-driven, survive client disconnects (essential for the async tempo).
- **Transactional mutations** let the entire period resolution apply atomically — critical for a simultaneous resolver where partial application would corrupt state.
- **Reactive queries** give real-time board/chat/countdown updates with no hand-rolled WebSocket layer.
- **Server authority by construction** — clients never see other players' AP/range because the query simply doesn't return them. Secrecy is enforced at the data-access layer, not patched on.

> **Tradeoff (flagged):** Convex is a managed platform (vendor lock-in) and does not map onto the
> Docker/K8s/Prometheus scaling vision in the old architecture doc. For this game's scale (≤17
> players/match) that vision is over-engineering; Convex is the pragmatic choice. If self-hosting
> becomes a hard requirement later, the **pure engine module (§6) is deliberately backend-agnostic**
> and portable.

### 2.2 High-level shape

```
React (Vite, TS, Tailwind, shadcn)
        │  Convex React hooks (useQuery / useMutation)
        ▼
Convex deployment
  ├─ queries     → read public game state / private self-state / chat / history
  ├─ mutations   → createGame, join, start, queueAction, trade, vote, chat ...
  ├─ scheduled   → resolvePeriod (the heartbeat), runs the engine atomically
  ├─ actions     → side effects (push/email notifications)
  └─ engine/     → PURE TS resolver (no Convex deps) ← unit-tested in isolation
```

### 2.3 State management — recommendation & pushback
`PRODUCT.md` calls for Redux Toolkit/Recoil. With Convex, **server state is delivered by
auto-subscribing `useQuery` hooks**, so a Redux store for server data would be redundant and
would fight Convex's cache. **Recommendation:** use Convex for all server state; use React local
state (or a tiny Zustand store) only for ephemeral UI (selected cell, open modal, the *draft*
action being composed). **Net: drop Redux.** This is a deliberate deviation from the doc — easy
to revisit, but I'd push back on adding Redux here. *(Override if you want Redux retained.)*

**Important async detail:** a player's queued actions are **persisted to Convex on every edit**
(not held in local state), so a player can queue actions, close the tab, and have them survive —
required by the async tempo. They are returned **only to their owner** until resolution.

---

## 3. Canonical game ruleset

This section is the authoritative spec. Implement to *this*, not to prose elsewhere.

### 3.1 Board & coordinates
- Default **20×20**, configurable. Coordinates are absolute `(x, y)`. The playable window is
  tracked as `{ originX, originY, width, height }` so shrinking never re-indexes tanks.
- A cell holds **at most one living tank**, and may also hold: any number of **dead bodies**,
  one merged **AP cache**, and/or one **heart spawn**.

### 3.2 Player assets & caps
| Asset | Start | Cap | Notes |
|---|---|---|---|
| Hearts | 3 | 3 (min 0) | 0 ⇒ dead |
| AP | 0 | uncapped | **secret** |
| Range | 1 | uncapped (board-limited) | **secret**; Chebyshev |

- **Range 1 = the 8 touching squares** (Chebyshev distance ≤ 1).

### 3.3 Actions & AP costs
| Action | Cost | Effect |
|---|---|---|
| Move | 1 | Step to an adjacent (8-dir) empty cell |
| Shoot | 1 | Target a cell within range; living tank there loses 1 heart |
| Upgrade range | **= new range** | Range +1; cost equals the range you reach — 1→2 costs 2, 2→3 costs 3, 3→4 costs 4, … |
| Add heart (self-heal) | 3 | Own hearts +1 (cannot exceed 3) |
| Collect AP | 1 | Grab the entire AP cache on your current cell |
| Trade | 0 | Mutual-consent exchange of AP and/or hearts, within range |
| Give heart / Revive | 0 | Give 1 of your hearts to a target in range (heal ally ≤3, or revive a body) |

> **Range-upgrade cost scales:** an upgrade costs the range you're upgrading **to** (current range
> + 1) — 1→2 costs 2 AP, 2→3 costs 3, 3→4 costs 4, and so on. Several upgrades queued in one period
> resolve in separate slots, so their costs escalate (1→2→3 costs 2 then 3). Affordability is
> validated against this escalating cost at queue time.

### 3.4 The period loop
1. Admin sets **period length** (and other params, §3.15). A live countdown runs.
2. **During the period** = planning + diplomacy: chat (global + 1:1) and privately **queue/edit/
   cancel** an ordered list of actions. You may queue only what your **current AP** affords.
   Nobody sees others' queued actions. The board is static.
3. **At the buzzer:** the slot-based resolver (§3.5) runs atomically.
4. Grant AP, run heart-spawn / jury if due, apply board shrink, check win, schedule next period.
5. "Real-time" = live chat, live countdown, animated result reveal — **not** instant execution.

### 3.5 Resolution algorithm (slot-based, priority within each slot)
Players queue a *sequence*; resolution proceeds slot-by-slot (everyone's 1st action, then
everyone's 2nd, …). Within a slot, actions are bucketed by type and buckets run in **priority
order**. Contention within a bucket is broken by **lock-in time** (earliest edit wins).

```
PRIORITY = [HEAL, UPGRADE, TRANSFER, COLLECT, MOVE, SHOOT]
            # TRANSFER = trade + give-heart/revive
            # (COLLECT & TRANSFER extend PRODUCT.md's 5-type order; see §3.16)

maxLen = max queued-action count across living players
for slot in 0 .. maxLen-1:
    acts = [ queue[slot] for each living player that has a slot-th action ]
    for bucket in PRIORITY:
        b = acts of this bucket type
        switch bucket:
          HEAL    : each: spend 3AP, hearts = min(3, hearts+1)
          UPGRADE : each: spend (range+1) AP, range += 1   # cost = the range you reach
          TRANSFER: process in lockedAt order:
                      trade  -> if partner accepted & in range: swap resources (0AP)
                      give   -> if target in range: ally hearts+1 (≤3),
                                                    OR body -> revive(1 heart, 0 AP, range=1)
          COLLECT : each: if cache on my cell: spend 1AP, gain cache amount, clear cache
                          else: void -> refund
          MOVE    : process in lockedAt order, each vs LIVE board:
                      spend 1AP (always, even on bounce)        # per decision 2b
                      if dest in-bounds AND no living tank there: move there
                          (auto-pickup heart spawn if present, ≤3)
                      else: bounce (stay put)
          SHOOT   : snapshot positions; each: spend 1AP
                      tally hit if target cell is in range (snapshot) AND holds a living tank
                      apply all hits simultaneously (−1 heart each)  # mutual kills possible
        registerDeaths()   # hearts ≤ 0 -> dead: drop ALL AP as cache, cancel remaining queue

# end of period:
applyBoardShrink(deathsThisPeriod)   # §3.9 (no cascade)
grantAP()                            # +apPerGrant to living & not haunted; clear haunt flags
if period % heartSpawnEvery == 0: spawnHeart()
if period % juryVoteEvery   == 0: runJury()
checkWinCondition()                  # §3.13
scheduleNextPeriod()                 # or end game
```

**Key consequences (intended):**
- **Move beats shoot every slot** → queueing a move dodges a same-slot shot.
- **Trains work in lock-order, swaps fail** → if A (earlier) vacates a cell, B (later) follows in.
- **Mutual kills** happen (shots are simultaneous).
- A player with more AP simply gets more slots (more reactivity later in the resolution).
- **Death mid-resolution** cancels that player's remaining slots immediately.

### 3.6 Geometry
- **Movement:** 8-directional; one move = one step. **Range/shooting:** Chebyshev (square) — range *r* covers all cells within Chebyshev distance *r*. **No line-of-sight blocking** (pure range).

### 3.7 Combat, death, AP caches, collection
- Shot ⇒ target −1 heart. Hearts reach 0 ⇒ **dead**.
- On death: drop **all** AP as a cache on the death cell; the **body remains** on the board
  (revivable) and is **non-blocking** (living tanks may enter its cell).
- **Collect AP** (1 AP) on the cache's cell grabs the **entire** cache.

### 3.8 Revival
- A living player uses **Give heart / Revive** on a body within range. The body returns
  **alive with 1 heart, 0 AP, range reset to 1**, on its death cell (if still in-bounds).
  The giver loses 1 heart. Dead players **do not accrue AP**, **cannot be shot** (no effect),
  and **cannot be haunted**.

### 3.9 Board shrink
- Trigger: **1 row + 1 column removed per death**, applied **once at end of period** for that
  period's combat deaths (`D` deaths ⇒ remove `D` rows + `D` cols).
- **Which edges:** alternate to keep the board roughly centered — removal sequence cycles
  `(top,left) → (bottom,right) → (top,left) → …`. Implemented by adjusting
  `{originX, originY, width, height}`.
- A living tank left **outside** the new window **dies**. Bodies / AP caches / un-picked heart
  spawns on removed cells are **lost** (a body lost here can no longer be revived).
- **No cascade:** deaths caused by the shrink itself do not trigger further shrink this period.
- **Floor:** board never shrinks below what fits the survivors with spacing (min 3×3). *(§3.16)*

### 3.10 Hearts & heart spawns
- Self-heal cannot exceed 3 hearts.
- A heart spawns on a random empty in-bounds cell **every `heartSpawnEvery` periods**. A tank
  that **enters** the cell auto-claims it (+1 heart, ≤3). If contested in one slot, the
  **earliest-locked** mover gets the cell (others bounce, AP consumed).

### 3.11 Trade
- **Mutual consent:** initiator proposes `{ give: {ap,hearts}, receive: {ap,hearts} }` to a
  target; executes only if the target **accepted** during the period and both are within the
  **initiator's range** at the trade bucket. Trade action costs **0 AP**. Received hearts can't
  push anyone above 3.

### 3.12 Jury & haunting
- Jury = all dead players. A vote runs **every `juryVoteEvery` periods** (needs ≥1 dead).
- Each juror casts **one vote** for a single `(effect, target)`: **haunt** a living player or
  **gift AP** to a living player. The single option with the most votes wins (one pooled tally).
  **Tie / no majority ⇒ no effect** this cycle.
- **Haunt** ⇒ target skips its next AP grant. **Gift** ⇒ +1 AP to a living player.
- Votes are **secret** (§3.14).

### 3.13 Win & endgame
- Game continues until **3 living players remain** ⇒ they take 1st/2nd/3rd by tiebreak
  (hearts → kills → total AP → earlier spawn order; §3.16). Game ends.
- **At exactly 4 living players:** offer an in-game vote. If **all 4 unanimously** agree on a
  1/2/3 ranking (4th gets 4th), end immediately; otherwise play continues to the final 3.
- Eliminated players are ranked by **elimination order** (later death = higher placement).

### 3.14 Visibility / secrecy
| Public (in history & board) | Private / secret |
|---|---|
| Positions, hearts, alive/dead, kills/deaths | Each player's **AP balance** |
| Moves, shots (origin + target cell) | Each player's **range** value |
| Deaths, revivals | **Queued actions** (until resolution) |
| Heart spawns & pickups | **Trade contents**, **jury votes** |
| AP-cache **existence** | AP-cache **amount** (until collected; §3.16) |

Range is never announced; others only **infer** it when you shoot from afar. A range upgrade
produces **no public event**.

### 3.15 Configurable parameters & defaults (set at game creation)
| Param | Default | Notes |
|---|---|---|
| `periodSeconds` | TBD per playtest | The master clock |
| `apPerGrant` | 1 | AP granted to each living, non-haunted player per period |
| `heartSpawnEveryPeriods` | 5 | |
| `juryVoteEveryPeriods` | 3 | |
| `boardWidth` × `boardHeight` | 20 × 20 | |
| `minPlayers` / `maxPlayers` | 10 / 17 | |
| AP costs / caps | per §3.3 / §3.2 | exposed for tuning |

> All "every X" timers are counted in **periods** (one master clock), not independent wall-clock
> timers — simpler and fully deterministic.

### 3.16 Invariants (assert in code & tests)
- ≤ 1 living tank per cell. Hearts ∈ [0,3]. AP ≥ 0. Range ≥ 1.
- A queued plan's total cost ≤ the player's AP at buzzer (validated on every queue edit),
  accounting for the **escalating range-upgrade cost** (each upgrade costs current-range + 1).
- Resolution is a **pure function** of `(state, queues, seededRNG)` — same inputs ⇒ same output.
- Board window only shrinks, never grows; never below the floor.

### 3.17 Spawn placement
Place players in the inner region **excluding the outer 2 rings** (on 20×20 → indices 2..17),
with **pairwise Chebyshev distance ≥ 2**. Rejection-sample with a retry cap; fall back to a
relaxed-but-valid placement if the cap is hit. (256 inner cells easily fit 17 tanks.)

### 3.18 Micro-decisions assumed where the spec was silent — **override freely**
- **Lock-in timestamp** = the time an action was *last edited*; **no explicit "Lock" button** in V1.
- **AP consumption:** an *attempted* move (incl. bounce) and shot (incl. miss) **consume** AP;
  structurally **void** actions (trade not accepted, revive of a non-body, collect with no cache)
  are **refunded**. *(Bounce-consumes-AP is per your decision 2b; the void-refund is my consistent extension.)*
- **Trade range** = within the **initiator's** range, checked at the trade bucket.
- **Final-3 tiebreak** = hearts → kills → total AP → earlier spawn order.
- **Shrink:** `D` deaths ⇒ remove `D` rows + `D` cols; no cascade; floor 3×3 / sized to survivors.
- **AP-cache amount** hidden until collected (existence is public).
- **Endgame 4-vote** requires unanimity on one proposed ranking; resolves at a period boundary.

---

## 4. Data model (Convex schema)

```ts
// convex/schema.ts (sketch)
users:         { name, email, stats: { gamesPlayed, wins, kills, deaths } }

games:         { name, code, status: "lobby"|"active"|"completed",
                 createdBy, config: {...§3.15},
                 board: { originX, originY, width, height, shrinkStep },
                 periodNumber, periodEndsAt, nextResolveFnId,
                 placements?, startedAt?, endedAt? }
               // index: by_status, by_code

players:       { gameId, userId, status: "alive"|"dead",
                 x, y, hearts, ap /*SECRET*/, range /*SECRET*/,
                 kills, deaths, hauntedNextGrant, spawnOrder, deathOrder? }
               // index: by_game, by_game_status, by_game_user

queuedActions: { gameId, playerId, periodNumber, slotIndex,
                 type, params, lockedAt }            // PRIVATE to owner
               // index: by_game_period, by_player_period

tradeOffers:   { gameId, periodNumber, fromPlayerId, toPlayerId,
                 give: {ap,hearts}, receive: {ap,hearts}, accepted, acceptedAt }
               // index: by_game_period, by_to_player

apCaches:      { gameId, x, y, amount }              // existence public, amount private
heartSpawns:   { gameId, x, y, spawnedPeriod }       // public

events:        { gameId, periodNumber, type, payload, createdAt }  // PUBLIC history
               // index: by_game_period

chatMessages:  { gameId, scope: "global"|"dm", fromPlayerId, toPlayerId?, content, createdAt }
               // index: by_game_scope, by_game_dm_pair

juryVotes:     { gameId, voteCycle, fromPlayerId, effect: "haunt"|"gift", targetPlayerId } // PRIVATE
```

---

## 5. Server functions

**Queries** (enforce secrecy by what they return):
- `listOpenGames`, `getGamePublic(gameId)` (board + players' *public* fields only),
  `getMySelfState(gameId)` (my ap/range/queue), `getHistory(gameId)`,
  `getChat(gameId)` (global + my DMs), `getMyTradeOffers(gameId)`, `getJuryState(gameId)` (if dead).

**Mutations** (validated, server-authoritative):
- Lifecycle: `createGame`, `joinGame`, `leaveGame`, `startGame` (spawns players §3.17, schedules first resolution).
- Planning: `queueAction`, `reorderQueue`, `cancelAction` (re-validate affordability; stamp `lockedAt`).
- Social: `proposeTrade`, `acceptTrade`, `declineTrade`, `sendChat`.
- Jury/endgame: `castJuryVote`, `proposeEndgameRanking`, `acceptEndgameRanking`.

**Internal / scheduled:**
- `resolvePeriod(gameId)` — the heartbeat. Loads queues, runs the **pure engine (§6)**, writes
  new state + events atomically, grants AP, spawns heart / runs jury / shrinks board if due,
  checks win, then `scheduler.runAt(periodEndsAt')` for the next period (or completes the game).

**Actions (side-effects):**
- `notifyPlayers(gameId)` — push/email after each resolution and on key events (§8).

---

## 6. The engine module (pure & testable)

Lives in `convex/engine/` (or a shared `packages/engine`) with **no Convex imports** — plain TS.

```ts
resolvePeriod(state: GameState, queues: Record<PlayerId, Action[]>, rng: SeededRng)
  : { next: GameState; events: GameEvent[]; deaths: PlayerId[] }
```
Sub-resolvers: `applyHeal`, `applyUpgrade`, `applyTransfer`, `applyCollect`,
`applyMove` (sequential by `lockedAt`), `applyShoot` (simultaneous), `registerDeaths`,
`shrinkBoard`, `spawnHeart`, `runJury`, `checkWin`. Any randomness flows through the injected
**seeded RNG** so resolution stays deterministic and fully unit-testable. Convex only does I/O
around this pure core.

---

## 7. Client architecture

```
src/
  routes/         Home, Login/Register, Lobby, WaitingRoom, Game, Profile
  features/
    board/        BoardGrid, TankMarker, CacheMarker, HeartMarker, RangeOverlay
    actions/      ActionMenu, ActionQueuePanel (draft + reorder/cancel), AffordabilityMeter
    chat/         GlobalChat, DmThreadList, DmThread   (WhatsApp-style)
    history/      MoveHistory (chess.com-style timeline of public events)
    timer/        PeriodCountdown, ResolutionReveal (animates the buzzer outcome)
    jury/         JuryPanel (dead players), VotePanel
    endgame/      EndgameRankingVote, ResultsScreen
  lib/            convex client, auth, geometry helpers (shared Chebyshev/adjacency)
  components/ui/  shadcn primitives
```
Server state via Convex `useQuery`; the **draft action queue** writes through to Convex on each
edit (durable). Resolution updates arrive reactively and trigger the reveal animation.

---

## 8. Async hardening
- **Durable timers:** periods are driven entirely by Convex scheduled functions — resolution
  happens on time even if every client is offline.
- **Notifications** (Convex action → web push / email): "your turn window is closing",
  "you were shot/killed/revived", "jury targeted you", "game over". Essential for hours-scale games.
- **Reconnect/offline:** queued actions and all state live server-side, so refresh/reconnect is
  seamless; presence is cosmetic, never required for correctness.

## 9. Security & integrity
- **Server authority:** all rules enforced in mutations/engine; clients send *intent* only.
- **Secrecy at the query layer:** AP/range/queues/votes are never serialized to other players.
- **Validation:** affordability, range, adjacency, ownership, turn/phase legality on every mutation.
- **Anti-abuse:** rate-limit chat & action edits; auth via Convex Auth; input size caps.

## 10. Testing strategy
The simultaneous resolver is the highest-risk component, so it is **built and tested first, in
isolation** (§11 Stage 2). Deterministic unit tests (seeded RNG) covering at minimum:
- Priority ordering within a slot (heal→…→shoot) and across slots.
- **Move-beats-shoot** dodge; **mutual kill**; **train succeeds / swap fails**.
- Move contention → earliest `lockedAt` wins, loser **bounces and loses AP**.
- Out-of-AP rejection at queue time; void-action refunds; death cancels remaining slots.
- Board shrink edges/casualties/lost caches; revival resets range; heal cap at 3; **scaling
  range-upgrade cost** (R→R+1 costs R+1, stacked upgrades escalate).
- Jury tally / tie / haunt-skip; trade consent + range + heart cap; win at 3 / 4-player vote.
Plus Convex integration tests (scheduling, secrecy of queries) and a few client E2E happy paths.

---

## 11. Multi-stage delivery plan

> Build order optimizes for **de-risking the engine early** and shipping a playable loop fast.
> Each stage ends with a demoable/testable artifact.

### Stage 0 — Foundations
Scaffold Vite + React + TS + Tailwind + shadcn; `convex init`; schema (§4) stubs; Convex Auth;
routing/layout; CI (typecheck + test). **Done when:** app boots, auth works, schema deploys.

### Stage 1 — Lobby & game lifecycle
Create/join-by-code/join-open/leave; waiting room with live player list; config form (§3.15);
`startGame` with **spawn placement (§3.17)**; read-only board render. **Done when:** players can
form a game and see everyone spawned on the board in real time.

### Stage 2 — Core engine (critical path) ⚑
Pure resolver module (§6) + the **full deterministic test suite (§10)**. No UI/Convex wiring yet.
**Done when:** every ruleset scenario passes as unit tests.

### Stage 3 — Action queue & the resolution loop
Persisted queue/edit/cancel (private, affordability-checked); `resolvePeriod` scheduled function
wiring the engine; AP grant; **live countdown + resolution reveal**; public move history.
**Done when:** a game of *move-only* tanks plays period-to-period end-to-end, on a timer.

### Stage 4 — Full action set & systems
Shoot/range/upgrade; self-heal; death → AP cache → collect; revival; board shrink; heart spawns;
trade handshake; jury & haunting. **Done when:** all §3 mechanics are live and match the engine tests.

### Stage 5 — Social & endgame
Global + 1:1 chat (WhatsApp-style); alliance/betrayal UX; win detection, **3-left ranking** &
**4-player negotiation vote**; results screen; user stats/match history. **Done when:** a full
game can be played start→finish with chat and a real winner.
**✅ Complete (2026-06-19):** pure kill-attribution (earliest lock-in) + `convex/lib/ranking.ts`,
`deathOrder`/`placement` on players, chat (global + secret DMs; eliminated players may chat), the
4-player vote finalized at the buzzer (`resolve.ts` → `endgame.ts`), `ResultsScreen`, and derived
profile stats/match history (`users.myProfile`). Alliances stay emergent (chat + trade);
rate-limiting & notifications are deferred to Stage 6.

### Stage 6 — Async hardening
Notifications; offline/reconnect polish; presence; rate limiting; a focused security/integrity
pass (secrecy, validation, anti-abuse). **Done when:** an hours-long game survives clients being
closed and notifies players appropriately.

### Stage 7 — Beta & launch
Playtest; tune the configurable knobs (§3.15) for balance; accessibility & mobile polish; deploy.

---

## 12. Risks & micro-decisions to confirm
- **Micro-decisions in §3.18** — please skim and override any you disagree with; they're encoded
  as defaults otherwise.
- **Redux deviation (§2.3)** — I recommend dropping Redux for Convex reactivity; confirm.
- **Balance unknowns** — `periodSeconds` and the spawn/heart/jury intervals need playtesting
  (Stage 7); all are configurable so they won't require code changes.
- **Shrink aggressiveness** — 1 row+col *per death* shrinks fast with 10–17 players; flagged as a
  tuning knob (could become "every N deaths") if playtests feel too brutal.
```
