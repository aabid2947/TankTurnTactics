import { test, expect } from "@playwright/test";
import { signUp, uniqueCredentials } from "./helpers";

/** Real sign-up → authenticated lobby, then sign back out. */
test("sign up lands in the lobby and can sign out", async ({ page }) => {
  const { email, password } = uniqueCredentials();
  await signUp(page, email, password);

  // Authenticated chrome is present (create-game CTA).
  await expect(page.getByRole("button", { name: /create game/i })).toBeVisible();

  // Sign out returns to the auth screen. The control is icon-only on mobile,
  // so match by accessible name.
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
});
