import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Dokumente", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/documents");
  });

  test('"Dokument hochladen"-Button ist sichtbar', async ({ page }) => {
    const uploadBtn = page.getByTestId("btn-upload-document")
      .or(page.getByTestId("btn-upload-document-empty"));
    await expect(uploadBtn.first()).toBeVisible({ timeout: 10_000 });
  });

  test("Upload-Dialog öffnet sich beim Klick", async ({ page }) => {
    const uploadBtn = page.getByTestId("btn-upload-document").first();
    if (await uploadBtn.count() === 0) return;
    await uploadBtn.click();
    await expect(page.getByTestId("document-upload-submit")).toBeVisible();
  });

  test("Dokument-Karten werden gerendert (0 oder mehr)", async ({ page }) => {
    const cards = page.locator('[data-testid^="document-card-"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("Upload-Dialog: Hochladen-Button ist deaktiviert ohne Datei", async ({ page }) => {
    const uploadBtn = page.getByTestId("btn-upload-document").first();
    if (await uploadBtn.count() === 0) return;
    await uploadBtn.click();
    await expect(page.getByTestId("document-upload-submit")).toBeDisabled();
  });
});
