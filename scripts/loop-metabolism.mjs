#!/usr/bin/env node
// loop-metabolism — the cost/limit GOVERNOR for the loop architecture.
//
// Oracle = REAL tokens spent, parsed from Claude Code session transcripts (.jsonl `message.usage`:
// input / output / cache-read / cache-write, per model). So *spend* is measured, never guessed.
//
// Honest scope: the user is on a Claude SUBSCRIPTION (rate limits, not dollar charges), and real-time
// rate-limit headroom is NOT machine-readable. So this governs a TOKEN-BUDGET PROXY — a cost-equivalent
// USD figure (a heaviness proxy, NOT a bill) — against a configurable ceiling, and FAILS SAFE to DEFER
// when spend or ceiling is unknown. It never fabricates a GREEN. Shares .loop/state.json (the spine)
// with loop-memory.mjs, writing only the `budget` field.
//
//   node scripts/loop-metabolism.mjs measure [fileOrDir]   # sum real spend -> report + GREEN/YELLOW/RED
//   node scripts/loop-metabolism.mjs budget --ceiling 5 [--yellow 0.7] [--red 0.9]
//   node scripts/loop-metabolism.mjs baseline [fileOrDir] [--top 12]  # WHERE spend goes: main vs fan-out, per-model, per-subagent + saves a snapshot to .loop/baselines/

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const LOOP = join(process.cwd(), ".loop");
const STATE = join(LOOP, "state.json");

// $/MTok (input, output) — proxy weights, not a bill. Cache: read 0.1x in, 5m-write 1.25x in, 1h-write 2x in.
const PRICES = [[/opus/i, { in: 5, out: 25 }], [/sonnet/i, { in: 3, out: 15 }], [/haiku/i, { in: 1, out: 5 }]];
const priceFor = (model) => (PRICES.find(([re]) => re.test(model || "")) || [, { in: 5, out: 25 }])[1];
const DEFAULT_CEILING_USD = 250; // placeholder so the governor isn't REPORT-ONLY forever; tune per project via `budget --ceiling`

const usd = (n) => "$" + n.toFixed(2);
const fmt = (n) => n.toLocaleString("en-US");
const die = (m) => { process.stderr.write("loop-metabolism: " + m + "\n"); process.exit(1); };

function loadState() {
  if (!existsSync(STATE)) return { schemaVersion: 1, project: "", updatedAt: "", currentGoal: null, next: null, budget: null, body: null, latest: {}, log: [] };
  try { return JSON.parse(readFileSync(STATE, "utf8")); } catch (e) { die("state.json is corrupt: " + e.message); }
}
function parseFlags(argv) {
  const f = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) { const n = argv[i + 1]; f[argv[i].slice(2)] = n !== undefined && !n.startsWith("--") ? argv[++i] : true; }
  }
  return f;
}

function jsonlUnder(dir) {
  const out = [];
  let entries; try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...jsonlUnder(p));
    else if (e.isFile() && e.name.endsWith(".jsonl")) out.push(p);
  }
  return out;
}
function candidateRoots() {
  const roots = [];
  const cfg = process.env.CLAUDE_CONFIG_DIR;
  if (cfg) roots.push(join(cfg, "projects"));
  roots.push(join(homedir(), ".claude", "projects"), join(homedir(), ".claude-work", "projects"));
  return [...new Set(roots)].filter(existsSync);
}
// a session = its main <id>.jsonl PLUS its subagent transcripts, which live in a SEPARATE <id>/subagents/ dir (NOT inline)
function sessionTargets(file) {
  const subs = join(file.replace(/\.jsonl$/i, ""), "subagents");
  return existsSync(subs) ? [file, ...jsonlUnder(subs)] : [file];
}
function resolveTargets(arg) {
  if (arg) { let st; try { st = statSync(arg); } catch { die("no such path: " + arg); } return st.isDirectory() ? jsonlUnder(arg) : [arg]; }
  const roots = candidateRoots();
  // PIN to the current session via env — race-free (no cross-project newest-mtime mixups) AND pulls in subagents
  const id = process.env.CLAUDE_CODE_SESSION_ID;
  if (id) {
    for (const root of roots) {
      let dirs; try { dirs = readdirSync(root, { withFileTypes: true }); } catch { continue; }
      for (const d of dirs) {
        if (!d.isDirectory()) continue;
        const main = join(root, d.name, id + ".jsonl");
        if (existsSync(main)) return sessionTargets(main);
      }
    }
  }
  // fallback (no session env): newest .jsonl + its subagents (heuristic — may pick the wrong session; pass a path to be exact)
  const all = roots.flatMap(jsonlUnder);
  if (!all.length) return [];
  all.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return sessionTargets(all[0]);
}

