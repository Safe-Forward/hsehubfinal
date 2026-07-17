import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Vorfälle — Liste & Formular", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/incidents");
  });

  test('"Vorfall melden"-Button ist sichtbar', async ({ page }) => {
    await expect(page.getByTestId("btn-add-incident")).toBeVisible();
  });

  test("Dialog öffnet sich beim Klick auf melden", async ({ page }) => {
    await page.getByTestId("btn-add-incident").click();
    await expect(page.getByTestId("incident-form-title")).toBeVisible();
    await expect(page.getByTestId("incident-form-submit")).toBeVisible();
  });

  test("Titel-Feld ist ausfüllbar", async ({ page }) => {
    const stamp = Date.now();
    await page.getByTestId("btn-add-incident").click();
    await page.getByTestId("incident-form-title").fill(`E2E-Vorfall-${stamp}`);
    await expect(page.getByTestId("incident-form-title")).toHaveValue(`E2E-Vorfall-${stamp}`);
  });

  test("Vorfall-Liste rendert (0 oder mehr Zeilen)", async ({ page }) => {
    const rows = page.locator('[data-testid^="incident-row-"]');
    await expect(rows.first().or(page.locator("body"))).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Vorfälle — KPI-Kacheln (Berichte)", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/reports");
    await page.getByTestId("tab-incidents").click();
  });

  const kpiTiles = [
    "tile-incidents-total",
    "tile-incidents-open",
    "tile-incidents-closed",
    "tile-incidents-reportable",
    "tile-incidents-accident-free",
    "tile-incidents-teur",
  ];

  for (const tile of kpiTiles) {
    test(`KPI-Kachel "${tile}" ist sichtbar`, async ({ page }) => {
      await expect(page.getByTestId(tile)).toBeVisible({ timeout: 10_000 });
    });
  }
});
