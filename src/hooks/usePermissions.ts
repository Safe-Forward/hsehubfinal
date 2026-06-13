import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  DetailedPermissions, 
  PermissionCategory,
  DEFAULT_DETAILED_PERMISSIONS,
  ADMIN_DETAILED_PERMISSIONS 
} from "@/types/permissions";

const DEBUG_RBAC = import.meta.env.DEV;

function logRBAC(message: string, data?: unknown) {
  if (DEBUG_RBAC) {
    console.log(`[RBAC] ${message}`, data !== undefined ? data : "");
  }
}

export interface Permissions {
  dashboard: boolean;
  employees: boolean;
  healthCheckups: boolean;
  documents: boolean;
  reports: boolean;
  audits: boolean;
  settings: boolean;
  riskAssessments: boolean;
  investigations: boolean;
  incidents: boolean;
  trainings: boolean;
}

const DEFAULT_PERMISSIONS: Permissions = {
  dashboard: false,
  employees: false,
  healthCheckups: false,
  documents: false,
  reports: false,
  audits: false,
  settings: false,
  riskAssessments: false,
  investigations: false,
  incidents: false,
  trainings: false,
};

const ADMIN_PERMISSIONS: Permissions = {
  dashboard: true,
  employees: true,
  healthCheckups: true,
  documents: true,
  reports: true,
  audits: true,
  settings: true,
  riskAssessments: true,
  investigations: true,
  incidents: true,
  trainings: true,
};

const SUPER_ADMIN_PERMISSIONS: Permissions = ADMIN_PERMISSIONS;

export const ROUTE_PERMISSION_MAP: Record<string, keyof Permissions> = {
  "/dashboard": "dashboard",
  "/employees": "employees",
  "/investigations": "investigations",
  "/risk-assessments": "riskAssessments",
  "/training": "trainings",
  "/incidents": "incidents",
  "/audits": "audits",
  "/reports": "reports",
  "/settings": "settings",
  "/documents": "documents",
  "/health-checkups": "healthCheckups",
  "/activity-groups": "riskAssessments",
  "/measures": "riskAssessments",
  "/tasks": "dashboard",
  "/messages": "dashboard",
  "/profile": "dashboard",
  "/invoices": "dashboard",
};

