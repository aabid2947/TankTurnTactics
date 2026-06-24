# Tank Turn Tactics — Product & Game Design

> **Clarified 2026-06-18** after a full rules Q&A. Every mechanic below is now unambiguous.
> This is the **player-facing game design**. The technical build plan and the machine-readable
> ruleset live in **`Implementation.md`** (which is the canonical spec if any doubt arises).

---

## 1. Overview
- **Game name:** Tank Turn Tactics
- **Objective:** Survive and finish in the **top 3**.
- **Audience:** Strategy fans, casual gamers, and multiplayer turn-based players.
- **The hook:** Each player is a tank on a shrinking grid. You earn Action Points slowly over
  real time and spend them to move, shoot, upgrade, heal, trade, and revive. Your position and
  hearts are visible to everyone; **your AP and range are secret.** When you die you join a
  **jury** that can haunt the living or gift them points. It is as much a game of **alliances,
  bluffing, and betrayal** (via chat) as it is of tactics.

## 2. The core loop — periods & simultaneous resolution
The game runs in repeating **periods** of a fixed length set by the host (e.g. 10 minutes, or
hours for a slow game).

1. **During a period** (the planning & diplomacy window): you chat with other players and
   privately **queue an ordered list of actions** — as many as your current AP can pay for. You
   can freely reorder or cancel them until the buzzer. **No one can see anyone else's queue.**
2. **At the buzzer:** every player's queued actions resolve **simultaneously** in a deterministic
   order (see §6). The board and history then animate the outcome.
3. **After resolution:** everyone is granted Action Points, board/jury/heart events fire if due,
   and the next period's countdown begins.

"Real-time" means the chat, the countdown, and the result reveal are live — **not** that actions
execute the moment you click. You commit during the window; the world moves at the buzzer.

## 3. The board
- Default **20 × 20**, configurable by the host. The board **shrinks** as players die.
- Each cell holds **at most one living tank**. (Dead tanks, dropped points, and spawned hearts
  can share a cell — see §7–§8.)
- **Spawning:** players start at random cells, with **at least one empty cell between any two
  tanks**, and **never in the outermost 2 rings** of the board.
- **Shrinking:** when a player dies, the board loses **1 row and 1 column**, applied once at the
  end of the period (so several deaths in one period shrink it several steps). Removal alternates
  edges to keep the board roughly centered. **Any tank left outside the new edge dies.** Dropped
  points, un-picked hearts, and dead bodies on removed cells are **lost** (a body lost this way
  can no longer be revived). Deaths *caused by* the shrink do not trigger further shrinking that
  period.

## 4. Player assets
| Asset | Start | Limit | Visible to others? |
|---|---|---|---|
| **Hearts** | 3 | max 3, dead at 0 | ✅ visible |
| **Action Points (AP)** | 0 | no cap | ❌ **secret** |
| **Range** | 1 | no cap (board-limited) | ❌ **secret** |

Range is measured as a **square** around you: range 1 = the 8 touching squares; range 2 = the
5×5 block; and so on.

## 5. Actions & their cost
| Action | AP cost | What it does |
|---|---|---|
| **Move** | 1, 2, 3, 5, 7… | Step to an adjacent square (incl. diagonals), if empty. The *n*-th move in a period costs the *n*-th rung — first move 1, then primes; the ladder resets each period |
| **Shoot** | 1 | Hit a square within range; a living tank there loses 1 heart |
| **Upgrade range** | 2, 3, 5, 7, 11… | Increase your range by 1; the *n*-th upgrade costs the *n*-th prime (1→2 = 2, 2→3 = 3, 3→4 = 5, 4→5 = 7, …). Permanent — stacks across the whole game |
| **Add a heart** | 3 | Heal yourself by 1 heart (never above 3) |
| **Collect AP** | 1 | Pick up the entire AP cache on your square |
| **Trade** | 0 | Mutually agreed swap of AP and/or hearts with a player in range |
| **Give heart / Revive** | 0 | Give one of your hearts to a tank in range (heal an ally, or revive a dead one) |

## 6. How a period resolves (the important part)
Players queue a **sequence** of actions. At the buzzer they resolve **slot by slot**: first
everyone's **1st** action resolves, then everyone's **2nd**, and so on (a player with more AP
simply has more actions). Within each slot, actions are grouped by type and applied in this
**priority order**:

> **Add heart → Upgrade range → Trade/Give → Collect AP → Move → Shoot**

When two actions compete for the same thing (the same square, the same dropped points, the same
spawned heart), the player who **locked in their action earliest wins**; the other one fails.

This produces the intended feel:
- **Moving dodges a shot:** because moves resolve before shots in the same slot, a tank that moves
  can escape a shot aimed at its old square.
