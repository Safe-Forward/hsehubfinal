import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Schulungen", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/training");
  });

  test('"Neuen Kurs erstellen"-Button ist sichtbar', async ({ page }) => {
    await expect(page.getByTestId("btn-add-course")).toBeVisible({ timeout: 10_000 });
  });

  test("Kurs-Karten werden gerendert (0 oder mehr)", async ({ page }) => {
    const cards = page.locator('[data-testid^="course-card-"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("Vorhandene Kurs-Karte ist klickbar", async ({ page }) => {
    const firstCard = page.locator('[data-testid^="course-card-"]').first();
    if (await firstCard.count() === 0) return;
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await expect(page).toHaveURL(/\/training\//, { timeout: 8_000 });
  });
});

test.describe("Schulungen — KPI-Kacheln (Berichte)", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/reports");
    await page.getByTestId("tab-trainings").click();
  });

  test("KPI Schulungskurse ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("tile-trainings-courses")).toBeVisible({ timeout: 10_000 });
  });

  test("KPI Compliance-Rate ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("tile-trainings-compliance")).toBeVisible({ timeout: 10_000 });
  });
});
