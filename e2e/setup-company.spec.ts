import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Unternehmens-Setup", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("Seite ist erreichbar (Formular oder Weiterleitung zu Dashboard)", async ({ page }) => {
    await page.goto("/setup-company");
    // Wait for React to settle (redirect or render)
    await page.waitForLoadState("networkidle");
    // Authenticated user with existing company gets redirected to dashboard
    if (page.url().includes("/dashboard")) return;
    // Otherwise the setup form should be visible
    await expect(page.getByTestId("setup-company-page")).toBeVisible({ timeout: 8_000 });
  });
});
