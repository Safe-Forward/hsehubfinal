import { test, expect } from "@playwright/test";

// Smoke tests for pages that must always be reachable without auth - if any
// of these break, public marketing/legal pages are down even though the
// app itself might look fine in CI's logged-in test suites.

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/.+/);
});

test("Impressum is reachable and shows the Einzelunternehmen disclosure", async ({ page }) => {
  await page.goto("/impressum");
  await expect(page.getByRole("heading", { name: "Impressum" })).toBeVisible();
  await expect(page.getByText("Einzelunternehmen")).toBeVisible();
});

test("Datenschutz is reachable", async ({ page }) => {
  await page.goto("/datenschutz");
  await expect(page.locator("body")).toContainText(/Datenschutz/i);
});

test("AVV page is reachable", async ({ page }) => {
  await page.goto("/avv");
  await expect(page.locator("body")).toContainText(/Auftragsverarbeitung/i);
});