- **Mutual destruction is possible:** shots resolve together, so two tanks can kill each other.
- **Trains, not swaps:** if an earlier-locked tank vacates a square, a later-locked tank can follow
  into it; two tanks cannot swap places.
- **Committing costs you:** if your move is blocked (you lost the square to someone faster, or it's
  occupied), you still **spend the AP** — at its current rung, though a bounce doesn't advance the
  move-cost ladder. Plan carefully.
- **Death stops you mid-turn:** if you're killed partway through resolution, your remaining queued
  actions are cancelled.

At the end of every period, each **living, non-haunted** player gains AP (default +1).

## 7. Combat, death & revival
- A shot removes **1 heart**. At **0 hearts you die**.
- On death you **drop all your AP** as a cache on your square, and your **tank stays on the board**
  (it doesn't block movement — living tanks can step onto it). You can be revived.
- **Collecting points:** move onto a cache and use **Collect AP** to take all of it.
- **Reviving:** a living player uses **Give heart / Revive** on a dead tank within range. The
  revived player returns with **1 heart, 0 AP, and range reset to 1**, on the square where they
  died (if it's still in bounds). The giver loses one heart.
- While dead you **don't earn AP**, **can't be shot**, and **can't be haunted** — but you **vote on
  the jury** (§10).

## 8. Hearts on the board
- You can never heal above 3 hearts.
- A **bonus heart spawns** on a random empty square every few periods (host-configurable). The
  first tank to **move onto it** claims +1 heart (capped at 3). If several arrive the same period,
  the earliest-locked mover gets it.

## 9. Trade & diplomacy
- A **trade** is a mutually agreed exchange: you propose giving/receiving AP and/or hearts, and it
  only happens if the other player **accepts** before the buzzer and is **within your range**.
  Trades are free (0 AP). No trade can push anyone above 3 hearts.
- Trades (and the chat) are the heart of alliances and betrayals.

## 10. The jury & haunting
- All dead players form a **jury**. Every few periods (host-configurable) the jury votes.
- Each juror casts **one vote** for a single outcome: **haunt** a living player, or **gift AP** to
  a living player. The single most-voted outcome wins; a tie means nothing happens that cycle.
- **Haunt:** the target **skips their next AP grant.** **Gift:** the target gains **+1 AP.**
- Jury votes are **secret**.

## 11. Winning
- The game runs until **3 living players remain** — they take **1st, 2nd, and 3rd**.
- **At 4 players left**, they may end early: if **all four agree** on a 1st/2nd/3rd ranking, the
  game ends immediately (4th place to the odd one out); otherwise play continues to the final 3.
- Everyone else is ranked by **when they were eliminated** (dying later places you higher).

## 12. Information & secrecy
| Everyone can see | Only you can see |
|---|---|
| Positions, hearts, who's alive/dead, kills | Your **AP** balance |
| Moves and shots (origin & target square) | Your **range** |
| Deaths, revivals, heart spawns & pickups | Your **queued actions** (until the buzzer) |
| That a points-cache exists on a square | A cache's **amount**, until you collect it |
|  | **Trade details** and **jury votes** |

Range upgrades are never announced — opponents can only *infer* your range when you shoot from far.

## 13. Host-configurable settings (set when creating a game)
Period length · AP granted per period (default 1) · heart-spawn frequency · jury-vote frequency ·
board size (default 20×20) · min/max players (default 10 / 17). All "every X" timers are counted
in periods. These exist so the game can be tuned during playtesting without code changes.

## 14. Multiplayer & accounts
- Any user can **create a room** and invite others by **code**, or let players **join open rooms**.
- Players gather in a **waiting room**; once enough have joined, the **host starts** the game and
  everyone spawns onto the board.
- User **accounts, match history, and statistics** are stored.

## 15. User interface
- **Board:** grid showing tanks, dropped-point caches, and spawned hearts; your own range overlay.
- **Action menu + queue panel:** compose, reorder, and cancel your queued actions; an AP meter
  shows what you can still afford.
- **Countdown + resolution reveal:** live timer, then an animation of the buzzer outcome.
- **Chat:** WhatsApp-style **global chat** and **1:1 direct messages** to any player.
- **History:** a chess.com-style timeline of past (public) moves.
- **Trade panel** and, for dead players, a **jury voting panel.**

## 16. Technology
**Convex** (real-time database + scheduled server functions) with **TypeScript**, and a
**React + Vite + TailwindCSS + shadcn/ui** front end. The game is built **async-robust** (durable
server-side timers + notifications) so a period resolves on schedule even if players are offline.
*(Note: Redux is intentionally not used — Convex's reactive queries replace it. See
`Implementation.md` §2.3.)*

## 17. Roadmap
Delivery is staged (foundations → lobby → **core engine, built test-first** → action loop → full
mechanics → social & endgame → async hardening → beta & launch). See **`Implementation.md` §11**
for the detailed plan and acceptance criteria of each stage.
