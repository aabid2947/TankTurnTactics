#!/usr/bin/env node
// loop-hands — the HANDS organ: the BUILD oracle the loop was missing. BUILD is where code gets authored;
// until now it was the ONE step exempt from the no-false-green contract. `hands gate` closes that gap with a
// CODE-enforced ladder of machine checks and writes a structured verdict the Body reads — like /eyes & /immune.
//
// The ladder (each rung runs only if applicable; the verdict NAMES every rung it could not check — no bluffing):
//   1. ARTIFACT — did BUILD change the tree? (git working tree incl. deletions, or --paths). A SIGNAL + the
//                 input set for PARSE; NOT sufficient for a pass on its own (it inspects no content).
//   2. PARSE    — do the changed source files parse? (node --check js/mjs/cjs, JSON.parse, py_compile).
//   3. BUILD    — if package.json has a build/typecheck script, does it COMPLETE and pass? (hang/timeout = FAIL).
//   4. BOOT     — if there's a simple node entry, does it STAY UP through a smoke window? (the ONE unambiguous
//                 signal). Bridges to /eyes. Any EXIT defers to /eyes — guessing crash-vs-config from stderr is
//                 endlessly leaky, so hands never false-fails a boot; /eyes (real env) adjudicates runtime.
//
// Honest verdict (the false-green guard — hardened after two adversarial reviews found 12 holes):
//   BUILT (pass)        — a CONTENT rung (parse/build/boot) verified something, no rung failed, and no unchecked
//                         CODE file (.tsx etc.) was left uncovered by a build rung (the sibling-mask guard).
//   INCOMPLETE (fail)   — a rung ran and the build is broken (parse error / build fail-or-hang / boot crash).
//   UNVERIFIABLE (unknown) — nothing could be inspected, or unchecked code went uncovered. Refuses to green-light
//                         code it never looked at. ARTIFACT alone never yields BUILT.
// Process hygiene: build & boot run through spawnTreeKill — output is drained (no ENOBUFS) and the WHOLE process
// tree is killed on timeout (no orphaned server holding a port).
//
//   node scripts/loop-hands.mjs gate [--paths "a,b"] [--boot-timeout 8000] [--build-timeout 120000] [--no-boot] [--no-build]

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync, execFileSync } from "node:child_process";

const CWD = process.cwd();
const MEMORY = join(dirname(fileURLToPath(import.meta.url)), "loop-memory.mjs");
const die = (m) => { process.stderr.write("loop-hands: " + m + "\n"); process.exit(1); };

function parseFlags(argv) {
  const f = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) { const n = argv[i + 1]; f[argv[i].slice(2)] = n !== undefined && !n.startsWith("--") ? argv[++i] : true; }
  }
  return f;
}
const git = (args) => { const r = spawnSync("git", args, { cwd: CWD, encoding: "utf8" }); return r.status === 0 ? (r.stdout || "") : null; };
const lines = (s) => (s || "").split(/\r?\n/).filter(Boolean);
const readPkg = () => { try { return JSON.parse(readFileSync(join(CWD, "package.json"), "utf8")); } catch { return null; } };

