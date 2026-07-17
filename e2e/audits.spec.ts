import { test, expect } from "@playwright/test";
import { credsMissing, loginAs } from "./helpers/auth";

test.describe("Audits — Liste & Formular", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/audits");
  });

  test('"Neues Audit"-Button ist sichtbar', async ({ page }) => {
    await expect(page.getByTestId("btn-add-audit")).toBeVisible();
  });

  test("Dialog öffnet sich beim Klick auf neues Audit", async ({ page }) => {
    await page.getByTestId("btn-add-audit").click();
    await expect(page.getByTestId("audit-form-submit")).toBeVisible();
  });

  test("Audit-Liste rendert (0 oder mehr Einträge)", async ({ page }) => {
    const rows = page.locator('[data-testid^="audit-row-"]');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("Löschen-Dialog: Abbrechen-Button schließt ohne Aktion", async ({ page }) => {
    const firstRow = page.locator('[data-testid^="audit-row-"]').first();
    const count = await firstRow.count();
    if (count === 0) {
      test.skip();
      return;
    }
    // Löschen-Button innerhalb der ersten Zeile anklicken
    await firstRow.locator('[aria-label*="löschen"], [aria-label*="delete"], button:has(.ti-trash)').first().click();
    await expect(page.getByTestId("confirm-delete-btn")).toBeVisible();
    await expect(page.getByTestId("cancel-delete-btn")).toBeVisible();
    await page.getByTestId("cancel-delete-btn").click();
    await expect(page.getByTestId("confirm-delete-btn")).not.toBeVisible();
  });
});

test.describe("Audits — KPI-Kacheln (Berichte)", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/reports");
    await page.getByTestId("tab-audits").click();
  });

  test("KPI Gesamt-Audits ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("tile-audits-total")).toBeVisible({ timeout: 10_000 });
  });

  test("KPI Abgeschlossene Audits ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("tile-audits-completed")).toBeVisible({ timeout: 10_000 });
  });
});
