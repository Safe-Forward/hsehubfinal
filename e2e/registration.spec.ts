import { test, expect } from "@playwright/test";

// Registrierungsformular — niemals wirklich abschicken, damit keine echten
// Unternehmen entstehen. Tests prüfen nur Felder, Paket-Auswahl und AVV-Gate.

test.describe("Registrierungsformular", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("Alle drei Pakete sind wählbar", async ({ page }) => {
    await expect(page.getByTestId("reg-plan-basic")).toBeVisible();
    await expect(page.getByTestId("reg-plan-standard")).toBeVisible();
    await expect(page.getByTestId("reg-plan-premium")).toBeVisible();
  });

  test("Unternehmensname-Feld ist ausfüllbar", async ({ page }) => {
    await page.getByTestId("reg-company-name").fill("E2E Test GmbH");
    await expect(page.getByTestId("reg-company-name")).toHaveValue("E2E Test GmbH");
  });

  test("Rechnungs-E-Mail-Feld ist ausfüllbar", async ({ page }) => {
    await page.getByTestId("reg-company-email").fill("test@example.com");
    await expect(page.getByTestId("reg-company-email")).toHaveValue("test@example.com");
  });

  test("Admin-Name-Feld ist ausfüllbar", async ({ page }) => {
    await page.getByTestId("reg-admin-name").fill("Max Mustermann");
    await expect(page.getByTestId("reg-admin-name")).toHaveValue("Max Mustermann");
  });

  test("Admin-E-Mail-Feld ist ausfüllbar", async ({ page }) => {
    await page.getByTestId("reg-admin-email").fill("admin@example.com");
    await expect(page.getByTestId("reg-admin-email")).toHaveValue("admin@example.com");
  });

  test("Passwort-Feld ist ausfüllbar", async ({ page }) => {
    await page.getByTestId("reg-password").fill("SicheresPasswort123!");
    await expect(page.getByTestId("reg-password")).toHaveValue("SicheresPasswort123!");
  });

  test("Passwort-Bestätigen-Feld ist ausfüllbar", async ({ page }) => {
    await page.getByTestId("reg-confirm-password").fill("SicheresPasswort123!");
    await expect(page.getByTestId("reg-confirm-password")).toHaveValue("SicheresPasswort123!");
  });

  test("AVV-Gate: Submit-Button bleibt deaktiviert ohne AVV-Zustimmung", async ({ page }) => {
    await page.getByTestId("reg-company-name").fill("Gate Test GmbH");
    await page.getByTestId("reg-company-email").fill("gate@example.com");
    await page.getByTestId("reg-admin-name").fill("Gate Tester");
    await page.getByTestId("reg-admin-email").fill("gate@example.com");
    await page.getByTestId("reg-password").fill("SicheresPasswort123!");
    await page.getByTestId("reg-confirm-password").fill("SicheresPasswort123!");
    await expect(page.getByTestId("reg-submit")).toBeDisabled();
  });

  test("AVV-Gate: Submit-Button aktiv nach AVV-Zustimmung", async ({ page }) => {
    await page.getByTestId("reg-company-name").fill("Gate Test GmbH");
    await page.getByTestId("reg-company-email").fill("gate@example.com");
    await page.getByTestId("reg-admin-name").fill("Gate Tester");
    await page.getByTestId("reg-admin-email").fill("gate@example.com");
    await page.getByTestId("reg-password").fill("SicheresPasswort123!");
    await page.getByTestId("reg-confirm-password").fill("SicheresPasswort123!");
    await page.locator("#avv-acceptance").check();
    await expect(page.getByTestId("reg-submit")).toBeEnabled();
  });
});
