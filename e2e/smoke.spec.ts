import { test, expect } from "@playwright/test";

/** App boots, serves the auth shell, and the Convex client connects without a fatal error. */
test.describe("smoke", () => {
  test("loads the sign-in screen", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Tank Turn Tactics/i);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("no missing-Convex-function errors on load", async ({ page }) => {
    const serverErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && /Could not find public function/i.test(msg.text())) {
        serverErrors.push(msg.text());
      }
    });
    await page.goto("/");
    await expect(page.getByLabel("Email")).toBeVisible();
    expect(serverErrors, serverErrors.join("\n")).toHaveLength(0);
  });
});
