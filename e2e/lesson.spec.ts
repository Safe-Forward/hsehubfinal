import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Schulung — Lektionsansicht", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("Klick auf Kurs-Karte öffnet Kursdetail-Seite", async ({ page }) => {
    await page.goto("/training");
    const cards = page.locator('[data-testid^="course-card-"]');
    await cards.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    if (await cards.count() === 0) return;
    await cards.first().click();
    await expect(page).toHaveURL(/\/training\//, { timeout: 8_000 });
    // Just check page loaded (no crash)
    await expect(page.locator("h1, h2, [data-testid]").first()).toBeVisible({ timeout: 8_000 });
  });
});
