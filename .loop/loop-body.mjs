#!/usr/bin/env node
// loop-body — the BODY organ: the deterministic orchestrator that turns the other organs into ONE loop.
//
// The control flow lives HERE, as code — NOT as prose an autonomous agent can drift past. The script owns:
// which organ runs next, whether the goal's oracle is actually green, whether Metabolism says stop, and the
// iteration cap. Claude is only the EXECUTOR: it runs the single action `next` prints, the organ writes its
// verdict to the spine (.loop/state.json via loop-memory.mjs), and Claude calls `next` again.
//
// Keystone honesty property: the Body emits DONE *only* when every machine GATE in the goal's plan returned a
// fresh pass (eyes VERIFIED / immune CLEAN / senses GROUNDED, as that goal requires). A gate that couldn't run
// (UNVERIFIED / UNREVIEWED / UNGROUNDED) → BLOCKED, never a faked pass. It cannot false-green its own loop, and
// the iteration cap means it cannot run forever.
//
// Goal-aware shaping (Balanced + safety floor): the goal is classified into a PROFILE and only the organs that
// profile's oracle needs are run — a security audit skips the build + browser run, a research question never
// builds, a UI polish doesn't pay for a functional /eyes it doesn't need. Efficiency is the BYPRODUCT of a
// correct oracle, never the driver — so a SAFETY FLOOR guarantees shaping never drops a load-bearing gate:
// any plan that builds keeps /immune (changed code must be reviewed); a functional goal keeps /eyes.
//
//   node scripts/loop-body.mjs start --goal "<task>" [--max 3]   # classify, set goal, compute plan, emit first action
//   node scripts/loop-body.mjs next                              # advance the state machine, emit next action
//   node scripts/loop-body.mjs status                            # show profile / phase / plan / oracle / history
//   node scripts/loop-body.mjs block --reason "<why>"            # mark blocked (e.g. input gate failed)
//
// Pipeline (shaped per profile): frame → [research] → [decide] → [build] → [verify] → [review] → done

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const LOOP = join(process.cwd(), ".loop");
const STATE = join(LOOP, "state.json");
const METABOLISM = join(dirname(fileURLToPath(import.meta.url)), "loop-metabolism.mjs");
const DEFAULT_CEILING_USD = 250; // mirrors loop-metabolism.mjs — keep in sync
const die = (m) => { process.stderr.write("loop-body: " + m + "\n"); process.exit(1); };

function loadState() {
  if (!existsSync(STATE)) return { schemaVersion: 1, project: "", updatedAt: "", currentGoal: null, next: null, budget: null, body: null, latest: {}, log: [] };
  try { return JSON.parse(readFileSync(STATE, "utf8")); } catch (e) { die("state.json is corrupt: " + e.message); }
}
function save(state) { state.updatedAt = new Date().toISOString(); writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n"); }
function parseFlags(argv) {
  const f = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) { const n = argv[i + 1]; f[argv[i].slice(2)] = n !== undefined && !n.startsWith("--") ? argv[++i] : true; }
  }
  return f;
}

