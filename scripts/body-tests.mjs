#!/usr/bin/env node
// body-tests — deterministic dry-run proof for loop-body.mjs goal-aware shaping + safety floor + the BUILD gate.
//
// Isolated from Metabolism: copies loop-body.mjs into a temp dir WITHOUT loop-metabolism.mjs beside it, so
// refreshBudget no-ops and the tests never read the real session transcript. Organ verdicts (incl. the new
// `hands` BUILD gate) are injected straight into state.json (ts far future → always post-dispatch). The Body
// does NOT auto-run hands — it reads hands' fresh verdict from the spine, exactly like eyes/immune. Named
// without a `loop-` prefix so /body Step 0 never ships it.
//
//   node scripts/body-tests.mjs        # exits 0 iff every check passes

import { execFileSync } from "node:child_process";
import { mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "loop-body.mjs");
const BASE = join(tmpdir(), "loopbody-tests");
const ENGINE_DIR = join(BASE, "engine");
const ENGINE = join(ENGINE_DIR, "loop-body.mjs");

if (existsSync(BASE)) rmSync(BASE, { recursive: true, force: true });
mkdirSync(ENGINE_DIR, { recursive: true });
copyFileSync(SRC, ENGINE); // NOTE: deliberately no loop-metabolism.mjs beside it → refreshBudget no-ops