// run a process with output draining (no ENOBUFS) + whole-tree kill on timeout (no orphans). Resolves, never rejects.
function spawnTreeKill(cmd, args, { shell = false, timeoutMs }) {
  return new Promise((resolve) => {
    let child;
    try { child = spawn(cmd, args, { cwd: CWD, shell, stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32" }); }
    catch (e) { return resolve({ spawnError: e.message }); }
    let out = "", err = "", done = false;
    child.stdout.on("data", (d) => { if (out.length < 1 << 20) out += d.toString(); });
    child.stderr.on("data", (d) => { if (err.length < 1 << 20) err += d.toString(); });
    const killTree = () => { try { if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" }); else { try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); } } } catch { /* ignore */ } };
    const finish = (r) => { if (done) return; done = true; clearTimeout(t); killTree(); resolve(r); };
    const t = setTimeout(() => finish({ timedOut: true, stdout: out, stderr: err }), timeoutMs);
    child.on("exit", (code) => finish({ status: code, stdout: out, stderr: err }));
    child.on("error", (e) => finish({ spawnError: e.message, stdout: out, stderr: err }));
  });
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd !== "gate") die(`unknown command "${cmd || ""}". Use: gate`);
const f = parseFlags(rest);
const bootTimeout = Number(f["boot-timeout"]) || 8000;
const buildTimeout = Number(f["build-timeout"]) || 120000;
const pkg = readPkg();

const ran = [], fails = [], notes = [];
let parseRan = false, buildRan = false, bootRan = false;

// ── Rung 1: ARTIFACT (signal + PARSE inputs; never a sufficient pass, never a hard fail on a clean tree) ───
const notLoop = (p) => p !== ".loop" && !p.startsWith(".loop/");
const isGit = git(["rev-parse", "--is-inside-work-tree"]) !== null;
let changed = [], deletedCount = 0;
if (isGit) {
  const mod = lines(git(["diff", "--name-only", "HEAD"]) ?? git(["diff", "--name-only"]));
  const staged = lines(git(["diff", "--name-only", "--cached"]));
  const others = lines(git(["ls-files", "--others", "--exclude-standard"]));
  changed = [...new Set([...mod, ...staged, ...others])].filter((p) => notLoop(p) && existsSync(join(CWD, p)));
  const del = [...lines(git(["diff", "--name-only", "--diff-filter=D", "HEAD"])), ...lines(git(["diff", "--name-only", "--cached", "--diff-filter=D"]))];
  deletedCount = new Set(del.filter(notLoop)).size; // deletions are real artifacts but have no content to PARSE
}
const paths = typeof f.paths === "string" ? f.paths.split(",").map((s) => s.trim()).filter(Boolean) : [];
if (changed.length + deletedCount > 0) ran.push("artifact");
else if (paths.length) { changed = paths.filter((p) => existsSync(join(CWD, p))); if (changed.length) ran.push("artifact"); else notes.push("artifact: --paths not found on disk"); }
else if (isGit) notes.push("artifact: clean working tree — nothing uncommitted to inspect (committed build? re-run with --paths)");
else notes.push("artifact: no git repo and no --paths — cannot confirm an artifact");

// ── Rung 2: PARSE (changed source files only; sets parseRan when it actually inspects content) ────────────
const pyStub = (r) => !!r.error || r.status === 9009 || /Python was not found|Microsoft Store/i.test(r.stderr || ""); // Win Store stub ≠ a syntax error
const parseSkipped = [], parseFails = [];
for (const rel of changed) {
  const abs = join(CWD, rel);
  const ext = rel.slice(rel.lastIndexOf(".")).toLowerCase();
  if ([".js", ".mjs", ".cjs"].includes(ext)) { const r = spawnSync(process.execPath, ["--check", abs], { encoding: "utf8" }); parseRan = true; if (r.status !== 0) parseFails.push(`${rel}: ${(r.stderr || "").split(/\r?\n/)[0]}`); }
  else if (ext === ".json") { parseRan = true; try { JSON.parse(readFileSync(abs, "utf8")); } catch (e) { parseFails.push(`${rel}: ${e.message}`); } }
  else if (ext === ".py") {
    let r = spawnSync("python", ["-m", "py_compile", abs], { encoding: "utf8" });
    if (pyStub(r)) r = spawnSync("python3", ["-m", "py_compile", abs], { encoding: "utf8" });
    if (pyStub(r)) parseSkipped.push(`${rel} (no python)`);
    else { parseRan = true; if (r.status !== 0) parseFails.push(`${rel}: py syntax`); }
  } else parseSkipped.push(rel); // .ts/.tsx/.jsx/.vue/.svelte/.html/.css → no cheap parser; BUILD rung / /eyes cover these
}
if (parseFails.length) fails.push("PARSE: " + parseFails.join("; "));
else if (parseRan) ran.push("parse");
if (parseSkipped.length) notes.push(`parse-unchecked: ${parseSkipped.slice(0, 6).join(",")}${parseSkipped.length > 6 ? "…" : ""}`);

// ── Rung 3: BUILD / typecheck (a HANG/timeout is a FAIL; tree-killed so a watch-mode build leaves no orphan) ─
if (!f["no-build"]) {
  const script = pkg?.scripts?.build ? "build" : pkg?.scripts?.typecheck ? "typecheck" : null;
  if (script) {
    const r = await spawnTreeKill("npm", ["run", script, "--silent"], { shell: true, timeoutMs: buildTimeout });
    if (r.spawnError) notes.push(`build(${script}): could not spawn (${r.spawnError})`);
    else if (r.timedOut) fails.push(`BUILD(${script}): did not complete within ${Math.round(buildTimeout / 1000)}s — hang / watch-mode? (raise --build-timeout if legitimately slow)`);
    else if (r.status === 0) { ran.push(`build(${script})`); buildRan = true; }
    else fails.push(`BUILD(${script}): exit ${r.status} — ${((r.stderr || "") + (r.stdout || "")).trim().split(/\r?\n/).slice(-3).join(" ⏎ ").slice(-300) || "(no output)"}`);
  } else if (existsSync(join(CWD, "tsconfig.json"))) notes.push("TS project but no build/typecheck script — wire one so hands can verify .ts/.tsx");
  else notes.push("no build oracle (no build/typecheck script)");
}

// ── Rung 4: BOOT smoke (the bridge to /eyes; tree-killed + drained) ───────────────────────────────────────
if (!f["no-boot"]) {
  const ENTRIES = ["server.mjs", "server.js", "app.mjs", "app.js", "index.mjs", "main.mjs", "main.js"];
  let entry = ENTRIES.find((e) => existsSync(join(CWD, e))) || null;
  if (!entry && pkg?.scripts?.start) { const m = /^node\s+(\S+)/.exec(String(pkg.scripts.start).trim()); if (m && existsSync(join(CWD, m[1]))) entry = m[1]; }
  if (entry) {
    const r = await spawnTreeKill(process.execPath, [entry], { timeoutMs: bootTimeout });
    // BOOT is POSITIVE-SIGNAL-ONLY: "stayed up past the smoke window" is the one thing readable unambiguously.
    // Reading an EXIT as crash-vs-config-vs-CLI from stderr text proved endlessly leaky (3 reviews), so ANY exit
    // is deferred to /eyes (which runs with the real env) rather than guessed. hands never false-fails a boot.
    if (r.timedOut) { ran.push(`boot(${entry})`); bootRan = true; }                                  // stayed up = booted ✓
    else if (r.spawnError) notes.push(`boot(${entry}): could not spawn (${r.spawnError}) — deferred to /eyes`);
    else notes.push(`boot(${entry}): exited ${r.status} in the smoke window (short-lived script, or needs runtime env/services the gate lacks) — deferred to /eyes`);
  } else notes.push("no boot oracle (no simple node entry) — runtime deferred to /eyes");
}

// ── Verdict — a pass REQUIRES a content rung AND no unchecked code masked by a sibling (false-green guard) ─
const contentRan = parseRan || buildRan || bootRan;
// sibling-mask guard via a NON-CODE ALLOWLIST (not a code enumeration — that kept missing types like .astro/.scss):
// any changed file we could not parse and that is NOT clearly a non-code asset is "unverified source". It counts
// as covered ONLY if a whole-project BUILD rung ran; else a parseable sibling must not green it.
// inert assets only — NOT yaml/toml/ini (those drive builds: netlify.toml, Cargo.toml, CI yml → treat as source);
// real lockfiles stay safe by name.
const SAFE_NONCODE = /\.(md|markdown|txt|rst|csv|tsv|lock|map|snap|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|eot|otf|pdf|mp[34]|mov|zip|gz)$|(^|[\\/])(LICENSE|README|CHANGELOG|\.gitignore|\.gitattributes|\.editorconfig|\.npmrc|\.env(\.\w+)?|pnpm-lock\.yaml)$/i;
const unverifiedSrc = parseSkipped.map((p) => p.replace(/ \(no python\)$/, "")).filter((p) => !SAFE_NONCODE.test(p));
const masked = unverifiedSrc.length > 0 && !buildRan;
let verdict, headline;
if (fails.length) { verdict = "fail"; headline = "INCOMPLETE/BROKEN"; }
else if (!contentRan || masked) { verdict = "unknown"; headline = "UNVERIFIABLE"; if (masked && contentRan) notes.push(`unverified source (no parser + no build script): ${unverifiedSrc.slice(0, 4).join(",")} — wire a build/typecheck script, or /eyes verifies it at runtime`); }
else { verdict = "pass"; headline = "BUILT"; if (buildRan && unverifiedSrc.length) notes.push(`unparsed source ${unverifiedSrc.slice(0, 4).join(",")} assumed covered by the build script`); }

const summary = `${headline}: ran[${ran.join(" ") || "-"}]`
  + (fails.length ? ` FAILS[${fails.join(" | ")}]` : "")
  + (notes.length ? ` notes[${notes.join("; ")}]` : "");

try { execFileSync("node", [MEMORY, "add", "--organ", "hands", "--type", "gate", "--verdict", verdict, "--summary", summary], { cwd: CWD, stdio: "ignore" }); }
catch { /* spine write best-effort */ }

process.stdout.write(`HANDS ${verdict.toUpperCase()}: ${summary}\n`);
process.exit(0);
