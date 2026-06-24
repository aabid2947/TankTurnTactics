# Tank Turn Tactics — Official Rule Book

> **A tank on a shrinking grid. A gun you keep secret. Ten minutes to scheme — one
> heartbeat to resolve.** This is the players' guide: everything you need to play and
> every rule you can be held to, in reading order.
>
> Outranked only by the spec: if anything here ever disagrees with **`Implementation.md §3`**,
> that document wins. (Player-facing design lives in `PRODUCT.md`; this book is the
> tidied, example-driven version you actually read at the table.)

---

## Contents
1. [The game in one minute](#1-the-game-in-one-minute)
2. [The one idea you must understand first](#2-the-one-idea-you-must-understand-first)
3. [Setup & your tank](#3-setup--your-tank)
4. [The period — a single turn of the game](#4-the-period--a-single-turn-of-the-game)
5. [Your actions](#5-your-actions)
6. [How the buzzer resolves — the order of everything](#6-how-the-buzzer-resolves--the-order-of-everything)
7. [Worked examples](#7-worked-examples)
8. [Combat, death & revival](#8-combat-death--revival)
9. [The board shrinks](#9-the-board-shrinks)
10. [Bonus hearts on the board](#10-bonus-hearts-on-the-board)
11. [Trading & diplomacy](#11-trading--diplomacy)
12. [The jury & haunting (life after death)](#12-the-jury--haunting-life-after-death)
13. [Winning](#13-winning)
14. [What's secret, what's public](#14-whats-secret-whats-public)
15. [Quick reference card](#15-quick-reference-card)
16. [Glossary](#16-glossary)

---

## 1. The game in one minute

You are a **tank** on a grid full of other tanks. You earn **Action Points (AP)** slowly,
in real time, and spend them to **move, shoot, upgrade your range, heal, collect, trade,
and revive**.

- Everyone can see **where you are** and **how many hearts** you have.
- **Nobody** can see your **AP**, your **range**, or what you're planning.
- When a player dies, the **board shrinks** — the walls close in.
- Die, and you join the **jury** of the dead, who can haunt or bless the living.

**Your goal: finish in the top 3.** Play continues until three tanks are left standing.
It's a game of tactics *and* of alliances, bluffing, and betrayal — most of which happens
in the chat, not on the grid.

---

## 2. The one idea you must understand first

Tank Turn Tactics does **not** play in real time, and it is **not** a normal "I move, then
you move" turn game. It runs in repeating **periods** (say, 10 minutes each), and works like
a sealed-orders battle:

1. **During the period** — the planning window — you quietly build an **ordered list of
   actions** (a *queue*). You can reorder or cancel it as many times as you like. **No one
   can see your queue.** Meanwhile you chat, scheme, and cut deals.
2. **At the buzzer** — the period ends and **everyone's queued actions resolve at once**, in
   a strict, deterministic order (explained in §6). The board then animates what happened.
3. **After resolution** — everyone is granted AP, scheduled events (heart spawns, jury votes,
   the board shrink) fire if due, and the next period's countdown begins.

> **"Real-time" means the chat, the countdown, and the result reveal are live — *not* that
> your tank moves the instant you click.** You commit during the window; the world moves at
> the buzzer.

Everything else in this book is detail hanging off that single idea. If you only remember one
thing: **you are writing secret orders that all execute together.**

---

## 3. Setup & your tank

### The board
- A square grid, **20×20 by default** (the host can change it).
- Each cell holds **at most one living tank**. (Dead bodies, dropped AP, and bonus hearts can
  share a cell with a tank or each other — see later sections.)
- The board **shrinks** as players die (§9).

### Where you start
- Tanks spawn at **random** cells, with **at least one empty cell between any two tanks**.
- You will **never** spawn in the **outer two rings** of the board — you start with room around
  you.

### Your three stats
| Stat | You start with | Limit | Can others see it? |
|---|---|---|---|
| **Hearts** | 3 | max **3**, you die at **0** | ✅ **Yes** |
| **Action Points (AP)** | **0** | no cap — bank as much as you like | ❌ **Secret** |
| **Range** | **1** | no cap (board-limited) | ❌ **Secret** |

**Range is a square around you** (Chebyshev distance), not a circle:
- **Range 1** = the **8** cells touching you.
- **Range 2** = the full **5×5 block** centred on you (24 cells).
- **Range *r*** = every cell within *r* steps in any direction, diagonals included.

There is **no line-of-sight blocking** — if a cell is within your range number, you can hit it.

> You begin with **0 AP**, so your first move is to wait for the AP drip and start planning.
> AP arrives at the end of each period (default **+1**).

---

## 4. The period — a single turn of the game

Every period runs the same three beats:

**① During the period (plan & talk).**
A live countdown is running. You:
- **Chat** — global chat and 1:1 direct messages. Make allies. Lie to them.
- **Queue actions** — build your ordered list. You may queue **only what your current AP can
  pay for**. Reorder and cancel freely until the buzzer.
- The board is **frozen** during this window — nothing on the grid actually moves yet.

**② At the buzzer (resolve).**
All queues execute simultaneously by the rules in §6. Tanks move, shots fire, deals close,
players may die.

**③ After resolution (upkeep), in this order:**
1. The **board shrinks** for every death this period (§9).
2. **AP is granted** — every **living, non-haunted** player gains AP (default **+1**).
   Haunted players are skipped (§12); haunt marks then clear.
3. If it's a **heart-spawn period**, a bonus heart appears (§10).
4. If it's a **jury period**, the dead vote (§12).
5. The game checks for a **winner** (§13).
6. The **next period** is scheduled — and round we go.

All "every X periods" timers (heart spawns, jury votes) count off the **same master clock**,
so the game is fully deterministic.

---

## 5. Your actions

These are everything you can queue. Costs are in **AP**.

| Action | Cost | What it does |
|---|---|---|
| **Move** | **1, 2, 3, 5, 7, …** | Step to one **adjacent** cell (including diagonals), if it's empty. The *n*-th move of a period costs the *n*-th rung (see below). |
| **Shoot** | **1** | Fire at a cell **within your range**; a living tank there loses **1 heart**. |
| **Upgrade range** | **2, 3, 5, 7, 11, …** | Raise your range by 1. The *n*-th upgrade costs the *n*-th prime: 1→2 = **2**, 2→3 = **3**, 3→4 = **5**, 4→5 = **7**, … |
| **Add heart** (self-heal) | **3** | Heal yourself **+1 heart** (never above 3). |
| **Collect AP** | **1** | Pick up the **entire** AP cache sitting on your current cell. |
| **Trade** | **0** | A mutually-agreed swap of AP and/or hearts with a player in range (§11). |
| **Give heart / Revive** | **0** | Give one of your hearts to a tank in range — heal an ally, or revive a dead body (§8, §11). |

A few things worth internalising:

- **You can queue many actions per period** — as many as your AP affords. A longer plan means more
  slots and more reactivity later in resolution (see §6) — but moves and range-upgrades both get
  pricier the more you stack into one period.
- **Range upgrades get expensive fast,** and follow the primes — 1→2 = 2, 2→3 = 3, 3→4 = 5, 4→5 = 7,
  5→6 = 11, … Range is permanent, so this **stacks across the whole game**; queuing 1→2→3 in one
  period costs **2 then 3 = 5 AP**.
- **Moves get expensive fast too.** The first move of a period costs **1 AP**; each further move
  costs the next prime — **1, 2, 3, 5, 7, 11, …** The ladder **resets every period**, so a single
  step is always cheap, but crossing three cells in one period costs **1 + 2 + 3 = 6 AP**. (A move
  that **bounces** is charged its current rung but doesn't climb the ladder.)
- **Bonus hearts are grabbed by moving onto them** (free, automatic). **AP caches are *not*** —
  you must stand on the cache and use **Collect** (§8, §10).

### Do you get your AP back if an action fails?
Sometimes. The rule is simple once you see the logic — **you pay if you *attempted* something,
you're refunded if there was *nothing to attempt*:**

| Outcome | AP? |
|---|---|
| A **move that bounces** (the cell was taken or off-board) | **Spent** (its current rung) — you tried to move; a bounce doesn't advance the move ladder. |
| A **shot that misses** (nobody there) | **Spent** — you pulled the trigger. |
| A **trade** the partner never accepted | **Refunded** — nothing happened. |
| A **revive/give** with no valid target on the cell | **Refunded.** |
| A **Collect** with no cache on your cell | **Refunded.** |

> **Committing costs you.** Plan your moves carefully — a blocked move still burns the AP.

---

## 6. How the buzzer resolves — the order of everything

This is the engine of the game. Read it twice.

Everyone queued an **ordered list**. At the buzzer, resolution goes **slot by slot**:

> **Everyone's 1st action resolves, then everyone's 2nd, then everyone's 3rd, …**

A player who queued more actions simply keeps acting in later slots after shorter plans have
run out — so **more AP buys you more *reactivity*: your later actions land on a board that has
already moved.**

**Within a single slot,** actions don't fire in a free-for-all. They're grouped by type and the
groups run in this fixed **priority order:**

> ### Heal → Upgrade → Trade/Give → Collect → **Move → Shoot**

When two actions fight over the same thing — the same destination cell, the same AP cache, the
same bonus heart — the player who **locked their action in earliest wins**; the other one fails.
("Locked in" = when you last edited that action. Decide early to win ties.)

### The four consequences that define the game
This ordering is deliberate. It produces exactly these behaviours:

- **Moving dodges a shot.** Moves resolve *before* shots in the same slot. So a tank that moves
  has already left when shots are fired — the shooter hits an empty square. *(This is the single
  most important interaction to understand.)*
- **Mutual destruction is real.** All shots in a slot fire **simultaneously** against a snapshot
  of the board, so two tanks can kill each other in the same instant.
- **Trains work; swaps don't.** Moves resolve one at a time in lock-in order against the live
  board. If an earlier-locked tank vacates a cell, a later-locked tank can follow into it (a
  train). But two adjacent tanks can **never** swap places — whoever resolves first finds the
  other still there and bounces.
- **Death stops you mid-turn.** If you're killed partway through resolution, your remaining
  queued actions are **cancelled** — anything after the fatal slot never happens.

---

## 7. Worked examples

Coordinates are `(x, y)`. "Adjacent" includes diagonals.

### Example A — Moving dodges a shot
- **Tank B** at `(6,5)`, range ≥ 1, queues slot 1: **Shoot `(5,5)`**.
- **Tank A** at `(5,5)`, queues slot 1: **Move to `(5,6)`**.

Resolving slot 1: the **Move** group runs before the **Shoot** group.
1. A moves `(5,5)` → `(5,6)`, spends 1 AP. Cell `(5,5)` is now empty.
2. Shots fire: B's shot at `(5,5)` finds **no tank** → **miss**, 1 AP spent.

**Result:** A dodged. Both paid 1 AP; nobody lost a heart. This is the "everyone moves first"
instinct in action.

### Example B — Mutual kill
- **A** at `(5,5)` and **B** at `(6,5)` are adjacent, each on **1 heart**, each with range ≥ 1.
- Both queue slot 1: **Shoot the other**. Neither moves.

Resolving slot 1, Shoot group: the board is snapshotted with both tanks in place. A's shot hits
B; B's shot hits A. **Both hits apply at once:** each drops to **0 hearts** → **both die**. Each
drops an AP cache where they fell.

### Example C — A train, and a failed swap
**Train (works).** A at `(5,5)` locked her move *first*; B at `(4,5)` locked *later*.
- A queues **Move → `(6,5)`** (empty). B queues **Move → `(5,5)`** (A's current cell).
- Move group runs in lock order: **A first** — moves to `(6,5)`, vacating `(5,5)`. **Then B** —
  `(5,5)` is now empty, so B follows in. Both moves succeed: a train.

**Swap (fails).** A at `(5,5)`, B at `(6,5)`, adjacent. A queues **Move → `(6,5)`**, B queues
**Move → `(5,5)`** — they're trying to trade places. A locked first.
- Move group, lock order: **A first** — tries `(6,5)`, but B is still there (B hasn't moved) →
  A **bounces**, 1 AP spent. **Then B** — tries `(5,5)`, but A is still there → B **bounces**,
  1 AP spent. **Nobody moves; both paid.** Two tanks can't swap.

### Example D — More AP = the last word
- **B** (1 AP) queues `[Move]`. **A** (4 AP) queues `[Move, Move, Shoot]` — her two moves cost 1 + 2 and the shot 1 (4 AP total).
- **Slot 1:** both move.
- **Slot 2:** only A has an action — A moves again, now reacting to where B ended up.
- **Slot 3:** only A acts — A shoots, aiming at B's *final* position.

A's deeper bank let her act **after** B was out of actions, turning her AP advantage into a
clean shot. Banking AP is a weapon.

---

## 8. Combat, death & revival

### Getting shot
- Each shot that lands removes **1 heart**. At **0 hearts you die**.
- A shot only lands if, at the moment shots fire, the target cell is **within the shooter's
  range** and **holds a living tank** (§6, §7).

### When you die
- You **drop all your AP** as a **cache** on the cell where you died.
- Your **tank stays on the board** as a **body**. It does **not** block movement — living tanks
  can walk over it — and it can be **revived**.
- While dead you **earn no AP**, **can't be shot**, and **can't be haunted** — but you join the
  **jury** (§12).

### Picking up dropped AP
A cache just sits there. To take it: **move a tank onto the cache's cell, then use Collect AP**
(costs 1 AP, grabs the *whole* cache). Others can see a cache *exists* but not how big it is
until someone collects it.

### Reviving the dead
A living player uses **Give heart / Revive** on a body **within range**:
- The body returns to life with **1 heart, 0 AP, and range reset to 1**, on the cell where it
  died (if that cell is still in-bounds).
- The reviver **loses one heart** (revival is generous, and costs you).

---

## 9. The board shrinks

The arena closes in as tanks fall:

- **Trigger:** **1 row + 1 column** are removed **per death**, applied **once at the end of the
  period**. Three deaths in a period shrink the board three steps.
- **Which edges:** removal **alternates** to keep the board roughly centred (top/left, then
  bottom/right, and so on).
- **Caught outside:** any **living tank left outside the new edge dies.** Bodies, AP caches, and
  un-claimed bonus hearts on removed cells are **lost** — and a body lost this way can **never be
  revived**.
- **No cascade:** deaths *caused by* the shrink do **not** trigger further shrinking that period.
- **Floor:** the board never shrinks below what fits the survivors (and never below 3×3).

**Tactically:** the edge is a weapon. Pin an enemy against a side that's about to vanish and the
walls will do your killing for you.

---

## 10. Bonus hearts on the board

- Every few periods (host-configurable, **default every 5**), a **bonus heart** spawns on a
  random empty cell.
- The **first tank to step onto it** claims **+1 heart** (never above 3) — this is **automatic
  and free**, just by moving there (unlike AP caches, which need Collect).
- If several tanks reach it in the same slot, the **earliest-locked mover** wins the cell; the
  others bounce (and pay their move AP).
- You can never exceed **3 hearts** by any means.

---

## 11. Trading & diplomacy

- A **trade** is a **mutually agreed** exchange: you propose what you'll **give** and **receive**
  (AP and/or hearts), and it executes **only if** the other player **accepts before the buzzer**
  *and* is **within your range** when the trade resolves.
- Trades cost **0 AP**. No trade can push anyone above **3 hearts**.
- **Give heart / Revive** is the one-way cousin: hand a single heart to a tank in range — to heal
  an ally (their hearts +1, capped at 3) or to revive a body — at the cost of one of your own
  hearts (§8).

Trades and the chat are where the real game lives. There's **no formal alliance system** — bonds,
betrayals, and protection rackets are things you build (and break) through talk and trades.
A deal is only as good as the person you struck it with.

---

## 12. The jury & haunting (life after death)

Dying isn't the end of your influence.

- Every dead player joins the **jury**. Every few periods (host-configurable, **default every 3**,
  whenever at least one player is dead) the jury votes.
- Each juror casts **one secret vote** for a single outcome aimed at a living player:
  - **Haunt** them → that player **skips their next AP grant**.
  - **Gift** them AP → that player gains **+1 AP**.
- All votes pool into one tally; the **single most-voted outcome wins.** A **tie means nothing
  happens** that cycle.
- Votes are **secret** — no one knows who the jury blessed or cursed, or who voted how.

So the dead become kingmakers: starve the front-runner, or quietly fund a friend's comeback.

---

## 13. Winning

- The game runs until **3 living tanks remain**. They take **1st, 2nd, and 3rd**.
- Among those final three, placement is decided by tiebreak in this order:
  **most hearts → most kills → most total AP → earliest spawn order.**
- **The final-four deal:** when exactly **4 players** are left, they may end early. If **all four
  agree** on a 1st/2nd/3rd ranking (the odd one out takes 4th), the game ends immediately at the
  next period boundary. If they can't all agree, play continues to the final 3.
- **Everyone else is ranked by when they were eliminated** — **dying later places you higher.**

So even a losing game is a fight for position: outlast one more rival and you move up the board.

---

## 14. What's secret, what's public

The information war is half the game. Here's exactly who knows what.

| Everyone can see | Only **you** can see |
|---|---|
| Every tank's **position** | Your **AP** balance |
| Every tank's **hearts**, and who's alive/dead | Your **range** |
| **Moves and shots** (origin & target cell) | Your **queued actions** (until the buzzer) |
| **Deaths, revivals, kills** | **Trade details** |
| **Heart spawns & pickups** | **Jury votes** |
| That an **AP cache exists** on a cell | A cache's **amount**, until it's collected |

> **Range is never announced.** Opponents can only *infer* it — e.g. when you land a shot from
> far away. A range **upgrade** produces **no public event** at all. Your reach is your secret;
> guard it, or bluff it.

---

## 15. Quick reference card

**Action costs**
| Action | AP |
|---|---|
| Move | 1, 2, 3, 5, 7, … (n-th move of the period) |
| Shoot | 1 |
| Upgrade range | n-th prime (1→2 = 2, 2→3 = 3, 3→4 = 5, 4→5 = 7, …) |
| Add heart (self-heal) | 3 |
| Collect AP | 1 |
| Trade | 0 |
| Give heart / Revive | 0 |

**Resolution priority (within each slot)**
`Heal → Upgrade → Trade/Give → Collect → Move → Shoot`
Ties broken by **earliest lock-in**.

**Remember**
- Slots run 1st-action-for-everyone, then 2nd, then 3rd…
- **Move beats Shoot** → moving dodges a same-slot shot.
- **No swaps** (trains only). **Mutual kills** happen. **Death cancels** your remaining actions.
- Failed *attempt* (bounce/miss) = AP **spent**. Structurally *void* (no target/cache/acceptance) = AP **refunded**.

**Key numbers (defaults — the host can tune these)**
| Thing | Default |
|---|---|
| Starting hearts / AP / range | 3 / 0 / 1 |
| Heart cap | 3 |
| AP granted per period | +1 |
| Board size | 20 × 20 |
| Players | 10–17 |
| Bonus heart spawns | every 5 periods |
| Jury vote | every 3 periods |
| Period length | set by the host |
| Win condition | last **3** standing (top-3 place) |
| Board shrink | 1 row + 1 col **per death**, end of period |

---

## 16. Glossary

- **Period** — one full turn of the game: a planning window followed by the buzzer.
- **The buzzer** — the moment a period ends and all queues resolve at once.
- **Queue** — your secret, ordered list of actions for the period.
- **Slot** — the *n*-th action across all players; slots resolve in order (all 1st actions, then
  all 2nd actions, …).
- **Lock-in** — when you last edited an action; the earliest lock-in wins contested ties.
- **AP (Action Points)** — your secret currency; earned over time, spent on actions, banked
  without limit.
- **Range** — your secret square reach for shooting/trading/giving (Chebyshev distance).
- **Cache** — dropped AP left where a tank died; grabbed with **Collect**.
- **Body** — a dead tank still on the board; non-blocking and revivable until lost to a shrink.
- **Bounce** — a move that fails (cell taken or off-board); you still spend the AP for that rung, but it doesn't advance the move-cost ladder.
- **Train** — a chain of moves where each tank follows into the cell the one ahead just vacated.
- **Haunt / Gift** — the jury's two powers: skip a player's next AP grant, or give them +1 AP.
- **Jury** — all dead players, voting periodically to haunt or gift the living.

---

> **A living document.** Some numbers above are **host-configurable** and are being tuned during
> beta — your game's settings (shown when the room is created) are the real values. The rules
> themselves track **`Implementation.md §3`**, which is authoritative if any doubt arises.
