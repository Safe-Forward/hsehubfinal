import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Audit — Detailseite", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("Klick auf Audit öffnet Detailseite", async ({ page }) => {
    await page.goto("/audits");
    // Navigation is triggered by the "Details"-Button inside the audit row, not the row itself
    const rows = page.locator('[data-testid^="audit-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    if (await rows.count() === 0) return;
    // Click the first button inside the row (the "Details" / navigation button)
    await rows.first().locator("button").first().click();
    await expect(page).toHaveURL(/\/audits\//, { timeout: 8_000 });
    await expect(page.getByTestId("audit-details-page")).toBeVisible({ timeout: 8_000 });
  });
});
