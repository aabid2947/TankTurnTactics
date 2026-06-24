#!/usr/bin/env node
// loop-memory — deterministic, machine-guarded write-back for the loop architecture.
// Replaces the human approval gate with CODE guards: schema'd state, append-only log,
// timestamps + provenance, supersession (autonomous self-correction), and auto-compaction
// (token-lean by force, not by hope). Used by /council, /council-deep, and /ui-refine.
//
//   node scripts/loop-memory.mjs add --organ council-deep --type decision \
//        --summary "Use .loop/state.json for machine state" [--supersedes <id>] [--data '<json>']
//   node scripts/loop-memory.mjs read     # compact, staleness-annotated view for an organ's read step
//
// Writes BOTH: .loop/state.json (structured machine state) and .loop/memory.md (human-readable knowledge).
// Types: decision | standard | lesson  → mirrored into memory.md ; gate | handoff | goal → state.json only.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const LOOP = join(process.cwd(), ".loop");
const STATE = join(LOOP, "state.json");
const MEM = join(LOOP, "memory.md");
const MAX_LOG = 200;         // state.json log entries kept
const MAX_PER_SECTION = 25;  // memory.md bullets kept per section

const TYPE_SECTION = { decision: "Decisions", standard: "Standards", lesson: "Lessons" };
const ALLOWED = new Set([...Object.keys(TYPE_SECTION), "gate", "handoff", "goal"]);

const die = (m) => { process.stderr.write("loop-memory: " + m + "\n"); process.exit(1); };

function parseFlags(argv) {
  const f = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const next = argv[i + 1];
      f[argv[i].slice(2)] = next !== undefined && !next.startsWith("--") ? argv[++i] : true;
    }
  }
  return f;
}
function loadState() {
  if (!existsSync(STATE)) return { schemaVersion: 1, project: "", updatedAt: "", currentGoal: null, next: null, budget: null, body: null, latest: {}, log: [] };
  try { return JSON.parse(readFileSync(STATE, "utf8")); } catch (e) { die("state.json is corrupt: " + e.message); }
}

const [cmd, ...rest] = process.argv.slice(2);
if (!existsSync(LOOP)) mkdirSync(LOOP, { recursive: true });

if (cmd === "add") {
  const f = parseFlags(rest);
  const organ = f.organ, type = f.type, summary = (typeof f.summary === "string" ? f.summary : "").trim();
  if (!organ || organ === true) die("--organ required");
  if (!ALLOWED.has(type)) die(`--type must be one of: ${[...ALLOWED].join(", ")}`);
  if (!summary) die("--summary required");
  let data;
  if (f.data && f.data !== true) { try { data = JSON.parse(f.data); } catch { die("--data must be valid JSON"); } }
  const verdict = (f.verdict && f.verdict !== true) ? f.verdict : null;   // structured gate outcome the Body reads
  if (verdict && !["pass", "fail", "unknown"].includes(verdict)) die("--verdict must be pass | fail | unknown");

  const ts = new Date().toISOString();
  const id = randomBytes(4).toString("hex");
  const entry = { id, ts, organ, type, summary,
    ...(data ? { data } : {}),
    ...(verdict ? { verdict } : {}),
    ...(f.supersedes && f.supersedes !== true ? { supersedes: f.supersedes } : {}) };

  const state = loadState();
  state.log.push(entry);
  if (state.log.length > MAX_LOG) state.log = state.log.slice(-MAX_LOG);
  state.latest[organ] = { id, ts, type, summary, ...(verdict ? { verdict } : {}) };
  if (type === "goal") state.currentGoal = { ts, summary };
  state.updatedAt = ts;
  writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n");

  if (TYPE_SECTION[type]) mirrorToMemory(TYPE_SECTION[type], entry);
  process.stdout.write(`recorded ${type} ${id} by ${organ} @ ${ts}\n`);
  process.exit(0);
}

