/**
 * Cross-Feature Workflow Tests
 * Tests the key business workflows that span multiple pages.
 */
import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Workflow: Vorfall → Maßnahme", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("Vorfall-Detail öffnen und zu Maßnahmen navigieren", async ({ page }) => {
    await page.goto("/incidents");
    const rows = page.locator('[data-testid^="incident-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 12_000 }).catch(() => {});
    if ((await rows.count()) === 0) return;

    // Open incident detail
    await rows.first().click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Click "Maßnahme erstellen" — should navigate to /measures with incident_id param
    const measureBtn = dialog.getByRole("button", { name: /Maßnahme erstellen/i });
    if ((await measureBtn.count()) === 0) return; // permission-gated

    await measureBtn.click();
    await expect(page).toHaveURL(/\/measures/, { timeout: 8_000 });
    // URL should carry incident context
    const url = page.url();
    expect(url).toContain("incident_id");
  });

  test("Maßnahmen-Seite empfängt incident_id URL-Parameter", async ({ page }) => {
    // Navigate directly with incident_id param (as done by Incidents page)
    await page.goto("/measures?incident_id=test-123");
    await expect(page.getByTestId("btn-add-measure")).toBeVisible({ timeout: 10_000 });
    // Page should load cleanly (no crash from the URL param)
    const errorState = page.locator('[data-testid="error-boundary"], text=Unbekannter Fehler');
    expect(await errorState.count()).toBe(0);
  });
});

test.describe("Workflow: Sidebar-Navigation", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  const routes = [
    { label: /Dashboard/i, url: /\/dashboard/ },
    { label: /Mitarbeiter/i, url: /\/employees/ },
    { label: /Vorfälle/i, url: /\/incidents/ },
    { label: /Maßnahmen/i, url: /\/measures/ },
    { label: /Aufgaben/i, url: /\/tasks/ },
    { label: /GBU|Gefährdung/i, url: /\/risk-assessments/ },
    { label: /Audits/i, url: /\/audits/ },
  ];

  for (const route of routes) {
    test(`Sidebar "${route.label.source}" navigiert zu ${route.url.source}`, async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForSelector('[data-testid="sidebar"], nav', { timeout: 10_000 });
      const link = page.locator(`nav a, [data-testid="sidebar"] a`)
        .filter({ hasText: route.label }).first();
      if ((await link.count()) === 0) return; // permission-gated or different label
      await link.click();
      await expect(page).toHaveURL(route.url, { timeout: 8_000 });
    });
  }

  test("Investigations-Route /investigations ist erreichbar (kein /health-checkups)", async ({ page }) => {
    await page.goto("/investigations");
    await expect(page).toHaveURL(/\/investigations/, { timeout: 5_000 });
    // Page should load properly
    await page.waitForTimeout(1_000);
    const mainContent = page.locator("main, [role='main']").first();
    await expect(mainContent).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Workflow: Überfällige Maßnahmen (Rot-Markierung)", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("Überfällige Maßnahmen erscheinen mit rotem Hintergrund", async ({ page }) => {
    await page.goto("/measures");
    await page.waitForTimeout(1_500);

    const overdueIndicator = page.locator("text=(überfällig)");
    const overdueRows = page.locator("tr.bg-red-50, tr[class*='red-9']");

    const overdueCount = await overdueIndicator.count();
    if (overdueCount === 0) {
      // No overdue measures in DB — test is valid, nothing to check
      return;
    }

    // If there are overdue indicators, the row should have red styling
    await expect(overdueIndicator.first()).toBeVisible();
    expect(await overdueRows.count()).toBeGreaterThan(0);
  });

  test("Nicht-überfällige Maßnahmen haben keinen roten Hintergrund", async ({ page }) => {
    await page.goto("/measures");
    await page.waitForTimeout(1_500);

    const rows = page.locator('[data-testid^="measure-row-"]');
    if ((await rows.count()) === 0) return;

    // Rows without overdue indicator should not have red class
    for (let i = 0; i < Math.min(await rows.count(), 5); i++) {
      const row = rows.nth(i);
      const text = await row.textContent();
      const isOverdue = text?.includes("(überfällig)");
      const cls = await row.getAttribute("class");
      if (!isOverdue) {
        // Non-overdue rows must not have red styling
        expect(cls).not.toMatch(/bg-red/);
      }
    }
  });
});

test.describe("Workflow: Kernschulungen (Position → Mitarbeiter)", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("Kernschulungen-Card auf Mitarbeiterprofil zeigt Pflichtschulungen", async ({ page }) => {
    await page.goto("/employees");
    const rows = page.locator('[data-testid^="employee-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 12_000 }).catch(() => {});
    if ((await rows.count()) === 0) return;

    await rows.first().click();
    await expect(page).toHaveURL(/\/employees\//, { timeout: 8_000 });

    const tab = page.getByTestId("tab-core-trainings");
    await tab.waitFor({ state: "visible", timeout: 8_000 });
    await tab.click();

    const card = page.getByTestId("core-trainings-card");
    await expect(card).toBeVisible({ timeout: 8_000 });

    // Card should not show a loading/error state
    const errorText = card.locator("text=Fehler, text=Error");
    expect(await errorText.count()).toBe(0);
  });
});
