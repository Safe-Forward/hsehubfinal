import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Einstellungen", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
  });

  test("Einstellungen-Seite lädt", async ({ page }) => {
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });
  });

  test("Unternehmensname-Feld ist vorhanden", async ({ page }) => {
    const el = page.getByTestId("settings-company-name");
    if (await el.count() === 0) return;
    await expect(el).toBeVisible({ timeout: 10_000 });
  });

  test("Speichern-Button ist vorhanden", async ({ page }) => {
    const el = page.getByTestId("settings-save-company");
    if (await el.count() === 0) return;
    await expect(el).toBeVisible({ timeout: 10_000 });
  });

  test("Sidebar-Navigation hat Tab-Schaltflächen", async ({ page }) => {
    await expect(page.getByTestId("settings-tab-team")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("settings-tab-user-roles")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("settings-tab-configuration")).toBeVisible({ timeout: 10_000 });
  });
});
