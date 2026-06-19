import { expect, type Page } from "@playwright/test";

/** A fresh, unique credential per call so each test gets its own account. */
export function uniqueCredentials() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return { email: `e2e+${stamp}@example.com`, password: "test-password-123" };
}

/**
 * Sign up a brand-new account through the real Convex Auth password flow and
 * wait until the authenticated lobby is showing.
 */
export async function signUp(page: Page, email: string, password: string) {
  await page.goto("/");
  // The sign-in screen defaults to the "signIn" flow — switch to sign-up.
  await page.getByRole("button", { name: /need an account\? sign up/i }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /^sign up$/i }).click();
  // Authenticated lobby renders the "Find a game" heading.
  await expect(page.getByRole("heading", { name: /find a game/i })).toBeVisible();
}
