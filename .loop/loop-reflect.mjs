#!/usr/bin/env node
// loop-reflect — the REFLECTION organ's engine: turn outcomes into durable, VERIFIED lessons the loop will
// actually read next run. Storage + supersession + compaction already live in loop-memory; this adds the
// honesty GUARD the other organs have — because a wrong or over-broad lesson is WORSE than none: it silently
// misdirects every future run. So the guard is CODE, fail-closed:
//   • falsifiable shape required — WHEN <condition> → THEN <rule> BECAUSE <evidence>; no vague platitudes
//   • provenance required — research/discovery/reference lessons must cite a --source (mirrors senses' gate)
//   • promotion guard (anti-overfit) — a STANDARD is loaded into EVERY run, so it must be earned by
//     RECURRENCE (a similar prior lesson) or GROUNDING (a source); a single ungrounded incident can only
//     become a (weaker) lesson, never a standing rule
//   • routing — project facts → .loop/memory.md (auto); user/working-style → PROPOSED for global memory
//     (never auto-written: an organ must not silently edit the user's cross-project memory)
//
//   node scripts/loop-reflect.mjs distill --trigger feedback|gate|research|discovery \
//        --scope project-standard|project-lesson|user-feedback|reference \
//        --when "<condition>" --then "<rule>" --because "<evidence>" \
//        [--cause missing-context|outdated-knowledge|misread-intent|process-gap|execution-bug] \
//        [--source "<url | gate-id | quote>"] [--supersedes <id>]
//   node scripts/loop-reflect.mjs scan   # surface recurrence (→ promote) + stale references (→ re-ground)

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const LOOP = join(process.cwd(), ".loop");
const STATE = join(LOOP, "state.json");
const MEMORY = join(dirname(fileURLToPath(import.meta.url)), "loop-memory.mjs");
const die = (m) => { process.stderr.write("loop-reflect: " + m + "\n"); process.exit(1); };

const TRIGGERS = ["feedback", "gate", "research", "discovery"];
const SCOPES = ["project-standard", "project-lesson", "user-feedback", "reference"];
const CAUSES = ["missing-context", "outdated-knowledge", "misread-intent", "process-gap", "execution-bug"];

