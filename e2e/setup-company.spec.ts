import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Unternehmens-Setup", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("Seite ist erreichbar (Formular oder Weiterleitung zu Dashboard)", async ({ page }) => {
    await page.goto("/setup-company");
    // User with existing company gets redirected to /dashboard by React.
    // Wait for that redirect; if it times out the user has no company and the form shows.
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 }).catch(async () => {
      await expect(page.getByTestId("setup-company-page")).toBeVisible({ timeout: 5_000 });
    });
  });
});
