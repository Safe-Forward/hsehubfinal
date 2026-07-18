import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Unternehmens-Setup", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("Seite ist erreichbar (Formular oder 'Company Linked'-Ansicht)", async ({ page }) => {
    await page.goto("/setup-company");
    // User with existing company → sees "Company Linked" card (setup-company-existing)
    // User without company → sees the setup form (setup-company-page)
    const existing = page.getByTestId("setup-company-existing");
    const form = page.getByTestId("setup-company-page");
    await expect(existing.or(form)).toBeVisible({ timeout: 10_000 });
  });
});
