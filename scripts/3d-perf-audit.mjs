#!/usr/bin/env node
// 3D / WebGL perf gate — the SECOND oracle (graphics budgets), separate from /ui-refine's DOM gate.
// Governs what lives INSIDE the <canvas>: glTF/GLB asset budgets (always) + an optional local FPS floor.
//
// Reliable & dependency-free: glTF/GLB metadata budget check (triangles, draw calls, textures, compression).
// Optional (needs `playwright`): a local frame-time sampler — a FLOOR smoke-test only. Real mid-tier-device
// FPS, battery/thermal, and canvas a11y stay mandatory human checks in SIGNOFF.md (headless GPU lies).
//
// Usage:
//   node scripts/3d-perf-audit.mjs                                           # asset budgets only
//   AUDIT_URL=http://localhost:3000/ node scripts/3d-perf-audit.mjs --fps    # + local FPS floor (if playwright)
//
// Exit: 0 = pass · 1 = a budget failed · 2 = no 3D assets found AND no FPS sample taken.

import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const WANT_FPS = process.argv.includes("--fps");
const URL = process.env.AUDIT_URL || "http://localhost:3000/";

const budget = JSON.parse(readFileSync(join(ROOT, "3d-budget.json"), "utf8"));
const line = (c = "─") => c.repeat(60);
const log = (s = "") => process.stdout.write(s + "\n");

// ---- find glTF/GLB assets (skip dependency / build dirs) ----
const SKIP = new Set(["node_modules", ".git", "dist", "build", ".next", ".lighthouse", "out", "coverage"]);
function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP.has(e.name)) walk(join(dir, e.name), acc);
    } else if (/\.(glb|gltf)$/i.test(e.name)) {
      acc.push(join(dir, e.name));
    }
  }
  return acc;
}

// ---- parse glTF JSON metadata (no geometry decode required) ----
function readGltfJson(file) {
  const buf = readFileSync(file);
  if (extname(file).toLowerCase() === ".glb") {
    // GLB container: 12-byte header (magic, version, length) then chunks; first chunk (type 'JSON').
    if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error("bad GLB magic");
    const chunkLen = buf.readUInt32LE(12);
    if (buf.readUInt32LE(16) !== 0x4e4f534a) throw new Error("first GLB chunk is not JSON");
    return JSON.parse(buf.subarray(20, 20 + chunkLen).toString("utf8"));
  }
  return JSON.parse(buf.toString("utf8"));
}

function analyze(file) {
  const g = readGltfJson(file);
  const acc = g.accessors || [];
  let triangles = 0;
  let drawCalls = 0;
  for (const m of g.meshes || []) {
    for (const p of m.primitives || []) {
      drawCalls++;
      const mode = p.mode === undefined ? 4 : p.mode; // 4 = TRIANGLES
      let count = 0;
      if (p.indices !== undefined && acc[p.indices]) count = acc[p.indices].count;
      else if (p.attributes?.POSITION !== undefined && acc[p.attributes.POSITION]) count = acc[p.attributes.POSITION].count;
      if (mode === 4) triangles += count / 3;
      else if (mode === 5 || mode === 6) triangles += Math.max(0, count - 2); // strip/fan ≈
    }
  }
  const used = new Set([...(g.extensionsUsed || []), ...(g.extensionsRequired || [])]);
  const bv = g.bufferViews || [];
  let textureBytes = 0;
  for (const im of g.images || []) {
    if (im.bufferView !== undefined && bv[im.bufferView]) textureBytes += bv[im.bufferView].byteLength || 0;
  }
  return {
    fileBytes: statSync(file).size,
    triangles: Math.round(triangles),
    drawCalls,
    textureBytes,
    imageCount: (g.images || []).length,
    geomCompressed: used.has("KHR_draco_mesh_compression") || used.has("EXT_meshopt_compression"),
    texCompressed: used.has("KHR_texture_basisu"),
  };
}

const mb = (b) => (b / 1048576).toFixed(1) + "MB";

// ---- asset budget gate ----
log(line("="));
log("3D ASSET BUDGET GATE  (glTF / GLB)");
log(line("="));

const assets = walk(ROOT);
let assetFail = false;

