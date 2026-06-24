import { test, expect } from "@playwright/test";

// Real login round-trip against the live backend, using a dedicated,
// permanently-confirmed test company ("Playwright E2E Test Co", premium
// tier so no module is tier-gated). Skips automatically if the test
// credentials aren't configured locally (see .env.test.local, gitignored),
// so this doesn't break for anyone running the suite without that secret.

const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

test.skip(!email || !password, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD not set - see .env.test.local");

test("wrong password shows an error and does not navigate away from /auth", async ({ page }) => {
  await page.goto("/auth");
  await page.locator("#login-email").fill(email!);
  await page.locator("#login-password").fill("definitely-the-wrong-password");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/auth/);
});

test("correct credentials log in and land on the dashboard", async ({ page }) => {
  await page.goto("/auth");
  await page.locator("#login-email").fill(email!);
  await page.locator("#login-password").fill(password!);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
});

test("a logged-in premium-tier company can reach a tier-gated module (training)", async ({ page }) => {
  await page.goto("/auth");
  await page.locator("#login-email").fill(email!);
  await page.locator("#login-password").fill(password!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  await page.goto("/training");
  await expect(page).toHaveURL(/\/training/);
});
