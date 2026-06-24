#!/usr/bin/env node
// Combined UI audit runner — the "autonomous gate loop" oracle (Loop A).
// Order: render precondition -> performance (Lighthouse) -> accessibility (pa11y),
// then a structured PASS/FAIL summary Claude Code can parse and iterate against.
//
// Usage:
//   AUDIT_URL=http://localhost:3000/ node scripts/ui-audit.mjs
//   node scripts/ui-audit.mjs --check-render-only
//
// Exit codes: 0 = all gates pass · 1 = an audit gate failed · 2 = render precondition failed.

import { spawnSync } from "node:child_process";

const URL = process.env.AUDIT_URL || "http://localhost:3000/";
const RENDER_ONLY = process.argv.includes("--check-render-only");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const line = (c = "─") => c.repeat(60);
const log = (s = "") => process.stdout.write(s + "\n");

async function renderGate() {
  log(line());
  log(`RENDER PRECONDITION — ${URL}`);
  log(line());
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(URL, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) {
      log(`✗ Server responded ${res.status}. The site must build and render locally before the loop can close.`);
      return false;
    }
    const html = await res.text();
    if (html.trim().length < 200) {
      log("✗ Response is suspiciously empty — is the app actually rendering, or just serving a shell?");
      return false;
    }
    log("✓ Site is reachable and rendering.");
    return true;
  } catch (e) {
    log(`✗ Could not reach ${URL} (${e.code || e.name}).`);
    log("  Start your dev server first (e.g. `npm run dev`), or set AUDIT_URL to the right port.");
    log("  If this repo can't render locally (auth-gated / staging-only / no local build),");
    log("  the autonomous loop does NOT apply — see CLAUDE.md › 'When the render gate can't pass'.");
    return false;
  }
}

function runGate(title, args) {
  log("");
  log(line());
  log(title);
  log(line());
  const r = spawnSync(npx, args, { stdio: "inherit", shell: process.platform === "win32" });
  return r.status === 0;
}

const summary = { render: false, perf: null, a11y: null };
summary.render = await renderGate();

if (!summary.render) {
  log("");
  log("GATE: FAIL (render precondition) — fix the dev server / build before auditing.");
  process.exit(2);
}

if (RENDER_ONLY) {
  log("");
  log("GATE: PASS (render only).");
  process.exit(0);
}

summary.perf = runGate("PERFORMANCE / CORE WEB VITALS — Lighthouse CI", ["lhci", "autorun"]);
summary.a11y = runGate("ACCESSIBILITY — pa11y-ci (axe + htmlcs, WCAG2AA)", ["pa11y-ci"]);

log("");
log(line("="));
log("AUTONOMOUS GATE SUMMARY");
log(line("="));
log(`  render : ${summary.render ? "PASS" : "FAIL"}`);
log(`  perf   : ${summary.perf ? "PASS" : "FAIL"}   (reports → .lighthouse/)`);
log(`  a11y   : ${summary.a11y ? "PASS" : "FAIL"}`);

const allGreen = summary.render && summary.perf && summary.a11y;
log("");
log(`GATE: ${allGreen ? "PASS" : "FAIL"}`);

if (allGreen) {
  log("");
  log("⚠ FALSE-GREEN GUARD: green here means the *instrumented* dimensions pass.");
  log("  It does NOT mean production-grade. Visual polish and real assistive-tech use are");
  log("  NOT certified by these gates — a human must complete SIGNOFF.md before 'done'.");
}

process.exit(allGreen ? 0 : 1);
