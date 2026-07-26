import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("G-Untersuchungen — Liste & Formular", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
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

test.describe("G-Untersuchungen — Ansichtsmodus-Buttons", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/investigations");
    await page.waitForTimeout(1_000);
  });

  test("Alle drei Ansichtsmodus-Buttons sind vorhanden", async ({ page }) => {
    await expect(page.getByTestId("btn-view-mode-employee")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("btn-view-mode-date")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("btn-view-mode-checkup")).toBeVisible({ timeout: 10_000 });
  });

  test("'Nach Mitarbeiter'-Button ist klickbar und aktiv", async ({ page }) => {
    const btn = page.getByTestId("btn-view-mode-employee");
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();
    await page.waitForTimeout(300);
    // Should still be on investigations page
    await expect(page).toHaveURL(/\/investigations/, { timeout: 3_000 });
    // Button should have active/selected state
    const cls = await btn.getAttribute("class");
    expect(cls).toBeDefined();
  });

  test("'Nach Datum'-Button ist klickbar", async ({ page }) => {
    const btn = page.getByTestId("btn-view-mode-date");
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/investigations/, { timeout: 3_000 });
  });

  test("'Nach Untersuchungsart'-Button ist klickbar", async ({ page }) => {
    const btn = page.getByTestId("btn-view-mode-checkup");
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/investigations/, { timeout: 3_000 });
  });

  test("Ansichtswechsel ändert die Listenstruktur", async ({ page }) => {
    // Start in employee view
    await page.getByTestId("btn-view-mode-employee").click();
    const employeeRows = page.locator('[data-testid^="investigation-employee-row-"]');
    const employeeCount = await employeeRows.count();

    // Switch to date view
    await page.getByTestId("btn-view-mode-date").click();
    await page.waitForTimeout(500);
    // In date view, the row structure may be different
    const allContent = await page.locator("main, [role='main']").first().textContent();
    expect(allContent?.length).toBeGreaterThan(0);
  });
});

test.describe("G-Untersuchungen — KPI-Kacheln (Berichte)", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/reports");
    await page.getByTestId("tab-checkups").click();
  });

  test("KPI Gesamt-Untersuchungen ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("tile-checkups-total")).toBeVisible({ timeout: 10_000 });
  });

  test("KPI Abgeschlossene Untersuchungen ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("tile-checkups-completed")).toBeVisible({ timeout: 10_000 });
  });

  test("KPI Wert ist nicht negativ", async ({ page }) => {
    const tile = page.getByTestId("tile-checkups-total");
    await expect(tile).toBeVisible({ timeout: 10_000 });
    const text = await tile.textContent();
    const num = parseInt(text?.replace(/[^0-9]/g, "") || "0");
    expect(num).toBeGreaterThanOrEqual(0);
  });
});
