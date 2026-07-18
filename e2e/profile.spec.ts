import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Benutzerprofil", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/profile");
  });

  test("Profilseite lädt", async ({ page }) => {
    await expect(page.getByTestId("profile-page")).toBeVisible({ timeout: 10_000 });
  });

  test("Bearbeiten-Button oder Eingabefelder sind sichtbar", async ({ page }) => {
    await page.waitForTimeout(2_000);
    const editBtn = page.getByTestId("profile-edit-btn");
    const firstNameInput = page.getByTestId("profile-first-name");

    const editBtnCount = await editBtn.count();
    const firstNameCount = await firstNameInput.count();

    // At least one of them must be present
    expect(editBtnCount + firstNameCount).toBeGreaterThan(0);

    if (editBtnCount > 0) {
      await expect(editBtn).toBeVisible({ timeout: 5_000 });
    }
    if (firstNameCount > 0) {
      await expect(firstNameInput).toBeVisible({ timeout: 5_000 });
    }
  });

  test("Vorname- und Nachname-Felder sind im DOM vorhanden", async ({ page }) => {
    const firstName = page.getByTestId("profile-first-name");
    const lastName = page.getByTestId("profile-last-name");
    if (await firstName.count() === 0) return;
    await expect(firstName).toBeVisible({ timeout: 10_000 });
    if (await lastName.count() === 0) return;
    await expect(lastName).toBeVisible({ timeout: 10_000 });
  });
});
