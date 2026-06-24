#!/usr/bin/env node
// hands-tests — proof for loop-hands.mjs, the BUILD oracle. Builds REAL temp git repos in assorted states and
// runs `loop-hands gate`, asserting the verdict. Covers the original ladder PLUS the 10 defects an adversarial
// review confirmed (false-greens: TS-no-build, build-hang, build->1MB; false-reds: committed build, deletion,
// missing-env server, CLI usage-exit, verbose boot). Named without a `loop-` prefix so /body Step 0 won't ship it.
//
//   node scripts/hands-tests.mjs

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = join(tmpdir(), "hands-tests-" + process.pid); // per-run dir: a prior run's orphan can't lock it
if (existsSync(BASE)) { try { rmSync(BASE, { recursive: true, force: true }); } catch { /* stale lock — ignore */ } }
mkdirSync(BASE, { recursive: true });

const results = [];
const ok = (name, label, cond) => results.push({ name, label, pass: !!cond });
const has = (s, sub) => s.includes(sub);

function repo(name, { files = {}, commit = null, gitInit = true } = {}) {
  const dir = join(BASE, name);
  mkdirSync(join(dir, ".loop"), { recursive: true });
  copyFileSync(join(HERE, "loop-hands.mjs"), join(dir, ".loop", "loop-hands.mjs"));
  copyFileSync(join(HERE, "loop-memory.mjs"), join(dir, ".loop", "loop-memory.mjs"));
  if (gitInit) spawnSync("git", ["init", "-q"], { cwd: dir });
  for (const [fp, c] of Object.entries(files)) { mkdirSync(dirname(join(dir, fp)), { recursive: true }); writeFileSync(join(dir, fp), c); }
  if (commit) {
    spawnSync("git", ["add", ...(commit === "all" ? ["-A"] : commit)], { cwd: dir });
    spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "base"], { cwd: dir });
  }
  return dir;
}
const g = (dir, ...args) => spawnSync("git", args, { cwd: dir });
function gate(dir, args = []) {
  try { return execFileSync("node", [join(dir, ".loop", "loop-hands.mjs"), "gate", ...args], { cwd: dir, encoding: "utf8" }); }
  catch (e) { return (e.stdout || "") + (e.stderr || ""); }
}
const PKG = (scripts) => JSON.stringify({ name: "t", scripts });

// 1. clean committed repo, no oracle → UNVERIFIABLE (not a false "broken")  [hardened: was FAIL]
{ const d = repo("1_clean_no_oracle", { files: { "a.js": "const x = 1;\n" }, commit: ["a.js"] });
  const o = gate(d, ["--no-boot"]);
  ok("1_clean", "UNKNOWN on clean tree", has(o, "HANDS UNKNOWN") && has(o, "UNVERIFIABLE")); }

// 2. changed file with a syntax error → FAIL (PARSE)
{ const d = repo("2_parse_fail", { files: { "broken.js": "const x = ;\n" } });
  const o = gate(d, ["--no-boot"]);
  ok("2_parse", "FAIL on parse error", has(o, "HANDS FAIL") && has(o, "PARSE")); }

// 3. valid JS change, no build/boot oracle → BUILT (parse is a real content rung)
{ const d = repo("3_valid_js", { files: { "util.js": "export const add = (a,b)=>a+b;\n" } });
  const o = gate(d, ["--no-boot"]);
  ok("3_valid_js", "PASS on parsed change", has(o, "HANDS PASS") && has(o, "BUILT")); }

// 4. build script that fails → FAIL (BUILD)
{ const d = repo("4_build_fail", { files: { "package.json": PKG({ build: "node -e \"process.exit(1)\"" }), "x.js": "const y=2;\n" } });
  const o = gate(d, ["--no-boot"]);
  ok("4_build_fail", "FAIL on build error", has(o, "HANDS FAIL") && has(o, "BUILD")); }

