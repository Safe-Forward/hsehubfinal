import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Unternehmens-Setup", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("Seite ist erreichbar (Formular oder Weiterleitung zu Dashboard)", async ({ page }) => {
    await page.goto("/setup-company");
    // Wait until React router settles on either URL
    await page.waitForURL(/\/(dashboard|setup-company)/, { timeout: 8_000 });
    // User with existing company gets redirected — that is correct behavior
    if (page.url().includes("/dashboard")) return;
    // User without company sees the setup form
    await expect(page.getByTestId("setup-company-page")).toBeVisible({ timeout: 8_000 });
  });
});
