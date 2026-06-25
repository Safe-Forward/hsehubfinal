import { test, expect } from "@playwright/test";

// Concrete regression guard for "something is wider than the screen" on the
// public, no-auth pages. This is intentionally narrow: it does not check
// visual layout, just that nothing forces horizontal scrolling on a common
// mobile viewport. A page that needs the user to scroll sideways to read
// text or tap a button is broken on mobile regardless of how it looks.

const PUBLIC_PAGES = ["/", "/impressum", "/datenschutz", "/avv", "/auth", "/register"];

const MOBILE_VIEWPORT = { width: 375, height: 667 }; // iPhone SE/8-class viewport
const OVERFLOW_TOLERANCE_PX = 1; // rounding slack between scrollWidth/clientWidth

test.describe("mobile viewport: no horizontal overflow", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} has no horizontal overflow at 375x667`, async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await page.goto(path);

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      expect(
        scrollWidth,
        `${path}: document.documentElement.scrollWidth (${scrollWidth}) exceeds clientWidth (${clientWidth}) - something is wider than the viewport`,
      ).toBeLessThanOrEqual(clientWidth + OVERFLOW_TOLERANCE_PX);
    });
  }
});
