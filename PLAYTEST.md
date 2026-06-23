# Tank Turn Tactics — Playtest Log

> **What this is:** a running log of hands-on playtests (Stage 7 — *beta & launch*). Each session
> records what was tested, what broke, and — most importantly — **which findings need a host
> decision vs. which are clear fixes**.
>
> **Relationship to the canonical docs:** this file is a *capture*, not a ruleset. Nothing here
> changes the game until the host decides. When a finding is approved, the change lands in the
> canonical docs (`PRODUCT.md` / `Implementation.md §3`) and the relevant code, and the finding is
> ticked off below. `Implementation.md §3` remains authoritative if anything here disagrees.
>
> **How to read a finding:**
> - **Severity** — 🔴 critical · 🟠 major · 🟡 minor
> - **Type** — `BUG` (behaves against spec) · `UX` (clear usability fix) · `BALANCE` (a tunable
>   knob/number) · `DESIGN` (touches a **locked** decision → **needs host sign-off**, do not just
>   implement)

## Session index
- [Session 01 — 2026-06-19 — first hands-on combat playtest](#session-01--2026-06-19--first-hands-on-combat-playtest)

---

## Session 01 — 2026-06-19 — first hands-on combat playtest

- **Participants:** `aabid2947` (project owner / host — git author) and `FiroZ UddiN`
  (collaborator, driving the hands-on play). Roles inferred from git + the transcript.
- **Build under test:** the Stage 3+ action loop on `main` (private per-period queue → scheduled
  `resolvePeriod`, interactive board, history). First time the **combat** loop was felt end-to-end
  by two humans rather than the deterministic test suite.
- **Source:** WhatsApp thread, 2026-06-19, 17:18–17:44 IST. Verbatim transcript in the
  [appendix](#appendix--verbatim-transcript-source-of-record).
- **Logged:** 2026-06-23.

### Headline
Combat doesn't feel right yet. The **`move-beats-shoot` rule** (intended as "moving dodges a shot",
`Implementation.md §3.6`) collapsed in practice into a **degenerate equilibrium**: the rational play
for *everyone* is "queue Move in slot 1", so almost nobody is ever hit and shooting becomes pure
guesswork. This was made worse by a **suspected queue bug** — a player with 5 AP could still only get
**one move to land per period**, which contradicts the spec (`§3.5`: more AP = more slots). On top of
that, four UX/balance papercuts.

> ⚠️ The big finding (**F1**) is pressure on a **locked decision** (period-based simultaneous
> resolution; "move beats shoot"). Per the working rules it is **not** to be re-litigated or
> silently changed — it is recorded here and routed to the host as **decision D1**.

### Findings

| # | Sev | Type | Finding (one line) | Spec ref | Touches |
|---|-----|------|--------------------|----------|---------|
| **F1** | 🔴 | `DESIGN` | "Move beats shoot" + secret simultaneous queues ⇒ everyone queues Move first ⇒ combat becomes unhittable / pure prediction | `PRODUCT.md §6`, `Implementation.md §3.5–3.6` **(LOCKED)** | the core resolver model |
| **F2** | 🟠 | `BUG` | With 5 AP, only **one** move lands in a period; moves don't chain | `Implementation.md §3.5` ("more AP = more slots") | `convex/engine/resolve.ts`, `convex/actions.ts`, `src/components/game/ActionQueue.tsx`, `InGameBoard.tsx` |
| **F3** | 🟠 | `DESIGN` | Proposal: execute **moves in real time**, keep **AP grants periodic** (every 10 min) | `PRODUCT.md §2`, `Implementation.md §2.1, §3.4` **(LOCKED)** | the turn model itself |
| **F4** | 🟡 | `UX` | Errors aren't surfaced — failed actions fail silently | — | mutation call sites (`ActionQueue.tsx`, board, trade/chat panels) |
| **F5** | 🟡 | `UX` | 1:1 (direct) chat UX is poor | `PRODUCT.md §15` | `src/components/game/ChatPanel.tsx` |
| **F6** | 🟡 | `BALANCE` | Players should **start with 3 AP** (currently 0) | `PRODUCT.md §4`, `Implementation.md §3.2` | `convex/games.ts` (`startGame`), config knobs `§3.18` |
| **F7** | 🟡 | `UX` | Trade is permanently pinned to the bottom; a **popup on "Give"** would read better | `PRODUCT.md §15` | `src/components/game/TradePanel.tsx`, `GameBoard.tsx` |

### Deep dives

#### F1 — The dodge/prediction equilibrium 🔴 `DESIGN` → **needs host decision (D1)**
- **What the spec intends.** `§3.6`: *"Move beats shoot every slot → queueing a move dodges a
  same-slot shot."* This is a deliberate feature — a tank can juke an incoming shot.
- **What emerged in play.** Because every queue is **secret** and everything resolves
  **simultaneously at the buzzer**, the *dominant strategy for everyone* is to put Move in slot 1.
  If everyone moves first, shots resolve against a board that has already changed — so you're
  shooting where a tank *was*, not where it *is*. `FiroZ`: *"I shoot — and the guy isn't even
  there."* `aabid` named the equilibrium directly: *"Everyone will choose move as their first
  move, so the chances of getting hit drop way down."*
- **Why it matters.** The dodge was meant to be an *occasional clutch play*; instead it's the
  *default*, which guts the shooting half of the game and turns combat into blind prediction
  ("predict where he'll go, and when").
- **Important sequencing note:** **F2 is probably amplifying this.** If you can only land one move
  per period (the bug), the board state players are reasoning about is artificially sparse and the
  feel is even more broken. **Fix F2 first, then re-judge F1** — the equilibrium may soften (or
  not) once multi-move chains actually work.
- **Option space for the host** *(recorded for D1 — not chosen here)*:
  - **Options that PRESERVE the locked model (tuning, not re-litigation):** cap moves-per-period or
    make repeated moves cost-escalate (so "always move" has a price); let *some* shots lead moves
    (e.g. a "snap shot" action that resolves in the move bucket); leak partial information so blind
    prediction isn't the only counter; lean on the AP economy so move-spamming starves your other
    actions.
  - **Option that CHANGES the locked model:** **F3** (real-time moves). This is a turn-model change,
    not a tuning knob — bigger blast radius, separate decision.

#### F1 — Deep Council verdict (analysis, 2026-06-23) → input for D1/D2
A four-advisor **independent** council (champion / critic / realist / devil's-advocate, each blind to
the others) analyzed the move-resolver problem. **Convergence — 3 of 4, including the dedicated
skeptic:** the root cause is the **free dodge** (move beats shoot at zero cost), *not* simultaneous
resolution; and the fix is to give shooting an **area / zone footprint** rather than chase precise
hits on point targets. They split on the *label* (Champion: "this fixes direct fire"; Critic: "this
*replaces* it with zone control") but point at the **same mechanic**.
- **Recommended path (preserves the locked model):** (1) fix **F2** and re-run the same playtest
  first — it confounds the evidence; (2) prototype **radius-1 area shots** (shoot a *cell*; damage
  hits that cell + its 8 neighbours; keep MOVE→SHOOT; splash radius = one tuning knob) — costed at
  ~1 day / one engine bucket / ~3–6 test rewrites; (3) get the host's product call.
- **Rejected for now:** reordering slot priority (just flips to "everyone shoots first" → deterministic
  crossfire); overwatch / reaction-shots (Critic: "worst trap" → mutual-camping stalemate; Realist:
  most expensive, breaks the clean phase model); a flat escalating move-cost (Critic: punishes the
  loser → death-spiral).
- **Product question surfaced (host call):** is combat a *precision duel* or a *blunt social threat*?
  The game's own pitch ("alliances, bluffing, betrayal") leans to the latter — which *is* the
  area/zone direction.
- ⚠️ **Unverified — scale:** all evidence is from a **2-player** playtest; the game ships at
  **10–17**. The Critic's projection that prediction-combat decoheres at high counts (and survival
  rewards turtling) is **untested** — validate the chosen fix at 6–10 players, not 2.

#### F2 — One move per period despite spare AP 🟠 `BUG`
- **Reported:** *"Even if I have 5 AP, right now I can only make one move in a single time period";*
  *"moves don't stack."*
- **Against spec:** `§3.5` is explicit — *"a player with more AP simply gets more slots."* Move costs
  1 AP (`§3.3`), so 5 AP should buy up to 5 chained moves across slots.
- **Backend looks permissive:** `convex/actions.ts` caps a queue at 64 actions and only blocks on
  **affordability** (`queueCost(kinds, range) > ap`) — no per-kind / per-period move cap. So the
  restriction is most likely **client-side** (the board/queue UI not letting you stack moves) or a
  resolver edge case.
- **Action:** reproduce, then trace the queue path UI → `queueAction` → `engine/resolve.ts`. Classify
  as a front-end limitation vs. an engine bug before fixing. **Do this before re-evaluating F1.**

#### F3 — Real-time moves vs. the 10-minute planning window 🟠 `DESIGN` → **needs host decision (D2)**
- **The proposal (`FiroZ`):** moves should *execute the moment you make them* (real time), while AP
  is still **granted periodically** (every ~10 min). Motivation: kills the prediction problem (F1)
  and the no-chaining problem (F2) in one move.
- **The tension (`aabid`):** *"If we make it real-time, does the 10-minute planning window even make
  sense anymore?"* — directly conflicts with the **locked** model (`PRODUCT.md §2`: *"You commit
  during the window; the world moves at the buzzer."*).
- **The partial reconciliation (`FiroZ`):** *"Yes — because AP still arrives every 10 minutes."*
  i.e. the period stops being a *resolution* boundary and becomes purely an **AP-budget refill**
  interval; you'd act reactively in real time but only as far as your banked AP allows.
- **Unresolved:** even with that, "planning window" effectively becomes "AP cooldown", and the whole
  simultaneous-resolution engine (the project's *defining mechanic*) would be replaced. **High blast
  radius — explicit host call required.** Recorded, not decided.

### Minor / papercuts (F4–F7)
- **F4 — Errors fail silently.** Mutations throw readable strings (e.g. `"Not enough AP for that
  plan"`, `"You're not alive"`) but the UI swallows them. Surface them (toast/inline) at the mutation
  call sites. *Clear fix.*
- **F5 — 1:1 chat UX.** Direct-message flow in `ChatPanel.tsx` feels off. Needs a UX pass (how you
  pick a recipient / switch threads). *Clear fix, needs a small design think.*
- **F6 — Start with 3 AP.** Currently start = 0 (`PRODUCT.md §4`). Note: **starting AP is not a host
  knob today** — implementing this is either a constant change in `startGame` or a *new* configurable
  knob. *Balance change → quick host confirm (the number), then a clear fix.*
- **F7 — Trade placement.** Trade panel is pinned to the bottom; a **popup triggered from "Give"**
  was suggested as more natural. *Clear fix, UX.*

### What needs the host (decisions)
- [ ] **D1 — F1:** Accept the move-first equilibrium, *tune* it (preserve the locked model), or
      escalate to **D2**? → *Deep Council (2026-06-23) recommends: fix F2 → re-test → prototype
      radius-1 area shots; do NOT reorder priority or add overwatch. Plus a product call: is combat a
      precision duel or a blunt social threat?*
- [ ] **D2 — F3:** Keep period-based simultaneous resolution, or move to real-time moves + periodic
      AP? (Replaces the defining mechanic — needs an explicit yes.) → *Council: 3/4 advisors reject
      the real-time switch as unnecessary-or-a-multi-week-rewrite that discards the 31-test engine;
      defer unless the duel-vs-threat product call demands continuous time.*
- [ ] **D3 — F6:** Confirm starting AP = 3 (and: fixed constant, or new host-configurable knob?).

### Clear fixes (no decision needed — once D-items above don't block)
- [ ] **F2** — make multi-move chains land (investigate UI vs. engine first).
- [ ] **F4** — surface mutation errors in the UI.
- [ ] **F5** — rework 1:1 chat UX.
- [ ] **F7** — move trade into a "Give"-triggered popup.

---

### Appendix — verbatim transcript (source of record)
> Hinglish original, left intact, with a faithful English gloss. Times are IST, 2026-06-19.

| Time | Who | Original | English gloss |
|------|-----|----------|---------------|
| 17:18 | FiroZ | likh deta hoo abhi / bhai but i think ap periodically mile lekin moves normally time based kr dete h jb move kiya ho jaye warna bahut prediction based ho jayega | I'll write it down now. But bro — I think AP should arrive periodically, while moves just execute normally in real time (they happen when you make them), otherwise it gets far too prediction-based. |
| 17:19 | aabid | Prediction based hi Jane m kya dikkat h | What's actually wrong with it being prediction-based? |
| 17:19 | aabid | Bas experience kharab nhi hona chahiye | I just don't want the experience to be bad. |
| 17:20 | FiroZ | bhai mea shoot krta hoo banda waha hota hi ni | Bro, I shoot — and the guy isn't even there [anymore]. |
| 17:21 | aabid | To wo pahle move kar gya simple | Then he moved first — simple. |
| 17:21 | aabid | Oh ek min | Oh — wait a minute. *(catching the implication)* |
| 17:21 | FiroZ | haa to mujhe kesse pta hota ye , mea predict karo kaha jayega wo kb kb | Right — so how was I supposed to know that? I have to predict where he'll go, and when. |
| 17:21 | aabid | Ye to problematic h / Everyone will choose move as their first move to marne ke chances bahut kam ho jaege | This is problematic. Everyone will pick Move as their first action, so the chances of getting hit drop way down. |
| 17:22 | FiroZ | yes | yes |
| 17:22 | FiroZ | dusri bahut badhi dikkat | Second — a really big problem: |
| 17:23 | FiroZ | agar mere pe 5 AP h phir bhi mea ek time period mea ek hi move kr paa raha hoo abhi | Even if I have 5 AP, right now I can only make one move in a single time period. |
| 17:23 | aabid | Move stack nhi kar paa rha ,mm | Moves don't stack, hmm. |
| 17:24 | FiroZ | isko time period queue krna acha idea ni tha | Queuing this per-time-period wasn't a good idea. |
| 17:29 | FiroZ | minor issues — errors sahi se ni btata ye abhi / chat mein 1v1 baat krne ka ux sahi ni h / start with 3 ap / trade permanently bottom pe h jb ki give pe popup zayada sahi hoag | **Minor issues:** it doesn't report errors properly right now · the UX for 1:1 chat is off · start with 3 AP · trade is permanently pinned to the bottom, whereas a popup on "Give" would be more appropriate. |
| 17:29 | FiroZ | major issue — move chain ni ho paarahe same time period / shoot krne se pehle hi banda hamesha move kr jayega / (indono ke liye to real real time move execute krna sahi hoga shayad) | **Major issue:** moves can't be chained within the same time period · the target always moves before you can shoot · (for both, maybe executing moves in real real-time would be the right fix). |
| 17:43 | aabid | Realtime kardenge to 10 minute ki window for planning ka koi sense banega?? | If we go real-time, will the 10-minute planning window even make any sense?? |
| 17:44 | FiroZ | yes kyunki ap 10 minutes pe milegi na | Yes — because AP still arrives every 10 minutes. |
