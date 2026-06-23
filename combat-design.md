# Tank Turn Tactics — Combat & Move-Resolution Design Notes

> **What this is:** a record of the design discussion (owner ↔ Claude, 2026-06-23) working through
> **how to fix the "everyone moves first" combat problem** so the game is *fun*, not just correct.
> It follows the Deep Council analysis (see `PLAYTEST.md` §F1 and the council verdict recorded there).
>
> **Status: EXPLORATION — not a locked decision.** Nothing here changes the ruleset; the authoritative
> ruleset stays in `Implementation.md §3` / `PRODUCT.md`. The open questions for the host are at the
> end. (Distinct from `design.md`, which is the *visual* design system.)

## The problem in one line
Because moves resolve before shots **and** everyone plans secretly at the same time, the smart play is
"move first" — so shots hit empty squares and almost nobody dies. Combat feels like blind guessing.
(Full detail: `PLAYTEST.md` §F1.)

## The thread of the discussion (in order)

### 1. "Duel vs threat" is the *player's* choice, not the designer's
Two ways combat could feel:
- **Duel** — you aim, you hit; winning is about out-shooting people.
- **Threat** — the gun is leverage; you scare people into deals and let the shrinking map do the killing.

**Conclusion:** the owner shouldn't *pick* one. Both should be viable, and each *player* leans how they
like (aggressive vs political). The system's job is to **support both**, not to choose.

### 2. A threat only counts if the gun can actually kill (the credible-threat rule)
A "pure threat" gun is self-defeating: *a guard dog with no teeth keeps no one out.* If everyone learns
you can almost never land a shot, the threat is ignored and the whole "scare people into deals" layer
collapses. So **kills must be genuinely possible and believable** — which also retires the idea (floated
by one advisor) that "kills can be rare, let the board do the work." Too rare = no fear = everyone
ignores each other.

### 3. Therefore both playstyles need the SAME one thing
**A shot has to be able to land on someone who tries to slip away.** That's the shared foundation. Get
it and the aggressive player kills while the schemer threatens — both work. Miss it and *neither* works.

### 4. The real-time detour — and why the periodic model is stronger *on fun*
Idea: make moves happen the instant you click (real-time), keep AP arriving every ~10 min.
- **Problem the owner spotted:** spend all your AP and you sit idle until the next refill — if everyone
  empties out together the game *freezes*. That's a **fun** problem (dead time), independent of build cost.
- **Why the current model avoids it:** the 10-minute wait isn't dead time — it *is* the scheming phase
  (chat, deals, traps, positioning). The buzzer is the payoff.
- **"How do you save AP?"** You just don't spend it — AP banks with no cap (already true today). Hoard a
  few rounds, then unleash a burst. *When* to spend the hoard is itself a core skill (straight from the
  original Tank game).

**Takeaway:** real-time *adds* an idle problem the periodic model doesn't have — and (see below) we don't
need real-time to fix the killing problem anyway.

### 5. The master dial: how many squares can the target be in when the shot lands?
This single question governs whether combat is fun:
- **Many possible squares → shooting is a GUESS → kills feel like LUCK → not fun.**
- **Few possible squares → shooting is a READ → kills feel EARNED → fun.**

Point shots, area shots, real-time — all of it is *downstream* of this.

### 6. Why "area shots" only *half*-solve it
Remember **positions are public** — you're not guessing where the enemy *starts*, only where they *go*.
A blast covering a square *plus the ring of squares touching it* already covers **every square reachable
in one step** — so against a one-step dodge it's a **guaranteed hit, not a guess.** The lottery only
returns when the target can run **two or more squares.**

### 7. The true lever: cut the link between AP and how far you can run
Today: **more AP → run farther → impossible to hit.** That's the spiral. Fix it by **capping movement
per period** (e.g. 1, maybe 2 squares) *regardless of how much AP you have.* Then:
- a modest blast reliably covers the escape squares → **killing is dependable, not a dice roll**;
- AP still matters hugely — shooting more, range upgrades, revives, trades, banking — just **not** for
  becoming untouchable;
- the dodge survives as a small, *costed* choice ("spend my one step to slip the likeliest shot?"), not
  a free escape *or* a coin-flip.

*"Don't build a gun that chases a sprinter — stop the sprinting, and an ordinary shot lands fine."* (Also
how the original Tank game felt: step-at-a-time movement, and shooting your neighbour just worked.)

## Working direction (tentative — pending host call)
- **Keep** the period-based simultaneous model (do **not** go real-time).
- **Don't pick** duel-vs-threat; make the gun *real* so both playstyles work.
- **Two dials, set together:** (a) movement distance per period, (b) shot/blast footprint — tuned so a
  kill is *read + commit*, not a gamble.

## Open questions for the host
1. **THE live one — should one player, alone, be able to reliably kill another?**
   - **Yes** → cap movement short (1–2 squares); solo duels work.
   - **No, killing should take teamwork** → keep movement freer; kills come from *cornering* (two players
     cross-covering escape squares, or pinning against the shrinking edge). More social, fewer lone-wolf
     kills — leans into the alliances/betrayal pitch.
2. **Movement cap:** hard cap (1? 2?) or an escalating AP cost per extra step?
3. **Shot footprint:** radius-1 area to start? Tied to the secret range stat, or fixed?
4. **Economy knock-ons:** does this change starting AP (F6) / AP-per-period? Bigger banks = better
   sprints, so the movement cap and the AP drip must be tuned together.

These feed `PLAYTEST.md` decisions **D1** (combat fix) and **D2** (real-time vs periodic).

## See also
- `PLAYTEST.md` §F1 — the original finding + the Deep Council verdict.
- `Implementation.md §3.5–3.6` — the current (locked) resolver & "move beats shoot".
- `PRODUCT.md §5–6` — player-facing actions & how a period resolves.