// ─── Goal-aware pipeline shaping ──────────────────────────────────────────────────────────────────────────
// research is only worth its (fan-out) cost when the goal needs *external* facts
const RESEARCH_HINTS = /\b(latest|newest|best|which|compare|vs\.?|should i (use|pick|choose)|state of the art|benchmark|alternativ|trade-?offs?|as of \d|current(ly)?)\b/i;
// goal-type classifiers — FIRST match wins, in this precedence (most specific intent first)
const PROFILE_HINTS = {
  audit:    /\b(audit|security review|pen ?test|vulnerab|threat ?model|find (bugs|vulns|vulnerabilit))\b/i,
  question: /\b(should i|which|what'?s the best|compare|recommend|investigate|explain|pros and cons|trade-?offs?|how (do|does|should) i)\b/i,
  bugfix:   /\b(fix|bug|broken|crash|errors?|fails?|failing|regression|not working|doesn'?t work|incorrect|wrong (output|result|behaviou?r))\b/i,
  ui:       /\b(ui|ux|styl(e|ing)|css|layout|re-?design|re-?style|polish|visual|look(s| and feel)?|theme|responsive|spacing|typograph|aesthetic)\b/i,
  refactor: /\b(refactor|clean ?up|tidy|rename|extract|simplif(y|ies|ication)|restructure|re-?organiz|de-?dup|consolidate)\b/i,
};
// a goal that asks to CHANGE code — so the "question" profile must not swallow a build task phrased as a question
const BUILD_VERBS = /\b(build|add|implement|create|make|write|fix|refactor|wire|integrat|set ?up|deploy|migrat|polish|re-?design|re-?style)\b/i;
// a goal with observable runtime behavior — the safety floor forces /eyes when one of these is present AND we build
const FUNCTIONAL_HINTS = /\b(flow|submit|log ?in|sign ?up|auth|save|loads?|fetch|api|endpoint|click|navigat|form|functional|behaviou?r|end-?to-?end|works?|feature|button|route|redirect|render)\b/i;

function profileFor(goal) {
  const g = goal || "";
  let name, plan;
  if (PROFILE_HINTS.audit.test(g))                                 { name = "audit";    plan = ["frame", "review"]; }
  else if (PROFILE_HINTS.question.test(g) && !BUILD_VERBS.test(g)) { name = "research"; plan = ["frame", "research", "debate", "commit"]; }
  else if (PROFILE_HINTS.bugfix.test(g))                           { name = "bugfix";   plan = ["frame", "build", "verify", "review"]; }
  else if (PROFILE_HINTS.ui.test(g))                               { name = "ui";       plan = RESEARCH_HINTS.test(g) ? ["frame", "research", "debate", "commit", "build", "review"] : ["frame", "build", "review"]; }
  else if (PROFILE_HINTS.refactor.test(g))                         { name = "refactor"; plan = ["frame", "build", "review"]; }
  else                                                             { name = "feature";  plan = RESEARCH_HINTS.test(g) ? ["frame", "research", "debate", "commit", "build", "verify", "review"] : ["frame", "debate", "commit", "build", "verify", "review"]; }

  // ─── SAFETY FLOOR — shaping may never drop a load-bearing gate (the price of keeping the honesty oracle) ──
  const hasBuild = plan.includes("build");
  if (hasBuild && !plan.includes("review")) plan.push("review");                                              // changed code MUST be reviewed by /immune
  if (hasBuild && FUNCTIONAL_HINTS.test(g) && !plan.includes("verify")) plan.splice(plan.indexOf("review"), 0, "verify"); // a functional goal MUST be run by /eyes
  return { name, plan };
}

function nextPlannedAfter(b, phase) {
  const i = b.plan.indexOf(phase);
  return i >= 0 && i + 1 < b.plan.length ? b.plan[i + 1] : "done"; // callers also guard via isLastPhase
}
function isLastPhase(b, phase) { return b.plan.indexOf(phase) === b.plan.length - 1; }

// the GATE phases — each produces a fresh classified verdict the Body must see PASS before advancing past it.
// (non-gate phases — frame / decide / build — just advance when Claude calls next.)
const GATE_ORGAN = { research: "senses", commit: "decide", build: "hands", verify: "eyes", review: "immune" };
const GATE_PASS  = { research: "senses GROUNDED", commit: "decision COMMITTED", build: "code BUILT", verify: "eyes VERIFIED", review: "immune CLEAN" };
function gatesSummary(b) {
  const gates = b.plan.filter((p) => GATE_ORGAN[p]).map((p) => GATE_PASS[p]);
  let s = gates.length ? gates.join(" + ") : "no machine gate (advisory profile)";
  if (b.profile === "ui") s += " — visual taste still needs human SIGNOFF (not machine-certified)";
  return s;
}

// the Body reads the organ's STRUCTURED verdict field (set via `loop-memory add --verdict`); prose is a fallback only
function verdictOf(entry) {
  if (entry && entry.verdict && ["pass", "fail", "unknown"].includes(entry.verdict)) return entry.verdict;
  return classify(entry && entry.summary);
}
// fallback for un-tagged write-backs. ANY failure token outranks a leading pass — closes the "VERIFIED x; FAILED y"
// false-green that bit the leading-token version. The structured --verdict above is the real fix; this is defense.
function classify(summary) {
  const s = (summary || "").trim().toUpperCase();
  if (/\b(FAILED|CONFIRMED|UNGROUNDED)\b/.test(s) || /\b\d+ +(CONFIRMED|BUG)/.test(s)) return "fail";
  if (/^(VERIFIED|CLEAN|GROUNDED|PASS|GREEN)\b/.test(s)) return "pass";
  return "unknown";
}
function freshResult(state, organ, sinceTs) {
  const l = state.latest[organ];
  if (!l || !l.ts) return null;
  if (sinceTs && new Date(l.ts).getTime() <= new Date(sinceTs).getTime()) return null; // stale (pre-dispatch)
  return l;
}

function emit(state, verb, organ, target, note) {
  const b = state.body || {};
  process.stdout.write(`ACTION: ${verb} | organ: ${organ} | profile: ${b.profile || "-"} | phase: ${b.phase || "-"} | iter: ${b.iteration ?? "-"}/${b.maxIterations ?? "-"}\n`);
  if (target) process.stdout.write(`target: ${target}\n`);
  if (note) process.stdout.write(`note: ${note}\n`);
}

function refreshBudget() {
  // run Metabolism OURSELVES so the cost gate isn't Claude's discretion (the council's "determinism theater" fix).
  // best-effort: if metabolism is absent/unreadable, measure self-fails and applyCostGate degrades safely.
  try { execSync(`node "${METABOLISM}" measure`, { stdio: "ignore", cwd: process.cwd() }); } catch { /* no-op */ }
}
function applyCostGate(state, b) {
  b.downgrade = false;
  const bud = state.budget;
  if (!bud || bud.spentUsd == null) return; // budget still unknown (metabolism absent) — degrade safely rather than block
  const ceiling = bud.ceilingUsd != null ? bud.ceilingUsd : DEFAULT_CEILING_USD;
  const redAt = bud.redAt != null ? bud.redAt : 0.9, yellowAt = bud.yellowAt != null ? bud.yellowAt : 0.7;
  const frac = bud.spentUsd / ceiling;
  if (frac >= redAt) {
    b.phase = "blocked";
    b.blockedReason = `Metabolism RED — $${bud.spentUsd.toFixed(2)} = ${Math.round(frac * 100)}% of $${ceiling} ceiling. Deferring; hand back to the human (or raise it: metabolism budget --ceiling <usd>).`;
    b.history.push({ ph: "cost", verdict: "RED", ts: new Date().toISOString() });
    save(state); emit(state, "BLOCKED", "-", b.goal, b.blockedReason); process.exit(0);
  }
  b.downgrade = frac >= yellowAt;
}

function retryOrCap(state, b, reason) {
  if (b.iteration >= b.maxIterations) {   // already on the last allowed build cycle → stop, don't rebuild again
    b.phase = "blocked";
    b.blockedReason = `${reason} — still not green after ${b.maxIterations} build→verify/review attempts. Hand to the human — then /reflect on the failure to capture a lesson.`;
    save(state); emit(state, "BLOCKED", "-", b.goal, b.blockedReason); process.exit(0);
  }
  b.iteration++;
  b.phase = "build"; b._retryReason = reason;
  save(state);
}

// consume the dispatched step's outcome and ADVANCE along the (shaped) plan. gate phases require a fresh
// classified verdict; DONE only when we pass the LAST phase in the plan with every gate green.
function advance(state, b) {
  const aw = b.awaiting;
  const gateOrgan = GATE_ORGAN[aw.phase];
  if (gateOrgan) {
    const res = freshResult(state, aw.organ, aw.sinceTs);
    if (!res) { emit(state, "RUN", aw.organ, b.goal, `No fresh /${aw.organ} verdict on the spine yet. Run /${aw.organ} on the target (prefer a subagent), let it write back (with --verdict), then: loop-body next.`); process.exit(0); }
    // commit gate (/decide) speaks COMMITTED|DEFERRED, not pass|fail — DEFERRED means "hand to human", never rebuild
    if (aw.phase === "commit") {
      const dv = (res.verdict || "").toLowerCase();
      let committed;
      if (dv === "committed" || dv === "pass") committed = true;
      else if (dv === "deferred") committed = false;
      else committed = /\bCOMMITTED\b/.test((res.summary || "").toUpperCase()) && !/\bDEFER/.test((res.summary || "").toUpperCase());
      b.history.push({ ph: aw.phase, organ: aw.organ, verdict: committed ? "committed" : "deferred", summary: res.summary, ts: res.ts });
      b.awaiting = null;
      if (!committed) {
        b.phase = "blocked";
        b.blockedReason = `/decide DEFERRED — ${res.summary || "no decision"}. The Body won't build on an uncommitted decision (UNGROUNDED findings / no verdict / refuted basis / no rollback). Hand to the human.`;
        save(state); emit(state, "BLOCKED", "-", b.goal, b.blockedReason); process.exit(0);
      }
      if (isLastPhase(b, aw.phase)) { b.phase = "done"; save(state); emit(state, "DONE", "-", b.goal, `Oracle GREEN (${b.profile}): ${gatesSummary(b)}. ${res.summary}`); process.exit(0); }
      b.phase = nextPlannedAfter(b, aw.phase); save(state); return;
    }
    const v = verdictOf(res);
    b.history.push({ ph: aw.phase, organ: aw.organ, verdict: v, summary: res.summary, ts: res.ts });
    b.awaiting = null;
    if (v === "unknown") {
      if (aw.phase === "build" && b.plan.includes("verify")) { // hands couldn't STATICALLY verify; /eyes will, at runtime
        b.phase = nextPlannedAfter(b, aw.phase); save(state); return;
      }
      const why = aw.organ === "eyes" ? "no live app/env to observe" : aw.organ === "immune" ? "nothing in scope to review" : aw.organ === "senses" ? "no sources fetched" : aw.organ === "hands" ? "couldn't statically verify the build (unparseable source / no build script) and there is no /eyes gate to verify it at runtime — wire a build/typecheck script" : "the gate couldn't run";
      b.phase = "blocked";
      b.blockedReason = `/${aw.organ} could not ${aw.phase} (${res.summary}) — ${why}. The Body won't fake a pass; hand to the human.`;
      save(state); emit(state, "BLOCKED", "-", b.goal, b.blockedReason); process.exit(0);
    }
    if (v === "fail") {
      if (b.plan.includes("build")) { retryOrCap(state, b, `/${aw.organ} ${aw.phase} FAILED: ${res.summary}`); return; }
      b.phase = "blocked";
      b.blockedReason = `/${aw.organ} ${aw.phase} FAILED: ${res.summary} — profile "${b.profile}" has no build phase to fix it in. Hand to the human.`;
      save(state); emit(state, "BLOCKED", "-", b.goal, b.blockedReason); process.exit(0);
    }
    // pass
    if (isLastPhase(b, aw.phase)) { b.phase = "done"; save(state); emit(state, "DONE", "-", b.goal, `Oracle GREEN (${b.profile}): ${gatesSummary(b)}. ${res.summary}`); process.exit(0); }
    b.phase = nextPlannedAfter(b, aw.phase);
    save(state);
    return;
  }
  // non-gate phase (frame / decide / build): proceed on this call — Claude calls next when the step is done
  b.history.push({ ph: aw.phase, organ: aw.organ || "-", ts: new Date().toISOString() });
  b.awaiting = null;
  if (isLastPhase(b, aw.phase)) { b.phase = "done"; save(state); emit(state, "DONE", "-", b.goal, `Oracle GREEN (${b.profile}): ${gatesSummary(b)}.`); process.exit(0); }
  b.phase = nextPlannedAfter(b, aw.phase);
  save(state);
}

// emit the action for the CURRENT phase and record what we're awaiting
function dispatch(state, b) {
  const ts = new Date().toISOString();
  const dg = b.downgrade ? " [METABOLISM YELLOW — downgrade: Sonnet over Opus, fewer agents, skip optional extras; keep the honesty gates]" : "";
  const setNext = (k) => { state.next = { ...(state.next || {}), [k]: b.goal, ts }; };
  switch (b.phase) {
    case "research":
      b.awaiting = { organ: "senses", phase: "research", sinceTs: ts }; setNext("research"); save(state);
      emit(state, "RUN", "senses", b.goal, `Gather the external facts the decision needs. Run /senses (prefer a subagent); it writes GROUNDED/UNGROUNDED to the spine. Then: loop-body next.${dg}`); break;
    case "debate":
      b.awaiting = { organ: "council", phase: "debate", sinceTs: ts }; save(state);
      emit(state, "RUN", "council", b.goal, `Debate the approach (advisory — picks NO winner). Run /council, or /council-deep for architectural/hard calls (heavier; it emits a verdict.json the commit step reads). It records the debate to the spine. Then: loop-body next.${dg}`); break;
    case "commit":
      b.awaiting = { organ: "decide", phase: "commit", sinceTs: ts }; setNext("commit"); save(state);
      emit(state, "RUN", "decide", b.goal, `Commit the approach. Run /decide — it weighs the debate verdict against the /senses findings and either COMMITS (pick · alternatives · confidence · flipFact · rollback) or DEFERS. It writes --verdict committed|deferred to the spine. DEFERRED → the Body BLOCKS (it won't build on a non-decision). Then: loop-body next.${dg}`); break;
    case "build": {
      b.awaiting = { organ: "hands", phase: "build", sinceTs: ts };
      const why = b._retryReason ? ` Fix the prior gate first — ${b._retryReason}.` : "";
      b._retryReason = null; save(state);
      const how = b.profile === "ui"
        ? `Refine the UI with /ui-refine (its own a11y+perf gate; visual taste stays human-gated via SIGNOFF, reported separately).`
        : `Implement the decided approach (greenfield app? scaffold from a known-bootable template FIRST so it can boot).`;
      emit(state, "BUILD", "hands", b.goal, `${how}${why} Then PROVE the build is real with /hands: run \`node .loop/loop-hands.mjs gate\` — it machine-checks artifact→parse→build→boot and writes BUILT/INCOMPLETE/UNVERIFIABLE to the spine. Then: loop-body next.${dg}`); break;
    }
    case "verify":
      b.awaiting = { organ: "eyes", phase: "verify", sinceTs: ts }; setNext("verify"); save(state);
      emit(state, "RUN", "eyes", b.goal, `Run /eyes (prefer a subagent) — actually run it, observe browser→API→data→response. It writes VERIFIED/FAILED/UNVERIFIED. Then: loop-body next.${dg}`); break;
    case "review":
      b.awaiting = { organ: "immune", phase: "review", sinceTs: ts }; setNext("review"); save(state);
      emit(state, "RUN", "immune", b.goal, `Run /immune (prefer a subagent) — hunt + adversarially verify bugs/vulns. It writes CLEAN/CONFIRMED/UNREVIEWED. Then: loop-body next.${dg}`); break;
    case "done": emit(state, "DONE", "-", b.goal, `Oracle green (${b.profile}) — loop complete.`); break;
    case "blocked": emit(state, "BLOCKED", "-", b.goal, b.blockedReason || "blocked"); break;
    default: emit(state, "BLOCKED", "-", b.goal, `unknown phase "${b.phase}"`);
  }
}

const [cmd, ...rest] = process.argv.slice(2);
if (!existsSync(LOOP)) mkdirSync(LOOP, { recursive: true });

if (cmd === "start") {
  const f = parseFlags(rest);
  const goal = (typeof f.goal === "string" ? f.goal : "").trim();
  if (!goal) die('--goal required, e.g. start --goal "add a working signup flow"');
  const state = loadState();
  const ts = new Date().toISOString();
  const { name: profile, plan } = profileFor(goal);
  state.currentGoal = { ts, summary: goal };
  state.body = { goal, profile, plan, phase: "frame", iteration: 1, maxIterations: Number(f.max) || 3, awaiting: { organ: "frame", phase: "frame", sinceTs: ts }, downgrade: false, blockedReason: null, startedTs: ts, history: [] };
  save(state);
  emit(state, "FRAME", "-", goal, `Auto-shaped as profile "${profile}" → plan: ${plan.join(" → ")} (only the organs this goal's oracle needs; the safety floor kept /immune for any build and /eyes for functional goals). If that profile is WRONG for the goal, run: loop-body block --reason "wrong profile: <why>" and restart with a clearer goal. Otherwise restate the goal as a concrete, FALSIFIABLE spec (an input → an observable success). Too vague to verify? loop-body block --reason "vague: <2-3 questions>" and ask the user. Else record it — loop-memory add --organ body --type goal --summary "<the sharp spec>" — then call: loop-body next.`);
  process.exit(0);
}

if (cmd === "next") {
  refreshBudget();                  // refresh spend FIRST — the cost gate reads live numbers, not Claude's discretion
  const state = loadState();
  const b = state.body;
  if (!b) die('no active body — run: loop-body start --goal "<task>"');
  if (b.phase === "done") { emit(state, "DONE", "-", b.goal, `Oracle green (${b.profile}) — loop complete.`); process.exit(0); }
  if (b.phase === "blocked") { emit(state, "BLOCKED", "-", b.goal, b.blockedReason || "blocked"); process.exit(0); }
  applyCostGate(state, b);          // exits with BLOCKED if Metabolism RED; else sets b.downgrade
  if (b.awaiting) advance(state, b); // exits if no fresh oracle result / terminal; else sets the new phase
  dispatch(state, b);
  process.exit(0);
}

if (cmd === "status") {
  const state = loadState(); const b = state.body;
  if (!b) { process.stdout.write("no active body — start one with: loop-body start --goal \"<task>\"\n"); process.exit(0); }
  process.stdout.write(`goal : ${b.goal}\nprofile: ${b.profile} | phase: ${b.phase} | iter ${b.iteration}/${b.maxIterations}\nplan : ${b.plan.join(" → ")}\noracle: ${gatesSummary(b)}\n`);
  if (b.blockedReason) process.stdout.write(`blocked: ${b.blockedReason}\n`);
  for (const h of b.history.slice(-10)) process.stdout.write(`  · ${h.ph}${h.organ && h.organ !== "-" ? "/" + h.organ : ""}${h.verdict ? " → " + h.verdict : ""}${h.summary ? " — " + h.summary : ""}\n`);
  process.exit(0);
}

if (cmd === "block") {
  const f = parseFlags(rest); const state = loadState(); const b = state.body;
  if (!b) die("no active body");
  b.phase = "blocked"; b.blockedReason = (typeof f.reason === "string" ? f.reason : "blocked"); b.awaiting = null;
  b.history.push({ ph: "blocked", summary: b.blockedReason, ts: new Date().toISOString() });
  save(state);
  emit(state, "BLOCKED", "-", b.goal, b.blockedReason);
  process.exit(0);
}

die(`unknown command "${cmd || ""}". Use: start | next | status | block`);
