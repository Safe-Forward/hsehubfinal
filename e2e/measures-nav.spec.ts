import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Maßnahmen-Navigation (Permission-Fix)", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2_000);
  });

  test("Maßnahmen-Link ist in der Navigation sichtbar", async ({ page }) => {
    const link = page.getByTestId("nav-measures");
    await expect(link).toBeVisible({ timeout: 8_000 });
  });

  test("Maßnahmen-Link navigiert zur /measures-Seite", async ({ page }) => {
    const link = page.getByTestId("nav-measures");
    if (await link.count() === 0) return; // Kein Zugriff für diesen User
    await link.click();
    await expect(page).toHaveURL(/\/measures/, { timeout: 8_000 });
  });

  test("Maßnahmen-Seite lädt ohne Fehler", async ({ page }) => {
    await page.goto("/measures");
    // Kein roter Fehler-Screen
    await expect(page.locator("body")).not.toContainText("Access Denied", { timeout: 5_000 });
    await expect(page.locator("body")).not.toContainText("Kein Zugriff");
  });
});
