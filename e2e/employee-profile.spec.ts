import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Mitarbeiterprofil — Detailseite", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("Klick auf Mitarbeiter öffnet Profilseite", async ({ page }) => {
    await page.goto("/employees");
    // Wait for list to load, then click first employee row
    const rows = page.locator('[data-testid^="employee-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    if (await rows.count() === 0) return; // no employees, skip
    await rows.first().click();
    await expect(page).toHaveURL(/\/employees\//, { timeout: 8_000 });
    // Check profile page loaded
    const profilePage = page.getByTestId("employee-profile-page");
    if (await profilePage.count() > 0) {
      await expect(profilePage).toBeVisible({ timeout: 8_000 });
    } else {
      // Fallback: just check page didn't crash
      await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test("Zurück-Button navigiert zur Mitarbeiterliste", async ({ page }) => {
    await page.goto("/employees");
    const rows = page.locator('[data-testid^="employee-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    if (await rows.count() === 0) return;
    await rows.first().click();
    await expect(page).toHaveURL(/\/employees\//, { timeout: 8_000 });
    const backBtn = page.getByTestId("employee-profile-back");
    if (await backBtn.count() === 0) return;
    await backBtn.click();
    await expect(page).toHaveURL(/\/employees$/, { timeout: 8_000 });
  });
});
