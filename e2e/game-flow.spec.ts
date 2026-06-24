import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { signUp, uniqueCredentials, hudChipValue } from "./helpers";

/**
 * Full multi-player game flow driven entirely through the UI against the real
 * Convex backend. Five isolated browser contexts (a host + four challengers)
 * play a game and we assert the live ruleset holds through the loop:
 *
 *   - lobby → join-by-code → host start → every client lands on the active board
 *   - period 0 grants no AP; the first resolve grants apPerGrant to every tank
 *   - a queued move + upgrade resolve, advancing the period and clearing the queue
 *   - the upgrade rule: range 1 → 2 (cost 2 AP), reflected in the HUD and history
 *   - reactivity: a challenger's independent client sees the period advance too
 *
 * Five players (not two) because the win rule ends the game at ≤ 3 survivors
 * (engine/resolve.ts: `gameOver: alive.length <= 3`) — with fewer, the first
 * resolve would immediately win the game. Real periods are ≥ 5 min, so the
 * host's "Resolve now" force-resolve drives the clock instead of the buzzer.
 */
test("five players play two periods: join, start, queue, resolve, rules apply", async ({ browser }) => {
  test.setTimeout(120_000);

  const contexts: BrowserContext[] = [];
  const newPlayer = async (): Promise<Page> => {
    const ctx = await browser.newContext();
    contexts.push(ctx);
    return ctx.newPage();
  };

  try {
    // --- Host signs up and creates a game tuned for the test. ---
    const host = await newPlayer();
    const hostCreds = uniqueCredentials();
    await signUp(host, hostCreds.email, hostCreds.password);
    await host.getByRole("button", { name: /create game/i }).click();
    await expect(host.getByRole("heading", { name: /create a game/i })).toBeVisible();

    // minPlayers 10 → 2 so a 5-player start is allowed.
    for (let i = 0; i < 8; i++) await host.getByRole("button", { name: "Decrease Min players" }).click();
    // AP per period 1 → 5 so a move (1) + upgrade-from-range-1 (2) both fit.
    for (let i = 0; i < 4; i++) await host.getByRole("button", { name: "Increase AP per period" }).click();

    await host.getByLabel("Game name").fill(`E2E Flow ${Date.now()}`);
    await host.getByRole("button", { name: /create & open lobby/i }).click();

    // Read the invite code off the waiting-room copy button.
    await expect(host.getByText(/waiting room/i)).toBeVisible();
    const code = (await host.locator('button[title="Copy invite code"] span').first().innerText()).trim();
    expect(code).toMatch(/\w/);

    // --- Four challengers sign up and join by code. ---
    const challengers: Page[] = [];
    for (let i = 0; i < 4; i++) {
      const pg = await newPlayer();
      const cr = uniqueCredentials();
      await signUp(pg, cr.email, cr.password);
      await pg.getByLabel("Game code").fill(code);
      await pg.getByRole("button", { name: /join by code/i }).click();
      await expect(pg.getByText(/waiting room/i)).toBeVisible();
      challengers.push(pg);
    }
    const challenger = challengers[0];

    // --- Host starts once all five tanks are on the roster. ---
    const startBtn = host.getByRole("button", { name: /start game/i });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    // Every client transitions to the active board at period 0 with 0 AP.
    await expect(host.getByText(/period 0/i)).toBeVisible();
    await expect(challenger.getByText(/period 0/i)).toBeVisible();
    await expect(hudChipValue(host, "AP")).toHaveText("0");

    // --- First force-resolve: AP-grant rule fires (0 → 5), game continues. ---
    const resolveNow = host.getByRole("button", { name: /resolve now/i });
    await resolveNow.click();
    await expect(host.getByText(/period 1/i)).toBeVisible();
    await expect(hudChipValue(host, "AP")).toHaveText("5");
    await expect(hudChipValue(host, "Range")).toHaveText("1");

    // --- Queue a move: only valid adjacent cells are enabled in move mode. ---
    await host.getByRole("button", { name: /^move$/i }).click();
    const moveTarget = host.locator('button[aria-label^="Cell"]:not([disabled])').first();
    await expect(moveTarget).toBeVisible();
    await moveTarget.click();
    await expect(host.getByText(/Move \(\d+, \d+\) → \(/)).toBeVisible();

    // --- Queue an upgrade (range 1 → 2, costs 2 AP). ---
    await host.getByRole("button", { name: /^upgrade$/i }).click();
    await expect(host.getByText(/Upgrade range/i)).toBeVisible();

    // --- Second force-resolve: actions apply, period advances, queue clears. ---
    await resolveNow.click();
    await expect(host.getByText(/period 2/i)).toBeVisible();
    await expect(host.getByText(/no actions queued/i)).toBeVisible();

    // Rules reflected in the HUD + public history.
    await expect(hudChipValue(host, "Range")).toHaveText("2");
    await expect(host.getByText(/upgraded to range 2/i)).toBeVisible();
    await expect(host.getByText(/\bmoved\b/i)).toBeVisible();

    // Reactivity: a challenger's independent client also advanced to period 2.
    await expect(challenger.getByText(/period 2/i)).toBeVisible();
  } finally {
    for (const ctx of contexts) await ctx.close();
  }
});
