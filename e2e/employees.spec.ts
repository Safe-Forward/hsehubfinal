import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Mitarbeiter — Liste & Filter", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/employees");
    await page.locator('[data-testid^="employee-row-"]').first()
      .waitFor({ state: "visible", timeout: 12_000 }).catch(() => {});
  });

  test("Seite lädt und zeigt Mitarbeiterliste", async ({ page }) => {
    const rows = page.locator('[data-testid^="employee-row-"]');
    const empty = page.locator("text=Noch keine Mitarbeiter");
    const hasData = (await rows.count()) > 0 || await empty.isVisible();
    expect(hasData).toBe(true);
  });

  test('"Mitarbeiter hinzufügen"-Button ist sichtbar', async ({ page }) => {
    await expect(page.getByTestId("btn-add-employee")).toBeVisible({ timeout: 10_000 });
  });

  test("Dialog öffnet alle Pflichtfelder", async ({ page }) => {
    await page.getByTestId("btn-add-employee").click();
    await expect(page.getByTestId("employee-form-firstname")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("employee-form-lastname")).toBeVisible();
    await expect(page.getByTestId("employee-form-email")).toBeVisible();
    await expect(page.getByTestId("employee-form-submit")).toBeVisible();
  });

  test("Formularfelder sind ausfüllbar", async ({ page }) => {
    const stamp = Date.now();
    await page.getByTestId("btn-add-employee").click();
    await page.getByTestId("employee-form-firstname").fill(`E2E-${stamp}`);
    await page.getByTestId("employee-form-lastname").fill(`Nachname-${stamp}`);
    await page.getByTestId("employee-form-email").fill(`e2e-${stamp}@test.hsehub`);
    await expect(page.getByTestId("employee-form-firstname")).toHaveValue(`E2E-${stamp}`);
    await expect(page.getByTestId("employee-form-lastname")).toHaveValue(`Nachname-${stamp}`);
  });

  test("Suchfeld filtert Mitarbeiter", async ({ page }) => {
    const rows = page.locator('[data-testid^="employee-row-"]');
    if ((await rows.count()) === 0) return;
    const search = page.getByTestId("search-employees");
    await expect(search).toBeVisible();
    await search.fill("XXXXXNICHTVORHANDEN");
    const filtered = page.locator('[data-testid^="employee-row-"]');
    await expect(filtered).toHaveCount(0, { timeout: 3_000 });
    await search.clear();
  });

  test("Status-Filter Aktiv/Inaktiv ist vorhanden", async ({ page }) => {
    await expect(page.getByTestId("filter-employee-status")).toBeVisible({ timeout: 8_000 });
  });

  test("Abteilungs-Filter ist vorhanden", async ({ page }) => {
    await expect(page.getByTestId("filter-employee-department")).toBeVisible({ timeout: 8_000 });
  });

  test("Mitarbeiter-Zeile ist klickbar → navigiert zu Profil", async ({ page }) => {
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    if ((await firstRow.count()) === 0) return;
    await firstRow.click();
    await expect(page).toHaveURL(/\/employees\//, { timeout: 8_000 });
  });
});

test.describe("Mitarbeiterprofil — Tabs & Funktionen", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/employees");
    const rows = page.locator('[data-testid^="employee-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 12_000 }).catch(() => {});
    if ((await rows.count()) === 0) return;
    await rows.first().click();
    await expect(page).toHaveURL(/\/employees\//, { timeout: 8_000 });
  });

  test("Profil-Seite lädt mit Mitarbeitername", async ({ page }) => {
    await expect(page.getByTestId("employee-profile-name")).toBeVisible({ timeout: 10_000 });
    const name = await page.getByTestId("employee-profile-name").textContent();
    expect(name?.trim().length).toBeGreaterThan(0);
  });

  test("Alle Haupt-Tabs sind sichtbar", async ({ page }) => {
    await expect(page.getByTestId("tab-overview")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("tab-workplace-briefings")).toBeVisible();
    await expect(page.getByTestId("tab-qualifications")).toBeVisible();
    await expect(page.getByTestId("tab-core-trainings")).toBeVisible();
  });

  test("Tab-Wechsel zu Unterweisungen funktioniert", async ({ page }) => {
    const tab = page.getByTestId("tab-workplace-briefings");
    await tab.waitFor({ state: "visible", timeout: 8_000 });
    await tab.click();
    await expect(page.locator("text=Arbeitsplatzspezifische Unterweisungen")).toBeVisible({ timeout: 5_000 });
  });

  test("Tab-Wechsel zu Qualifikationen funktioniert", async ({ page }) => {
    const tab = page.getByTestId("tab-qualifications");
    await tab.waitFor({ state: "visible", timeout: 8_000 });
    await tab.click();
    const content = page.locator('[role="tabpanel"]').last();
    await expect(content).toBeVisible({ timeout: 5_000 });
  });

  test("Tab-Wechsel zu Kernschulungen funktioniert", async ({ page }) => {
    const tab = page.getByTestId("tab-core-trainings");
    await tab.waitFor({ state: "visible", timeout: 8_000 });
    await tab.click();
    await expect(page.getByTestId("core-trainings-card")).toBeVisible({ timeout: 8_000 });
  });

  test("Unterweisungen-Tab: Button zum Hinzufügen vorhanden", async ({ page }) => {
    await page.getByTestId("tab-workplace-briefings").click();
    const addBtn = page.getByTestId("btn-add-briefing");
    const emptyAddBtn = page.getByRole("button", { name: /Erste Unterweisung/i });
    const hasBtn = (await addBtn.isVisible()) || (await emptyAddBtn.isVisible());
    expect(hasBtn).toBe(true);
  });

  test("Zurück-Button navigiert zur Mitarbeiterliste", async ({ page }) => {
    await expect(page.getByTestId("employee-profile-back")).toBeVisible({ timeout: 8_000 });
    await page.getByTestId("employee-profile-back").click();
    await expect(page).toHaveURL(/\/employees$/, { timeout: 5_000 });
  });
});
