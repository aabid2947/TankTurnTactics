#!/usr/bin/env node
// Real-device MOBILE gate — "Loop A-Mobile". Drives a physically-connected Android phone over adb,
// loads each route in the phone's REAL Chrome via the DevTools bridge, screenshots it, and machine-
// checks the mobile layout: horizontal overflow, tap-target size, viewport meta, off-screen clipping.
//
// Honest gate (kit DNA): no device / no reachable Chrome / missing dep -> exit 2 (precondition),
// never a false pass. A real run is the ONLY thing that turns it green.
//
// Usage:
//   node scripts/mobile-audit.mjs                 # full run — needs an Android phone (USB debugging) + Chrome open
//   node scripts/mobile-audit.mjs --self-test     # offline scaffolding check (no device, no puppeteer needed)
//   AUDIT_URL=http://localhost:3000/ node scripts/mobile-audit.mjs
//
// Config: mobile-budget.json in CWD. Screenshots -> .mobile-audit/<route>.png (Read them to eyeball).
// Exit: 0 all checks pass · 1 a check failed · 2 precondition failed (no device / no Chrome / no dep).

import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SELF_TEST = process.argv.includes("--self-test");
const ADB = process.env.ADB || "adb";
const line = (c = "─") => c.repeat(64);
const log = (s = "") => process.stdout.write(s + "\n");
const rel = (p) => (p ? p.replace(process.cwd() + (process.platform === "win32" ? "\\" : "/"), "") : p);

const DEFAULTS = {
  baseUrl: "http://localhost:3000",
  routes: ["/"],
  minTapTargetPx: 44, // iOS HIG 44 / Material 48 / WCAG 2.5.5 AAA 44. Lower to 24 for WCAG 2.5.8 AA.
  maxOverflowPx: 2,
  reversePorts: [3000], // phone localhost:<port> -> PC, so the phone reaches your dev servers with no LAN/CORS setup
  cdpPort: 9222,
  navTimeoutMs: 30000,
};

function loadConfig() {
  const p = resolve(process.cwd(), "mobile-budget.json");
  let cfg = { ...DEFAULTS };
  if (existsSync(p)) {
    try {
      cfg = { ...cfg, ...JSON.parse(readFileSync(p, "utf8")) };
    } catch (e) {
      log(`✗ mobile-budget.json is invalid JSON: ${e.message}`);
      process.exit(2);
    }
  }
  if (process.env.AUDIT_URL) cfg.baseUrl = process.env.AUDIT_URL;
  cfg.baseUrl = cfg.baseUrl.replace(/\/+$/, "");
  return cfg;
}

function adb(args) {
  return spawnSync(ADB, args, { encoding: "utf8", shell: process.platform === "win32" });
}

function adbDevices() {
  const r = adb(["devices"]);
  if (r.error) {
    return {
      ok: false,
      reason: `adb not found (${r.error.code || r.error.message}). Install Android platform-tools and put adb on PATH (or set ADB=<path>).`,
      devices: [],
    };
  }
  const devices = (r.stdout || "")
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [id, state] = l.split(/\s+/);
      return { id, state };
    });
  return { ok: true, devices };
}

// ---------------------------------------------------------------- self-test ---
if (SELF_TEST) {
  log(line());
  log("MOBILE GATE — SELF-TEST (offline scaffolding; no device needed)");
  log(line());
  const cfg = loadConfig();
  log("resolved config:");
  log(JSON.stringify(cfg, null, 2));
  log("");
  const dv = adbDevices();
  if (!dv.ok) {
    log(`  adb        : NOT FOUND — ${dv.reason}`);
  } else {
    const ready = dv.devices.filter((d) => d.state === "device");
    log(
      `  adb        : found · devices=${dv.devices.length} authorized=${ready.length}` +
        (dv.devices.length ? ` [${dv.devices.map((d) => `${d.id}:${d.state}`).join(", ")}]` : ""),
    );
  }
  let pup = false;
  try {
    await import("puppeteer-core");
    pup = true;
  } catch {
    /* not installed */
  }
  log(`  puppeteer  : ${pup ? "installed" : "NOT installed — run: npm i -D puppeteer-core (in the kit)"}`);
  log("");
  log("Self-test validates the SCRIPT + config only. A real run additionally needs an authorized");
  log("Android device with Chrome open. It never reports the UI green — only a real run can.");
  process.exit(0);
}

// ----------------------------------------------------------------- full run ---
const cfg = loadConfig();
log(line());
log(`MOBILE GATE (real Android) — ${cfg.baseUrl}`);
log(line());

// 1) device present + authorized
const dv = adbDevices();
if (!dv.ok) {
  log(`✗ ${dv.reason}`);
  process.exit(2);
}
const ready = dv.devices.filter((d) => d.state === "device");
if (ready.length === 0) {
  log("✗ No authorized Android device.");
  if (dv.devices.some((d) => d.state === "unauthorized")) {
    log("  A device is connected but UNAUTHORIZED — unlock the phone and tap 'Allow USB debugging'.");
  } else {
    log("  Connect the phone via USB, enable Developer Options → USB debugging, accept the prompt.");
    log("  Verify with:  adb devices");
  }
  process.exit(2);
}
log(`✓ device: ${ready[0].id}`);

// 2) reverse tunnels — phone localhost:<port> -> PC, so the phone reaches your dev servers with no LAN/CORS
for (const port of cfg.reversePorts) {
  const r = adb(["reverse", `tcp:${port}`, `tcp:${port}`]);
  log(
    r.status === 0
      ? `✓ adb reverse tcp:${port}  (phone localhost:${port} → PC)`
      : `⚠ adb reverse tcp:${port} failed: ${(r.stderr || "").trim()}`,
  );
}

