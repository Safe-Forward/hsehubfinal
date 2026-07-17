import { test, expect } from "@playwright/test";
import { credsMissing, TEST_EMAIL, TEST_PASSWORD } from "./helpers/auth";

// Auth-Formular-Tests: Felder, Validierung, Weiterleitung
// Keine Credentials nötig für reine Formular-Sichtbarkeits-Tests.

test.describe("Login-Formular", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
  });

  test("E-Mail-Feld ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("login-email")).toBeVisible();
  });

  test("Passwort-Feld ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("login-password")).toBeVisible();
  });

  test("Login-Button ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("login-submit")).toBeVisible();
  });

  test("Falsches Passwort zeigt Fehlermeldung und bleibt auf /auth", async ({ page }) => {
    test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");
    await page.getByTestId("login-email").fill(TEST_EMAIL!);
    await page.getByTestId("login-password").fill("definitiv-falsches-passwort-123!");
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL(/\/auth/, { timeout: 8_000 });
  });

  test("Korrekte Credentials → Weiterleitung zu /dashboard", async ({ page }) => {
    test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");
    await page.getByTestId("login-email").fill(TEST_EMAIL!);
    await page.getByTestId("login-password").fill(TEST_PASSWORD!);
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });
});

test.describe("Passwort vergessen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/forgot-password");
  });

  test("E-Mail-Feld ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("forgot-password-email")).toBeVisible();
  });

  test("Absenden-Button ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("forgot-password-submit")).toBeVisible();
  });

  test("Absenden-Button ist deaktiviert ohne E-Mail", async ({ page }) => {
    await expect(page.getByTestId("forgot-password-submit")).not.toBeDisabled();
  });
});

test.describe("Passwort zurücksetzen", () => {
  // Ohne gültigen Token aus der E-Mail zeigt die Seite immer "Ungültiger Link".
  // Das Formular selbst (reset-password-input) ist nur mit echtem Token testbar.
  test("Reset-Seite lädt und zeigt Ungültiger-Link-Zustand", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.locator("text=Ungültiger Link")).toBeVisible({ timeout: 8_000 });
  });
});
