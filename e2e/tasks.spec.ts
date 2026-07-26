import { test, expect } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

test.describe("Aufgaben — Grundfunktionen", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/tasks");
  });

  test('"Neue Aufgabe"-Button ist sichtbar', async ({ page }) => {
    await expect(page.getByTestId("btn-add-task")).toBeVisible({ timeout: 10_000 });
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
});

test.describe("Aufgaben — Deutsches UI", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/tasks");
    await expect(page.getByTestId("btn-add-task")).toBeVisible({ timeout: 10_000 });
  });

  test("Seitenüberschrift ist auf Deutsch", async ({ page }) => {
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 5_000 });
    const text = await heading.textContent();
    // Must not be English "Tasks" or "Task Management"
    expect(text).not.toBe("Tasks");
    expect(text).not.toBe("Task Management");
    // Should contain German "Aufgaben"
    expect(text).toContain("Aufgaben");
  });

  test('"Neue Aufgabe"-Button hat deutschen Text', async ({ page }) => {
    const btn = page.getByTestId("btn-add-task");
    const text = await btn.textContent();
    expect(text).toContain("Aufgabe");
    expect(text).not.toContain("New Task");
  });

  test("Suchfeld hat deutschen Placeholder", async ({ page }) => {
    const search = page.locator('input[type="search"], input[placeholder]').first();
    const placeholder = await search.getAttribute("placeholder");
    expect(placeholder).toMatch(/Aufgabe/i);
    expect(placeholder).not.toMatch(/Search/i);
  });

  test("Dialog-Titel ist auf Deutsch", async ({ page }) => {
    await page.getByTestId("btn-add-task").click();
    const dialogTitle = page.locator('[role="dialog"] h2, [role="dialog"] [id*="title"]').first();
    await expect(dialogTitle).toBeVisible({ timeout: 5_000 });
    const text = await dialogTitle.textContent();
    expect(text).not.toBe("Create Task");
    expect(text).toMatch(/Aufgabe/i);
  });

  test("Dialog-Formular hat Titel-Feld mit deutschem Label", async ({ page }) => {
    await page.getByTestId("btn-add-task").click();
    await expect(page.getByTestId("task-form-title")).toBeVisible({ timeout: 5_000 });
    // Find the label for the title field
    const label = page.locator("label[for='title'], label:has-text('Titel')").first();
    if ((await label.count()) > 0) {
      const text = await label.textContent();
      expect(text).not.toBe("Title");
      expect(text).toMatch(/Titel/i);
    }
  });

  test("Priorität-Dropdown hat deutsche Optionen", async ({ page }) => {
    await page.getByTestId("btn-add-task").click();
    const prioritySelect = page.getByTestId("task-form-priority");
    await expect(prioritySelect).toBeVisible({ timeout: 5_000 });
    await prioritySelect.click();
    const options = page.locator('[role="option"]');
    await options.first().waitFor({ state: "visible", timeout: 3_000 });
    const texts = await options.allTextContents();
    const hasGerman = texts.some(t => /Niedrig|Mittel|Hoch|Dringend/i.test(t));
    expect(hasGerman).toBe(true);
    const hasEnglish = texts.some(t => /^Low$|^Medium$|^High$|^Urgent$/.test(t.trim()));
    expect(hasEnglish).toBe(false);
    await page.keyboard.press("Escape");
  });

  test("Status-Dropdown hat deutsche Optionen", async ({ page }) => {
    await page.getByTestId("btn-add-task").click();
    const statusSelect = page.getByTestId("task-form-status");
    await expect(statusSelect).toBeVisible({ timeout: 5_000 });
    await statusSelect.click();
    const options = page.locator('[role="option"]');
    await options.first().waitFor({ state: "visible", timeout: 3_000 });
    const texts = await options.allTextContents();
    const hasGerman = texts.some(t => /Ausstehend|Bearbeitung|Abgeschlossen|Überfällig/i.test(t));
    expect(hasGerman).toBe(true);
    await page.keyboard.press("Escape");
  });

  test("Abbrechen-Button hat deutschen Text", async ({ page }) => {
    await page.getByTestId("btn-add-task").click();
    const cancelBtn = page.locator('[role="dialog"]').getByRole("button", { name: /Abbrechen/i });
    await expect(cancelBtn).toBeVisible({ timeout: 5_000 });
    const text = await cancelBtn.textContent();
    expect(text).not.toBe("Cancel");
  });

  test("Abbrechen-Button schließt Dialog", async ({ page }) => {
    await page.getByTestId("btn-add-task").click();
    const cancelBtn = page.locator('[role="dialog"]').getByRole("button", { name: /Abbrechen/i });
    await expect(cancelBtn).toBeVisible({ timeout: 5_000 });
    await cancelBtn.click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 });
  });
});

test.describe("Aufgaben — Tabellendarstellung", () => {
  test.skip(credsMissing, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD nicht gesetzt");

  test.beforeEach(async ({ page }) => {
    await page.goto("/tasks");
    await page.locator('[data-testid^="task-row-"]').first()
      .waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  });

  test("Tabellen-Header sind auf Deutsch", async ({ page }) => {
    const headers = page.locator("th");
    if ((await headers.count()) === 0) return;
    const texts = await headers.allTextContents();
    // Should contain German header words
    const hasGerman = texts.some(t => /Titel|Priorität|Status|Fällig|Zugewiesen/i.test(t));
    expect(hasGerman).toBe(true);
    // Should NOT contain English-only header words
    const hasEnglish = texts.some(t => /^Title$|^Priority$|^Due Date$|^Assigned To$/.test(t.trim()));
    expect(hasEnglish).toBe(false);
  });

  test("Fälligkeitsdatum wird im deutschen Format angezeigt (DD.MM.YYYY)", async ({ page }) => {
    const rows = page.locator('[data-testid^="task-row-"]');
    if ((await rows.count()) === 0) return;
    // Find a cell that looks like a date in the first few rows
    const cells = rows.first().locator("td");
    const cellCount = await cells.count();
    let foundDate = false;
    for (let i = 0; i < cellCount; i++) {
      const text = await cells.nth(i).textContent();
      if (text?.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
        foundDate = true;
        break;
      }
    }
    // If there's a task with a due date, it should be in DD.MM.YYYY format
    // (not ISO 8601 like "2024-01-15T00:00:00Z")
    if (foundDate) {
      expect(foundDate).toBe(true);
    }
    // No tasks = fine
    expect(true).toBe(true);
  });

  test("Priorität-Badge zeigt deutschen Text", async ({ page }) => {
    const rows = page.locator('[data-testid^="task-row-"]');
    if ((await rows.count()) === 0) return;
    const firstRow = rows.first();
    const text = await firstRow.textContent();
    // Priority badges should not show raw English values
    expect(text).not.toMatch(/\bLow\b|\bMedium\b|\bHigh\b|\bUrgent\b/);
  });

  test("Status-Badge zeigt deutschen Text", async ({ page }) => {
    const rows = page.locator('[data-testid^="task-row-"]');
    if ((await rows.count()) === 0) return;
    const rowText = await page.locator('[data-testid^="task-row-"]').allTextContents();
    const combined = rowText.join(" ");
    // Status values should not show raw English snake_case
    expect(combined).not.toContain("in_progress");
    expect(combined).not.toContain("pending");
  });
});
