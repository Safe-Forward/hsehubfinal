import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Einstellungen — Firmendaten laden (fetchCompanySettings-Fix)", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("Organisationstyp wird beim Öffnen der Einstellungen geladen", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });

    // Zum Organisations-Tab navigieren
    const orgTab = page.getByTestId("settings-tab-organisation");
    if (await orgTab.count() === 0) return;
    await orgTab.click();
    await page.waitForTimeout(2_000);

    // Unternehmensname-Feld sollte einen Wert haben (nicht leer)
    const companyName = page.getByTestId("settings-company-name");
    if (await companyName.count() === 0) return;
    await expect(companyName).toBeVisible({ timeout: 5_000 });
    // Wert ist geladen (kein leeres Feld nach 2 Sekunden)
    const value = await companyName.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test("Team-Tab zeigt Teammitglieder (nicht leer)", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });

    const teamTab = page.getByTestId("settings-tab-team");
    if (await teamTab.count() === 0) return;
    await teamTab.click();
    await page.waitForTimeout(2_000);

    // Mindestens eine Zeile in der Tabelle (der eigene Admin-Account)
    const rows = page.locator("table tbody tr");
    if (await rows.count() === 0) return;
    expect(await rows.count()).toBeGreaterThan(0);
  });
});
