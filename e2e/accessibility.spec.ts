import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// WCAG accessibility audit for the public, no-auth pages. These are the
// pages anonymous visitors and search engines actually land on, so they're
// the highest-value place to start an a11y baseline. Authenticated app
// pages aren't covered here since they need live Supabase test credentials
// not available in this environment.
//
// We hard-fail on "critical" and "serious" impact violations - the kind
// that block screen-reader/keyboard users from completing a task (missing
// labels, missing alt text, broken ARIA, etc). "moderate" and "minor"
// findings are logged for visibility but don't fail CI, since those are
// often judgment calls (e.g. contrast on decorative elements) that need a
// human to triage rather than a mechanical gate.

const PUBLIC_PAGES = ["/", "/impressum", "/datenschutz", "/avv", "/auth", "/register"];

const FAILING_IMPACTS = new Set(["critical", "serious"]);

test.describe("accessibility (axe-core, WCAG 2A/2AA)", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} has no critical/serious WCAG violations`, async ({ page }) => {
      await page.goto(path);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      const blocking = results.violations.filter((v) => FAILING_IMPACTS.has(v.impact ?? ""));
      const nonBlocking = results.violations.filter((v) => !FAILING_IMPACTS.has(v.impact ?? ""));

      if (nonBlocking.length > 0) {
        const summary = nonBlocking
          .map((v) => `  - [${v.impact}] ${v.id}: ${v.nodes.length} node(s) - ${v.help}`)
          .join("\n");
        console.log(`[a11y] ${path}: ${nonBlocking.length} non-blocking (moderate/minor) violation(s):\n${summary}`);
      }

      if (blocking.length > 0) {
        const details = blocking
          .map(
            (v) =>
              `  - [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))\n` +
              v.nodes.map((n) => `      selector: ${n.target.join(", ")}`).join("\n"),
          )
          .join("\n");
        console.log(`[a11y] ${path}: ${blocking.length} BLOCKING violation(s):\n${details}`);
      }

      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
});
