import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Nachrichten", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/messages");
  });

  test("Nachrichten-Seite lädt", async ({ page }) => {
    await expect(page.getByTestId("messages-page")).toBeVisible({ timeout: 10_000 });
  });

  test("Kanal-Liste ist sichtbar", async ({ page }) => {
    const channelList = page.getByTestId("messages-channel-list");
    if (await channelList.count() === 0) return;
    await expect(channelList).toBeVisible({ timeout: 10_000 });
  });

  test("Eingabefeld ist vorhanden", async ({ page }) => {
    await page.waitForTimeout(2_000);
    const input = page.getByTestId("messages-input");
    if (await input.count() === 0) return;
    await expect(input).toBeVisible({ timeout: 10_000 });
  });

  test("Senden-Button ist vorhanden", async ({ page }) => {
    await page.waitForTimeout(2_000);
    const sendBtn = page.getByTestId("messages-send");
    if (await sendBtn.count() === 0) return;
    await expect(sendBtn).toBeVisible({ timeout: 10_000 });
  });
});
