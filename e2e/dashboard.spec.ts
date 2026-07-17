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