if (assets.length === 0) {
  log("• No .glb/.gltf assets found under the project.");
  log("  If your 3D is procedural or uses another format, asset budgets don't apply — but the");
  log("  FPS + manual real-device checks still do (SIGNOFF.md › 3D / WebGL).");
} else {
  const pa = budget.perAsset || {};
  for (const file of assets) {
    const rel = relative(ROOT, file);
    let a;
    try { a = analyze(file); }
    catch (e) { assetFail = true; log(`✗ ${rel} — parse failed (${e.message})`); continue; }
    const fails = [];
    if (pa.maxFileBytes && a.fileBytes > pa.maxFileBytes) fails.push(`file ${mb(a.fileBytes)} > ${mb(pa.maxFileBytes)}`);
    if (pa.maxTriangles && a.triangles > pa.maxTriangles) fails.push(`tris ${a.triangles} > ${pa.maxTriangles}`);
    if (pa.maxDrawCalls && a.drawCalls > pa.maxDrawCalls) fails.push(`draws ${a.drawCalls} > ${pa.maxDrawCalls}`);
    if (pa.maxTextureBytes && a.textureBytes > pa.maxTextureBytes) fails.push(`tex ${mb(a.textureBytes)} > ${mb(pa.maxTextureBytes)}`);
    if (budget.require?.geometryCompression && !a.geomCompressed) fails.push("geometry uncompressed (need Draco or meshopt)");
    if (budget.require?.textureCompression && a.imageCount > 0 && !a.texCompressed) fails.push("textures not KTX2/Basis");
    if (fails.length) { assetFail = true; log(`✗ ${rel}`); fails.forEach((f) => log(`    - ${f}`)); }
    else log(`✓ ${rel}  (${a.triangles} tris · ${a.drawCalls} draws · ${mb(a.fileBytes)})`);
  }
}

// ---- optional local FPS floor (smoke test) ----
let fpsFail = false;
let fpsRan = false;
if (WANT_FPS) {
  log("");
  log(line("="));
  log("LOCAL FPS FLOOR  (smoke test — NOT a real-device measurement)");
  log(line("="));
  let chromium = null;
  try { ({ chromium } = await import("playwright")); } catch { /* not installed */ }
  if (!chromium) {
    log("• playwright not installed — skipping. Enable with:");
    log("    npm i -D playwright && npx playwright install chromium");
    log("  Real mid-tier-device FPS is mandatory in SIGNOFF.md regardless; this is only a local floor.");
  } else {
    fpsRan = true;
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
      const deltas = await page.evaluate(() => new Promise((resolve) => {
        const out = []; let last = performance.now(); const t0 = last;
        const tick = (now) => { out.push(now - last); last = now; if (now - t0 < 5000) requestAnimationFrame(tick); else resolve(out); };
        requestAnimationFrame(tick);
      }));
      const sorted = [...deltas].sort((a, b) => a - b);
      const medianFps = Math.round(1000 / (sorted[Math.floor(sorted.length / 2)] || 16.7));
      const longFrames = deltas.filter((d) => d > 50).length;
      const f = budget.fps || {};
      log(`  median ≈ ${medianFps} fps  ·  long frames (>50ms): ${longFrames}  ·  samples: ${deltas.length}`);
      if (f.minMedianFps && medianFps < f.minMedianFps) { fpsFail = true; log(`✗ median ${medianFps}fps < ${f.minMedianFps}`); }
      if (f.maxLongFrames !== undefined && longFrames > f.maxLongFrames) { fpsFail = true; log(`✗ long frames ${longFrames} > ${f.maxLongFrames}`); }
      if (!fpsFail) log("✓ local FPS floor passed (still verify on a real mid-tier device).");
    } finally { await browser.close(); }
  }
}

// ---- summary ----
log("");
log(line("="));
log("3D-PERF GATE SUMMARY");
log(line("="));
log(`  assets : ${assets.length === 0 ? "none found" : assetFail ? "FAIL" : "PASS"}`);
log(`  fps    : ${WANT_FPS ? (fpsRan ? (fpsFail ? "FAIL" : "PASS (local floor)") : "skipped (no playwright)") : "not run (pass --fps)"}`);
const gateFail = assetFail || fpsFail;
const nothingChecked = assets.length === 0 && !fpsRan;
log("");
log(`GATE: ${nothingChecked ? "N/A (no 3D assets audited; no FPS sampled)" : gateFail ? "FAIL" : "PASS"}`);
log("");
log("⚠ This gate does NOT certify production-grade 3D. Real mid-tier-device FPS, battery/thermal, and");
log("  canvas screen-reader / keyboard fallbacks are HUMAN checks — see SIGNOFF.md › 3D / WebGL.");

process.exit(assets.length === 0 && !fpsRan ? 2 : gateFail ? 1 : 0);
