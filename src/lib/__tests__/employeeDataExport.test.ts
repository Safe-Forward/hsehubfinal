import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportEmployeeData } from "@/lib/employeeDataExport";

// Art. 15/20 DSGVO export: a wrong filter column on any of these 11 queries
// either leaks another employee's data (wrong column matches too broadly)
// or silently produces an incomplete export (the data subject's actual
// right to a complete copy of their data). These tests pin down exactly
// which table+column each section must query.

const tableCalls: Array<{ table: string; column: string; value: string }> = [];

const mockData: Record<string, unknown> = {
  employees: { id: "emp-1", full_name: "Max Müller" },
  health_checkups: [{ id: "hc-1" }],
  training_records: [{ id: "tr-1" }],
  training_participations: [],
  course_certificates: [],
  course_lesson_progress: [],
  course_quiz_results: [],
  employee_activity_logs: [],
  notification_preferences: null,
  incidents: [{ id: "inc-1" }],
  tasks: [{ id: "task-1" }],
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: () => ({
        eq: (column: string, value: string) => {
          tableCalls.push({ table, column, value });
          if (table === "employees") {
            return { single: () => Promise.resolve({ data: mockData[table] }) };
          }
          return Promise.resolve({ data: mockData[table] });
        },
      }),
    })),
  },
}));

describe("exportEmployeeData", () => {
  let capturedBlob: Blob | null = null;

  beforeEach(() => {
    tableCalls.length = 0;
    capturedBlob = null;
    global.URL.createObjectURL = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });
    global.URL.revokeObjectURL = vi.fn();
  });

  it("queries every personal-data table scoped to the given employeeId, using the correct column per table", async () => {
    await exportEmployeeData("emp-1");

    const byTable = Object.fromEntries(tableCalls.map((c) => [c.table, c]));

    expect(byTable.employees).toEqual({ table: "employees", column: "id", value: "emp-1" });
    expect(byTable.health_checkups).toEqual({ table: "health_checkups", column: "employee_id", value: "emp-1" });
    expect(byTable.training_records).toEqual({ table: "training_records", column: "employee_id", value: "emp-1" });
    expect(byTable.training_participations).toEqual({ table: "training_participations", column: "employee_id", value: "emp-1" });
    expect(byTable.course_certificates).toEqual({ table: "course_certificates", column: "employee_id", value: "emp-1" });
    expect(byTable.course_lesson_progress).toEqual({ table: "course_lesson_progress", column: "employee_id", value: "emp-1" });
    expect(byTable.course_quiz_results).toEqual({ table: "course_quiz_results", column: "employee_id", value: "emp-1" });
    expect(byTable.employee_activity_logs).toEqual({ table: "employee_activity_logs", column: "employee_id", value: "emp-1" });
    expect(byTable.notification_preferences).toEqual({ table: "notification_preferences", column: "employee_id", value: "emp-1" });
    // Different column names by design: incidents/tasks don't use employee_id.
    expect(byTable.incidents).toEqual({ table: "incidents", column: "affected_employee_id", value: "emp-1" });
    expect(byTable.tasks).toEqual({ table: "tasks", column: "employee_profile_id", value: "emp-1" });
  });

  it("bundles every section into the downloaded JSON, defaulting null/missing sections to an empty array", async () => {
    await exportEmployeeData("emp-1");

    expect(capturedBlob).not.toBeNull();
    const text = await capturedBlob!.text();
    const payload = JSON.parse(text);

    expect(payload.legal_basis).toContain("DSGVO");
    expect(payload.employee).toEqual(mockData.employees);
    expect(payload.health_checkups).toEqual(mockData.health_checkups);
    expect(payload.incidents_affected_by).toEqual(mockData.incidents);
    expect(payload.assigned_tasks).toEqual(mockData.tasks);
    // notification_preferences resolved to null from the mock - must not crash and must not surface as null.
    expect(payload.notification_preferences).toEqual([]);
    expect(payload.training_participations).toEqual([]);
  });

  it("falls back to the raw employeeId for the filename when the employee has no full_name", async () => {
    mockData.employees = { id: "emp-2" };
    let downloadedFilename = "";
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = realCreateElement(tag);
      if (tag === "a") {
        Object.defineProperty(el, "download", {
          set(value: string) {
            downloadedFilename = value;
          },
          get() {
            return downloadedFilename;
          },
        });
      }
      return el;
    });

    await exportEmployeeData("emp-2");

    expect(downloadedFilename).toContain("emp-2");
    vi.restoreAllMocks();
  });
});
