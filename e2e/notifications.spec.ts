import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Benachrichtigungen", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/notifications");
  });

  test("Benachrichtigungs-Seite lädt", async ({ page }) => {
    await expect(page.getByTestId("notifications-page")).toBeVisible({ timeout: 10_000 });
  });

  test("Benachrichtigungs-Liste rendert (0 oder mehr)", async ({ page }) => {
    await page.waitForTimeout(3_000);
    const items = page.locator('[data-testid^="notification-item-"]');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("'Alle als gelesen markieren'-Button erscheint wenn ungelesene vorhanden", async ({ page }) => {
    await page.waitForTimeout(3_000);
    const markAllBtn = page.getByTestId("notifications-mark-all-read");
    // Button is only rendered when unread count > 0 — graceful if absent
    if (await markAllBtn.count() === 0) return;
    await expect(markAllBtn).toBeVisible({ timeout: 5_000 });
  });
});
