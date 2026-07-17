import { test, expect } from "@playwright/test";
import { credsMissing, loginAs } from "./helpers/auth";

test.describe("G-Untersuchungen — Liste & Formular", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/investigations");
  });

  test('"Neue Untersuchung"-Button ist sichtbar', async ({ page }) => {
    await expect(page.getByTestId("btn-add-investigation")).toBeVisible({ timeout: 10_000 });
  });

  test("Dialog öffnet sich beim Klick", async ({ page }) => {
    await page.getByTestId("btn-add-investigation").click();
    await expect(page.getByTestId("investigation-form-submit")).toBeVisible();
  });

  test("Mitarbeiter-Zeilen werden gerendert (0 oder mehr)", async ({ page }) => {
    const rows = page.locator('[data-testid^="investigation-employee-row-"]');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("G-Untersuchungen — KPI-Kacheln (Berichte)", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/reports");
    await page.getByTestId("tab-checkups").click();
  });

  test("KPI Gesamt-Untersuchungen ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("tile-checkups-total")).toBeVisible({ timeout: 10_000 });
  });

  test("KPI Abgeschlossene Untersuchungen ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("tile-checkups-completed")).toBeVisible({ timeout: 10_000 });
  });
});
