import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Passwort ändern (Profile → Sicherheit)", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByTestId("profile-page")).toBeVisible({ timeout: 10_000 });
    // Zum Sicherheits-Tab navigieren
    await page.getByRole("tab", { name: /sicherheit/i }).click();
  });

  test("Passwort-Felder sind vorhanden und interaktiv", async ({ page }) => {
    const current = page.locator("#current");
    const newPw = page.locator("#new");
    const confirm = page.locator("#confirm");

    await expect(current).toBeVisible({ timeout: 5_000 });
    await expect(newPw).toBeVisible();
    await expect(confirm).toBeVisible();

    // Felder sind beschreibbar (nicht disabled/read-only)
    await current.fill("test-input");
    await expect(current).toHaveValue("test-input");
    await current.fill("");
  });

  test("Passwort-Button ist aktiv und klickbar", async ({ page }) => {
    const btn = page.getByRole("button", { name: /passwort/i });
    await expect(btn).toBeVisible({ timeout: 5_000 });
    await expect(btn).toBeEnabled();
  });

  test("Validierung: leere Felder zeigen deutschen Fehler", async ({ page }) => {
    const btn = page.getByRole("button", { name: /passwort/i });
    await btn.click();
    // Toast mit deutschem Fehlertext
    await expect(page.getByText(/pflichtfelder/i)).toBeVisible({ timeout: 5_000 });
  });

  test("Validierung: nicht übereinstimmende Passwörter", async ({ page }) => {
    await page.locator("#new").fill("Passwort123");
    await page.locator("#confirm").fill("AnderesPw456");
    await page.getByRole("button", { name: /passwort/i }).click();
    await expect(page.getByText(/stimmen nicht überein/i)).toBeVisible({ timeout: 5_000 });
  });

  test("Validierung: zu kurzes Passwort", async ({ page }) => {
    await page.locator("#new").fill("kurz");
    await page.locator("#confirm").fill("kurz");
    await page.getByRole("button", { name: /passwort/i }).click();
    await expect(page.getByText(/zu kurz|mindestens/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
