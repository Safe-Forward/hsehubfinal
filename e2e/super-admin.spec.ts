import { test, expect } from "@playwright/test";

// Super-admin routes are protected by PIN verification and super-admin role.
// A normal test user is NOT a super admin.
// These tests verify the access-control shell works — not the admin features.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("SuperAdmin — Zugriffskontrolle", () => {
  test("Unauthentifizierter Zugriff auf /super-admin/verify zeigt Login oder PIN-Seite", async ({ page }) => {
    await page.goto("/super-admin/verify");
    // Should see either the PIN entry form or redirect to /auth
    await page.waitForTimeout(2000);
    const url = page.url();
    const onVerify = url.includes("/super-admin/verify");
    const onAuth = url.includes("/auth");
    expect(onVerify || onAuth).toBe(true);
  });

  test("Direkter Zugriff auf /super-admin/dashboard ohne PIN leitet um", async ({ page }) => {
    await page.goto("/super-admin/dashboard");
    await page.waitForTimeout(2000);
    const url = page.url();
    // Should be redirected away from dashboard (to /auth, /super-admin/verify, or elsewhere)
    const blocked = !url.includes("/super-admin/dashboard");
    const stillThere = url.includes("/super-admin/dashboard");
    // Either it got redirected, or there's a PIN/auth gate visible
    if (stillThere) {
      // Check if there's a PIN gate blocking the content
      const hasGate = await page.locator("input[type='password'], input[type='number'], [class*='pin']").count() > 0;
      expect(hasGate).toBe(true);
    } else {
      expect(blocked).toBe(true);
    }
  });
});
