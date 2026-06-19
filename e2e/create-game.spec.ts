import { test, expect } from "@playwright/test";
import { signUp, uniqueCredentials } from "./helpers";

/** Sign up → create a game with the default config → land in the game room. */
test("create a game and open its room", async ({ page }) => {
  const { email, password } = uniqueCredentials();
  await signUp(page, email, password);

  await page.getByRole("button", { name: /create game/i }).click();
  await expect(page.getByRole("heading", { name: /create a game/i })).toBeVisible();

  const gameName = `E2E Skirmish ${Date.now()}`;
  await page.getByLabel("Game name").fill(gameName);
  await page.getByRole("button", { name: /create & open lobby/i }).click();

  // createGame navigates to /game/:id — the room for the freshly-created game.
  await expect(page).toHaveURL(/\/game\/[a-z0-9]+/i);
});
