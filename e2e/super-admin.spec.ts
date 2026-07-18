import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

// SuperAdmin-Routen sind doppelt geschützt:
// 1. ProtectedRoute requiredRole="super_admin" → unauthentifiziert oder normaler User → /auth
// 2. SuperAdminRoute → erfordert zusätzlich PIN-Verifikation in sessionStorage
//
// Mit Standard-Test-Credentials (normaler User) ist kein SuperAdmin-Inhalt erreichbar.
// Diese Tests prüfen daher ausschließlich die Zugriffskontrolle.

test.describe("SuperAdmin — Zugriffskontrolle (unauthentifiziert)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("Unauthentifizierter Zugriff auf /super-admin/verify leitet zu /auth um", async ({ page }) => {
    await page.goto("/super-admin/verify");
    await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
  });

  test("Unauthentifizierter Zugriff auf /super-admin/dashboard leitet zu /auth um", async ({ page }) => {
    await page.goto("/super-admin/dashboard");
    await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
  });
});

test.describe("SuperAdmin — Zugriffskontrolle (normaler Nutzer)", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("Normaler Nutzer wird von /super-admin/verify zu /auth oder /dashboard umgeleitet", async ({ page }) => {
    await page.goto("/super-admin/verify");
    await page.waitForURL(url => !url.toString().includes("/super-admin/verify"), { timeout: 10_000 });
    const url = page.url();
    expect(url.includes("/auth") || url.includes("/dashboard")).toBe(true);
  });

  test("Normaler Nutzer wird von /super-admin/dashboard zu /auth oder /dashboard umgeleitet", async ({ page }) => {
    await page.goto("/super-admin/dashboard");
    await page.waitForURL(url => !url.toString().includes("/super-admin/dashboard"), { timeout: 10_000 });
    const url = page.url();
    expect(url.includes("/auth") || url.includes("/dashboard")).toBe(true);
  });

  test("Normaler Nutzer wird von /super-admin/companies umgeleitet", async ({ page }) => {
    await page.goto("/super-admin/companies");
    await page.waitForURL(url => !url.toString().includes("/super-admin/companies"), { timeout: 10_000 });
    const url = page.url();
    expect(url.includes("/auth") || url.includes("/dashboard")).toBe(true);
  });
});
