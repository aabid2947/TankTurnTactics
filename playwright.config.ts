import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config.
 *
 * Targets a running app. By default it boots the local Vite dev server
 * (`npm run dev`), which connects to the deployed Convex dev deployment via the
 * `VITE_CONVEX_URL` in `.env.local`. So the backend under test is real Convex —
 * make sure functions are pushed (`npx convex dev --once`) before running.
 *
 * Point at any deployed URL instead with `BASE_URL`, e.g.
 *   BASE_URL=https://tank-turn-tactics.vercel.app npx playwright test
 * When BASE_URL is an external host, the local dev server is NOT started.
 */
const externalBaseURL = process.env.BASE_URL;
const baseURL = externalBaseURL ?? "http://localhost:5173";
const useLocalServer = !externalBaseURL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: useLocalServer
    ? {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
