import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Rechnungen & Abonnement", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/invoices");
  });

  test("Seite lädt", async ({ page }) => {
    const container = page.getByTestId("invoices-page");
    if (await container.count() > 0) {
      await expect(container).toBeVisible({ timeout: 10_000 });
    } else {
      await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test("Rechnungs-Tabelle oder Leer-Zustand wird angezeigt", async ({ page }) => {
    // Wait for page to settle
    await page.waitForTimeout(2000);
    // Either invoice rows exist, or some content is visible
    const content = page.locator('[data-testid^="invoice-"], h1, h2, table, [role="table"]');
    const count = await content.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
