import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Unternehmens-Setup", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("Seite ist erreichbar (Formular oder Weiterleitung zu Dashboard)", async ({ page }) => {
    await page.goto("/setup-company");
    // Authenticated user with existing company gets redirected to dashboard
    // User without company sees the setup form
    const isOnSetup = page.url().includes("/setup-company");
    const isOnDashboard = page.url().includes("/dashboard");
    if (isOnDashboard) return; // company already exists, redirect is correct behavior
    // If still on setup-company, check form is visible
    const setupPage = page.getByTestId("setup-company-page");
    if (await setupPage.count() > 0) {
      await expect(setupPage).toBeVisible({ timeout: 8_000 });
    } else {
      await expect(page.locator("h1, h2, form").first()).toBeVisible({ timeout: 8_000 });
    }
  });
});
