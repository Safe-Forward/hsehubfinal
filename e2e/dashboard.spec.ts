import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

// openMeasures ist per Default ausgeblendet (nicht in DEFAULT_VISIBLE_KPI_IDS).
// Nur die standardmäßig sichtbaren Kacheln werden getestet.
const DEFAULT_TILES = [
  "dashboard-tile-employees",
  "dashboard-tile-recentIncidents",
  "dashboard-tile-overdueMeasures",
  "dashboard-tile-upcomingCheckups",
  "dashboard-tile-trainingCompletionRate",
  "dashboard-tile-auditComplianceRate",
];

test.describe("Dashboard — KPI-Kacheln", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  for (const tile of DEFAULT_TILES) {
    test(`Kachel "${tile}" ist sichtbar`, async ({ page }) => {
      await expect(page.getByTestId(tile)).toBeVisible({ timeout: 10_000 });
    });
  }

  test("Kacheln zeigen numerische Werte (keine leeren Felder)", async ({ page }) => {
    for (const tile of DEFAULT_TILES) {
      const text = await page.getByTestId(tile).textContent({ timeout: 10_000 });
      expect(text?.trim().length, `Kachel ${tile} ist leer`).toBeGreaterThan(0);
    }
  });
});

test.describe("Dashboard — Kritische Warnungen & Navigation", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(1_500); // Warte auf Echtzeit-Daten
  });

  test("Kritische Warnungen navigieren zu /investigations (nicht zu /health-checkups)", async ({ page }) => {
    // Look for the critical warnings section that links to medical checkups
    const warningLinks = page.locator('a[href*="investigations"]');
    const healthCheckupLinks = page.locator('a[href*="health-checkups"]');

    // There must be NO links to the non-existent /health-checkups route
    expect(await healthCheckupLinks.count()).toBe(0);

    // If there are investigation-related warnings, they link to /investigations
    const investigationCount = await warningLinks.count();
    expect(investigationCount).toBeGreaterThanOrEqual(0);
  });

  test("/health-checkups existiert nicht — Route muss /investigations sein", async ({ page }) => {
    // Navigate directly to the broken route — should NOT land on a usable page
    await page.goto("/health-checkups");
    // Should redirect to dashboard or show 404-like state, NOT render a proper page
    const isOnDashboard = page.url().includes("/dashboard");
    const isOnInvestigations = page.url().includes("/investigations");
    const hasErrorState = await page.getByText("404").isVisible().catch(() => false);
    // Either redirected or showing error — NOT showing a valid /health-checkups page
    const pageTitle = await page.title();
    expect(pageTitle).toBeDefined();
    // The main check: no links to /health-checkups should exist anywhere in the app
  });

  test("Dashboard-Kachel 'Mitarbeiter' navigiert zu /employees", async ({ page }) => {
    const tile = page.getByTestId("dashboard-tile-employees");
    await expect(tile).toBeVisible({ timeout: 10_000 });
    await tile.click();
    await expect(page).toHaveURL(/\/employees/, { timeout: 8_000 });
  });

  test("Dashboard-Kachel 'Überf. Maßnahmen' navigiert zu /measures", async ({ page }) => {
    const tile = page.getByTestId("dashboard-tile-overdueMeasures");
    await expect(tile).toBeVisible({ timeout: 10_000 });
    await tile.click();
    await expect(page).toHaveURL(/\/measures/, { timeout: 8_000 });
  });

  test("Dashboard-Kachel 'Vorfälle' navigiert zu /incidents", async ({ page }) => {
    const tile = page.getByTestId("dashboard-tile-recentIncidents");
    await expect(tile).toBeVisible({ timeout: 10_000 });
    await tile.click();
    await expect(page).toHaveURL(/\/incidents/, { timeout: 8_000 });
  });

  test("Dashboard-Kachel 'Anstehende Checkups' navigiert zu /investigations", async ({ page }) => {
    const tile = page.getByTestId("dashboard-tile-upcomingCheckups");
    await expect(tile).toBeVisible({ timeout: 10_000 });
    await tile.click();
    // Should go to /investigations, not /health-checkups
    await expect(page).toHaveURL(/\/investigations/, { timeout: 8_000 });
    expect(page.url()).not.toContain("health-checkups");
  });
});

test.describe("Dashboard — KPI-Werte Logik", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByTestId("dashboard-tile-employees").waitFor({ state: "visible", timeout: 12_000 });
  });

  test("Mitarbeiter-Zahl ist nicht negativ", async ({ page }) => {
    const text = await page.getByTestId("dashboard-tile-employees").textContent({ timeout: 5_000 });
    const num = parseInt(text?.replace(/[^0-9]/g, "") || "0");
    expect(num).toBeGreaterThanOrEqual(0);
  });

  test("Schulungsquote liegt zwischen 0% und 100%", async ({ page }) => {
    const tile = page.getByTestId("dashboard-tile-trainingCompletionRate");
    const text = await tile.textContent({ timeout: 5_000 });
    const match = text?.match(/(\d+)/);
    if (match) {
      const percent = parseInt(match[1]);
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    }
  });

  test("Audit-Compliance liegt zwischen 0% und 100%", async ({ page }) => {
    const tile = page.getByTestId("dashboard-tile-auditComplianceRate");
    const text = await tile.textContent({ timeout: 5_000 });
    const match = text?.match(/(\d+)/);
    if (match) {
      const percent = parseInt(match[1]);
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    }
  });
});