// 3) bridge to the phone's Chrome DevTools
const fwd = adb(["forward", `tcp:${cfg.cdpPort}`, "localabstract:chrome_devtools_remote"]);
if (fwd.status !== 0) {
  log(`✗ Could not bridge to Chrome on the phone (adb forward): ${(fwd.stderr || "").trim()}`);
  log("  Open Chrome on the phone (≥1 tab), keep USB debugging on, then re-run.");
  process.exit(2);
}
log(`✓ adb forward tcp:${cfg.cdpPort} → phone Chrome DevTools`);

// 4) connect to the phone's real Chrome
let puppeteer;
try {
  ({ default: puppeteer } = await import("puppeteer-core"));
} catch {
  log("✗ puppeteer-core is not installed. Run:  npm i -D puppeteer-core   (in the kit, then re-run)");
  process.exit(2);
}

let browser;
try {
  browser = await puppeteer.connect({ browserURL: `http://localhost:${cfg.cdpPort}`, defaultViewport: null });
} catch (e) {
  log(`✗ Could not connect to the phone's Chrome at localhost:${cfg.cdpPort} (${e.message}).`);
  log("  Make sure Chrome is OPEN on the phone (≥1 tab); chrome://inspect on the PC should list the device.");
  process.exit(2);
}

const outDir = resolve(process.cwd(), ".mobile-audit");
mkdirSync(outDir, { recursive: true });
const pages = await browser.pages();
const page = pages[0] || (await browser.newPage());

const results = [];
for (const route of cfg.routes) {
  const url = cfg.baseUrl + route;
  const rec = { route, url, ok: false, error: null, checks: null, shot: null };
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: cfg.navTimeoutMs });
    await new Promise((r) => setTimeout(r, 600)); // let layout settle
    const safe = route.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") || "root";
    const shot = resolve(outDir, `${safe}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    rec.shot = shot;
    rec.checks = await page.evaluate((MIN) => {
      const vw = window.innerWidth;
      const docW = Math.max(
        document.documentElement.scrollWidth,
        document.body ? document.body.scrollWidth : 0,
      );
      const overflow = Math.max(0, docW - vw);
      const vp = document.querySelector('meta[name="viewport"]');
      const viewportOk = !!vp && /width\s*=\s*device-width/i.test(vp.getAttribute("content") || "");
      const visible = (el) => {
        const s = getComputedStyle(el);
        if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const sel =
        'a[href],button,[role="button"],input:not([type="hidden"]),select,textarea,label[for],[onclick],[tabindex]:not([tabindex="-1"])';
      const small = [];
      for (const el of document.querySelectorAll(sel)) {
        if (!visible(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < MIN || r.height < MIN) {
          small.push({
            tag: el.tagName.toLowerCase(),
            w: Math.round(r.width),
            h: Math.round(r.height),
            label: (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 32),
          });
        }
      }
      const clipped = [];
      for (const el of document.querySelectorAll("body *")) {
        if (!visible(el)) continue;
        const s = getComputedStyle(el);
        if (s.position === "fixed" || s.position === "sticky") continue;
        const r = el.getBoundingClientRect();
        if (r.right > vw + 2) clipped.push({ tag: el.tagName.toLowerCase(), over: Math.round(r.right - vw) });
      }
      clipped.sort((a, b) => b.over - a.over);
      return { vw, docW, overflow, viewportOk, small, clipped: clipped.slice(0, 8) };
    }, cfg.minTapTargetPx);
    const c = rec.checks;
    rec.ok = c.overflow <= cfg.maxOverflowPx && c.viewportOk && c.small.length === 0;
  } catch (e) {
    rec.error = e.message;
  }
  results.push(rec);
}

await browser.disconnect();

// -------------------------------------------------------------------- report ---
log("");
log(line("="));
log("MOBILE GATE SUMMARY");
log(line("="));
let pass = results.length > 0;
for (const r of results) {
  if (r.error) {
    log(`  ${r.route.padEnd(14)} ERROR — ${r.error}`);
    pass = false;
    continue;
  }
  const c = r.checks;
  if (!r.ok) pass = false;
  log(
    `  ${r.route.padEnd(14)} ${r.ok ? "PASS" : "FAIL"}  overflow=${c.overflow}px  ` +
      `viewport=${c.viewportOk ? "ok" : "MISSING"}  small-tap=${c.small.length}  clipped=${c.clipped.length}` +
      `  → ${rel(r.shot)}`,
  );
  if (c.small.length)
    log(
      `      tap<${cfg.minTapTargetPx}px: ` +
        c.small.slice(0, 6).map((s) => `${s.tag}[${s.w}×${s.h}]"${s.label}"`).join("  "),
    );
  if (c.clipped.length)
    log(`      past right edge: ` + c.clipped.slice(0, 5).map((s) => `${s.tag}(+${s.over}px)`).join("  "));
}
log("");
log(`GATE: ${pass ? "PASS" : "FAIL"}`);
if (pass) {
  log("");
  log("⚠ FALSE-GREEN GUARD: real-device LAYOUT checks pass, but touch feel, gestures (pinch-zoom crop,");
  log("  the rotation dial), real iOS/Safari, and visual taste are NOT certified here — human SIGNOFF.md.");
}
process.exit(pass ? 0 : 1);
