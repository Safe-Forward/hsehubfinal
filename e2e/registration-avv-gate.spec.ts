import { test, expect } from "@playwright/test";

// register_company() rejects registration server-side without AVV
// acceptance, but the UI is supposed to make that unreachable in the first
// place by keeping the submit button disabled. This is the regression
// guard for that clickwrap gate - if it ever silently breaks (e.g. a
// refactor drops the `disabled` binding), a customer could register
// without ever seeing/accepting the AVV. Deliberately never submits the
// form, so this never creates real company data.

test("submit button stays disabled until the AVV checkbox is checked, and enables once it is", async ({ page }) => {
  await page.goto("/register");

  await page.locator("#companyName").fill("E2E Gate Test GmbH");
  await page.locator("#companyEmail").fill("e2e-gate-test@example.com");
  await page.locator("#adminName").fill("E2E Gate Tester");
  await page.locator("#adminEmail").fill("e2e-gate-test@example.com");
  await page.locator("#password").fill("SomeValidPassword123!");
  await page.locator("#confirmPassword").fill("SomeValidPassword123!");

  const submitButton = page.getByRole("button", { name: /kostenlos testen/i });
  const avvCheckbox = page.locator("#avv-acceptance");

  await expect(avvCheckbox).not.toBeChecked();
  await expect(submitButton).toBeDisabled();

  await avvCheckbox.check();
  await expect(submitButton).toBeEnabled();

  await avvCheckbox.uncheck();
  await expect(submitButton).toBeDisabled();
});

test("AVV checkbox links point at the public Datenschutz and AVV pages", async ({ page }) => {
  await page.goto("/register");

  const avvLabel = page.locator('label[for="avv-acceptance"]');
  await expect(avvLabel.locator('a[href="/datenschutz"]')).toBeVisible();
  await expect(avvLabel.locator('a[href="/avv"]')).toBeVisible();
});
