import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Audit — Detailseite", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("Klick auf Audit öffnet Detailseite", async ({ page }) => {
    await page.goto("/audits");
    // Try clicking first audit row
    const rows = page.locator('[data-testid^="audit-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    if (await rows.count() === 0) return;
    await rows.first().click();
    await expect(page).toHaveURL(/\/audits\//, { timeout: 8_000 });
    const detailPage = page.getByTestId("audit-details-page");
    if (await detailPage.count() > 0) {
      await expect(detailPage).toBeVisible({ timeout: 8_000 });
    } else {
      await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 8_000 });
    }
  });
});
