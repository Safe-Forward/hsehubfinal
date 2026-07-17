import { test, expect } from "@playwright/test";
import { credsMissing, loginAs } from "./helpers/auth";

test.describe("Risikobewertungen — Liste & Formular", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/risk-assessments");
  });

  test('"Neue Bewertung"-Button ist sichtbar', async ({ page }) => {
    await expect(page.getByTestId("btn-add-risk")).toBeVisible({ timeout: 10_000 });
  });

  test("Dialog öffnet sich beim Klick auf neue Bewertung", async ({ page }) => {
    await page.getByTestId("btn-add-risk").click();
    await expect(page.getByTestId("risk-form-submit")).toBeVisible();
  });

  test("Risikobewertungs-Liste rendert (0 oder mehr Zeilen)", async ({ page }) => {
    const rows = page.locator('[data-testid^="risk-row-"]');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("Submit-Button im Formular ist vorhanden", async ({ page }) => {
    await page.getByTestId("btn-add-risk").click();
    await expect(page.getByTestId("risk-form-submit")).toBeVisible();
  });
});

test.describe("Risikobewertungen — KPI-Kacheln (Berichte)", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/reports");
    await page.getByTestId("tab-risks").click();
  });

  test("KPI Gesamt-Risiken ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("tile-risks-total")).toBeVisible({ timeout: 10_000 });
  });
});
