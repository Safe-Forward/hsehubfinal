import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePermissions } from "@/hooks/usePermissions";

// This hook decides who can see/do what inside a company - a silent
// regression here is a real access-control bug (either an employee seeing
// something they shouldn't, or company_admin/super_admin getting locked
// out). These tests cover the role-bypass shortcuts and the custom_roles
// DB-lookup path without needing a live Supabase project.

let mockTeamMember: { role: string } | null = null;
let mockRoleData: { permissions?: Record<string, boolean>; detailed_permissions?: unknown } | null = null;
let mockAuth: { user: { id: string } | null; userRole: string | null; companyId: string | null; loading: boolean };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "team_members") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: mockTeamMember, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "custom_roles") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: mockRoleData, error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

describe("usePermissions", () => {
  beforeEach(() => {
    mockTeamMember = null;
    mockRoleData = null;
    mockAuth = { user: { id: "user-1" }, userRole: "employee", companyId: "company-1", loading: false };
  });

  it("denies everything when there is no user or companyId", async () => {
    mockAuth = { user: null, userRole: null, companyId: null, loading: false };

    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasPermission("employees")).toBe(false);
    expect(result.current.hasPermission("dashboard")).toBe(false);
  });

  it("super_admin bypasses hasPermission and canAccessRoute entirely, even without a custom_roles row", async () => {
    mockAuth.userRole = "super_admin";

    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasPermission("settings")).toBe(true);
    expect(result.current.canAccessRoute("/settings")).toBe(true);
    expect(result.current.hasDetailedPermission("employees", "anything")).toBe(true);
  });

  it("company_admin bypasses hasPermission and canAccessRoute entirely, even without a custom_roles row", async () => {
    mockAuth.userRole = "company_admin";

    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasPermission("trainings")).toBe(true);
    expect(result.current.canAccessRoute("/training")).toBe(true);
  });

  it("regular employee with no custom_roles entry for their role gets DENIED ALL, not a default-allow", async () => {
    mockTeamMember = { role: "Employee" };
    mockRoleData = null; // no custom_roles row at all

    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasPermission("employees")).toBe(false);
    expect(result.current.hasPermission("dashboard")).toBe(false);
  });

  it("regular employee gets exactly the permissions configured in their custom_roles row", async () => {
    mockTeamMember = { role: "Sicherheitsbeauftragter" };
    mockRoleData = {
      permissions: { dashboard: true, employees: false, incidents: true, trainings: false },
    };

    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasPermission("dashboard")).toBe(true);
    expect(result.current.hasPermission("incidents")).toBe(true);
    expect(result.current.hasPermission("employees")).toBe(false);
    expect(result.current.hasPermission("trainings")).toBe(false);
    expect(result.current.roleName).toBe("Sicherheitsbeauftragter");
  });

  it("canAccessRoute maps a sub-path like /risk-assessments/123 to its base permission key", async () => {
    mockTeamMember = { role: "Employee" };
    mockRoleData = { permissions: { riskAssessments: true } };

    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canAccessRoute("/risk-assessments/123/edit")).toBe(true);
    expect(result.current.canAccessRoute("/incidents/456")).toBe(false);
  });

  it("canAccessRoute denies unmapped paths instead of defaulting to allow", async () => {
    mockTeamMember = { role: "Employee" };
    mockRoleData = { permissions: { dashboard: true } };

    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canAccessRoute("/some-unmapped-future-route")).toBe(false);
  });

  it("hasDetailedPermission denies when the category itself is missing from detailed_permissions", async () => {
    mockTeamMember = { role: "Employee" };
    mockRoleData = {
      permissions: { employees: true },
      detailed_permissions: { documents: { view: true } },
    };

    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasDetailedPermission("documents", "view")).toBe(true);
    expect(result.current.hasDetailedPermission("employees", "edit")).toBe(false);
  });
});