let scenarioDir, allOut, scenarioName;
const results = [];
function scenario(name) { scenarioName = name; scenarioDir = join(BASE, name); mkdirSync(scenarioDir, { recursive: true }); allOut = ""; }
function run(args) {
  let out;
  try { out = execFileSync("node", [ENGINE, ...args], { cwd: scenarioDir, encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  allOut += out;
  return out;
}
function inject(organ, verdict, summary) {
  const p = join(scenarioDir, ".loop", "state.json");
  const s = JSON.parse(readFileSync(p, "utf8"));
  s.latest = s.latest || {};
  s.latest[organ] = { organ, verdict, summary, ts: "2099-01-01T00:00:00.000Z" };
  writeFileSync(p, JSON.stringify(s, null, 2) + "\n");
}
const ok = (label, cond) => results.push({ scenario: scenarioName, label, pass: !!cond });
const has = (s, sub) => s.includes(sub);

// ── A. audit → frame→review only; immune is the oracle; build + eyes never run ──────────────────────────
scenario("A_audit_pass");
let o = run(["start", "--goal", "security audit of the auth module", "--max", "3"]);
ok("classified audit", has(o, 'profile "audit"'));
ok("plan = frame → review", has(o, "plan: frame → review"));
o = run(["next"]); // frame → review
ok("dispatches immune", has(o, "organ: immune") && has(o, "RUN"));
inject("immune", "pass", "CLEAN — no vulns");
o = run(["next"]); // review pass → DONE
ok("DONE on immune CLEAN", has(o, "DONE") && has(o, "immune CLEAN"));
ok("hands/build never dispatched", !has(allOut, "BUILD") && !has(allOut, "organ: hands"));
ok("eyes never dispatched", !has(allOut, "organ: eyes"));

// ── B. audit, immune FAIL, no build phase → BLOCKED ─────────────────────────────────────────────────────
scenario("B_audit_fail");
run(["start", "--goal", "pentest the login endpoint for vulnerabilities", "--max", "3"]);
run(["next"]); // → RUN immune
inject("immune", "fail", "2 CONFIRMED SQLi");
o = run(["next"]);
ok("BLOCKED on fail", has(o, "BLOCKED"));
ok("explains no build to fix in", has(o, "no build phase"));

// ── C. UI (non-functional) → frame→build→review; build gated by hands; eyes skipped; signoff noted ──────
scenario("C_ui_nonfunctional");
o = run(["start", "--goal", "polish the visual styling of the marketing page", "--max", "3"]);
ok("classified ui", has(o, 'profile "ui"'));
ok("plan has no verify", has(o, "plan: frame → build → review"));
o = run(["next"]); // frame → build
ok("dispatches BUILD via ui-refine, awaiting hands", has(o, "BUILD") && has(o, "ui-refine") && has(o, "organ: hands"));
inject("hands", "pass", "BUILT: ran[artifact parse]");
o = run(["next"]); // build-gate pass → review
ok("then dispatches immune", has(o, "organ: immune"));
inject("immune", "pass", "CLEAN");
o = run(["next"]);
ok("DONE + signoff caveat", has(o, "DONE") && has(o, "SIGNOFF"));
ok("eyes never dispatched", !has(allOut, "organ: eyes"));

// ── D. UI + functional goal → safety floor FORCES /eyes; hands still gates the build ─────────────────────
scenario("D_ui_functional_floor");
o = run(["start", "--goal", "restyle the signup flow page", "--max", "3"]);
ok("classified ui", has(o, 'profile "ui"'));
ok("floor added verify", has(o, "plan: frame → build → verify → review"));
run(["next"]); // frame → build
inject("hands", "pass", "BUILT");
o = run(["next"]); // build-gate → verify
ok("eyes IS dispatched (floor)", has(o, "organ: eyes"));
inject("eyes", "pass", "VERIFIED signup flow");
o = run(["next"]); // verify → review
ok("then immune", has(o, "organ: immune"));
inject("immune", "pass", "CLEAN");
o = run(["next"]);
ok("DONE eyes+immune", has(o, "DONE") && has(o, "eyes VERIFIED") && has(o, "immune CLEAN"));

// ── E. research question → frame→research→decide; senses is the oracle; nothing built ───────────────────
scenario("E_research_question");
o = run(["start", "--goal", "which charting library should I use for a dashboard?", "--max", "3"]);
ok("classified research", has(o, 'profile "research"'));
ok("plan = frame → research → decide", has(o, "plan: frame → research → decide"));
o = run(["next"]); // frame → research
ok("dispatches senses", has(o, "organ: senses"));
inject("senses", "pass", "GROUNDED: 5 sources");
o = run(["next"]); // research → decide
ok("then council", has(o, "organ: council"));
o = run(["next"]); // decide (last) → DONE
ok("DONE on senses GROUNDED", has(o, "DONE") && has(o, "senses GROUNDED"));
ok("never built / ran / reviewed", !has(allOut, "BUILD") && !has(allOut, "organ: eyes") && !has(allOut, "organ: immune"));

// ── F. feature (default) → full pipeline incl. the hands BUILD gate (no regression) ─────────────────────
scenario("F_feature_full");
o = run(["start", "--goal", "add user signup with email verification", "--max", "3"]);
ok("classified feature", has(o, 'profile "feature"'));
ok("full plan", has(o, "plan: frame → decide → build → verify → review"));
run(["next"]); // frame → decide
run(["next"]); // decide → build (awaiting hands)
inject("hands", "pass", "BUILT: ran[artifact parse boot]");
o = run(["next"]); // build-gate → verify
ok("eyes dispatched after hands", has(o, "organ: eyes"));
inject("eyes", "pass", "VERIFIED");
o = run(["next"]); // verify → review
ok("immune dispatched", has(o, "organ: immune"));
inject("immune", "pass", "CLEAN");
o = run(["next"]);
ok("DONE oracle chain", has(o, "DONE") && has(o, "code BUILT") && has(o, "eyes VERIFIED + immune CLEAN"));

// ── G. feature, eyes FAILS twice with --max 2 → retry once, then BLOCKED at the cap ─────────────────────
scenario("G_retry_then_cap");
run(["start", "--goal", "add user signup with email verification", "--max", "2"]);
run(["next"]); // frame → decide
run(["next"]); // decide → build (iter 1)
inject("hands", "pass", "BUILT");
run(["next"]); // build-gate → verify
inject("eyes", "fail", "FAILED: 500 on submit");
o = run(["next"]); // verify FAIL → retry build (iter 2)
ok("retries to BUILD", has(o, "BUILD") && has(o, "FAILED"));
ok("iteration is 2/2", has(o, "iter: 2/2"));
inject("hands", "pass", "BUILT");
run(["next"]); // build-gate → verify
inject("eyes", "fail", "FAILED again");
o = run(["next"]); // verify FAIL at cap → BLOCKED
ok("BLOCKED at cap", has(o, "BLOCKED") && has(o, "after 2"));

// ── H. the NEW build gate: hands FAIL → rebuild, never advance to /eyes; cap → BLOCKED ───────────────────
scenario("H_build_gate_fail");
run(["start", "--goal", "add user signup with email verification", "--max", "2"]);
run(["next"]); // frame → decide
o = run(["next"]); // decide → build (iter 1)
ok("BUILD awaits hands", has(o, "BUILD") && has(o, "organ: hands"));
inject("hands", "fail", "INCOMPLETE/BROKEN: ran[artifact] FAILS[BUILD(build): exit 1]");
o = run(["next"]); // build-gate FAIL → rebuild (iter 2), NOT advance to verify
ok("bad build rebuilds, not advances", has(o, "BUILD") && has(o, "iter: 2/2"));
ok("retry cites the build failure", has(o, "INCOMPLETE"));
ok("did NOT advance to eyes", !has(o, "organ: eyes"));
inject("hands", "fail", "INCOMPLETE/BROKEN again");
o = run(["next"]); // build-gate FAIL at cap → BLOCKED
ok("BLOCKED at cap on unbuildable", has(o, "BLOCKED") && has(o, "after 2"));

// ── I. build UNKNOWN (hands can't statically verify) WITH a downstream /eyes → DEFER to eyes, not block ──
scenario("I_build_unknown_defers");
run(["start", "--goal", "add user signup with email verification", "--max", "3"]); // feature: has verify
run(["next"]); // frame → decide
run(["next"]); // decide → build (awaiting hands)
inject("hands", "unknown", "UNVERIFIABLE: ran[artifact] notes[parse-unchecked: App.tsx]");
o = run(["next"]); // build-unknown + verify in plan → defer to /eyes
ok("build-unknown defers to eyes", has(o, "organ: eyes") && !has(o, "BLOCKED"));

// ── J. build UNKNOWN with NO /eyes downstream (ui non-functional) → BLOCK honestly ──────────────────────
scenario("J_build_unknown_blocks");
run(["start", "--goal", "polish the visual styling of the marketing page", "--max", "3"]); // ui: no verify
run(["next"]); // frame → build
inject("hands", "unknown", "UNVERIFIABLE: ran[artifact] notes[parse-unchecked: styles.scss]");
o = run(["next"]); // build-unknown + no verify → block
ok("build-unknown blocks without eyes", has(o, "BLOCKED") && has(o, "wire a build/typecheck"));

// ── report ──────────────────────────────────────────────────────────────────────────────────────────────
const fails = results.filter((r) => !r.pass);
for (const r of results) process.stdout.write(`${r.pass ? "PASS" : "FAIL"}  ${r.scenario.padEnd(22)} ${r.label}\n`);
process.stdout.write(`\n${results.length - fails.length}/${results.length} checks passed across 10 scenarios.\n`);
process.exit(fails.length ? 1 : 0);
