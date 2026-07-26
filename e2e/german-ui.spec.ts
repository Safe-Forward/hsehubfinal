import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

/**
 * Stichproben-Tests: Stellen sicher, dass keine englischen Texte in der UI erscheinen.
 * Prüft die wichtigsten Seiten auf bekannte englische Strings.
 */
test.describe("Deutsch-UI Stichproben", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  const englishStrings = [
    "Permission Denied",
    "Upload Failed",
    "Upload Successful",
    "Validation Error",
    "Access Denied",
    "Not Started",
    "In Progress",
    "Completed",
    "Blocked",
    "Loading...",
    "No documents found",
    "All Categories",
    "Notifications",    // als Seitentitel h1
    "Mark all as read",
    "Checklist Regenerated",
    "Select All",       // als Button-Label
    "Save Note",
    "Skip",
    "Regenerate Checklist",
  ];

  async function checkNoEnglish(page: any, path: string) {
    await page.goto(path);
    await page.waitForTimeout(2_000);
    const body = await page.locator("body").textContent();
    for (const str of englishStrings) {
      expect(body, `"${str}" auf ${path} gefunden`).not.toContain(str);
    }
  }

  test("Dashboard enthält keine englischen Fehlertexte", async ({ page }) => {
    await checkNoEnglish(page, "/dashboard");
  });

  test("Dokumente-Seite ist auf Deutsch", async ({ page }) => {
    await page.goto("/documents");
    await page.waitForTimeout(2_000);
    await expect(page.getByText("Dokumente", { exact: true }).or(page.getByText("Dokumentenübersicht"))).toBeVisible({ timeout: 8_000 });
    await expect(page.locator("body")).not.toContainText("No documents found");
    await expect(page.locator("body")).not.toContainText("All Categories");
  });

  test("Benachrichtigungen-Seite ist auf Deutsch", async ({ page }) => {
    await page.goto("/notifications");
    await page.waitForTimeout(2_000);
    // h1 muss deutsch sein
    await expect(page.locator("h1")).not.toHaveText("Notifications", { timeout: 5_000 });
    await expect(page.locator("h1")).toContainText("Benachrichtigungen", { timeout: 5_000 });
  });

  test("Profil-Sicherheits-Tab ist auf Deutsch", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForTimeout(1_000);
    const secTab = page.getByRole("tab", { name: /sicherheit/i });
    if (await secTab.count() === 0) return;
    await secTab.click();
    await page.waitForTimeout(1_000);
    await expect(page.locator("body")).not.toContainText("Update Password");
    await expect(page.locator("body")).not.toContainText("Current Password");
  });

  test("Audits-Seite zeigt deutsches Datumsformat", async ({ page }) => {
    await page.goto("/audits");
    await page.waitForTimeout(3_000);
    // Kein ISO-Datum (2025-01-15) direkt sichtbar als Rohstring
    const body = await page.locator("body").textContent() ?? "";
    const isoDatePattern = /\b\d{4}-\d{2}-\d{2}\b/;
    expect(isoDatePattern.test(body), "ISO-Datum im Body gefunden").toBe(false);
  });
});

test.describe("Deutsch-UI — Einstellungs-Tabs", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("Support-Tab ist auf Deutsch", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });
    const tab = page.getByTestId("settings-tab-support");
    if (await tab.count() === 0) return;
    await tab.click();
    await page.waitForTimeout(1_500);
    await expect(page.locator("body")).not.toContainText("Submit a Support Ticket");
    await expect(page.locator("body")).not.toContainText("Submit Ticket");
  });

  test("Rechnungen-Tab ist auf Deutsch", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });
    const tab = page.getByTestId("settings-tab-invoices-billing");
    if (await tab.count() === 0) return;
    await tab.click();
    await page.waitForTimeout(1_500);
    await expect(page.locator("body")).not.toContainText("Invoices & Billing");
  });

  test("API-Integration-Tab ist auf Deutsch", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });
    const tab = page.getByTestId("settings-tab-api-integration");
    if (await tab.count() === 0) return;
    await tab.click();
    await page.waitForTimeout(1_500);
    await expect(page.locator("body")).not.toContainText("Connect System");
    await expect(page.locator("body")).not.toContainText('"Active"');
  });
});

test.describe("Deutsch-UI — Benachrichtigungsglocke", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test("NotificationBell zeigt deutsche Texte", async ({ page }) => {
    await page.goto("/dashboard");
    const bell = page.getByTestId("notification-bell-trigger");
    if (await bell.count() === 0) return;
    await bell.click();
    await page.waitForTimeout(1_000);
    await expect(page.locator("body")).not.toContainText("Notifications", { timeout: 3_000 });
    await expect(page.locator("body")).not.toContainText("Mark all read");
    await expect(page.locator("body")).not.toContainText("View all");
  });
});