// 5. build passes + node entry stays up → BUILT (boot bridges to /eyes)
{ const d = repo("5_build_boot", { files: { "package.json": PKG({ build: "node -e \"process.exit(0)\"" }), "server.mjs": "setInterval(()=>{},1000);\n" } });
  const o = gate(d, ["--boot-timeout", "1500"]);
  ok("5_build_boot", "PASS build+boot", has(o, "HANDS PASS") && has(o, "build(build)") && has(o, "boot(server.mjs)")); }

// 6. node entry that EXITS on boot → DEFERRED to /eyes (hands never false-fails a boot); parse still verifies syntax
{ const d = repo("6_boot_defers", { files: { "server.mjs": "throw new Error('boom on boot');\n" } });
  const o = gate(d, ["--no-build", "--boot-timeout", "1500"]);
  ok("6_boot_defers", "boot exit defers, not FAIL", !has(o, "HANDS FAIL") && has(o, "deferred to /eyes")); }

// 7. no git, no --paths → UNVERIFIABLE
{ const d = repo("7_no_git", { files: { "a.js": "const z=3;\n" }, gitInit: false });
  const o = gate(d, ["--no-boot"]);
  ok("7_no_git", "UNKNOWN when nothing checkable", has(o, "HANDS UNKNOWN") && has(o, "UNVERIFIABLE")); }

// ── regressions for the 10 adversarial findings ─────────────────────────────────────────────────────────

// #1 false-green: garbage .tsx with no build script must NOT pass as BUILT → UNVERIFIABLE
{ const d = repo("R1_tsx_no_build", { files: { "App.tsx": "export default function App( { return <div>\n" } });
  const o = gate(d, ["--no-boot"]);
  ok("R1_tsx", "garbage tsx not BUILT", !has(o, "HANDS PASS"));
  ok("R1_tsx", "→ UNVERIFIABLE", has(o, "HANDS UNKNOWN")); }

// #2 false-red: a valid build already committed, WITH a build script → BUILT (build rung verifies it)
{ const d = repo("R2_committed_build", { files: { "package.json": PKG({ build: "node -e \"process.exit(0)\"" }), "feat.mjs": "export const f=()=>1;\n" }, commit: "all" });
  const o = gate(d, ["--no-boot"]);
  ok("R2_committed", "committed build passes via build rung", has(o, "HANDS PASS")); }

// #3 false-red: pure deletion → not a hard FAIL (UNVERIFIABLE when no content rung runs)
{ const d = repo("R3_deletion", { files: { "dead.mjs": "export const d=1;\n", "keep.mjs": "export const k=2;\n" }, commit: "all" });
  g(d, "rm", "dead.mjs");
  const o = gate(d, ["--no-build", "--no-boot"]);
  ok("R3_deletion", "deletion not FAILed", !has(o, "HANDS FAIL")); }

// #4 false-red: 12-factor server that fail-fasts on missing env → boot DEFERS, parse passes → BUILT
{ const d = repo("R4_env_server", { files: { "server.mjs": "if(!process.env.DATABASE_URL){console.error('FATAL: DATABASE_URL required');process.exit(1)}\nsetInterval(()=>{},1000);\n" } });
  const o = gate(d, ["--no-build", "--boot-timeout", "1500"]);
  ok("R4_env", "env-server not FAILed", !has(o, "HANDS FAIL"));
  ok("R4_env", "boot deferred to /eyes", has(o, "deferred to /eyes")); }

// #5 false-red: CLI with a usage-exit (no stack) → boot DEFERS, parse passes → BUILT
{ const d = repo("R5_cli_usage", { files: { "index.mjs": "if(process.argv.length<3){console.error('usage: mytool <command>');process.exit(1)}\nsetInterval(()=>{},1000);\n" } });
  const o = gate(d, ["--no-build", "--boot-timeout", "1500"]);
  ok("R5_cli", "usage-exit not FAILed", !has(o, "HANDS FAIL") && has(o, "HANDS PASS")); }

// #6 false-red: a healthy but very chatty server (>1MB stderr) must not be mis-failed (ENOBUFS) → BUILT
{ const d = repo("R6_verbose_boot", { files: { "server.mjs": "process.stderr.write('x'.repeat(2_000_000));setInterval(()=>{},1000);\n" } });
  const o = gate(d, ["--no-build", "--boot-timeout", "1500"]);
  ok("R6_verbose", "chatty server stays BUILT", has(o, "HANDS PASS") && has(o, "boot(server.mjs)")); }

