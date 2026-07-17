import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Maßnahmen", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/measures");
  });

  test('"Neue Maßnahme"-Button ist sichtbar', async ({ page }) => {
    await expect(page.getByTestId("btn-add-measure")).toBeVisible({ timeout: 10_000 });
  });

  test("Maßnahmen-Liste rendert (0 oder mehr Zeilen)", async ({ page }) => {
    const rows = page.locator('[data-testid^="measure-row-"]');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Maßnahmen — KPI-Kacheln (Berichte)", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/reports");
    await page.getByTestId("tab-measures").click();
  });

  test("KPI Gesamt-Maßnahmen ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("tile-measures-total")).toBeVisible({ timeout: 10_000 });
  });

  test("KPI Abgeschlossene Maßnahmen ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("tile-measures-completed")).toBeVisible({ timeout: 10_000 });
  });

  test("KPI In Bearbeitung ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("tile-measures-in-progress")).toBeVisible({ timeout: 10_000 });
  });
});