if (cmd === "target") {
  const f = parseFlags(rest);
  const state = loadState();
  const ts = new Date().toISOString();
  state.next = state.next || {};
  if (f.research && f.research !== true) state.next.research = f.research;
  if (f.verify && f.verify !== true) state.next.verify = f.verify;
  if (f.review && f.review !== true) state.next.review = f.review;
  state.next.ts = ts;
  state.updatedAt = ts;
  writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n");
  process.stdout.write(`target set -> research: ${state.next.research || "-"} | verify: ${state.next.verify || "-"} | review: ${state.next.review || "-"}\n`);
  process.exit(0);
}

if (cmd === "read") {
  const state = loadState();
  const newest = state.log.length ? state.log[state.log.length - 1].ts : null;
  const staleDays = newest ? Math.floor((Date.now() - new Date(newest).getTime()) / 86400000) : null;
  process.stdout.write(`# .loop state — ${state.log.length} entries, updated ${state.updatedAt || "never"}\n`);
  if (staleDays !== null && staleDays > 14)
    process.stdout.write(`STALE: newest entry is ${staleDays}d old — re-verify standards against the live project before trusting them.\n`);
  process.stdout.write(`currentGoal: ${state.currentGoal ? state.currentGoal.summary : "(none)"}\n`);
  const _n = state.next || {};
  process.stdout.write(`next: research=${_n.research || "-"} verify=${_n.verify || "-"} review=${_n.review || "-"}\n`);
  const _b = state.budget;
  process.stdout.write(
    _b && _b.ceilingUsd != null ? `budget: $${(_b.spentUsd || 0).toFixed(2)} / $${_b.ceilingUsd} ceiling (yellow@${_b.yellowAt} red@${_b.redAt})\n`
    : _b && _b.spentUsd ? `budget: $${_b.spentUsd.toFixed(2)} spent vs default ceiling (set your own: metabolism budget --ceiling)\n`
    : `budget: (unmeasured — run /metabolism)\n`);
  const _bd = state.body;
  if (_bd) process.stdout.write(`body: ${_bd.phase}${_bd.phase === "blocked" && _bd.blockedReason ? " — " + _bd.blockedReason : ""} (iter ${_bd.iteration}/${_bd.maxIterations}) goal: ${_bd.goal}\n`);
  for (const [o, v] of Object.entries(state.latest)) process.stdout.write(`latest ${o}: [${v.type}] ${v.summary} (${v.ts})\n`);
  process.exit(0);
}

die(`unknown command "${cmd || ""}". Use: add | target | read`);

function mirrorToMemory(section, entry) {
  let lines = existsSync(MEM) ? readFileSync(MEM, "utf8").split("\n") : ["# Project Memory — loop architecture", ""];
  const date = entry.ts.slice(0, 10);
  const sup = entry.supersedes ? ` supersedes ${entry.supersedes}` : "";
  const bullet = `- [${date} · ${entry.organ}] ${entry.summary} <!-- ${entry.id}${sup} -->`;

  if (entry.supersedes) {
    lines = lines.map((l) =>
      l.includes(`<!-- ${entry.supersedes}`) && !l.includes("[superseded]") ? l.replace(/^- /, "- [superseded] ") : l);
  }

  const hi = lines.findIndex((l) => l.trim() === `## ${section}`);
  if (hi === -1) {
    lines.push("", `## ${section}`, bullet);
  } else {
    lines.splice(hi + 1, 0, bullet); // newest directly under the header
    let end = lines.findIndex((l, i) => i > hi && l.startsWith("## "));
    if (end === -1) end = lines.length;
    const bullets = [];
    for (let i = hi + 1; i < end; i++) if (lines[i].startsWith("- ")) bullets.push(i);
    if (bullets.length > MAX_PER_SECTION) {
      for (const idx of bullets.slice(MAX_PER_SECTION).reverse()) lines.splice(idx, 1); // drop oldest
    }
  }
  writeFileSync(MEM, lines.join("\n"));
}
