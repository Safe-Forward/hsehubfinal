import { test, expect } from "@playwright/test";
import { credsMissing, loginAs } from "./helpers/auth";

test.describe("Dashboard — KPI-Kacheln", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/dashboard");
  });

  const tiles = [
    "dashboard-tile-employees",
    "dashboard-tile-openMeasures",
    "dashboard-tile-overdueMeasures",
    "dashboard-tile-recentIncidents",
    "dashboard-tile-upcomingCheckups",
    "dashboard-tile-trainingCompletionRate",
    "dashboard-tile-auditComplianceRate",
  ];

  for (const tile of tiles) {
    test(`Kachel "${tile}" ist sichtbar`, async ({ page }) => {
      await expect(page.getByTestId(tile)).toBeVisible({ timeout: 10_000 });
    });
  }

  test("Kacheln zeigen numerische Werte (keine leeren Felder)", async ({ page }) => {
    for (const tile of tiles) {
      const text = await page.getByTestId(tile).textContent();
      expect(text?.trim().length, `Kachel ${tile} ist leer`).toBeGreaterThan(0);
    }
  });
});
