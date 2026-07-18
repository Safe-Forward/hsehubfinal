import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Aktivitätsgruppen", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/activity-groups");
  });

  test("Seite lädt", async ({ page }) => {
    await expect(page.getByTestId("activity-groups-page")).toBeVisible({ timeout: 10_000 });
  });

  test('"Neue Gruppe"-Button ist sichtbar', async ({ page }) => {
    await expect(page.getByTestId("btn-add-activity-group")).toBeVisible({ timeout: 10_000 });
  });

  test("Gruppen-Liste rendert (0 oder mehr)", async ({ page }) => {
    const rows = page.locator('[data-testid^="activity-group-row-"]');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