// #9 false-green: a build that emits >1MB then exits non-zero must FAIL (not be mislabeled timed-out)
{ const d = repo("R9_build_verbose_fail", { files: { "package.json": PKG({ build: "node -e \"process.stderr.write('x'.repeat(2000000));process.exit(2)\"" }), "x.js": "const a=1;\n" } });
  const o = gate(d, ["--no-boot"]);
  ok("R9_build>1MB", "FAIL on >1MB failing build", has(o, "HANDS FAIL") && has(o, "BUILD")); }

// #10 false-green: a build that hangs (never completes) must FAIL, not pass on the other rungs
{ const d = repo("R10_build_hang", { files: { "package.json": PKG({ build: "node -e \"setInterval(()=>{},1000)\"" }), "x.js": "const a=1;\n" } });
  const o = gate(d, ["--no-boot", "--build-timeout", "1500"]);
  ok("R10_hang", "FAIL on hanging build", has(o, "HANDS FAIL") && has(o, "did not complete")); }

// re-review #1 (sibling-mask): a parseable sibling must NOT green an unchecked broken .tsx
{ const d = repo("RR1_sibling", { files: { "helper.js": "export const x=1;\n", "App.tsx": "export default function App( { return <div>\n" } });
  const o = gate(d, ["--no-boot"]);
  ok("RR1_sibling", "sibling cannot mask tsx", !has(o, "HANDS PASS") && has(o, "HANDS UNKNOWN")); }

// 3rd-review #1 (false-green): a broken .astro masked by a parseable sibling must NOT pass — the guard uses a
// non-code ALLOWLIST, so any unparsed source (.astro/.scss/.vue/…) blocks a clean BUILT unless a build rung ran
{ const d = repo("RR5_astro_mask", { files: { "ok.js": "export const x=1;\n", "Hero.astro": "---\nconst broken =\n---\n<div>\n" } });
  const o = gate(d, ["--no-boot"]);
  ok("RR5_astro", "astro not masked → UNKNOWN", !has(o, "HANDS PASS") && has(o, "HANDS UNKNOWN")); }

// re-review regression: the legit env-server (#4) and CLI usage-exit (#5) must STILL defer (not over-fail)
{ const d = repo("RR3_env_still_defers", { files: { "server.mjs": "if(!process.env.DATABASE_URL){console.error('FATAL: DATABASE_URL required');process.exit(1)}\nsetInterval(()=>{},1000);\n" } });
  const o = gate(d, ["--no-build", "--boot-timeout", "1500"]);
  ok("RR3_env", "env-server still PASS (defers)", has(o, "HANDS PASS") && !has(o, "HANDS FAIL")); }
{ const d = repo("RR4_usage_still_defers", { files: { "index.mjs": "if(process.argv.length<3){console.error('usage: mytool <command>');process.exit(1)}\nsetInterval(()=>{},1000);\n" } });
  const o = gate(d, ["--no-build", "--boot-timeout", "1500"]);
  ok("RR4_usage", "usage-exit still PASS (defers)", has(o, "HANDS PASS")); }

// 4th-review (false-green): build-driving config (.toml/.yml) is NOT inert — a broken one masked by a parseable
// sibling must not pass; only a build rung can cover it
{ const d = repo("RR6_toml_mask", { files: { "ok.js": "export const x=1;\n", "netlify.toml": "[build]\n  command = \n" } });
  const o = gate(d, ["--no-boot"]);
  ok("RR6_toml", "config not masked → UNKNOWN", !has(o, "HANDS PASS") && has(o, "HANDS UNKNOWN")); }

const fails = results.filter((r) => !r.pass);
for (const r of results) process.stdout.write(`${r.pass ? "PASS" : "FAIL"}  ${r.name.padEnd(18)} ${r.label}\n`);
process.stdout.write(`\n${results.length - fails.length}/${results.length} checks passed.\n`);
process.exit(fails.length ? 1 : 0);
