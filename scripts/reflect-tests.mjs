#!/usr/bin/env node
// reflect-tests — dry-run proof for loop-reflect.mjs honesty guards. Isolated: copies loop-reflect.mjs +
// loop-memory.mjs into a temp dir and runs distill/scan there. Named WITHOUT a `loop-` prefix so /body Step 0
// (copies only loop-*.mjs) never ships it into a real repo.
//
//   node scripts/reflect-tests.mjs        # exits 0 iff every check passes

import { execFileSync } from "node:child_process";
import { mkdirSync, copyFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = join(tmpdir(), "reflect-tests");
const ENGINE_DIR = join(BASE, "engine");
const REFLECT = join(ENGINE_DIR, "loop-reflect.mjs");
if (existsSync(BASE)) rmSync(BASE, { recursive: true, force: true });
mkdirSync(ENGINE_DIR, { recursive: true });
copyFileSync(join(HERE, "loop-reflect.mjs"), REFLECT);
copyFileSync(join(HERE, "loop-memory.mjs"), join(ENGINE_DIR, "loop-memory.mjs"));

let dir, allOut, name;
const results = [];
function scenario(n) { name = n; dir = join(BASE, n); mkdirSync(dir, { recursive: true }); allOut = ""; }
function run(args) {
  let out;
  try { out = execFileSync("node", [REFLECT, ...args], { cwd: dir, encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  allOut += out; return out;
}
function mem() { const p = join(dir, ".loop", "memory.md"); return existsSync(p) ? readFileSync(p, "utf8") : ""; }
const ok = (label, cond) => results.push({ name, label, pass: !!cond });
const has = (s, sub) => s.includes(sub);

// 1. shapeless lesson (missing when/then/because) → refused
scenario("1_shape_guard");
let o = run(["distill", "--trigger", "feedback", "--scope", "project-lesson", "--then", "do better"]);
ok("refuses vague lesson", has(o, "falsifiable"));

// 2. research lesson with no --source → refused (grounding guard)
scenario("2_grounding_guard");
o = run(["distill", "--trigger", "research", "--scope", "project-lesson", "--when", "x", "--then", "y", "--because", "z"]);
ok("refuses ungrounded research", has(o, "UNGROUNDED"));

// 3. project-standard with no source/recurrence → auto-downgraded to lesson (anti-overfit)
scenario("3_promotion_guard");
o = run(["distill", "--trigger", "feedback", "--scope", "project-standard", "--when", "deploying to prod", "--then", "run the smoke test first", "--because", "a one-off outage"]);
ok("downgrades unearned standard", has(o, "downgraded standard") && has(o, "lesson"));
ok("written to memory.md as lesson", has(mem(), "Lessons") && has(mem(), "smoke test"));

// 4. grounded standard (with --source) → kept as a standard
scenario("4_grounded_standard");
o = run(["distill", "--trigger", "research", "--scope", "project-standard", "--when", "using framework X", "--then", "prefer the official adapter", "--because", "maintained and typed", "--source", "https://example.com/docs"]);
ok("recorded as standard", has(o, "as standard"));
ok("standard in memory.md", has(mem(), "Standards") && has(mem(), "official adapter"));
ok("source embedded", has(mem(), "src: https://example.com/docs"));

// 5. user-feedback → NOT written to .loop, proposed for global memory
scenario("5_userfeedback_routing");
o = run(["distill", "--trigger", "feedback", "--cause", "misread-intent", "--scope", "user-feedback", "--when", "asked to refactor", "--then", "confirm scope before touching shared modules", "--because", "user values minimal diffs"]);
ok("proposes, not writes", has(o, "PROPOSED global memory"));
ok("nothing written to .loop", !has(mem(), "minimal diffs"));

// 6. recurrence → scan flags a promotion candidate
scenario("6_recurrence_scan");
run(["distill", "--trigger", "gate", "--scope", "project-lesson", "--when", "parsing user supplied dates", "--then", "validate the timezone offset explicitly", "--because", "eyes caught a UTC off by one", "--source", "gate-abc"]);
run(["distill", "--trigger", "gate", "--scope", "project-lesson", "--when", "parsing user supplied dates again", "--then", "validate the timezone offset always", "--because", "immune caught another timezone bug", "--source", "gate-def"]);
o = run(["scan"]);
ok("scan flags recurrence", has(o, "PROMOTE?"));

// report
const fails = results.filter((r) => !r.pass);
for (const r of results) process.stdout.write(`${r.pass ? "PASS" : "FAIL"}  ${r.name.padEnd(24)} ${r.label}\n`);
process.stdout.write(`\n${results.length - fails.length}/${results.length} checks passed.\n`);
process.exit(fails.length ? 1 : 0);