function parseFlags(argv) {
  const f = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) { const n = argv[i + 1]; f[argv[i].slice(2)] = n !== undefined && !n.startsWith("--") ? argv[++i] : true; }
  }
  return f;
}
function loadState() {
  if (!existsSync(STATE)) return { log: [] };
  try { return JSON.parse(readFileSync(STATE, "utf8")); } catch { return { log: [] }; }
}
const str = (v) => (typeof v === "string" ? v.trim() : "");
const norm = (s) => str(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
function tokens(s) { return new Set(norm(s).split(" ").filter((w) => w.length > 3)); }
function overlap(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
}

const [cmd, ...rest] = process.argv.slice(2);

if (cmd === "distill") {
  const f = parseFlags(rest);
  const trigger = str(f.trigger), scope = str(f.scope);
  const when = str(f.when), then = str(f.then), because = str(f.because);
  const source = str(f.source), cause = str(f.cause);
  const supersedes = (f.supersedes && f.supersedes !== true) ? String(f.supersedes) : null;

  if (!TRIGGERS.includes(trigger)) die(`--trigger must be one of: ${TRIGGERS.join(", ")}`);
  if (!SCOPES.includes(scope)) die(`--scope must be one of: ${SCOPES.join(", ")}`);
  if (cause && !CAUSES.includes(cause)) die(`--cause must be one of: ${CAUSES.join(", ")}`);
  // GUARD 1 — falsifiable shape
  if (!when || !then || !because) die("a lesson must be falsifiable: --when <condition> --then <rule> --because <evidence>. Refusing a vague lesson.");
  // GUARD 2 — provenance / grounding (the senses grounding gate, for lessons)
  const needsSource = trigger === "research" || trigger === "discovery" || scope === "reference";
  if (needsSource && !source) die(`trigger="${trigger}"/scope="${scope}" requires --source (a real URL, gate id, or quote). Refusing an UNGROUNDED lesson.`);

  const state = loadState();

  // GUARD 3 — promotion guard (anti-overfit): a STANDARD loads into every run, so earn it by RECURRENCE
  // (a similar prior lesson exists) or GROUNDING (a source / an explicit supersede). Else downgrade to lesson.
  let effScope = scope, downgradeNote = "";
  if (scope === "project-standard" && !source && !supersedes) {
    const recur = (state.log || []).filter((e) => (e.type === "lesson" || e.type === "standard") && overlap(e.summary, `${when} ${then}`) >= 0.5);
    if (recur.length < 1) { effScope = "project-lesson"; downgradeNote = " [downgraded standard->lesson: no recurrence or grounding yet — not enough evidence for a standing rule]"; }
  }

  // near-duplicate detection → suggest supersession rather than silently duping the memory
  let dupNote = "";
  if (!supersedes) {
    const dup = (state.log || []).map((e) => ({ e, ov: overlap(e.summary, `${when} ${then}`) })).filter((x) => x.ov >= 0.6).sort((a, b) => b.ov - a.ov)[0];
    if (dup) dupNote = ` [near-duplicate of ${dup.e.id} — consider: --supersedes ${dup.e.id}]`;
  }

  const src = source ? ` [src: ${source}]` : "";
  const summary = `WHEN ${when} -> ${then} (because ${because})${src}`;

  // GUARD 4 — routing. user/working-style is NOT auto-written to the user's global cross-project memory.
  if (effScope === "user-feedback") {
    process.stdout.write(
      `PROPOSED global memory entry (NOT auto-written — review, then add via your memory system):\n` +
      `---\ntype: feedback\nwhen: ${when}\nthen: ${then}\nwhy: ${because}${src}\n---\n` +
      `(Project-local lessons are written automatically; cross-project working-style is yours to confirm.)${dupNote}\n`);
    process.exit(0);
  }

  const memType = effScope === "project-standard" ? "standard" : "lesson";
  const tag = effScope === "reference" ? "[ref] " : "";
  const reviewBy = effScope === "reference" ? " (re-ground after ~90d; /senses)" : "";
  // delegate the actual write (append-only + supersession + compaction) to loop-memory
  const memArgs = ["add", "--organ", "reflect", "--type", memType, "--summary", `${tag}${summary}${reviewBy}`];
  if (supersedes) memArgs.push("--supersedes", supersedes);
  let out = "";
  try { out = execFileSync("node", [MEMORY, ...memArgs], { cwd: process.cwd(), encoding: "utf8" }); }
  catch (e) { die("loop-memory write failed: " + (e.stderr || e.message)); }
  process.stdout.write(out.trim() + `\n-> recorded as ${memType}${downgradeNote}${dupNote}\n`);
  process.exit(0);
}

if (cmd === "scan") {
  const state = loadState();
  const lessons = (state.log || []).filter((e) => e.type === "lesson" || e.type === "standard");
  const seen = new Set(); const clusters = [];
  for (const e of lessons) {
    if (seen.has(e.id)) continue;
    const group = lessons.filter((o) => !seen.has(o.id) && overlap(e.summary, o.summary) >= 0.5);
    group.forEach((o) => seen.add(o.id));
    if (group.length >= 2) clusters.push(group);
  }
  process.stdout.write(`# reflect scan — ${lessons.length} lessons/standards on the spine\n`);
  if (!clusters.length) process.stdout.write(`no recurrence clusters (>=2 similar) — nothing to promote yet.\n`);
  for (const g of clusters) process.stdout.write(`PROMOTE? ${g.length}x similar -> consider a standard: "${g[0].summary}" (ids: ${g.map((x) => x.id).join(", ")})\n`);
  const refs = lessons.filter((e) => /\[ref\]/.test(e.summary));
  if (refs.length) process.stdout.write(`refs to re-ground (${refs.length}): ${refs.map((x) => x.id).join(", ")} — re-verify with /senses if past ~90d.\n`);
  process.exit(0);
}

die(`unknown command "${cmd || ""}". Use: distill | scan`);