export function usePermissions() {
  const { user, userRole, companyId, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Permissions>(DEFAULT_PERMISSIONS);
  const [detailedPermissions, setDetailedPermissions] = useState<DetailedPermissions>(DEFAULT_DETAILED_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [roleName, setRoleName] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    logRBAC("=== Permission Resolution Started ===");
    logRBAC("User ID:", user?.id);
    logRBAC("User Role (from auth):", userRole);
    logRBAC("Company ID:", companyId);

    if (!user || !companyId) {
      logRBAC("No user or companyId - denying all permissions");
      setPermissions(DEFAULT_PERMISSIONS);
      setDetailedPermissions(DEFAULT_DETAILED_PERMISSIONS);
      setLoading(false);
      return;
    }

    if (userRole === "super_admin") {
      logRBAC("Super Admin detected - granting all permissions");
      setPermissions(SUPER_ADMIN_PERMISSIONS);
      setDetailedPermissions(ADMIN_DETAILED_PERMISSIONS);
      setRoleName("Super Admin");
      setLoading(false);
      return;
    }

    if (userRole === "company_admin") {
      logRBAC("Company Admin detected - granting all permissions");
      setPermissions(ADMIN_PERMISSIONS);
      setDetailedPermissions(ADMIN_DETAILED_PERMISSIONS);
      setRoleName("Admin");
      setLoading(false);
      return;
    }

    try {
      logRBAC("Fetching role from team_members table...");
      const { data: teamMember, error: teamError } = await supabase
        .from("team_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (teamError) {
        logRBAC("Error fetching team member:", teamError);
      }

      const assignedRole = teamMember?.role || "Employee";
      logRBAC("Assigned Role:", assignedRole);
      setRoleName(assignedRole);

      logRBAC("Fetching permissions from custom_roles table for role:", assignedRole);
      const { data: roleData, error: roleError } = await supabase
        .from("custom_roles")
        .select("permissions, detailed_permissions")
        .eq("company_id", companyId)
        .eq("role_name", assignedRole)
        .maybeSingle();

      if (roleError) {
        logRBAC("Error fetching role permissions:", roleError);
      }

      logRBAC("Raw roleData from DB:", roleData);

      if (roleData?.permissions) {
        const dbPermissions = roleData.permissions as Record<string, boolean>;
        logRBAC("DB Permissions object:", dbPermissions);

        const mappedPermissions: Permissions = {
          dashboard:        dbPermissions.dashboard === true,
          employees:        dbPermissions.employees === true,
          healthCheckups:   dbPermissions.healthCheckups === true,
          documents:        dbPermissions.documents === true,
          reports:          dbPermissions.reports === true,
          audits:           dbPermissions.audits === true,
          settings:         dbPermissions.settings === true,
          riskAssessments:  dbPermissions.riskAssessments === true,
          investigations:   dbPermissions.investigations === true,
          incidents:        dbPermissions.incidents === true,
          trainings:        dbPermissions.trainings === true,
        };

        logRBAC("Final mapped permissions:", mappedPermissions);
        setPermissions(mappedPermissions);

        if (roleData.detailed_permissions) {
          const detailed = roleData.detailed_permissions as DetailedPermissions;
          logRBAC("Detailed permissions found:", detailed);
          setDetailedPermissions(detailed);
        } else {
          logRBAC("No detailed_permissions, using defaults");
          setDetailedPermissions(DEFAULT_DETAILED_PERMISSIONS);
        }
      } else {
        logRBAC("No custom_roles entry found for role:", assignedRole);
        logRBAC("DENYING ALL - no permissions configured for this role");
        setPermissions(DEFAULT_PERMISSIONS);
        setDetailedPermissions(DEFAULT_DETAILED_PERMISSIONS);
      }
    } catch (error) {
      logRBAC("Exception in fetchPermissions:", error);
      setPermissions(DEFAULT_PERMISSIONS);
      setDetailedPermissions(DEFAULT_DETAILED_PERMISSIONS);
    } finally {
      setLoading(false);
      logRBAC("=== Permission Resolution Complete ===");
    }
  }, [user, userRole, companyId]);

  useEffect(() => {
    if (!authLoading) {
      fetchPermissions();
    }
  }, [authLoading, fetchPermissions]);

  const hasPermission = useCallback(
    (permission: keyof Permissions): boolean => {
      if (userRole === "super_admin" || userRole === "company_admin") {
        return true;
      }
      const result = permissions[permission] === true;
      logRBAC(`hasPermission("${permission}") = ${result}`);
      return result;
    },
    [permissions, userRole]
  );

  const hasDetailedPermission = useCallback(
    (category: PermissionCategory, permission: string): boolean => {
      if (userRole === "super_admin" || userRole === "company_admin") {
        return true;
      }
      const categoryPerms = detailedPermissions[category];
      if (!categoryPerms) {
        logRBAC(`hasDetailedPermission: category "${category}" not found`);
        return false;
      }
      const result = (categoryPerms as unknown as Record<string, boolean>)[permission] === true;
      logRBAC(`hasDetailedPermission("${category}.${permission}") = ${result}`);
      return result;
    },
    [detailedPermissions, userRole]
  );

  const canAccessRoute = useCallback(
    (path: string): boolean => {
      if (userRole === "super_admin" || userRole === "company_admin") {
        return true;
      }
      const basePath = "/" + path.split("/")[1];
      const permissionKey = ROUTE_PERMISSION_MAP[basePath];
      if (!permissionKey) {
        logRBAC(`canAccessRoute("${path}") - no mapping found, denying`);
        return false;
      }
      const result = permissions[permissionKey] === true;
      logRBAC(`canAccessRoute("${path}") -> ${permissionKey} = ${result}`);
      return result;
    },
    [permissions, userRole]
  );

  return {
    permissions,
    detailedPermissions,
    loading: loading || authLoading,
    roleName,
    hasPermission,
    hasDetailedPermission,
    canAccessRoute,
    refreshPermissions: fetchPermissions,
  };
}
