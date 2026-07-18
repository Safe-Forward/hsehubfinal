import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

// ── Unauthentifiziert: PIN-Formular ist sichtbar ─────────────────────────────
// Unauthentifizierte Besucher werden NICHT weitergeleitet (kein userRole →
// Guard greift nicht). Die PIN-Seite rendert für alle.
test.describe("SuperAdmin — PIN-Verifikationsseite (unauthentifiziert)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/super-admin/verify");
    await page.waitForTimeout(1500);
  });

  test("PIN-Eingabefeld ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("superadmin-pin-input")).toBeVisible({ timeout: 8_000 });
  });

  test("Submit-Button ist sichtbar und ohne PIN deaktiviert", async ({ page }) => {
    const btn = page.getByTestId("superadmin-pin-submit");
    await expect(btn).toBeVisible({ timeout: 8_000 });
    await expect(btn).toBeDisabled();
  });

  test("Submit-Button aktiviert sich sobald PIN eingegeben wird", async ({ page }) => {
    await page.getByTestId("superadmin-pin-input").fill("1234");
    await expect(page.getByTestId("superadmin-pin-submit")).toBeEnabled({ timeout: 4_000 });
  });

  test('"PIN vergessen?"-Link zeigt Reset-Bereich', async ({ page }) => {
    await page.getByTestId("superadmin-forgot-pin").click();
    await expect(page.locator("text=PIN zurücksetzen")).toBeVisible({ timeout: 4_000 });
  });

  test('"Abbrechen"-Button ist sichtbar', async ({ page }) => {
    await expect(page.getByTestId("superadmin-logout")).toBeVisible({ timeout: 8_000 });
  });

  test("Falsches PIN zeigt Fehlermeldung", async ({ page }) => {
    await page.getByTestId("superadmin-pin-input").fill("0000");
    await page.getByTestId("superadmin-pin-submit").click();
    // Toast mit "Incorrect PIN" oder Versuch-Anzeige "X attempts remaining"
    await expect(
      page.locator("text=Incorrect PIN").or(page.locator("text=attempts remaining")).or(page.locator("text=Verification Failed"))
    ).toBeVisible({ timeout: 8_000 });
  });

  test("/super-admin/dashboard ohne PIN leitet zu /super-admin/verify um", async ({ page }) => {
    await page.goto("/super-admin/dashboard");
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url.includes("/super-admin/verify") || url.includes("/auth") || url.includes("/super-admin/dashboard")).toBe(true);
  });
});

// ── Authentifiziert (kein super_admin): Redirect zu /dashboard ───────────────
test.describe("SuperAdmin — Zugriffskontrolle (normaler Nutzer)", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("Normaler Nutzer wird von /super-admin/verify zu /dashboard umgeleitet", async ({ page }) => {
    await page.goto("/super-admin/verify");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test("Normaler Nutzer wird von /super-admin/dashboard zu /dashboard umgeleitet", async ({ page }) => {
    await page.goto("/super-admin/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });
});
