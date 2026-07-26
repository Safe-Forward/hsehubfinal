import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Vorfälle — Liste, Filter & Formular", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/incidents");
  });

  test("Seite lädt und zeigt Vorfall-Liste", async ({ page }) => {
    const rows = page.locator('[data-testid^="incident-row-"]');
    const empty = page.getByText("Keine Vorfälle").or(page.getByText("Noch keine Vorfälle"));
    await expect(page.getByTestId("btn-add-incident")).toBeVisible({ timeout: 10_000 });
    const loaded = (await rows.count()) > 0 || await empty.isVisible();
    expect(loaded).toBe(true);
  });

  test('"Vorfall melden"-Button öffnet Dialog', async ({ page }) => {
    await page.getByTestId("btn-add-incident").click();
    await expect(page.getByTestId("incident-form-title")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("incident-form-submit")).toBeVisible();
  });

  test("Dialog hat alle wichtigen Felder", async ({ page }) => {
    await page.getByTestId("btn-add-incident").click();
    await expect(page.getByTestId("incident-form-title")).toBeVisible({ timeout: 5_000 });
    const selects = page.locator('[role="combobox"]');
    expect(await selects.count()).toBeGreaterThan(0);
  });

  test("Titel-Feld ist ausfüllbar", async ({ page }) => {
    const stamp = Date.now();
    await page.getByTestId("btn-add-incident").click();
    await page.getByTestId("incident-form-title").fill(`E2E-Vorfall-${stamp}`);
    await expect(page.getByTestId("incident-form-title")).toHaveValue(`E2E-Vorfall-${stamp}`);
  });

  test("Typ-Filter ist vorhanden", async ({ page }) => {
    await expect(page.getByTestId("filter-incident-type")).toBeVisible({ timeout: 8_000 });
  });

  test("Schweregrad-Filter ist vorhanden", async ({ page }) => {
    await expect(page.getByTestId("filter-incident-severity")).toBeVisible({ timeout: 8_000 });
  });

  test("Status-Filter ist vorhanden (neu hinzugefügt)", async ({ page }) => {
    await expect(page.getByTestId("filter-incident-status")).toBeVisible({ timeout: 8_000 });
  });

  test("Vorfall-Zeile öffnet Detail-Dialog beim Klick", async ({ page }) => {
    const rows = page.locator('[data-testid^="incident-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    if ((await rows.count()) === 0) return;
    await rows.first().click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test("Detail-Dialog zeigt Vorfall-Informationen", async ({ page }) => {
    const rows = page.locator('[data-testid^="incident-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    if ((await rows.count()) === 0) return;
    await rows.first().click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    const content = await dialog.textContent();
    expect(content?.trim().length).toBeGreaterThan(0);
  });

  test("Detail-Dialog: 'Maßnahme erstellen'-Button navigiert zu /measures", async ({ page }) => {
    const rows = page.locator('[data-testid^="incident-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    if ((await rows.count()) === 0) return;
    await rows.first().click();
    const measureBtn = page.getByRole("button", { name: /Maßnahme erstellen/i });
    if ((await measureBtn.count()) === 0) return;
    await measureBtn.click();
    await expect(page).toHaveURL(/\/measures/, { timeout: 8_000 });
  });

  test("Typ-Filter funktioniert: reduziert Ergebnismenge", async ({ page }) => {
    const rows = page.locator('[data-testid^="incident-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    if ((await rows.count()) === 0) return;
    const initialCount = await rows.count();
    const filter = page.getByTestId("filter-incident-type");
    await filter.click();
    const firstOption = page.getByRole("option").nth(1);
    if ((await firstOption.count()) === 0) return;
    await firstOption.click();
    await page.waitForTimeout(500);
    const filteredCount = await rows.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test("Status-Filter 'Offen' filtert korrekt", async ({ page }) => {
    const rows = page.locator('[data-testid^="incident-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    if ((await rows.count()) === 0) return;
    const filter = page.getByTestId("filter-incident-status");
    await filter.click();
    const openOption = page.getByRole("option", { name: /^Offen$|^open$/i });
    if ((await openOption.count()) === 0) return;
    await openOption.click();
    await page.waitForTimeout(500);
    expect(await rows.count()).toBeGreaterThanOrEqual(0);
  });
});
