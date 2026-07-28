/**
 * E2E Write-Flow Tests — CRUD-Operationen die echte Datenbankeinträge erstellen,
 * prüfen und wieder bereinigen. Alle Tests nutzen einen eindeutigen Timestamp
 * als Marker damit parallele Läufe sich nicht gegenseitig stören.
 *
 * Strategie: UI-Pfad wenn der Create-Button sichtbar ist (Benutzer hat Permission),
 * Supabase-API-Fallback (mit User-JWT aus localStorage) wenn nicht.
 */
import { test, expect, Page } from "@playwright/test";
import { credsMissing } from "./helpers/auth";

const SUPABASE_URL = "https://mzqypusyxvyuiesuhjcw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cXlwdXN5eHZ5dWllc3VoamN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNDQ0MTcsImV4cCI6MjA5NzYyMDQxN30.BLnaiuAJ4pZoEPnAUzKOPXBi6_TGaDKTgc57UO-uWvM";
const COMPANY_ID = "b71fb71f-288f-45a4-8e83-a6866aa02eab";
const STORAGE_KEY = "sb-mzqypusyxvyuiesuhjcw-auth-token";

/** Liest den aktuellen Access-Token aus dem Browser-localStorage */
async function getUserToken(page: Page): Promise<string> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return "";
    try {
      return JSON.parse(raw).access_token ?? "";
    } catch {
      return "";
    }
  }, STORAGE_KEY);
}

/** REST-Aufruf gegen Supabase mit dem User-JWT (respektiert RLS) */
async function supabaseApi(
  page: Page,
  method: string,
  path: string,
  body?: object
): Promise<any> {
  const token = await getUserToken(page);
  const res = await page.request.fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "",
    },
    data: body ? JSON.stringify(body) : undefined,
  });
  if (method === "DELETE") return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function supabaseCreate(page: Page, table: string, record: object): Promise<string | null> {
  const rows = await supabaseApi(page, "POST", `${table}?select=id`, record);
  return Array.isArray(rows) ? (rows[0]?.id ?? null) : (rows?.id ?? null);
}

async function supabaseDelete(page: Page, table: string, id: string) {
  await supabaseApi(page, "DELETE", `${table}?id=eq.${id}`);
}

/**
 * Klickt auf einen shadcn/Radix-Popover-Calendar-Trigger und wählt den ersten
 * verfügbaren Tag.
 *
 * react-day-picker v8 rendert role="gridcell" direkt auf dem <button> und setzt
 * das native `disabled`-Attribut für gesperrte Tage. Der Selector ist daher
 * `button[name="day"]:not([disabled])`.
 */
