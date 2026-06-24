import { test, expect } from "@playwright/test";

// ProtectedRoute must bounce unauthenticated visitors to /auth for every
// gated module - a regression here means a module is either unreachable
// for real users or, worse, reachable without login.

const protectedPaths = ["/dashboard", "/employees", "/settings", "/training", "/incidents"];

for (const path of protectedPaths) {
  test(`unauthenticated visit to ${path} redirects to /auth`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/auth/);
  });
}
