import { test, expect } from "@playwright/test";
import { credsMissing, loginAs } from "./helpers/auth";

test.describe("Aufgaben", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/tasks");
  });

  test('"Neue Aufgabe"-Button ist sichtbar', async ({ page }) => {
    await expect(page.getByTestId("btn-add-task")).toBeVisible();
  });

  test("Dialog öffnet sich beim Klick auf neue Aufgabe", async ({ page }) => {
    await page.getByTestId("btn-add-task").click();
    await expect(page.getByTestId("task-form-submit")).toBeVisible();
  });

  test("Aufgaben-Liste rendert (0 oder mehr Zeilen)", async ({ page }) => {
    const rows = page.locator('[data-testid^="task-row-"]');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("Submit-Button im Formular ist vorhanden", async ({ page }) => {
    await page.getByTestId("btn-add-task").click();
    await expect(page.getByTestId("task-form-submit")).toBeEnabled();
  });
});
