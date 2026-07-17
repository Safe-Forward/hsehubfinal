import { Page } from "@playwright/test";

export const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;
export const credsMissing = !TEST_EMAIL || !TEST_PASSWORD;

export async function loginAs(page: Page): Promise<void> {
  await page.goto("/auth");
  await page.getByTestId("login-email").fill(TEST_EMAIL!);
  await page.getByTestId("login-password").fill(TEST_PASSWORD!);
  await page.getByTestId("login-submit").click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}
