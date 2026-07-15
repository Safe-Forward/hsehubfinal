import { useEffect, useState, useCallback, useMemo, useRef, startTransition } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Download,
  Plus,
  Shield,
  ClipboardCheck,
  AlertTriangle,
  GraduationCap,
  CheckCircle,
  ListChecks,
  Stethoscope,
  Calendar,
  Eye,
  BarChart3,
  Building2,
} from "lucide-react";
import "react-grid-layout/css/styles.css";
import { Responsive as ResponsiveGrid, WidthProvider } from "react-grid-layout/legacy";

const ResponsiveGridLayout = WidthProvider(ResponsiveGrid);

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import ReportBuilder, { ReportConfig } from "@/components/reports/ReportBuilder";
import ReportLibrary from "@/components/reports/ReportLibrary";
import ReportWidget from "@/components/reports/ReportWidget";
import { OverviewSection } from "@/components/reports/sections/OverviewSection";
import { RiskAssessmentsSection } from "@/components/reports/sections/RiskAssessmentsSection";
import { AuditsSection } from "@/components/reports/sections/AuditsSection";
import { IncidentsSection } from "@/components/reports/sections/IncidentsSection";
import { TrainingsSection } from "@/components/reports/sections/TrainingsSection";
import { MeasuresSection } from "@/components/reports/sections/MeasuresSection";
import { TasksSection } from "@/components/reports/sections/TasksSection";
import { CheckupsSection } from "@/components/reports/sections/CheckupsSection";
import { AccidentKPISection } from "@/components/reports/sections/AccidentKPISection";
import {
  ReportStats,
  TrainingStatus,
  NavSection,
  getStatusColor,
  formatStatusLabel,
} from "@/components/reports/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function Reports() {
  const { user, companyId, loading } = useAuth();
  const { t } = useLanguage();
  const { hasDetailedPermission } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  const [activeSection, setActiveSection] = useState("overview");
  const [reportName, setReportName] = useState(t("reports.defaultReportNameValue"));
  const [visibility, setVisibility] = useState("only-me");
  const [dateRange, setDateRange] = useState("last-30-days");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddReportDialog, setShowAddReportDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [stats, setStats] = useState<ReportStats>({
    totalEmployees: 0,
    totalRiskAssessments: 0,
    totalAudits: 0,
    totalTasks: 0,
    totalIncidents: 0,
    totalMeasures: 0,
    totalTrainings: 0,
    totalCheckUps: 0,
    completedAudits: 0,
    completedTasks: 0,
    completedMeasures: 0,
    completedCheckUps: 0,
    openIncidents: 0,
    reportableIncidents: 0,
    trainingCompliance: 0,
  });

  const [trainingMatrix, setTrainingMatrix] = useState<TrainingStatus[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Section-specific chart breakdowns
  const [auditStatusData, setAuditStatusData] = useState<any[]>([]);
  const [riskLevelData, setRiskLevelData] = useState<any[]>([]);
  const [incidentTypeData, setIncidentTypeData] = useState<any[]>([]);
  const [measuresStatusData, setMeasuresStatusData] = useState<any[]>([]);
  const [checkUpsStatusData, setCheckUpsStatusData] = useState<any[]>([]);

  // Analytics & Report Builder State
  const [customReports, setCustomReports] = useState<ReportConfig[]>([]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null);
  const [reportToDelete, setReportToDelete] = useState<{ id: string; title: string } | null>(null);

  // Layout state for custom reports (lifted from OverviewSection)
  const CUSTOM_REPORTS_LAYOUT_KEY = "hse_custom_reports_grid_layout_v3_2col";

  // Helper to strictly recalculate layout based on report order (Latest First)
  const recalculateLayouts = (reports: ReportConfig[]) => {
    const layouts: any[] = [];
    const breakpoints = ['lg', 'md', 'sm'];
    const newLayouts: { [key: string]: any[] } = {};

    breakpoints.forEach(bp => {
      const isSmall = bp === 'sm';
      const colWidth = isSmall ? 6 : 6;

      const bpLayout = reports.map((report, index) => ({
        i: `report-${report.id}`, // Stable key
        x: isSmall ? 0 : (index % 2) * 6, // 0 or 6
        y: isSmall ? index * 2 : Math.floor(index / 2) * 2, // Fixed: 2 units per row
        w: colWidth,
        h: 2, // Fixed: 2 units height = 400px (was 4 = 800px)
        minW: 3,
        minH: 2, // Fixed: minimum 2 units (was 3)
        static: false,
      }));
      newLayouts[bp] = bpLayout;
    });

    return newLayouts;
  };

  const [customReportsLayouts, setCustomReportsLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_REPORTS_LAYOUT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // If we have saved layouts, verify they might match, but since customReports might be empty initially 
        // until useEffect loads them, this check is loose. 
        // However, we want to prioritize the "Latest First" structure.
        // For now, let's return parsed if valid, but the Effect below will enforce consistency.
        return parsed;
      }
    } catch (error) {
      console.error("Error loading custom reports layout:", error);
    }

    // Default to empty or recalculated based on initial customReports (likely empty array)
    return recalculateLayouts([]);
  });

  const handleCustomReportsLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    setCustomReportsLayouts(allLayouts);
    try {
      localStorage.setItem(CUSTOM_REPORTS_LAYOUT_KEY, JSON.stringify(allLayouts));
    } catch (error) {
      console.error("Error saving custom reports layout:", error);
    }
  }, []);

  const resetCustomLayouts = useCallback(() => {
    // Force regeneration based on current reports list
    const newLayouts = recalculateLayouts(customReports);

    // Wrap layout update in startTransition for smooth reset
    startTransition(() => {
      setCustomReportsLayouts(newLayouts);
      localStorage.setItem(CUSTOM_REPORTS_LAYOUT_KEY, JSON.stringify(newLayouts));
    });

    toast({
      title: t("reports.toast.layoutResetTitle"),
      description: t("reports.toast.customLayoutResetDesc"),
    });
  }, [customReports, toast, t]);

  // Navigation sections
  const navSections: NavSection[] = [
    { id: "overview", name: t("reports.nav.overview"), icon: <BarChart3 className="w-4 h-4" /> },
    { id: "risk-assessments", name: t("reports.nav.riskAssessments"), icon: <Shield className="w-4 h-4" /> },
    { id: "audits", name: t("reports.nav.audits"), icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: "incidents", name: t("reports.nav.incidents"), icon: <AlertTriangle className="w-4 h-4" /> },
    { id: "trainings", name: t("reports.nav.trainings"), icon: <GraduationCap className="w-4 h-4" /> },
    { id: "measures", name: t("reports.nav.measures"), icon: <CheckCircle className="w-4 h-4" /> },
    { id: "tasks", name: t("reports.nav.tasks"), icon: <ListChecks className="w-4 h-4" /> },
    { id: "checkups", name: t("reports.nav.checkups"), icon: <Stethoscope className="w-4 h-4" /> },
  ];

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (companyId) {
      loadCustomReports();
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from("departments")
      .select("id, name")
      .eq("company_id", companyId)
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching departments:", error);
          return;
        }
        setDepartments(data || []);
      });
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchReportData();
      fetchChartData();
      fetchSectionChartData();
    }
  }, [companyId, dateRange, departmentFilter]);

  // Löst die gewählte Abteilung in Mitarbeiter-IDs / GBU-IDs auf — für Tabellen
  // ohne eigene department_id-Spalte (measures, health_checkups, tasks, training).
  // Rückgabewert null bedeutet "kein Filter" (Abteilung = "all").
  const resolveDepartmentScope = useCallback(async (): Promise<{
    employeeIds: string[] | null;
    riskAssessmentIds: string[] | null;
  }> => {
    if (!companyId || departmentFilter === "all") {
      return { employeeIds: null, riskAssessmentIds: null };
    }

    // PostgREST caps unranged selects at 1000 rows - a department at a
    // large company could plausibly exceed that, so this paginates with
    // .range() instead of a single unranged select (see fetchAllPages).
    const [employeeIds, riskAssessmentIds] = await Promise.all([
      fetchAllPages<{ id: string }>((from, to) =>
        supabase
          .from("employees")
          .select("id")
          .eq("company_id", companyId)
          .eq("department_id", departmentFilter)
          .range(from, to)
      ),
      fetchAllPages<{ id: string }>((from, to) =>
        supabase
          .from("risk_assessments")
          .select("id")
          .eq("company_id", companyId)
          .eq("department_id", departmentFilter)
          .range(from, to)
      ),
    ]);

    return {
      employeeIds: employeeIds.map((e) => e.id),
      riskAssessmentIds: riskAssessmentIds.map((r) => r.id),
    };
  }, [companyId, departmentFilter]);

  const getDateRangeBounds = useCallback((range: string) => {
    const endDate = new Date();
    const startDate = new Date(endDate);

    switch (range) {
      case "last-7-days":
        startDate.setDate(endDate.getDate() - 6);
        break;
      case "last-30-days":
        startDate.setDate(endDate.getDate() - 29);
        break;
      case "last-90-days":
        startDate.setDate(endDate.getDate() - 89);
        break;
      case "this-month":
        startDate.setDate(1);
        break;
      case "last-month": {
        const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
        const lastMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0, 23, 59, 59, 999);
        return {
          startDate: lastMonth,
          endDate: lastMonthEnd,
          startIso: lastMonth.toISOString(),
          endIso: lastMonthEnd.toISOString(),
        };
      }
      case "this-year":
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate.setDate(endDate.getDate() - 29);
    }

    return {
      startDate,
      endDate,
      startIso: startDate.toISOString(),
      endIso: endDate.toISOString(),
    };
  }, []);

  // Load custom reports from localStorage
  const loadCustomReports = async () => {
    try {
      const saved = localStorage.getItem('hse_custom_reports');
      if (saved) {
        const loadedReports: ReportConfig[] = JSON.parse(saved);

        // Refresh data for all custom reports from the database
        const refreshedReports = await Promise.all(
          loadedReports.map(async (report) => {
            try {
              const freshData = await fetchTemplateData(report);
              return { ...report, data: freshData };
            } catch (err) {
              console.error(`Error refreshing data for report "${report.title}":`, err);
              return report; // Keep existing data on error
            }
          })
        );

        setCustomReports(refreshedReports);
        // Save refreshed data back to localStorage
        localStorage.setItem('hse_custom_reports', JSON.stringify(refreshedReports));

        // After loading reports, ensure layouts are synced
        const savedLayouts = localStorage.getItem(CUSTOM_REPORTS_LAYOUT_KEY);
        if (!savedLayouts || !JSON.parse(savedLayouts).lg || JSON.parse(savedLayouts).lg.length !== refreshedReports.length) {
          setCustomReportsLayouts(recalculateLayouts(refreshedReports));
        } else {
          setCustomReportsLayouts(JSON.parse(savedLayouts));
        }
      }
    } catch (error) {
      console.error('Error loading custom reports:', error);
    }
  };

  useEffect(() => {
    if (!companyId || customReports.length === 0) return;

    const refreshCustomReports = async () => {
      try {
        const { startIso, endIso } = getDateRangeBounds(dateRange);
        const refreshedReports = await Promise.all(
          customReports.map(async (report) => {
            const data = await fetchTemplateData({
              ...report,
              dateRange: {
                type: "custom",
                startDate: startIso,
                endDate: endIso,
              },
            });
            return { ...report, data };
          })
        );

        setCustomReports(refreshedReports);
        localStorage.setItem("hse_custom_reports", JSON.stringify(refreshedReports));
      } catch (error) {
        console.error("Error refreshing custom reports for date range:", error);
      }
    };

    refreshCustomReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, dateRange, getDateRangeBounds]);

  // Save custom reports to localStorage
  const saveCustomReports = async (reports: ReportConfig[]) => {
    try {
      localStorage.setItem('hse_custom_reports', JSON.stringify(reports));
      setCustomReports(reports);

      // Log action (using direct RPC like login)
      try {
        await supabase.rpc("create_audit_log", {
          p_action_type: "update_custom_reports",
          p_target_type: "reports",
          p_target_id: null,
          p_target_name: "Custom Reports Configuration",
          p_details: { count: reports.length, target_ref: "custom_reports" },
          p_company_id: companyId,
        });
        console.log("✅ Custom reports update log created, count:", reports.length);
      } catch (auditLogErr) {
        console.error("❌ Failed to create reports log:", auditLogErr);
      }
    } catch (error) {
      console.error('Error saving custom reports:', error);
    }
  };

  const fetchReportData = async () => {
    if (!companyId) return;

    try {
      const { startIso, endIso } = getDateRangeBounds(dateRange);
      const inRange = (query: any, column: string) =>
        query.gte(column, startIso).lte(column, endIso);

      const { employeeIds, riskAssessmentIds } = await resolveDepartmentScope();
      const deptActive = departmentFilter !== "all";
      // Leere Auswahl darf nicht ".in([])" werden (matched sonst alles) → Sentinel-ID die nie existiert
      const empScope = employeeIds && employeeIds.length > 0 ? employeeIds : ["00000000-0000-0000-0000-000000000000"];
      const riskScope = riskAssessmentIds && riskAssessmentIds.length > 0 ? riskAssessmentIds : ["00000000-0000-0000-0000-000000000000"];
      const withDept = (query: any) => (deptActive ? query.eq("department_id", departmentFilter) : query);
      const withEmpScope = (query: any, column: string) => (deptActive ? query.in(column, empScope) : query);
      const withRiskScope = (query: any) => (deptActive ? query.in("risk_assessment_id", riskScope) : query);

      // Fetch counts from all HSE modules:
      // - Measures: Corrective/preventive actions from risks, audits, and incidents
      // - Audits: Compliance checks and inspections (ISO standards)
      // - Health Check-ups: Employee medical examinations (G-Investigations)
      const [
        employeesRes,
        risksRes,
        auditsRes,
        tasksRes,
        incidentsRes,
        measuresRes,
        riskMeasuresRes,
        trainingsRes,
        checkUpsRes,
        completedAuditsRes,
        completedTasksRes,
        completedMeasuresRes,
        completedRiskMeasuresRes,
        completedCheckUpsRes,
        openIncidentsRes,
        reportableIncidentsRes,
      ] = await Promise.all([
        withDept(
          supabase
            .from("employees")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("created_at", startIso)
            .lte("created_at", endIso)
        ),
        withDept(
          supabase
            .from("risk_assessments")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("assessment_date", startIso)
            .lte("assessment_date", endIso)
        ),
        withDept(
          supabase
            .from("audits")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("created_at", startIso)
            .lte("created_at", endIso)
        ),
        withEmpScope(
          supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("created_at", startIso)
            .lte("created_at", endIso),
          "employee_profile_id"
        ),
        withDept(
          supabase
            .from("incidents" as any)
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("incident_date", startIso)
            .lte("incident_date", endIso)
        ),
        withEmpScope(
          supabase
            .from("measures" as any)
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("created_at", startIso)
            .lte("created_at", endIso),
          "responsible_person_id"
        ),
        withRiskScope(
          supabase
            .from("risk_assessment_measures")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("created_at", startIso)
            .lte("created_at", endIso)
        ),
        supabase
          .from("courses")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .gte("created_at", startIso)
          .lte("created_at", endIso),
        withEmpScope(
          supabase
            .from("health_checkups")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("created_at", startIso)
            .lte("created_at", endIso),
          "employee_id"
        ),
        inRange(
          withDept(
            supabase
              .from("audits")
              .select("id", { count: "exact", head: true })
              .eq("company_id", companyId)
              .eq("status", "completed")
          ),
          "created_at"
        ),
        inRange(
          withEmpScope(
            supabase
              .from("tasks")
              .select("id", { count: "exact", head: true })
              .eq("company_id", companyId)
              .eq("status", "completed"),
            "employee_profile_id"
          ),
          "created_at"
        ),
        inRange(
          withEmpScope(
            supabase
              .from("measures" as any)
              .select("id", { count: "exact", head: true })
              .eq("company_id", companyId)
              .eq("status", "completed"),
            "responsible_person_id"
          ),
          "created_at"
        ),
        inRange(
          withRiskScope(
            supabase
              .from("risk_assessment_measures")
              .select("id", { count: "exact", head: true })
              .eq("company_id", companyId)
              .eq("progress_status", "completed")
          ),
          "created_at"
        ),
        inRange(
          withEmpScope(
            supabase
              .from("health_checkups")
              .select("id", { count: "exact", head: true })
              .eq("company_id", companyId)
              .eq("status", "done"),
            "employee_id"
          ),
          "created_at"
        ),
        inRange(
          withDept(
            supabase
              .from("incidents" as any)
              .select("id", { count: "exact", head: true })
              .eq("company_id", companyId)
              .eq("investigation_status", "open")
          ),
          "incident_date"
        ),
        inRange(
          withDept(
            supabase
              .from("incidents" as any)
              .select("id", { count: "exact", head: true })
              .eq("company_id", companyId)
              .eq("is_reportable", true)
          ),
          "incident_date"
        ),
      ]);

      setStats({
        totalEmployees: employeesRes.count || 0,
        totalRiskAssessments: risksRes.count || 0,
        totalAudits: auditsRes.count || 0,
        totalTasks: tasksRes.count || 0,
        totalIncidents: incidentsRes.count || 0,
        totalMeasures: (measuresRes.count || 0) + (riskMeasuresRes.count || 0),
        totalTrainings: trainingsRes.count || 0,
        totalCheckUps: checkUpsRes.count || 0,
        completedAudits: completedAuditsRes.count || 0,
        completedTasks: completedTasksRes.count || 0,
        completedMeasures: (completedMeasuresRes.count || 0) + (completedRiskMeasuresRes.count || 0),
        completedCheckUps: completedCheckUpsRes.count || 0,
        openIncidents: openIncidentsRes.count || 0,
        reportableIncidents: reportableIncidentsRes.count || 0,
        trainingCompliance: 0,
      });

      const trainingMatrixData = await fetchTrainingMatrix(startIso, endIso, employeeIds);
      const totalRequired = trainingMatrixData.reduce((sum, t) => sum + t.total_required, 0);
      const totalCompleted = trainingMatrixData.reduce((sum, t) => sum + t.completed, 0);
      const aggregateCompliance = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0;
      setStats((prev) => ({ ...prev, trainingCompliance: aggregateCompliance }));
    } catch (error: any) {
      console.error("Error fetching report data:", error);
      toast({
        title: t("reports.toast.errorTitle"),
        description: error.message || t("reports.toast.reportDataLoadError"),
        variant: "destructive",
      });
    }
  };

  // PostgREST caps unranged selects at 1000 rows - this loops a query
  // builder factory with .range() until a page comes back short, otherwise
  // the training matrix would silently use only the first 1000 employees/
  // assignments/participations for companies above that volume.
  const fetchAllPages = async <T,>(
    buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
  ): Promise<T[]> => {
    const PAGE_SIZE = 1000;
    const allRows: T[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      allRows.push(...(data || []));
      if (!data || data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    return allRows;
  };

  const fetchTrainingMatrix = async (startIso: string, endIso: string, deptEmployeeIds: string[] | null = null) => {
    if (!companyId) return [];

    try {
      // Echte Trainingsdaten: course_employee_access (Zuweisung) + training_participations
      // (Status) + courses (Wiederholungsintervall). Vier Queries statt einer pro Mitarbeiter.
      const [employeesData, accessData, coursesRes, participationsData] = await Promise.all([
        fetchAllPages<{ id: string; full_name: string }>((from, to) => {
          let q = supabase
            .from("employees")
            .select("id, full_name")
            .eq("company_id", companyId)
            .eq("is_active", true);
          if (deptEmployeeIds !== null) {
            q = q.in(
              "id",
              deptEmployeeIds.length > 0 ? deptEmployeeIds : ["00000000-0000-0000-0000-000000000000"]
            );
          }
          return q.range(from, to);
        }),
        fetchAllPages<{ employee_id: string; course_id: string; created_at: string }>((from, to) =>
          supabase
            .from("course_employee_access")
            .select("employee_id, course_id, created_at")
            .eq("company_id", companyId)
            .gte("created_at", startIso)
            .lte("created_at", endIso)
            .range(from, to)
        ),
        supabase
          .from("courses")
          .select("id, renewal_months")
          .eq("company_id", companyId),
        fetchAllPages<{ employee_id: string; course_id: string; status: string; completion_date: string | null }>(
          (from, to) =>
            supabase
              .from("training_participations")
              .select("employee_id, course_id, status, completion_date")
              .eq("company_id", companyId)
              .range(from, to)
        ),
      ]);

      if (coursesRes.error) throw coursesRes.error;

      const renewalByCourse = new Map<string, number | null>(
        (coursesRes.data || []).map((c: any) => [c.id, c.renewal_months])
      );

      const participationByKey = new Map<string, { status: string; completion_date: string | null }>();
      participationsData.forEach((p) => {
        participationByKey.set(`${p.employee_id}|${p.course_id}`, {
          status: p.status,
          completion_date: p.completion_date,
        });
      });

      const courseIdsByEmployee = new Map<string, string[]>();
      accessData.forEach((a) => {
        const list = courseIdsByEmployee.get(a.employee_id) || [];
        list.push(a.course_id);
        courseIdsByEmployee.set(a.employee_id, list);
      });

      const now = new Date();
      const matrix: TrainingStatus[] = employeesData.map((emp) => {
        const courseIds = courseIdsByEmployee.get(emp.id) || [];
        let completed = 0;
        let expired = 0;

        courseIds.forEach((courseId) => {
          const participation = participationByKey.get(`${emp.id}|${courseId}`);
          if (participation?.status !== "completed") return;

          const renewalMonths = renewalByCourse.get(courseId);
          if (renewalMonths && participation.completion_date) {
            const expiryDate = new Date(participation.completion_date);
            expiryDate.setMonth(expiryDate.getMonth() + renewalMonths);
            if (expiryDate < now) {
              expired++;
              return;
            }
          }
          completed++;
        });

        const total = courseIds.length;
        const compliance = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          employee_name: emp.full_name,
          total_required: total,
          completed,
          expired,
          compliance_rate: compliance,
        };
      });

      setTrainingMatrix(matrix);
      return matrix;
    } catch (error: any) {
      console.error("Error fetching training matrix:", error);
      return [];
    }
  };

  const fetchChartData = async () => {
    if (!companyId) return;

    try {
      const { startDate, endDate } = getDateRangeBounds(dateRange);
      const msPerDay = 24 * 60 * 60 * 1000;
      const totalDays = Math.max(
        1,
        Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay)
      );

      const buckets: { label: string; startDate: Date; endDate: Date }[] = [];
      const useDailyBuckets = totalDays <= 45;

      if (useDailyBuckets) {
        const cursor = new Date(startDate);
        cursor.setHours(0, 0, 0, 0);

        while (cursor <= endDate) {
          const bucketStart = new Date(cursor);
          const bucketEnd = new Date(cursor);
          bucketEnd.setHours(23, 59, 59, 999);
          buckets.push({
            label: bucketStart.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            startDate: bucketStart,
            endDate: bucketEnd,
          });
          cursor.setDate(cursor.getDate() + 1);
        }
      } else {
        const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

        while (cursor <= endMonth) {
          const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
          const monthEnd = new Date(
            cursor.getFullYear(),
            cursor.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
          );
          buckets.push({
            label: monthStart.toLocaleDateString("en-US", { month: "short" }),
            startDate: monthStart,
            endDate: monthEnd,
          });
          cursor.setMonth(cursor.getMonth() + 1);
        }
      }

      const { employeeIds } = await resolveDepartmentScope();
      const deptActive = departmentFilter !== "all";
      const empScope = employeeIds && employeeIds.length > 0 ? employeeIds : ["00000000-0000-0000-0000-000000000000"];

      const chartDataPromises = buckets.map(async (bucket) => {
        let incidentsQuery = supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .gte("incident_date", bucket.startDate.toISOString())
          .lte("incident_date", bucket.endDate.toISOString());
        if (deptActive) incidentsQuery = incidentsQuery.eq("department_id", departmentFilter);

        let trainingsQuery = supabase
          .from("course_employee_access")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .gte("created_at", bucket.startDate.toISOString())
          .lte("created_at", bucket.endDate.toISOString());
        if (deptActive) trainingsQuery = trainingsQuery.in("employee_id", empScope);

        let tasksQuery = supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .gte("created_at", bucket.startDate.toISOString())
          .lte("created_at", bucket.endDate.toISOString());
        if (deptActive) tasksQuery = tasksQuery.in("employee_profile_id", empScope);

        const [incidentsRes, trainingsRes, tasksRes] = await Promise.all([
          incidentsQuery,
          trainingsQuery,
          tasksQuery,
        ]);

        return {
          month: bucket.label,
          incidents: incidentsRes.count || 0,
          trainings: trainingsRes.count || 0,
          tasks: tasksRes.count || 0,
        };
      });

      const data = await Promise.all(chartDataPromises);
      setChartData(data);
    } catch (error) {
      console.error("Error fetching chart data:", error);
      // Fallback to empty data on error
      setChartData([]);
    }
  };

  const fetchSectionChartData = async () => {
    if (!companyId) return;
    const { startIso, endIso } = getDateRangeBounds(dateRange);

    try {
      const { employeeIds, riskAssessmentIds } = await resolveDepartmentScope();
      const deptActive = departmentFilter !== "all";
      const empScope = employeeIds && employeeIds.length > 0 ? employeeIds : ["00000000-0000-0000-0000-000000000000"];
      const riskScope = riskAssessmentIds && riskAssessmentIds.length > 0 ? riskAssessmentIds : ["00000000-0000-0000-0000-000000000000"];
      const withDept = (query: any) => (deptActive ? query.eq("department_id", departmentFilter) : query);
      const withEmpScope = (query: any, column: string) => (deptActive ? query.in(column, empScope) : query);
      const withRiskScope = (query: any) => (deptActive ? query.in("risk_assessment_id", riskScope) : query);

      // Audit status distribution
      const { data: auditData } = await withDept(
        supabase
          .from("audits")
          .select("status")
          .eq("company_id", companyId)
          .gte("created_at", startIso)
          .lte("created_at", endIso)
      );

      const auditGrouped: Record<string, number> = {};
      (auditData || []).forEach((a: any) => {
        const key = a.status || "unknown";
        auditGrouped[key] = (auditGrouped[key] || 0) + 1;
      });
      setAuditStatusData(Object.entries(auditGrouped).map(([name, value]) => ({ name, value })));

      // Risk level distribution
      const { data: riskData } = await withDept(
        supabase
          .from("risk_assessments")
          .select("risk_level")
          .eq("company_id", companyId)
          .gte("assessment_date", startIso)
          .lte("assessment_date", endIso)
      );

      const riskGrouped: Record<string, number> = {};
      (riskData || []).forEach((r: any) => {
        const key = r.risk_level || "unknown";
        riskGrouped[key] = (riskGrouped[key] || 0) + 1;
      });
      setRiskLevelData(Object.entries(riskGrouped).map(([name, value]) => ({ name, value })));

      // Incident type distribution
      const { data: incidentData } = await withDept(
        supabase
          .from("incidents")
          .select("incident_type")
          .eq("company_id", companyId)
          .gte("incident_date", startIso)
          .lte("incident_date", endIso)
      );

      const incidentGrouped: Record<string, number> = {};
      (incidentData || []).forEach((i: any) => {
        const key = i.incident_type || "unknown";
        incidentGrouped[key] = (incidentGrouped[key] || 0) + 1;
      });
      setIncidentTypeData(Object.entries(incidentGrouped).map(([name, value]) => ({ name, value })));

      // Measures status distribution (combine both tables)
      const [measuresRes, riskMeasuresRes] = await Promise.all([
        withEmpScope(
          supabase
            .from("measures" as any)
            .select("status")
            .eq("company_id", companyId)
            .gte("created_at", startIso)
            .lte("created_at", endIso),
          "responsible_person_id"
        ),
        withRiskScope(
          supabase
            .from("risk_assessment_measures")
            .select("progress_status")
            .eq("company_id", companyId)
            .gte("created_at", startIso)
            .lte("created_at", endIso)
        ),
      ]);

      const measuresGrouped: Record<string, number> = {};
      (measuresRes.data || []).forEach((m: any) => {
        const key = m.status || "unknown";
        measuresGrouped[key] = (measuresGrouped[key] || 0) + 1;
      });
      (riskMeasuresRes.data || []).forEach((m: any) => {
        let key = m.progress_status || "unknown";
        if (key === "not_started") key = "planned";
        if (key === "blocked") key = "cancelled";
        measuresGrouped[key] = (measuresGrouped[key] || 0) + 1;
      });
      setMeasuresStatusData(Object.entries(measuresGrouped).map(([name, value]) => ({ name, value })));

      // Health check-up status distribution
      const { data: checkUpData } = await withEmpScope(
        supabase
          .from("health_checkups")
          .select("status")
          .eq("company_id", companyId)
          .gte("created_at", startIso)
          .lte("created_at", endIso),
        "employee_id"
      );

      const checkUpGrouped: Record<string, number> = {};
      (checkUpData || []).forEach((c: any) => {
        const key = c.status || "unknown";
        checkUpGrouped[key] = (checkUpGrouped[key] || 0) + 1;
      });
      setCheckUpsStatusData(Object.entries(checkUpGrouped).map(([name, value]) => ({ name, value })));
    } catch (error) {
      console.error("Error fetching section chart data:", error);
    }
  };

  const exportReport = () => {
    // Check permission before allowing export
    if (!hasDetailedPermission('reports', 'export_data')) {
      toast({
        title: t("reports.toast.permissionDeniedTitle"),
        description: t("reports.toast.permissionDeniedExport"),
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    // ── Header bar ──────────────────────────────────────────────
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(t("reports.pdf.title"), 14, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(t("reports.pdf.generated").replace("{date}", dateStr).replace("{time}", timeStr), 14, 17);
    doc.text(t("reports.pdf.dateRange").replace("{range}", dateRange.replace(/-/g, " ")), pageW - 14, 17, { align: "right" });

    // ── Report title ────────────────────────────────────────────
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(reportName || t("reports.pdf.defaultReportName"), 14, 34);

    // Section label
    const sectionLabel = navSections.find(s => s.id === activeSection)?.name || activeSection;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(t("reports.pdf.section").replace("{section}", sectionLabel), 14, 41);

    let cursorY = 50;

    // ── Helper: section heading ──────────────────────────────────
    const sectionHeading = (title: string) => {
      doc.setFillColor(243, 244, 246);
      doc.rect(14, cursorY, pageW - 28, 8, "F");
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(title, 16, cursorY + 5.5);
      cursorY += 12;
    };

    // ── Build content based on active section ───────────────────
    if (activeSection === "overview") {
      sectionHeading(t("reports.pdf.kpi.title"));
      autoTable(doc, {
        startY: cursorY,
        head: [[t("reports.pdf.metric"), t("reports.pdf.value")]],
        body: [
          [t("reports.pdf.kpi.totalEmployees"), stats.totalEmployees],
          [t("reports.pdf.kpi.riskAssessments"), stats.totalRiskAssessments],
          [t("reports.pdf.kpi.safetyAudits"), stats.totalAudits],
          [t("reports.pdf.kpi.completedAudits"), stats.completedAudits],
          [t("reports.pdf.kpi.incidents"), stats.totalIncidents],
          [t("reports.pdf.kpi.openIncidents"), stats.openIncidents],
          [t("reports.pdf.kpi.closedIncidents"), stats.totalIncidents - stats.openIncidents],
          [t("reports.pdf.kpi.trainingCourses"), stats.totalTrainings],
          [t("reports.pdf.kpi.trainingCompliance"), `${stats.trainingCompliance}%`],
          [t("reports.pdf.kpi.measures"), stats.totalMeasures],
          [t("reports.pdf.kpi.completedMeasures"), stats.completedMeasures],
          [t("reports.pdf.kpi.inProgressMeasures"), stats.totalMeasures - stats.completedMeasures],
          [t("reports.pdf.kpi.tasks"), stats.totalTasks],
          [t("reports.pdf.kpi.completedTasks"), stats.completedTasks],
          [t("reports.pdf.kpi.healthCheckups"), stats.totalCheckUps],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 }, 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 10;

      if (chartData && chartData.length > 0) {
        sectionHeading(t("reports.pdf.monthlyIncidentTrend"));
        autoTable(doc, {
          startY: cursorY,
          head: [[t("reports.pdf.month"), t("reports.pdf.incidentsColumn")]],
          body: chartData.map((d: any) => [d.month || d.name || "", d.incidents ?? d.value ?? 0]),
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          margin: { left: 14, right: 14 },
        });
        cursorY = (doc as any).lastAutoTable.finalY + 10;
      }
    } else if (activeSection === "risk-assessments") {
      sectionHeading(t("reports.pdf.riskAssessmentsSummary"));
      autoTable(doc, {
        startY: cursorY,
        head: [[t("reports.pdf.metric"), t("reports.pdf.value")]],
        body: [
          [t("reports.pdf.totalRiskAssessments"), stats.totalRiskAssessments],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 }, 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 10;
    } else if (activeSection === "audits") {
      sectionHeading(t("reports.pdf.auditsSummary"));
      const pending = stats.totalAudits - stats.completedAudits;
      const completionRate = stats.totalAudits > 0 ? Math.round((stats.completedAudits / stats.totalAudits) * 100) : 0;
      autoTable(doc, {
        startY: cursorY,
        head: [[t("reports.pdf.metric"), t("reports.pdf.value")]],
        body: [
          [t("reports.pdf.totalAudits"), stats.totalAudits],
          [t("reports.pdf.completed"), stats.completedAudits],
          [t("reports.pdf.pendingInProgress"), pending],
          [t("reports.pdf.completionRate"), `${completionRate}%`],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 }, 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 10;
    } else if (activeSection === "incidents") {
      sectionHeading(t("reports.pdf.incidentsSummary"));
      autoTable(doc, {
        startY: cursorY,
        head: [[t("reports.pdf.metric"), t("reports.pdf.value")]],
        body: [
          [t("reports.pdf.totalIncidents"), stats.totalIncidents],
          [t("reports.pdf.openUnderInvestigation"), stats.openIncidents],
          [t("reports.pdf.closedResolved"), stats.totalIncidents - stats.openIncidents],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 }, 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 10;
    } else if (activeSection === "trainings") {
      sectionHeading(t("reports.pdf.trainingSummary"));
      autoTable(doc, {
        startY: cursorY,
        head: [[t("reports.pdf.metric"), t("reports.pdf.value")]],
        body: [
          [t("reports.pdf.totalTrainingCourses"), stats.totalTrainings],
          [t("reports.pdf.overallComplianceRate"), `${stats.trainingCompliance}%`],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 }, 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 10;

      if (trainingMatrix && trainingMatrix.length > 0) {
        sectionHeading(t("reports.pdf.employeeTrainingMatrix"));
        autoTable(doc, {
          startY: cursorY,
          head: [[t("reports.pdf.employee"), t("reports.pdf.required"), t("reports.pdf.completed"), t("reports.pdf.expired"), t("reports.pdf.compliance"), t("reports.pdf.status")]],
          body: trainingMatrix.map(item => [
            item.employee_name,
            item.total_required,
            item.completed,
            item.expired,
            `${item.compliance_rate}%`,
            item.compliance_rate >= 80 ? t("reports.pdf.compliant") : item.compliance_rate >= 50 ? t("reports.pdf.needsAttention") : t("reports.pdf.nonCompliant"),
          ]),
          styles: { fontSize: 8, cellPadding: 2.5 },
          headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          columnStyles: {
            0: { cellWidth: 50 },
            5: { fontStyle: "bold" },
          },
          didDrawCell: (data: any) => {
            if (data.column.index === 5 && data.section === "body") {
              const val = String(data.cell.raw);
              if (val === t("reports.pdf.compliant")) doc.setTextColor(22, 163, 74);
              else if (val === t("reports.pdf.needsAttention")) doc.setTextColor(202, 138, 4);
              else doc.setTextColor(220, 38, 38);
            }
          },
          margin: { left: 14, right: 14 },
        });
        cursorY = (doc as any).lastAutoTable.finalY + 10;
      }
    } else if (activeSection === "measures") {
      sectionHeading(t("reports.pdf.measuresSummary"));
      const completionRate = stats.totalMeasures > 0 ? Math.round((stats.completedMeasures / stats.totalMeasures) * 100) : 0;
      autoTable(doc, {
        startY: cursorY,
        head: [[t("reports.pdf.metric"), t("reports.pdf.value")]],
        body: [
          [t("reports.pdf.totalMeasures"), stats.totalMeasures],
          [t("reports.pdf.completed"), stats.completedMeasures],
          [t("reports.pdf.inProgress"), stats.totalMeasures - stats.completedMeasures],
          [t("reports.pdf.completionRate"), `${completionRate}%`],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 }, 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 10;
    } else if (activeSection === "tasks") {
      sectionHeading(t("reports.pdf.tasksSummary"));
      const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
      autoTable(doc, {
        startY: cursorY,
        head: [[t("reports.pdf.metric"), t("reports.pdf.value")]],
        body: [
          [t("reports.pdf.totalTasks"), stats.totalTasks],
          [t("reports.pdf.completed"), stats.completedTasks],
          [t("reports.pdf.pending"), stats.totalTasks - stats.completedTasks],
          [t("reports.pdf.completionRate"), `${completionRate}%`],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 }, 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 10;
    } else if (activeSection === "checkups") {
      sectionHeading(t("reports.pdf.checkupsSummary"));
      autoTable(doc, {
        startY: cursorY,
        head: [[t("reports.pdf.metric"), t("reports.pdf.value")]],
        body: [
          [t("reports.pdf.totalCheckups"), stats.totalCheckUps],
          [t("reports.pdf.completed"), stats.completedCheckUps],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 }, 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 10;
    }

    // ── Footer on every page ─────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "normal");
      doc.text(t("reports.pdf.footerPage").replace("{current}", String(i)).replace("{total}", String(totalPages)), pageW / 2, doc.internal.pageSize.getHeight() - 6, { align: "center" });
      doc.text(t("reports.pdf.footerConfidential"), 14, doc.internal.pageSize.getHeight() - 6);
      doc.text(dateStr, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: "right" });
    }

    // ── Save ─────────────────────────────────────────────────────
    const fileName = `${(reportName || "safety-report").toLowerCase().replace(/\s+/g, "-")}_${sectionLabel.toLowerCase().replace(/\s+/g, "-")}_${now.toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

    toast({
      title: `✅ ${t("reports.toast.pdfExportedTitle")}`,
      description: t("reports.toast.pdfExportedDesc").replace("{name}", reportName).replace("{fileName}", fileName),
    });

    logAction({
      action: "export_report",
      targetType: "report",
      targetId: activeSection,
      targetName: reportName,
      details: { section: activeSection, dateRange, fileName },
    });
  };

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    toast({
      title: t("reports.toast.dateRangeUpdatedTitle"),
      description: t("reports.toast.dateRangeUpdatedDesc").replace("{range}", range.replace("-", " ")),
    });
  };

  const calculateDateRange = (range: any) => {
    const endDate = new Date();
    let startDate = new Date();

    switch (range?.type) {
      case "custom":
        return {
          startDate: range?.startDate || startDate.toISOString(),
          endDate: range?.endDate || endDate.toISOString(),
        };
      case "last_7_days":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "last_30_days":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "last_90_days":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "last_year":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case "all_time":
        startDate.setFullYear(endDate.getFullYear() - 10); // 10 years back
        break;
      default:
        // Default to all time to ensure data is captured
        startDate.setFullYear(endDate.getFullYear() - 10);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  const fetchTemplateData = async (template: Partial<ReportConfig>) => {
    if (!companyId) return [];

    const { metric, groupBy, dateRange } = template;
    const { startDate, endDate } = calculateDateRange(dateRange);
    const applyRange = (query: any, column: string) =>
      query.gte(column, startDate).lte(column, endDate);

    try {
      // Special handling for employees with department/location joins
      if (metric === "employees") {
        if (groupBy === "department") {
          const { data, error } = await supabase
            .from("employees")
            .select("department_id, departments(name)")
            .eq("company_id", companyId)
            .gte("created_at", startDate)
            .lte("created_at", endDate);

          if (error) {
            console.error("Error fetching employee data:", error);
            return [];
          }

          const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
            const deptName = item.departments?.name || t("reports.fallback.unassigned");
            acc[deptName] = (acc[deptName] || 0) + 1;
            return acc;
          }, {});

          return Object.entries(grouped).map(([name, value]) => ({ name, value }));
        } else if (groupBy === "location") {
          // Employees don't have location field - return empty
          console.warn("Employees table does not have a location field");
          return [{ name: t("reports.fallback.noLocationData"), value: 0 }];
        } else if (groupBy === "created_at") {
          const { data, error } = await supabase
            .from("employees")
            .select("created_at")
            .eq("company_id", companyId)
            .gte("created_at", startDate)
            .lte("created_at", endDate);

          if (error) {
            console.error("Error fetching employee time data:", error);
            return [];
          }

          const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
            if (!item.created_at) return acc;
            const date = new Date(item.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            acc[monthKey] = (acc[monthKey] || 0) + 1;
            return acc;
          }, {});

          return Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, value]) => ({ name, value }));
        } else if (groupBy === "tag") {
          // Tags are stored as a string[] column on the employees table
          const { data, error } = await supabase
            .from("employees")
            .select("tags")
            .eq("company_id", companyId)
            .gte("created_at", startDate)
            .lte("created_at", endDate);

          if (error) {
            console.error("Error fetching employee tags:", error);
            return [];
          }

          // Each employee can have multiple tags — count per tag
          const tagCounts: Record<string, number> = {};
          (data || []).forEach((item: any) => {
            const tags: string[] = Array.isArray(item.tags) ? item.tags : [];
            if (tags.length === 0) {
              const key = t("reports.fallback.noTag") || "Kein Tag";
              tagCounts[key] = (tagCounts[key] || 0) + 1;
            } else {
              tags.forEach((tag) => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
              });
            }
          });

          return Object.entries(tagCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([name, value]) => ({ name, value }));
        }
      }

      // Special handling for Risks
      if (metric === "risks") {
        if (groupBy === "department") {
          const { data, error } = await supabase
            .from("risk_assessments")
            .select("department_id, departments(name)")
            .eq("company_id", companyId)
            .gte("assessment_date", startDate)
            .lte("assessment_date", endDate);

          if (error) {
            console.error("Error fetching risks by department:", error);
            return [];
          }
          const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
            const name = item.departments?.name || t("reports.fallback.unassigned");
            acc[name] = (acc[name] || 0) + 1;
            return acc;
            }, {});
          return Object.entries(grouped).map(([name, value]) => ({ name, value }));
        } else {
          // risk_level or approval_status
          const column = groupBy || "risk_level";
          const { data, error } = await supabase
            .from("risk_assessments")
            .select(column)
            .eq("company_id", companyId)
            .gte("assessment_date", startDate)
            .lte("assessment_date", endDate);

          if (error) {
            console.error("Error fetching risks:", error);
            return [];
          }
          const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
            const key = item[column] || t("reports.fallback.unknown");
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});
          return Object.entries(grouped).map(([name, value]) => ({ name, value }));
        }
      }

      // Special handling for Measures
      if (metric === "measures") {
        if (groupBy === "department") {
          // Query BOTH measures tables and combine by department
          const promises = [];

          // Main measures table
          promises.push(
            supabase
              .from("measures" as any)
              .select(`
                responsible_person_id,
                responsible_person:employees!responsible_person_id(
                  departments(name)
                )
              `)
              .eq("company_id", companyId)
              .gte("created_at", startDate)
              .lte("created_at", endDate)
          );

          // Risk assessment measures table
          promises.push(
            supabase
              .from("risk_assessment_measures")
              .select(`
                responsible_person,
                responsible_employee:employees!responsible_person(
                  departments(name)
                )
              `)
              .eq("company_id", companyId)
              .gte("created_at", startDate)
              .lte("created_at", endDate)
          );

          const [measuresRes, riskMeasuresRes] = await Promise.all(promises);

          if (measuresRes.error) {
            console.error("Error fetching measures department:", measuresRes.error);
          }
          if (riskMeasuresRes.error) {
            console.error("Error fetching risk measures department:", riskMeasuresRes.error);
          }

          // Combine and group by department
          const grouped: Record<string, number> = {};

          // Add data from main measures table
          (measuresRes.data || []).forEach((item: any) => {
            const dept = item.responsible_person?.departments?.name || t("reports.fallback.unassigned");
            grouped[dept] = (grouped[dept] || 0) + 1;
          });

          // Add data from risk_assessment_measures table
          (riskMeasuresRes.data || []).forEach((item: any) => {
            const dept = item.responsible_employee?.departments?.name || t("reports.fallback.unassigned");
            grouped[dept] = (grouped[dept] || 0) + 1;
          });

          return Object.entries(grouped).map(([name, value]) => ({ name, value }));
        }
      }

      // Standard handling for other metrics
      let table: string;
      let groupColumn: string;

      switch (metric) {
        case "incidents":
          if (groupBy === "location") {
            // Use location from incidents table directly
            const { data, error } = await supabase
              .from("incidents")
              .select("location")
              .eq("company_id", companyId)
              .gte("incident_date", startDate)
              .lte("incident_date", endDate);

            if (error) return [];
            const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
              const key = item.location || t("reports.fallback.unknown");
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {});
            return Object.entries(grouped).map(([name, value]) => ({ name, value }));
          }
          if (groupBy === "department") {
            // Group incidents by department name via join
            const { data, error } = await (supabase as any)
              .from("incidents")
              .select("department_id, departments(name)")
              .eq("company_id", companyId)
              .gte("incident_date", startDate)
              .lte("incident_date", endDate);

            if (error) {
              console.error("Error fetching incidents by department:", error);
              return [];
            }
            const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
              const name = item.departments?.name || t("reports.fallback.unassigned");
              acc[name] = (acc[name] || 0) + 1;
              return acc;
            }, {});
            return Object.entries(grouped).map(([name, value]) => ({ name, value }));
          }
          // Fallthrough for other incident groupings
          // Handle different incident groupings
          let incidentGroupCol: string;
          if (groupBy === "category") {
            incidentGroupCol = "incident_type";
          } else if (groupBy === "investigation_status" || groupBy === "status") {
            incidentGroupCol = "investigation_status";
          } else if (groupBy === "incident_type") {
            incidentGroupCol = "incident_type";
          } else {
            incidentGroupCol = groupBy || "investigation_status";
          }

          const { data, error } = await supabase
            .from("incidents")
            .select(incidentGroupCol)
            .eq("company_id", companyId)
            .gte("incident_date", startDate)
            .lte("incident_date", endDate);

          if (error) {
            console.error("Error fetching incidents:", error);
            return [];
          }
          const groupedIncidents = (data || []).reduce((acc: Record<string, number>, item: any) => {
            const key = item[incidentGroupCol] || t("reports.fallback.unknown");
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});
          return Object.entries(groupedIncidents).map(([name, value]) => ({ name, value }));

        case "audits":
          table = "audits";
          // Map groupBy to actual column names
          if (groupBy === "iso_code") {
            groupColumn = "iso_code";
          } else if (groupBy === "status") {
            groupColumn = "status";
          } else if (groupBy === "category") {
            groupColumn = "audit_type";
          } else {
            groupColumn = groupBy || "status";
          }
          break;
        case "trainings":
          {
            // Echte Trainingsdaten aus training_participations (nicht das leere training_records)
            if (groupBy === "employee_id") {
              // Training Compliance by Employee
              const { data, error } = await supabase
                .from("training_participations")
                .select("employee_id, employees(full_name), status")
                .eq("company_id", companyId)
                .gte("created_at", startDate)
                .lte("created_at", endDate);

              if (error) {
                console.error("Error fetching training by employee:", error);
                return [];
              }

              // Group by employee and calculate completion percentage
              const employeeStats: Record<string, { total: number; completed: number }> = {};

              (data || []).forEach((item: any) => {
                const empName = item.employees?.full_name || t("reports.fallback.unassigned");
                if (!employeeStats[empName]) {
                  employeeStats[empName] = { total: 0, completed: 0 };
                }
                employeeStats[empName].total += 1;
                if (item.status === "completed") {
                  employeeStats[empName].completed += 1;
                }
              });

              return Object.entries(employeeStats).map(([name, stats]) => ({
                name,
                value: Math.round((stats.completed / stats.total) * 100) // Completion percentage
              }));
            } else if (groupBy === "status") {
              // Training by status
              const { data, error } = await supabase
                .from("training_participations")
                .select("status")
                .eq("company_id", companyId)
                .gte("created_at", startDate)
                .lte("created_at", endDate);

              if (error) {
                console.error("Error fetching training by status:", error);
                return [];
              }

              const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
                const key = item.status || t("reports.fallback.unknown");
                acc[key] = (acc[key] || 0) + 1;
                return acc;
              }, {});

              return Object.entries(grouped).map(([name, value]) => ({ name, value }));
            } else if (groupBy === "created_at") {
              // Training trends over time
              const { data, error } = await supabase
                .from("training_participations")
                .select("created_at")
                .eq("company_id", companyId)
                .gte("created_at", startDate)
                .lte("created_at", endDate);

              if (error) {
                console.error("Error fetching training trends:", error);
                return [];
              }

              const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
                if (!item.created_at) return acc;
                const date = new Date(item.created_at);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                acc[monthKey] = (acc[monthKey] || 0) + 1;
                return acc;
              }, {});

              return Object.entries(grouped)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([name, value]) => ({ name, value }));
            }
            return [];
          }
          break;
        case "measures":
          {
            // Query BOTH measures tables and combine the data
            const promises = [];

            // Main measures table
            promises.push(
              supabase
                .from("measures" as any)
                .select("status")
                .eq("company_id", companyId)
                .gte("created_at", startDate)
                .lte("created_at", endDate)
            );

            // Risk assessment measures table
            promises.push(
              supabase
                .from("risk_assessment_measures")
                .select("progress_status")
                .eq("company_id", companyId)
                .gte("created_at", startDate)
                .lte("created_at", endDate)
            );

            const [measuresRes, riskMeasuresRes] = await Promise.all(promises);

            if (measuresRes.error) {
              console.error("Error fetching measures:", measuresRes.error);
            }
            if (riskMeasuresRes.error) {
              console.error("Error fetching risk measures:", riskMeasuresRes.error);
            }

            // Combine and group data
            const combined: Record<string, number> = {};

            // Add data from main measures table
            (measuresRes.data || []).forEach((item: any) => {
              const key = item.status || t("reports.fallback.unknown");
              combined[key] = (combined[key] || 0) + 1;
            });

            // Add data from risk_assessment_measures table (map progress_status to status)
            (riskMeasuresRes.data || []).forEach((item: any) => {
              // Map progress_status names to match status names
              let key = item.progress_status || t("reports.fallback.unknown");
              // Map risk assessment statuses to standard measure statuses
              if (key === "not_started") key = "planned";
              if (key === "blocked") key = "cancelled";
              combined[key] = (combined[key] || 0) + 1;
            });

            return Object.entries(combined).map(([name, value]) => ({ name, value }));
          }
          break;
        case "checkups":
          {
            if (groupBy === "status") {
              // Checkups by status
              const { data, error } = await supabase
                .from("health_checkups")
                .select("status")
                .eq("company_id", companyId)
                .gte("created_at", startDate)
                .lte("created_at", endDate);

              if (error) {
                console.error("Error fetching health checkups data:", error);
                return [];
              }

              const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
                const key = item.status || t("reports.fallback.unknown");
                acc[key] = (acc[key] || 0) + 1;
                return acc;
              }, {});

              return Object.entries(grouped).map(([name, value]) => ({ name, value }));
            } else if (groupBy === "created_at") {
              // Checkups over time
              const { data, error } = await supabase
                .from("health_checkups")
                .select("created_at")
                .eq("company_id", companyId)
                .gte("created_at", startDate)
                .lte("created_at", endDate);

              if (error) {
                console.error("Error fetching checkups over time:", error);
                return [];
              }

              const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
                if (!item.created_at) return acc;
                const date = new Date(item.created_at);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                acc[monthKey] = (acc[monthKey] || 0) + 1;
                return acc;
              }, {});

              return Object.entries(grouped)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([name, value]) => ({ name, value }));
            }
            return [];
          }
          break;
        default:
          return [];
      }

      // Handle time-based grouping for other metrics (audits, measures, etc)
      if (groupBy === "created_at") {
        const { data, error } = await supabase
          .from(table as any)
          .select("created_at")
          .eq("company_id", companyId)
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        if (error) {
          console.error("Error fetching time data:", error);
          return [];
        }

        const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
          if (!item.created_at) return acc;
          const date = new Date(item.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          acc[monthKey] = (acc[monthKey] || 0) + 1;
          return acc;
        }, {});

        return Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, value]) => ({ name, value }));
      }

      const { data: stdData, error: stdError } = await supabase
        .from(table as any)
        .select(groupColumn)
        .eq("company_id", companyId)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (stdError) {
        console.error("Error fetching template data:", stdError);
        return [];
      }

      const groupedStd = (stdData || []).reduce((acc: Record<string, number>, item: any) => {
        const key = item[groupColumn] || t("reports.fallback.unknown");
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(groupedStd).map(([name, value]) => ({
        name,
        value,
      }));
    } catch (error) {
      console.error("Error in fetchTemplateData:", error);
      return [];
    }
  };

  const handleAddReport = () => {
    setIsLibraryOpen(true);
  };

  const handleSelectTemplate = async (template: Partial<ReportConfig>) => {
    try {
      // Fetch real data for the template
      const data = await fetchTemplateData(template);

      setSelectedReport({
        ...template,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        data, // Include actual fetched data
      } as ReportConfig);
      setIsLibraryOpen(false);
      setIsBuilderOpen(true);
    } catch (error) {
      console.error("Error selecting template:", error);
      toast({
        title: t("reports.toast.errorTitle"),
        description: t("reports.toast.templateDataLoadError"),
        variant: "destructive",
      });
    }
  };

  const handleSaveReport = (config: ReportConfig) => {
    const existingIndex = customReports.findIndex(r => r.id === config.id);
    let updatedReports;

    if (existingIndex >= 0) {
      // Update existing — keep targetSection from original creation, don't change it on edit
      const preserved = { ...config };
      if (!preserved.targetSection && customReports[existingIndex]?.targetSection) {
        preserved.targetSection = customReports[existingIndex].targetSection;
      }
      updatedReports = [...customReports];
      updatedReports[existingIndex] = preserved;
      setCustomReports(updatedReports);
      saveCustomReports(updatedReports);

      toast({
        title: t("reports.toast.reportUpdatedTitle"),
        description: t("reports.toast.reportUpdatedDesc").replace("{title}", config.title),
      });
    } else {
      // Add new — stamp targetSection so report stays in the section where it was created
      const configWithSection: ReportConfig = { ...config, targetSection: activeSection };
      updatedReports = [configWithSection, ...customReports];

      // Update data immediately
      setCustomReports(updatedReports);
      saveCustomReports(updatedReports);

      // Wrap layout calculation in startTransition for smoother rendering
      startTransition(() => {
        const newLayouts = recalculateLayouts(updatedReports);
        setCustomReportsLayouts(newLayouts);
        localStorage.setItem(CUSTOM_REPORTS_LAYOUT_KEY, JSON.stringify(newLayouts));
      });

      toast({
        title: t("reports.toast.reportCreatedTitle"),
        description: t("reports.toast.reportCreatedDesc").replace("{title}", config.title),
      });
    }

    setIsBuilderOpen(false);
    setSelectedReport(null);
  };

  const handleEditReport = (config: ReportConfig) => {
    setSelectedReport(config);
    setIsBuilderOpen(true);
  };

  const handleDuplicateReport = (config: ReportConfig) => {
    const duplicate = {
      ...config,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: t("reports.duplicateReportTitle").replace("{title}", config.title),
      data: config.data ? [...config.data] : [],
    };

    // Add Duplicate to BEGINNING (Latest First)
    const updatedReports = [duplicate, ...customReports];

    // Update data immediately
    setCustomReports(updatedReports);
    saveCustomReports(updatedReports);

    // Wrap layout calculation in startTransition for smoother rendering
    startTransition(() => {
      const newLayouts = recalculateLayouts(updatedReports);
      setCustomReportsLayouts(newLayouts);
      localStorage.setItem(CUSTOM_REPORTS_LAYOUT_KEY, JSON.stringify(newLayouts));
    });

    toast({
      title: t("reports.toast.reportDuplicatedTitle"),
      description: t("reports.toast.reportDuplicatedDesc").replace("{title}", config.title),
    });
  };

  const handleDeleteReport = (id: string) => {
    const report = customReports.find(r => r.id === id);
    if (!report) return;

    // Set report to delete and open confirmation dialog
    setReportToDelete({ id: report.id, title: report.title });
  };

  const confirmDeleteReport = () => {
    if (!reportToDelete) return;

    const updatedReports = customReports.filter(r => r.id !== reportToDelete.id);

    // Update data immediately
    setCustomReports(updatedReports);
    saveCustomReports(updatedReports);

    // Wrap layout recalculation in startTransition
    startTransition(() => {
      const newLayouts = recalculateLayouts(updatedReports);
      setCustomReportsLayouts(newLayouts);
      localStorage.setItem(CUSTOM_REPORTS_LAYOUT_KEY, JSON.stringify(newLayouts));
    });

    toast({
      title: t("reports.toast.reportDeletedTitle"),
      description: t("reports.toast.reportDeletedDesc").replace("{title}", reportToDelete.title),
    });
    setReportToDelete(null);
  };

  const handleExportReport = (config: ReportConfig) => {
    // Check permission before allowing export
    if (!hasDetailedPermission('reports', 'export_data')) {
      toast({
        title: t("reports.toast.permissionDeniedTitle"),
        description: t("reports.toast.permissionDeniedExport"),
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    // Header bar
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(t("reports.pdf.title"), 14, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(t("reports.pdf.generated").replace("{date}", dateStr).replace("{time}", timeStr), 14, 17);

    // Report Title
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(config.title, 14, 34);

    // Metadata
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${t("reports.pdf.metric")}: ${config.metric}  |  ${t("reports.pdf.chartType")}: ${config.chartType}  |  ${t("reports.pdf.groupBy")}: ${config.groupBy}`, 14, 41);

    let cursorY = 52;

    // Config summary table
    autoTable(doc, {
      startY: cursorY,
      head: [[t("reports.pdf.property"), t("reports.pdf.value")]],
      body: [
        [t("reports.pdf.metric"), config.metric],
        [t("reports.pdf.chartType"), config.chartType],
        [t("reports.pdf.groupBy"), config.groupBy],
        [t("reports.pdf.dateRangeProperty"), config.dateRange?.type?.replace(/_/g, " ") || t("reports.pdf.allTime")],
        ...(config.incidentType ? [[t("reports.pdf.incidentType"), config.incidentType]] : []),
        ...(config.auditTemplate ? [[t("reports.pdf.auditTemplate"), config.auditTemplate]] : []),
      ],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
      margin: { left: 14, right: 14 },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;

    // Data table if available
    if (config.data && config.data.length > 0) {
      doc.setFillColor(243, 244, 246);
      doc.rect(14, cursorY, pageW - 28, 8, "F");
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(t("reports.pdf.reportData"), 16, cursorY + 5.5);
      cursorY += 12;

      const dataKeys = Object.keys(config.data[0]);
      autoTable(doc, {
        startY: cursorY,
        head: [dataKeys.map(k => k.charAt(0).toUpperCase() + k.slice(1))],
        body: config.data.map(row => dataKeys.map(k => String(row[k] ?? ""))),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: 14, right: 14 },
        });
      cursorY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "normal");
      doc.text(t("reports.pdf.footerPage").replace("{current}", String(i)).replace("{total}", String(totalPages)), pageW / 2, doc.internal.pageSize.getHeight() - 6, { align: "center" });
      doc.text(t("reports.pdf.footerConfidential"), 14, doc.internal.pageSize.getHeight() - 6);
      doc.text(dateStr, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: "right" });
    }

    const fileName = `${config.title.toLowerCase().replace(/\s+/g, "-")}_${now.toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

    toast({
      title: `✅ ${t("reports.toast.reportExportedTitle")}`,
      description: t("reports.toast.reportExportedDesc").replace("{title}", config.title).replace("{fileName}", fileName),
    });
  };

  const handleVisibilityChange = (value: string) => {
    setVisibility(value);
    const visibilityText = value === "only-me" ? t("reports.visibility.onlyMeShort") : value === "team" ? t("reports.visibility.teamShort") : t("reports.visibility.companyShort");
    toast({
      title: t("reports.toast.visibilityUpdatedTitle"),
      description: t("reports.toast.visibilityUpdatedDesc").replace("{visibility}", visibilityText),
    });
  };

  const getMetricForSection = useCallback((sectionId: string) => {
    switch (sectionId) {
      case "risk-assessments":
        return "risks";
      case "audits":
        return "audits";
      case "incidents":
        return "incidents";
      case "trainings":
        return "trainings";
      case "measures":
        return "measures";
      case "tasks":
        return "tasks";
      case "checkups":
        return "checkups";
      default:
        return null;
    }
  }, []);

  const sectionCustomReports = useMemo(() => {
    if (activeSection === "overview") return [];
    const metric = getMetricForSection(activeSection);
    return customReports.filter((report) =>
      report.targetSection
        ? report.targetSection === activeSection
        : report.metric === metric
    );
  }, [activeSection, customReports, getMetricForSection]);

  const overviewCustomReports = useMemo(() => {
    const sectionMetrics = ["risks", "audits", "incidents", "trainings", "measures", "tasks", "checkups"];
    return customReports.filter((report) => {
      if (report.targetSection) return report.targetSection === "overview";
      return !sectionMetrics.includes(report.metric);
    });
  }, [customReports]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sub-Navigation */}
      <aside className="w-56 border-r bg-card flex-shrink-0">
        <div className="p-4 space-y-1">
          {navSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === section.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              {section.icon}
              <span>{section.name}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {/* Professional Header */}
        <header className="sticky top-0 z-10 bg-card border-b px-8 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1 min-w-[300px]">
              <Input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="w-full max-w-lg font-semibold text-lg px-2"
                placeholder={t("reports.reportNamePlaceholder")}
              />
            </div>

            <div className="flex items-center gap-3">
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-44">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allDepartments")}</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-40">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-7-days">{t("reports.dateRange.last7Days")}</SelectItem>
                  <SelectItem value="last-30-days">{t("reports.dateRange.last30Days")}</SelectItem>
                  <SelectItem value="last-90-days">{t("reports.dateRange.last90Days")}</SelectItem>
                  <SelectItem value="this-month">{t("reports.dateRange.thisMonth")}</SelectItem>
                  <SelectItem value="last-month">{t("reports.dateRange.lastMonth")}</SelectItem>
                  <SelectItem value="this-year">{t("reports.dateRange.thisYear")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={visibility} onValueChange={handleVisibilityChange}>
                <SelectTrigger className="w-48">
                  <Eye className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="only-me">{t("reports.visibility.onlyMe")}</SelectItem>
                  <SelectItem value="team">{t("reports.visibility.team")}</SelectItem>
                  <SelectItem value="company">{t("reports.visibility.company")}</SelectItem>
                </SelectContent>
              </Select>

              {hasDetailedPermission('reports', 'create_dashboards') && (
                <Button className="bg-purple-600 hover:bg-purple-700" size="sm" onClick={handleAddReport}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("reports.addReport")}
                </Button>
              )}

              {hasDetailedPermission('reports', 'export_data') && (
                <Button variant="outline" size="sm" onClick={exportReport}>
                  <Download className="w-4 h-4 mr-2" />
                  {t("reports.exportPdf")}
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Content Sections */}
        <div className="p-8">
          {activeSection === "overview" && (
            <OverviewSection
              stats={stats}
              chartData={chartData}
              customReports={overviewCustomReports}
              customReportsLayouts={customReportsLayouts}
              onCustomReportsLayoutChange={handleCustomReportsLayoutChange}
              onResetCustomLayouts={resetCustomLayouts}
              onEditReport={handleEditReport}
              onDuplicateReport={handleDuplicateReport}
              onDeleteReport={handleDeleteReport}
              onExportReport={handleExportReport}
              onViewReport={(report) => {
                setSelectedReport(report);
                setIsBuilderOpen(true);
              }}
            />
          )}
          {activeSection === "risk-assessments" && (
            <RiskAssessmentsSection stats={stats} chartData={chartData} riskLevelData={riskLevelData} />
          )}
          {activeSection === "audits" && (
            <AuditsSection stats={stats} chartData={chartData} auditStatusData={auditStatusData} />
          )}
          {activeSection === "incidents" && (
            <div className="space-y-8">
              {companyId && (
                <AccidentKPISection companyId={companyId} selectedYear={selectedYear} />
              )}
              <IncidentsSection stats={stats} chartData={chartData} incidentTypeData={incidentTypeData} />
            </div>
          )}
          {activeSection === "trainings" && (
            <TrainingsSection stats={stats} trainingMatrix={trainingMatrix} chartData={chartData} />
          )}
          {activeSection === "measures" && (
            <MeasuresSection stats={stats} chartData={chartData} measuresStatusData={measuresStatusData} />
          )}
          {activeSection === "tasks" && (
            <TasksSection stats={stats} chartData={chartData} />
          )}
          {activeSection === "checkups" && (
            <CheckupsSection stats={stats} checkUpsStatusData={checkUpsStatusData} />
          )}

          {activeSection !== "overview" && sectionCustomReports.length > 0 && (
            <div className="mt-6">
              <ResponsiveGridLayout
                className="layout"
                layouts={customReportsLayouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 2, md: 2, sm: 1, xs: 1, xxs: 1 }}
                rowHeight={160}
                margin={[16, 16]}
                isDraggable
                isResizable
                onLayoutChange={handleCustomReportsLayoutChange}
              >
                {sectionCustomReports.map((report) => (
                  <div key={report.id} className="min-h-[320px]">
                    <ReportWidget
                      config={report}
                      onEdit={handleEditReport}
                      onDuplicate={handleDuplicateReport}
                      onDelete={handleDeleteReport}
                      onExport={handleExportReport}
                    />
                  </div>
                ))}
              </ResponsiveGridLayout>
            </div>
          )}
        </div>
      </main>

      {/* Report Builder & Library Dialogs */}
      <ReportBuilder
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setSelectedReport(null);
        }}
        onSave={handleSaveReport}
        initialConfig={selectedReport}
        data={selectedReport?.data || []}
        onRefreshData={async (config) => {
          // Re-fetch data based on new config
          return await fetchTemplateData(config);
        }}
      />

      <ReportLibrary
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!reportToDelete} onOpenChange={(open) => !open && setReportToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("reports.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("reports.deleteDialog.description").replace("{name}", reportToDelete?.title || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReportToDelete(null)}>{t("reports.deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteReport} className="bg-destructive hover:bg-destructive/90">
              {t("reports.deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
