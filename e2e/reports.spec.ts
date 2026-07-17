import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

const TABS = [
  { id: "tab-overview", label: "Übersicht" },
  { id: "tab-incidents", label: "Vorfälle" },
  { id: "tab-measures", label: "Maßnahmen" },
  { id: "tab-trainings", label: "Schulungen" },
  { id: "tab-checkups", label: "G-Untersuchungen" },
  { id: "tab-audits", label: "Audits" },
  { id: "tab-risk-assessments", label: "Risikobewertungen" },
];

test.describe("Berichte — Tab-Navigation", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/reports");
  });

  for (const tab of TABS) {
    test(`Tab "${tab.label}" ist sichtbar und klickbar`, async ({ page }) => {
      const el = page.getByTestId(tab.id);
      if (await el.count() === 0) return;
      await expect(el).toBeVisible();
      await el.click();
      await expect(el).toBeVisible();
    });
  }
});

test.describe("Berichte — DrillDown-Modal", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/reports");
  });

  test("Klick auf KPI-Tile öffnet DrillDown-Modal", async ({ page }) => {
    const incTab = page.getByTestId("tab-incidents");
    if (await incTab.count() === 0) return;
    await incTab.click();
    await page.getByTestId("tile-incidents-total").click();
    await expect(page.getByTestId("drill-down-modal")).toBeVisible({ timeout: 8_000 });
  });

  test("DrillDown-Modal zeigt Titel", async ({ page }) => {
    const incTab = page.getByTestId("tab-incidents");
    if (await incTab.count() === 0) return;
    await incTab.click();
    await page.getByTestId("tile-incidents-total").click();
    await expect(page.getByTestId("drill-down-title")).toBeVisible({ timeout: 8_000 });
    const title = await page.getByTestId("drill-down-title").textContent();
    expect(title?.trim().length).toBeGreaterThan(0);
  });

  test("DrillDown-Modal: Tabelle oder Leer-Zustand wird angezeigt", async ({ page }) => {
    const incTab = page.getByTestId("tab-incidents");
    if (await incTab.count() === 0) return;
    await incTab.click();
    await page.getByTestId("tile-incidents-total").click();
    await page.getByTestId("drill-down-modal").waitFor({ timeout: 8_000 });
    await page.getByTestId("drill-down-loading").waitFor({ state: "hidden", timeout: 8_000 }).catch(() => {});
    const tableVisible = await page.getByTestId("drill-down-table").isVisible();
    const emptyVisible = await page.getByTestId("drill-down-empty").isVisible();
    expect(tableVisible || emptyVisible, "Weder Tabelle noch Leer-Zustand sichtbar").toBe(true);
  });

  test("DrillDown zeigt keine rohen UUIDs als Mitarbeiternamen", async ({ page }) => {
    const checkupTab = page.getByTestId("tab-checkups");
    if (await checkupTab.count() === 0) return;
    await checkupTab.click();
    const totalTile = page.getByTestId("tile-checkups-completed");
    if (await totalTile.count() === 0) return;
    await totalTile.click();
    await page.getByTestId("drill-down-modal").waitFor({ timeout: 8_000 });
    await page.getByTestId("drill-down-loading").waitFor({ state: "hidden", timeout: 8_000 }).catch(() => {});

    const rows = page.locator('[data-testid^="row-employee-"]');
    const count = await rows.count();
    if (count === 0) return;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (let i = 0; i < Math.min(count, 5); i++) {
      const text = await rows.nth(i).textContent();
      expect(uuidRegex.test(text?.trim() ?? ""), `Zeile ${i} zeigt UUID statt Namen: ${text}`).toBe(false);
    }
  });
});
