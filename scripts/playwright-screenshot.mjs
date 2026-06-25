#!/usr/bin/env node
// CI screenshot capture for ui-refine visual review loop.
// Runs in GitHub Actions with SwiftShader so WebGL (Three.js board) actually renders.
//
// Usage: PREVIEW_URL=http://localhost:4173 node scripts/playwright-screenshot.mjs
// Pull after CI: gh run download <run-id> -n screenshots

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.PREVIEW_URL ?? "http://localhost:4173";
const OUT = process.env.SCREENSHOTS_DIR ?? ".screenshots";
mkdirSync(OUT, { recursive: true });
console.log(`Saving screenshots to: ${OUT}`);

const browser = await chromium.launch({
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu-sandbox",
  ],
});

const page = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 800 });

async function shot(name, waitMs = 2000) {
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`✓ ${name}.png`);
}

// Home
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
await shot("home", 1500);

// Game — normal view (wait longer for Three.js init)
await page.goto(`${BASE}/game`, { waitUntil: "domcontentloaded", timeout: 30_000 });
await shot("game-normal", 5000);

// Game — kiosk/focus mode
try {
  await page.click('button:has-text("Focus mode")', { timeout: 3000 });
  await shot("game-kiosk", 2500);
} catch {
  console.warn('⚠ "Focus mode" button not found — skipping kiosk screenshot');
}

await browser.close();
console.log(`\nAll screenshots saved to ${OUT}/`);
console.log(`Pull with: gh run download <run-id> -n screenshots`);