async function pickFirstCalendarDay(page: Page, triggerLocator: ReturnType<Page["locator"]>) {
  await triggerLocator.click();
  // Warte bis mindestens ein Day-Button sichtbar ist (Popover öffnet sich im DOM-Portal)
  const dayBtn = page.locator('button[name="day"]:not([disabled])').first();
  await expect(dayBtn).toBeVisible({ timeout: 5_000 });
  await dayBtn.click();
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MITARBEITER
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Write-Flow: Mitarbeiter erstellen → prüfen → löschen", () => {
  test.skip(credsMissing, "E2E-Zugangsdaten fehlen");

  let createdId: string | null = null;
  const stamp = `E2E-${Date.now()}`;

  test.afterEach(async ({ page }) => {
    if (createdId) {
      await supabaseDelete(page, "employees", createdId);
      createdId = null;
    }
  });

  test("Mitarbeiter anlegen und in Liste finden", async ({ page }) => {
    await page.goto("/employees");
    await page.waitForLoadState("networkidle");

    const addBtn = page.getByTestId("btn-add-employee");

    if (await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // ── UI-Pfad ─────────────────────────────────────────────────────────
      await addBtn.click();
      await expect(page.getByTestId("employee-form-firstname")).toBeVisible({ timeout: 5_000 });
      // employee_number ist NOT NULL — muss ebenfalls befüllt werden
      await page.getByTestId("employee-form-number").fill(stamp);
      await page.getByTestId("employee-form-firstname").fill(`Test-${stamp}`);
      await page.getByTestId("employee-form-lastname").fill("Schreibtest");
      await page.getByTestId("employee-form-email").fill(`${stamp.toLowerCase()}@e2e.hsehub`);
      await page.getByTestId("employee-form-submit").click();
      await expect(page.getByTestId("employee-form-firstname")).not.toBeVisible({ timeout: 8_000 }).catch(() => {});
    } else {
      // ── API-Fallback ─────────────────────────────────────────────────────
      // employee_number ist NOT NULL — verwende den Stamp als eindeutige Nummer
      createdId = await supabaseCreate(page, "employees", {
        full_name: `Test-${stamp} Schreibtest`,
        employee_number: stamp,
        email: `${stamp.toLowerCase()}@e2e.hsehub`,
        company_id: COMPANY_ID,
        is_active: true,
      });
      expect(createdId, "API-Erstellung fehlgeschlagen").not.toBeNull();
      // Vollständige Navigation statt reload (setzt Realtime-Subscriptions zurück)
      await page.goto("/employees");
      await page.waitForLoadState("networkidle");
      // Warte bis die Liste gefüllt ist (erste Zeile oder Leer-Zustand)
      await page.locator('[data-testid^="employee-row-"], text=Keine Mitarbeiter').first()
        .waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
    }

    // Suche + Verifikation
    const search = page.getByTestId("search-employees");
    if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await search.fill(`Test-${stamp}`);
      await page.waitForTimeout(600);
    }

    const row = page.locator('[data-testid^="employee-row-"]').filter({ hasText: stamp });
    await expect(row).toBeVisible({ timeout: 8_000 });

    if (!createdId) {
      const rowTestId = await row.getAttribute("data-testid");
      createdId = rowTestId?.replace("employee-row-", "") ?? null;
    }
    expect(createdId).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. AUFGABE
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Write-Flow: Aufgabe erstellen → prüfen → löschen", () => {
  test.skip(credsMissing, "E2E-Zugangsdaten fehlen");

  let createdId: string | null = null;
  const stamp = `E2E-Task-${Date.now()}`;

  test.afterEach(async ({ page }) => {
    if (createdId) {
      await supabaseDelete(page, "tasks", createdId);
      createdId = null;
    }
  });

  test("Aufgabe anlegen und in Liste finden", async ({ page }) => {
    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("btn-add-task").click();
    await expect(page.getByTestId("task-form-title")).toBeVisible({ timeout: 5_000 });
    await page.getByTestId("task-form-title").fill(stamp);
    await page.getByTestId("task-form-submit").click();

    await expect(page.getByTestId("task-form-title")).not.toBeVisible({ timeout: 8_000 });

    // Suche
    const search = page.locator('input[aria-label="Aufgaben suchen"]');
    if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await search.fill(stamp);
      await page.waitForTimeout(600);
    }

    const row = page.locator('[data-testid^="task-row-"]').filter({ hasText: stamp });
    await expect(row).toBeVisible({ timeout: 8_000 });

    const rowTestId = await row.getAttribute("data-testid");
    createdId = rowTestId?.replace("task-row-", "") ?? null;
    expect(createdId).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. VORFALL (INCIDENT)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Write-Flow: Vorfall melden → prüfen → löschen", () => {
  test.skip(credsMissing, "E2E-Zugangsdaten fehlen");

  let createdId: string | null = null;
  const stamp = `E2E-Vorfall-${Date.now()}`;
  const today = new Date().toISOString().split("T")[0];

  test.afterEach(async ({ page }) => {
    if (createdId) {
      await supabaseDelete(page, "incidents", createdId);
      createdId = null;
    }
  });

  test("Vorfall anlegen und in Liste finden", async ({ page }) => {
    await page.goto("/incidents");
    await page.waitForLoadState("networkidle");

    const addBtn = page.getByTestId("btn-add-incident");

    if (await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // ── UI-Pfad ─────────────────────────────────────────────────────────
      await addBtn.click();
      await expect(page.getByTestId("incident-form-title")).toBeVisible({ timeout: 5_000 });

      // Titel
      await page.getByTestId("incident-form-title").fill(stamp);

      // Datum (Pflichtfeld) — den Popover-Trigger-Button anklicken (w-full justify-start)
      // Der Popover-Content wird via Radix-Portal außerhalb des Dialogs gerendert,
      // pickFirstCalendarDay findet den Button daher im globalen Scope.
      const dateTrigger = page.locator('[role="dialog"] button.w-full.justify-start').first();
      await pickFirstCalendarDay(page, dateTrigger);

      // incident_type + severity haben Standardwerte (near_miss / minor) — kein Klick nötig

      await page.getByTestId("incident-form-submit").click();
      await page.waitForTimeout(1_500);
    } else {
      // ── API-Fallback ─────────────────────────────────────────────────────
      createdId = await supabaseCreate(page, "incidents", {
        title: stamp,
        incident_type: "near_miss",
        severity: "minor",
        incident_date: new Date(today).toISOString(),
        company_id: COMPANY_ID,
      });
      expect(createdId, "API-Erstellung fehlgeschlagen").not.toBeNull();
      await page.reload();
      await page.waitForLoadState("networkidle");
    }

    // Suche + Verifikation
    const search = page.locator('input[aria-label="Vorfälle durchsuchen"]');
    if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await search.fill(stamp);
      await page.waitForTimeout(600);
    }

    const row = page.locator('[data-testid^="incident-row-"]').filter({ hasText: stamp });
    await expect(row).toBeVisible({ timeout: 10_000 });

    if (!createdId) {
      const rowTestId = await row.getAttribute("data-testid");
      createdId = rowTestId?.replace("incident-row-", "") ?? null;
    }
    expect(createdId).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. MASSNAHME (MEASURE)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Write-Flow: Maßnahme erstellen → prüfen → löschen", () => {
  test.skip(credsMissing, "E2E-Zugangsdaten fehlen");

  let createdId: string | null = null;
  const stamp = `E2E-Maßnahme-${Date.now()}`;

  test.afterEach(async ({ page }) => {
    if (createdId) {
      await supabaseDelete(page, "measures", createdId);
      createdId = null;
    }
  });

  test("Maßnahme anlegen und in Liste finden", async ({ page }) => {
    await page.goto("/measures");
    await page.waitForLoadState("networkidle");

    const addBtn = page.getByTestId("btn-add-measure");

    if (await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // ── UI-Pfad ─────────────────────────────────────────────────────────
      await addBtn.click();

      // Titel-Feld: id="title" (kein eindeutiger Placeholder nutzbar)
      const titleInput = page.locator('[role="dialog"] #title');
      await expect(titleInput).toBeVisible({ timeout: 5_000 });
      await titleInput.fill(stamp);

      // Submit: letzter "Speichern/Erstellen"-Button im Dialog
      const submitBtn = page
        .locator('[role="dialog"]')
        .getByRole("button", { name: /speichern|erstellen|hinzufügen/i })
        .last();
      await submitBtn.click();
      await page.waitForTimeout(1_500);
    } else {
      // ── API-Fallback ─────────────────────────────────────────────────────
      const rows = await supabaseApi(page, "POST", "measures?select=id", {
        title: stamp,
        company_id: COMPANY_ID,
        status: "open",
      });
      createdId = Array.isArray(rows) ? (rows[0]?.id ?? null) : (rows?.id ?? null);
      expect(createdId, "API-Erstellung fehlgeschlagen").not.toBeNull();
      await page.reload();
      await page.waitForLoadState("networkidle");
    }

    // Suche + Verifikation
    const search = page.locator('input[aria-label="Maßnahmen suchen"]');
    if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await search.fill(stamp);
      await page.waitForTimeout(600);
    }

    const row = page.locator("table tbody tr").filter({ hasText: stamp });
    await expect(row).toBeVisible({ timeout: 8_000 });

    if (!createdId) {
      const testId = await row.getAttribute("data-testid");
      if (testId) {
        createdId = testId.replace("measure-row-", "");
      } else {
        // ID via API ermitteln
        const found = await supabaseApi(
          page,
          "GET",
          `measures?title=eq.${encodeURIComponent(stamp)}&select=id&company_id=eq.${COMPANY_ID}`
        );
        createdId = Array.isArray(found) ? (found[0]?.id ?? null) : null;
      }
    }
    expect(createdId).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. RISIKOBEWERTUNG
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Write-Flow: Risikobewertung erstellen → prüfen → löschen", () => {
  test.skip(credsMissing, "E2E-Zugangsdaten fehlen");

  let createdId: string | null = null;
  const stamp = `E2E-GBU-${Date.now()}`;
  const today = new Date().toISOString().split("T")[0];

  test.afterEach(async ({ page }) => {
    if (createdId) {
      await supabaseDelete(page, "risk_assessments", createdId);
      createdId = null;
    }
  });

  test("Risikobewertung anlegen und in Liste finden", async ({ page }) => {
    await page.goto("/risk-assessments");
    await page.waitForLoadState("networkidle");

    const addBtn = page.getByTestId("btn-add-risk");

    if (await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // ── UI-Pfad ─────────────────────────────────────────────────────────
      await addBtn.click();

      // Titel-Feld: id="title" (kein Placeholder vorhanden)
      const titleInput = page.locator('[role="dialog"] #title');
      await expect(titleInput).toBeVisible({ timeout: 5_000 });
      await titleInput.fill(stamp);

      // Datum (Pflichtfeld) — ersten Calendar-Trigger im Dialog klicken
      const dateTrigger = page
        .locator('[role="dialog"]')
        .locator('button.w-full.justify-start')
        .first();
      await pickFirstCalendarDay(page, dateTrigger);

      // Das Formular ist 3-stufig — direkt zu Schritt 3 springen (Schritt-Indikator)
      await page.getByRole("button", { name: "Schritt 3" }).click();
      await expect(page.getByTestId("risk-form-submit")).toBeVisible({ timeout: 5_000 });

      await page.getByTestId("risk-form-submit").click();
      await page.waitForTimeout(1_500);
    } else {
      // ── API-Fallback ─────────────────────────────────────────────────────
      // risk_level ist NOT NULL in der DB
      createdId = await supabaseCreate(page, "risk_assessments", {
        title: stamp,
        assessment_date: today,
        company_id: COMPANY_ID,
        status: "draft",
        risk_level: "low",
      });
      expect(createdId, "API-Erstellung fehlgeschlagen").not.toBeNull();
      // Vollständige Navigation statt reload (setzt Realtime-Subscriptions zurück)
      await page.goto("/risk-assessments");
      await page.waitForLoadState("networkidle");
    }

    // Verifikation: Zeile in der Liste
    const row = page.locator('[data-testid^="risk-row-"]').filter({ hasText: stamp });
    await expect(row).toBeVisible({ timeout: 10_000 });

    if (!createdId) {
      const rowTestId = await row.getAttribute("data-testid");
      createdId = rowTestId?.replace("risk-row-", "") ?? null;
    }
    expect(createdId).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. AUDIT
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Write-Flow: Audit erstellen → prüfen → löschen", () => {
  test.skip(credsMissing, "E2E-Zugangsdaten fehlen");

  let createdId: string | null = null;
  const stamp = `E2E-Audit-${Date.now()}`;
  const today = new Date().toISOString().split("T")[0];

  test.afterEach(async ({ page }) => {
    if (createdId) {
      await supabaseDelete(page, "audits", createdId);
      createdId = null;
    }
  });

  test("Audit anlegen und in Liste finden", async ({ page }) => {
    await page.goto("/audits");
    await page.waitForLoadState("networkidle");

    const addBtn = page.getByTestId("btn-add-audit");

    if (await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // ── UI-Pfad ─────────────────────────────────────────────────────────
      await addBtn.click();

      // Titel (placeholder = "Audit-Titel")
      const titleInput = page.locator('[role="dialog"] input[placeholder="Audit-Titel"]');
      await expect(titleInput).toBeVisible({ timeout: 5_000 });
      await titleInput.fill(stamp);

      // ISO-Standard auswählen — warte bis Optionen geladen sind
      const isoTrigger = page.locator('[role="dialog"] [role="combobox"]').first();
      await expect(isoTrigger).toBeVisible({ timeout: 5_000 });
      await isoTrigger.click();
      const firstOption = page.locator('[role="option"]').first();
      await expect(firstOption).toBeVisible({ timeout: 5_000 });
      await firstOption.click();

      // Datum — Calendar-Trigger im Dialog
      const dateTrigger = page
        .locator('[role="dialog"]')
        .locator('button.w-full.justify-start')
        .first();
      await pickFirstCalendarDay(page, dateTrigger);
      // Calendar-Popover schließen falls noch offen (Portal blockiert Submit-Button)
      if (await page.locator('[role="grid"]').isVisible({ timeout: 500 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }

      await page.getByTestId("audit-form-submit").click();
      await page.waitForTimeout(1_500);
    } else {
      // ── API-Fallback ─────────────────────────────────────────────────────
      // Ersten verfügbaren ISO-Code der Firma laden
      const isoRows = await supabaseApi(
        page,
        "GET",
        `company_iso_standards?company_id=eq.${COMPANY_ID}&select=iso_code&limit=1`
      );
      const isoCode = Array.isArray(isoRows) ? isoRows[0]?.iso_code : null;

      if (!isoCode) {
        test.skip(true, "Keine ISO-Standards für Testfirma konfiguriert");
        return;
      }

      createdId = await supabaseCreate(page, "audits", {
        title: stamp,
        iso_code: isoCode,
        scheduled_date: today,
        company_id: COMPANY_ID,
        status: "planned",
      });
      expect(createdId, "API-Erstellung fehlgeschlagen").not.toBeNull();
      // Vollständige Navigation statt reload (setzt Realtime-Subscriptions zurück)
      await page.goto("/audits");
      await page.waitForLoadState("networkidle");
    }

    // Verifikation: Zeile in der Liste
    const row = page.locator('[data-testid^="audit-row-"]').filter({ hasText: stamp });
    await expect(row).toBeVisible({ timeout: 10_000 });

    if (!createdId) {
      const rowTestId = await row.getAttribute("data-testid");
      createdId = rowTestId?.replace("audit-row-", "") ?? null;
    }
    expect(createdId).not.toBeNull();
  });
});
