import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Mitarbeiter", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/employees");
  });

  test("Seite lädt und zeigt Mitarbeiter-Liste", async ({ page }) => {
    await expect(page.locator('[data-testid^="employee-row-"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('"Mitarbeiter hinzufügen"-Button ist sichtbar', async ({ page }) => {
    await expect(page.getByTestId("btn-add-employee")).toBeVisible();
  });

  test("Dialog öffnet sich beim Klick auf hinzufügen", async ({ page }) => {
    await page.getByTestId("btn-add-employee").click();
    await expect(page.getByTestId("employee-form-firstname")).toBeVisible();
    await expect(page.getByTestId("employee-form-lastname")).toBeVisible();
    await expect(page.getByTestId("employee-form-email")).toBeVisible();
    await expect(page.getByTestId("employee-form-department")).toBeVisible();
    await expect(page.getByTestId("employee-form-submit")).toBeVisible();
  });

  test("Formularfelder sind ausfüllbar", async ({ page }) => {
    const stamp = Date.now();
    await page.getByTestId("btn-add-employee").click();
    await page.getByTestId("employee-form-firstname").fill(`E2E-Vorname-${stamp}`);
    await page.getByTestId("employee-form-lastname").fill(`E2E-Nachname-${stamp}`);
    await page.getByTestId("employee-form-email").fill(`e2e-${stamp}@test.hsehub`);
    await expect(page.getByTestId("employee-form-firstname")).toHaveValue(`E2E-Vorname-${stamp}`);
    await expect(page.getByTestId("employee-form-lastname")).toHaveValue(`E2E-Nachname-${stamp}`);
    await expect(page.getByTestId("employee-form-email")).toHaveValue(`e2e-${stamp}@test.hsehub`);
  });
});
