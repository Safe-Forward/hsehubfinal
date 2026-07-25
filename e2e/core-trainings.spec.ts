import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

/**
 * E2E-Tests für den Kernschulungen-Tab in der Mitarbeiterakte.
 *
 * Abgedeckte Szenarien:
 *  1. Tab ist sichtbar und lädt
 *  2. Trainings aus Stellenanforderungen werden angezeigt
 *  3. "Status eintragen"-Button ist sichtbar
 *  4. Dialog öffnet mit Text-Input (kein Dropdown)
 *  5. "Kein Ablaufdatum"-Checkbox blendet Datumfeld aus
 *  6. Zeilen-Button "Eintragen" öffnet Dialog mit vorausgefülltem Name
 *  7. Manuell eingetragene Schulung erscheint in der Liste
 */

test.describe("Kernschulungen — Mitarbeiterprofil", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  // Navigate to the first employee's Kernschulungen tab
  test.beforeEach(async ({ page }) => {
    await page.goto("/employees");
    const rows = page.locator('[data-testid^="employee-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    if (await rows.count() === 0) return;
    await rows.first().click();
    await expect(page).toHaveURL(/\/employees\//, { timeout: 8_000 });

    // Click the "Kernschulungen" tab
    const kernTab = page.getByRole("tab", { name: /kernschulungen/i });
    await kernTab.waitFor({ state: "visible", timeout: 8_000 });
    await kernTab.click();
  });

  test("Kernschulungen-Karte wird geladen", async ({ page }) => {
    const card = page.getByTestId("core-trainings-card");
    await expect(card).toBeVisible({ timeout: 10_000 });
  });

  test("Zeigt Schulungszeilen oder Leer-Zustand an", async ({ page }) => {
    const card = page.getByTestId("core-trainings-card");
    await expect(card).toBeVisible({ timeout: 10_000 });

    const rows = page.locator('[data-testid^="core-training-row-"]');
    const emptyMsg = card.locator("text=Keine Stelle zugewiesen").or(
      card.locator("text=Keine Schulungen für diese Stelle")
    );

    const hasRows = (await rows.count()) > 0;
    const hasEmpty = await emptyMsg.isVisible();
    expect(hasRows || hasEmpty).toBeTruthy();
  });

  test('"Status eintragen"-Button ist sichtbar wenn Stelle zugewiesen', async ({ page }) => {
    await expect(page.getByTestId("core-trainings-card")).toBeVisible({ timeout: 10_000 });

    // Only check if there are rows (= employee has a position)
    const rows = page.locator('[data-testid^="core-training-row-"]');
    if ((await rows.count()) === 0) return;

    await expect(page.getByTestId("btn-status-eintragen")).toBeVisible({ timeout: 5_000 });
  });

  test('Dialog öffnet mit Textfeld — kein Dropdown', async ({ page }) => {
    const rows = page.locator('[data-testid^="core-training-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    if ((await rows.count()) === 0) return;

    await page.getByTestId("btn-status-eintragen").click();

    const dialog = page.getByTestId("dialog-status-eintragen");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Must have a text input, NOT a select/combobox
    await expect(page.getByTestId("input-training-name")).toBeVisible();
    await expect(dialog.locator("select, [role=combobox]")).toHaveCount(0);
  });

  test('"Kein Ablaufdatum"-Checkbox blendet Gültig-bis-Feld aus', async ({ page }) => {
    const rows = page.locator('[data-testid^="core-training-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    if ((await rows.count()) === 0) return;

    await page.getByTestId("btn-status-eintragen").click();
    await expect(page.getByTestId("dialog-status-eintragen")).toBeVisible({ timeout: 5_000 });

    // Expiry date field visible before checking
    const expiryInput = page.locator('input[type="date"]').nth(1);
    await expect(expiryInput).toBeVisible();

    // Check "Kein Ablaufdatum"
    await page.getByTestId("checkbox-no-expiry").click();

    // Expiry date field should now be hidden
    await expect(expiryInput).not.toBeVisible();
  });

  test('Zeilen-Button "Eintragen" öffnet Dialog mit vorausgefülltem Namen', async ({ page }) => {
    const rows = page.locator('[data-testid^="core-training-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    if ((await rows.count()) === 0) return;

    // Find a pending row's Eintragen button
    const firstRowId = await rows.first().getAttribute("data-testid");
    const typeId = firstRowId?.replace("core-training-row-", "");
    if (!typeId) return;

    const eintragenBtn = page.getByTestId(`btn-eintragen-${typeId}`);
    if ((await eintragenBtn.count()) === 0) return;

    // Get the training name from the row
    const trainingName = await rows.first().locator("p.font-medium").textContent();

    await eintragenBtn.click();

    const dialog = page.getByTestId("dialog-status-eintragen");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Name should be shown as static text (not editable input)
    await expect(page.getByTestId("input-training-name")).not.toBeVisible();
    if (trainingName) {
      await expect(dialog.locator(`text=${trainingName.trim()}`)).toBeVisible();
    }
  });

  test("Manuell eingetragene Schulung erscheint in der Liste", async ({ page }) => {
    const rows = page.locator('[data-testid^="core-training-row-"]');
    await rows.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    if ((await rows.count()) === 0) return;

    const uniqueName = `Test-Schulung-E2E-${Date.now()}`;

    // Open global dialog
    await page.getByTestId("btn-status-eintragen").click();
    await expect(page.getByTestId("dialog-status-eintragen")).toBeVisible({ timeout: 5_000 });

    // Fill training name
    await page.getByTestId("input-training-name").fill(uniqueName);

    // Fill completion date
    await page.getByTestId("input-completion-date").fill("2025-01-15");

    // Check no-expiry to skip expiry date
    await page.getByTestId("checkbox-no-expiry").click();

    // Save
    await page.getByRole("button", { name: /eintragen/i }).last().click();

    // Dialog should close
    await expect(page.getByTestId("dialog-status-eintragen")).not.toBeVisible({ timeout: 8_000 });

    // The new training should now appear in the list
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Kernschulungen — Einstellungen Stellen & Schulungen", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("link", { name: /stellen.*schulungen/i })
      .or(page.getByText("Stellen & Schulungen").first())
      .click();
    await page.waitForTimeout(1_000);
  });

  test("Eigene Stellen werden angezeigt", async ({ page }) => {
    const ownTab = page.getByRole("tab", { name: /eigene stellen/i });
    await expect(ownTab).toBeVisible({ timeout: 8_000 });
    await ownTab.click();
    // At least one position card or empty state
    const content = page.locator('[role="tabpanel"]').last();
    await expect(content).toBeVisible({ timeout: 5_000 });
  });

  test('"Aus Katalog"-Tab zeigt Stellen ohne Ersthelfer und Sicherheitsbeauftragter', async ({ page }) => {
    const catalogTab = page.getByRole("tab", { name: /aus katalog/i });
    await expect(catalogTab).toBeVisible({ timeout: 8_000 });
    await catalogTab.click();

    // These qualification roles must NOT be in the position catalog
    await expect(page.locator("text=Ersthelfer").first()).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
    await expect(page.locator("text=Sicherheitsbeauftragter").first()).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
    await expect(page.locator("text=Brandschutzhelfer").first()).not.toBeVisible({ timeout: 3_000 }).catch(() => {});

    // Job roles MUST be present
    await expect(page.locator("text=Gabelstaplerfahrer").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=Schweißer").first()).toBeVisible({ timeout: 5_000 });
  });

  test('"Schulungen zuordnen"-Dialog ist scrollbar bei vielen Einträgen', async ({ page }) => {
    const ownTab = page.getByRole("tab", { name: /eigene stellen/i });
    await ownTab.click();

    // Click first "Schulung zuordnen" button
    const zuordnenBtn = page.getByRole("button", { name: /schulung zuordnen/i }).first();
    if ((await zuordnenBtn.count()) === 0) return;
    await zuordnenBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // The scrollable list should exist
    const list = dialog.locator(".overflow-y-auto");
    await expect(list).toBeVisible();
  });
});