// shared cost math — ONE formula, used by both the governor (measure) and the baseline breakdown, so they never diverge
function costOf(u, model) {
  const pr = priceFor(model);
  const cc = u.cache_creation || {};
  const c5raw = cc.ephemeral_5m_input_tokens || 0, c1raw = cc.ephemeral_1h_input_tokens || 0;
  const ccTotal = u.cache_creation_input_tokens || 0, known = c5raw + c1raw;
  const c5 = known > 0 ? c5raw : ccTotal, c1 = known > 0 ? c1raw : 0; // no breakdown -> treat all as 5m
  const cr = u.cache_read_input_tokens || 0, inp = u.input_tokens || 0, outp = u.output_tokens || 0;
  const cost = (outp * pr.out + inp * pr.in + cr * pr.in * 0.1 + (c5 * 1.25 + c1 * 2) * pr.in) / 1e6;
  return { cost, inp, cr, c5, c1, outp };
}
// classify a transcript: MAIN session (orchestrator + inline organs) vs subagent FAN-OUT, and which fan-out group
// (a workflow run `wf_…`, or a direct Agent-tool spawn). Path is the oracle: subagents live under `<id>/subagents/`.
function classifyFile(file) {
  const isSub = /[\\/]subagents[\\/]/.test(file);
  let group = "main";
  if (isSub) { const wf = file.match(/[\\/]subagents[\\/]workflows[\\/](wf_[A-Za-z0-9_-]+)/); group = wf ? wf[1] : "direct-spawn"; }
  return { isSub, group };
}
// per-file spend + a human label (first user-message snippet) so a fan-out row says WHAT it was, not just an agent id
function measureFile(file) {
  let text; try { text = readFileSync(file, "utf8"); } catch { return null; }
  const r = { file, records: 0, tokens: 0, costUsd: 0, byModel: {}, label: "" };
  for (const line of text.split("\n")) {
    if (!r.label && line.includes('"role":"user"')) {
      try {
        const o = JSON.parse(line); const c = o && o.message && o.message.content;
        let s = typeof c === "string" ? c : Array.isArray(c) ? ((c.find((b) => b && b.type === "text") || {}).text || "") : "";
        if (s) r.label = s.replace(/\s+/g, " ").trim().slice(0, 70);
      } catch {}
    }
    if (!line.includes('"output_tokens"')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const u = o && o.message && o.message.usage;
    if (!u || typeof u.output_tokens !== "number") continue;
    const model = (o.message && o.message.model) || "unknown";
    const { cost, inp, cr, c5, c1, outp } = costOf(u, model);
    r.tokens += inp + cr + c5 + c1 + outp; r.costUsd += cost; r.records++;
    const key = model.replace(/\[.*$/, ""); r.byModel[key] = (r.byModel[key] || 0) + cost;
  }
  return r;
}

function measure(files) {
  let records = 0;
  const tot = { input: 0, cacheRead: 0, cache5m: 0, cache1h: 0, output: 0, webSearch: 0, webFetch: 0, costUsd: 0 };
  const byModel = {};
  for (const file of files) {
    let text; try { text = readFileSync(file, "utf8"); } catch { continue; }
    for (const line of text.split("\n")) {
      if (!line.includes('"output_tokens"')) continue;
      let o; try { o = JSON.parse(line); } catch { continue; }
      const u = o && o.message && o.message.usage;
      if (!u || typeof u.output_tokens !== "number") continue;
      const model = (o.message && o.message.model) || "unknown";
      const { cost, inp, cr, c5, c1, outp } = costOf(u, model);
      tot.input += inp; tot.cacheRead += cr; tot.cache5m += c5; tot.cache1h += c1; tot.output += outp; tot.costUsd += cost;
      if (u.server_tool_use) { tot.webSearch += u.server_tool_use.web_search_requests || 0; tot.webFetch += u.server_tool_use.web_fetch_requests || 0; }
      const key = model.replace(/\[.*$/, "");
      (byModel[key] = byModel[key] || { records: 0, output: 0, costUsd: 0 });
      byModel[key].records++; byModel[key].output += outp; byModel[key].costUsd += cost; records++;
    }
  }
  return { records, tot, byModel };
}

const [cmd, ...rest] = process.argv.slice(2);
if (!existsSync(LOOP)) mkdirSync(LOOP, { recursive: true });

if (cmd === "budget") {
  const f = parseFlags(rest);
  const state = loadState();
  const b = state.budget || { ceilingUsd: null, yellowAt: 0.7, redAt: 0.9, spentUsd: 0, spentTokens: 0, ts: "" };
  if (f.ceiling !== undefined && f.ceiling !== true) b.ceilingUsd = Number(f.ceiling);
  if (f.yellow !== undefined && f.yellow !== true) b.yellowAt = Number(f.yellow);
  if (f.red !== undefined && f.red !== true) b.redAt = Number(f.red);
  b.ts = new Date().toISOString();
  state.budget = b; state.updatedAt = b.ts;
  writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n");
  process.stdout.write(`budget set -> ceiling: ${b.ceilingUsd != null ? usd(b.ceilingUsd) : "(none)"} | yellow@${b.yellowAt} red@${b.redAt}\n`);
  process.exit(0);
}

if (cmd === "measure") {
  const files = resolveTargets(rest.find((a) => !a.startsWith("--")));
  if (!files.length) { process.stdout.write("METABOLISM: UNKNOWN — no transcript found. Can't govern blind → DEFER expensive organs.\n"); process.exit(0); }
  const m = measure(files);
  if (m.records === 0) { process.stdout.write(`METABOLISM: UNKNOWN — ${files.length} file(s), no usage records parsed (format changed?). Fail-safe → DEFER.\n`); process.exit(0); }

  const totalTokens = m.tot.input + m.tot.cacheRead + m.tot.cache5m + m.tot.cache1h + m.tot.output;
  process.stdout.write(`# METABOLISM — real spend across ${files.length} transcript(s), ${m.records} message(s)\n`);
  process.stdout.write(`cost-equivalent: ${usd(m.tot.costUsd)}  (PROXY for heaviness — subscription, not a bill)\n`);
  process.stdout.write(`tokens: out ${fmt(m.tot.output)} | in ${fmt(m.tot.input)} | cache-read ${fmt(m.tot.cacheRead)} | cache-write ${fmt(m.tot.cache5m + m.tot.cache1h)} | total ${fmt(totalTokens)}\n`);
  if (m.tot.webSearch || m.tot.webFetch) process.stdout.write(`senses I/O: ${m.tot.webSearch} web searches, ${m.tot.webFetch} fetches (separate limit)\n`);
  for (const [model, v] of Object.entries(m.byModel)) process.stdout.write(`  ${model}: ${usd(v.costUsd)} (${fmt(v.output)} out, ${v.records} msgs)\n`);

  const state = loadState();
  const b = state.budget || { ceilingUsd: null, yellowAt: 0.7, redAt: 0.9, spentUsd: 0, spentTokens: 0, ts: "" };
  b.spentUsd = m.tot.costUsd; b.spentTokens = totalTokens; b.ts = new Date().toISOString();
  state.budget = b; state.updatedAt = b.ts;
  writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n");

  const hasCustom = b.ceilingUsd != null;                     // unset ceiling -> labeled DEFAULT, never REPORT-ONLY-forever
  const ceiling = hasCustom ? b.ceilingUsd : DEFAULT_CEILING_USD;
  const yellowAt = b.yellowAt != null ? b.yellowAt : 0.7, redAt = b.redAt != null ? b.redAt : 0.9;
  const frac = m.tot.costUsd / ceiling, pct = (frac * 100).toFixed(0);
  let verdict, advice;
  if (frac >= redAt) { verdict = "RED — DEFER"; advice = "halt the HIGH-cost organs (council-deep / ui-refine / senses); finish on cheap ops or hand back to the human."; }
  else if (frac >= yellowAt) { verdict = "YELLOW — DOWNGRADE"; advice = "throttle: Sonnet over Opus for advisors, fewer parallel agents, skip OPTIONAL gates (keep the honesty gates)."; }
  else { verdict = "GREEN — PROCEED"; advice = "headroom OK; run at full tier."; }
  const tag = hasCustom ? "" : ` [default placeholder $${DEFAULT_CEILING_USD} — tune with: budget --ceiling <usd>]`;
  process.stdout.write(`VERDICT: ${verdict} — ${pct}% of ${usd(ceiling)} ceiling${tag}. ${advice}\n`);
  process.exit(0);
}

if (cmd === "baseline") {
  // B — "measure before you optimize": break spend down so you can SEE the leak (fan-out vs main vs model)
  // and save a snapshot to diff a later change against. Per-organ COST is NOT attributable here (transcripts
  // carry model, not organ) — that needs body to tag each spawn; what IS attributable: main-vs-fanout, per-model, per-subagent.
  const f = parseFlags(rest);
  const files = resolveTargets(rest.find((a) => !a.startsWith("--")));
  if (!files.length) { process.stdout.write("METABOLISM BASELINE: UNKNOWN — no transcript found.\n"); process.exit(0); }
  const topN = f.top && f.top !== true ? Number(f.top) : 12;
  const per = files.map(measureFile).filter((r) => r && r.records > 0);
  if (!per.length) { process.stdout.write(`METABOLISM BASELINE: UNKNOWN — ${files.length} file(s), no usage records parsed.\n`); process.exit(0); }

  const sum = (arr, k) => arr.reduce((s, r) => s + r[k], 0);
  const totalCost = sum(per, "costUsd"), totalTok = sum(per, "tokens"), totalRec = sum(per, "records");
  const mains = per.filter((r) => !classifyFile(r.file).isSub);
  const subs = per.filter((r) => classifyFile(r.file).isSub);
  const mainCost = sum(mains, "costUsd"), subCost = sum(subs, "costUsd");
  const pct = (c) => (totalCost > 0 ? (c / totalCost * 100).toFixed(1) : "0.0");

  const groups = {};
  for (const r of subs) { const g = classifyFile(r.file).group; (groups[g] = groups[g] || { cost: 0, n: 0 }); groups[g].cost += r.costUsd; groups[g].n++; }
  const byModel = {};
  for (const r of per) for (const [m, c] of Object.entries(r.byModel)) byModel[m] = (byModel[m] || 0) + c;
  const top = [...per].sort((a, b) => b.costUsd - a.costUsd).slice(0, topN);

  process.stdout.write(`# METABOLISM BASELINE — ${per.length} transcript(s) (${mains.length} main, ${subs.length} subagent), ${fmt(totalRec)} message(s)\n`);
  process.stdout.write(`total cost-equivalent: ${usd(totalCost)}  (PROXY for heaviness — subscription, not a bill)  |  ${fmt(totalTok)} tokens\n\n`);
  process.stdout.write(`WHERE IT GOES — main thread vs fan-out:\n`);
  process.stdout.write(`  MAIN (orchestrator + inline organs): ${usd(mainCost)} (${pct(mainCost)}%)\n`);
  process.stdout.write(`  FAN-OUT (spawned subagents):         ${usd(subCost)} (${pct(subCost)}%)\n\n`);
  process.stdout.write(`by model (where Haiku-routing would show up over time):\n`);
  for (const [m, c] of Object.entries(byModel).sort((a, b) => b[1] - a[1])) process.stdout.write(`  ${m}: ${usd(c)} (${pct(c)}%)\n`);
  process.stdout.write(`\nfan-out groups (a workflow run, or direct spawns):\n`);
  for (const [g, v] of Object.entries(groups).sort((a, b) => b[1].cost - a[1].cost).slice(0, 8)) process.stdout.write(`  ${g}: ${usd(v.cost)} (${v.n} agents)\n`);
  process.stdout.write(`\ntop ${top.length} spenders:\n`);
  for (const r of top) { const c = classifyFile(r.file); const lbl = c.isSub ? (r.label || r.file.split(/[\\/]/).pop()) : `whole main session ${r.file.split(/[\\/]/).pop().replace(/\.jsonl$/, "").slice(0, 8)}… (not one task)`; process.stdout.write(`  ${usd(r.costUsd)}  [${c.isSub ? "sub" : "main"}]  ${lbl}\n`); }

  // the decision-relevant READ — is the leak fan-out (the council's Devil's Advocate) or inline effort?
  const fo = subCost / (totalCost || 1);
  process.stdout.write(`\nREAD: `);
  if (fo >= 0.6) process.stdout.write(`fan-out is ${pct(subCost)}% of spend — FAN-OUT DISCIPLINE / context hygiene is the highest-leverage lever, NOT mechanical-organ tier. (Confirms the council's Devil's Advocate; a Haiku-on-mechanical-organs change would be a rounding error here.)\n`);
  else if (fo >= 0.3) process.stdout.write(`fan-out is ${pct(subCost)}% of spend — meaningful, but the main thread carries ${pct(mainCost)}%; weigh both before optimizing.\n`);
  else process.stdout.write(`the main thread carries ${pct(mainCost)}% — fan-out is minor here; model/effort on the main + inline work matters more this run.\n`);

  // save a snapshot to diff a later change against — this is how you PROVE an optimization helped (field % are refuted)
  const stamp = new Date().toISOString();
  const snap = {
    ts: stamp, totalCostUsd: +totalCost.toFixed(4), totalTokens: totalTok, messages: totalRec,
    mainCostUsd: +mainCost.toFixed(4), fanoutCostUsd: +subCost.toFixed(4), fanoutPct: +pct(subCost),
    transcripts: per.length, mainFiles: mains.length, subFiles: subs.length,
    byModelUsd: Object.fromEntries(Object.entries(byModel).map(([m, c]) => [m, +c.toFixed(4)])),
    fanoutGroups: Object.fromEntries(Object.entries(groups).map(([g, v]) => [g, { usd: +v.cost.toFixed(4), agents: v.n }])),
    top: top.map((r) => { const isSub = classifyFile(r.file).isSub; return { usd: +r.costUsd.toFixed(4), kind: isSub ? "sub" : "main", group: classifyFile(r.file).group, label: isSub ? r.label : "(whole main session — not one task)", file: r.file.split(/[\\/]/).pop() }; }),
    note: "per-organ COST not attributable (transcripts carry model, not organ; needs body to tag spawns). Attributable splits: main-vs-fanout, per-model, per-subagent.",
  };
  const bdir = join(LOOP, "baselines");
  if (!existsSync(bdir)) mkdirSync(bdir, { recursive: true });
  const outPath = join(bdir, stamp.replace(/[:.]/g, "-") + ".json");
  writeFileSync(outPath, JSON.stringify(snap, null, 2) + "\n");
  writeFileSync(join(bdir, "latest.json"), JSON.stringify(snap, null, 2) + "\n");
  process.stdout.write(`\nbaseline snapshot -> ${outPath}\n(re-run after a change and diff against baselines/latest.json to PROVE it helped — don't trust the refuted field percentages)\n`);
  process.exit(0);
}

die(`unknown command "${cmd || ""}". Use: measure | budget | baseline`);
