import { test, expect } from "@playwright/test";
import { credsMissing, loginAs } from "./helpers/auth";

test.describe("Hauptnavigation", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  const navLinks: [string, string, RegExp][] = [
    ["nav-dashboard", "Dashboard", /\/dashboard/],
    ["nav-employees", "Mitarbeiter", /\/employees/],
    ["nav-investigations", "G-Untersuchungen", /\/investigations/],
    ["nav-risk-assessments", "Risikobewertungen", /\/risk-assessments/],
    ["nav-training", "Schulungen", /\/training/],
    ["nav-incidents", "Vorfälle", /\/incidents/],
    ["nav-measures", "Maßnahmen", /\/measures/],
    ["nav-audits", "Audits", /\/audits/],
    ["nav-reports", "Berichte", /\/reports/],
    ["nav-settings", "Einstellungen", /\/settings/],
  ];

  for (const [testid, label, urlPattern] of navLinks) {
    test(`${label}-Link ist sichtbar und navigiert korrekt`, async ({ page }) => {
      await expect(page.getByTestId(testid)).toBeVisible();
      await page.getByTestId(testid).click();
      await expect(page).toHaveURL(urlPattern, { timeout: 8_000 });
    });
  }
});
