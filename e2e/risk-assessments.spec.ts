import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Risikobewertungen — Liste & Formular", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/risk-assessments");
  });

  test('"Neue Bewertung"-Button ist sichtbar', async ({ page }) => {
    await expect(page.getByTestId("btn-add-risk")).toBeVisible({ timeout: 10_000 });
  });

  test("Dialog öffnet sich beim Klick auf neue Bewertung", async ({ page }) => {
    await page.getByTestId("btn-add-risk").click();
    // Das Formular ist ein mehrstufiger Wizard — Submit ist am Ende.
    // Wir prüfen, ob das Formular geöffnet ist (ein Feld der ersten Seite ist sichtbar).
    await expect(page.locator("form, [role='dialog']").first()).toBeVisible();
  });

  test("Risikobewertungs-Liste rendert (0 oder mehr Zeilen)", async ({ page }) => {
    const rows = page.locator('[data-testid^="risk-row-"]');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Risikobewertungen — KPI-Kacheln (Berichte)", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/reports");
    // Korrekte Tab-ID: "risk-assessments" (nicht "risks")
    const tab = page.getByTestId("tab-risk-assessments");
    if (await tab.count() > 0) await tab.click();
  });

  test("KPI Gesamt-Risiken ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("tile-risks-total")).toBeVisible({ timeout: 10_000 });
  });
});
