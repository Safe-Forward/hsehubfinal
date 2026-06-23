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
  const [reportName, setReportName] = useState("Monthly Safety Report");
  const [visibility, setVisibility] = useState("only-me");
  const [dateRange, setDateRange] = useState("last-30-days");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddReportDialog, setShowAddReportDialog] = useState(false);

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
      title: "Layout Reset",
      description: "Benutzerdefiniertes Berichtslayout wurde zurückgesetzt",
    });
  }, [customReports, toast]);

  // Navigation sections
  const navSections: NavSection[] = [
    { id: "overview", name: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "risk-assessments", name: "Risk Assessments", icon: <Shield className="w-4 h-4" /> },
    { id: "audits", name: "Audits", icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: "incidents", name: "Incidents", icon: <AlertTriangle className="w-4 h-4" /> },
    { id: "trainings", name: "Trainings", icon: <GraduationCap className="w-4 h-4" /> },
    { id: "measures", name: "Measures", icon: <CheckCircle className="w-4 h-4" /> },
    { id: "tasks", name: "Tasks", icon: <ListChecks className="w-4 h-4" /> },
    { id: "checkups", name: "Check-ups", icon: <Stethoscope className="w-4 h-4" /> },
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

    const [employeesRes, risksRes] = await Promise.all([
      supabase
        .from("employees")
        .select("id")
        .eq("company_id", companyId)
        .eq("department_id", departmentFilter),
      supabase
        .from("risk_assessments")
        .select("id")
        .eq("company_id", companyId)
        .eq("department_id", departmentFilter),
    ]);

    return {
      employeeIds: (employeesRes.data || []).map((e: any) => e.id),
      riskAssessmentIds: (risksRes.data || []).map((r: any) => r.id),
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
        title: "Fehler",
        description: error.message || "Berichtsdaten konnten nicht geladen werden",
        variant: "destructive",
      });
    }
  };

  const fetchTrainingMatrix = async (startIso: string, endIso: string, deptEmployeeIds: string[] | null = null) => {
    if (!companyId) return [];

    try {
      // Echte Trainingsdaten: course_employee_access (Zuweisung) + training_participations
      // (Status) + courses (Wiederholungsintervall). Vier Queries statt einer pro Mitarbeiter.
      let employeesQuery = supabase
        .from("employees")
        .select("id, full_name")
        .eq("company_id", companyId)
        .eq("is_active", true);
      if (deptEmployeeIds !== null) {
        employeesQuery = employeesQuery.in(
          "id",
          deptEmployeeIds.length > 0 ? deptEmployeeIds : ["00000000-0000-0000-0000-000000000000"]
        );
      }

      const [employeesRes, accessRes, coursesRes, participationsRes] = await Promise.all([
        employeesQuery,
        supabase
          .from("course_employee_access")
          .select("employee_id, course_id, created_at")
          .eq("company_id", companyId)
          .gte("created_at", startIso)
          .lte("created_at", endIso),
        supabase
          .from("courses")
          .select("id, renewal_months")
          .eq("company_id", companyId),
        supabase
          .from("training_participations")
          .select("employee_id, course_id, status, completion_date")
          .eq("company_id", companyId),
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (accessRes.error) throw accessRes.error;
      if (coursesRes.error) throw coursesRes.error;
      if (participationsRes.error) throw participationsRes.error;

      const renewalByCourse = new Map<string, number | null>(
        (coursesRes.data || []).map((c: any) => [c.id, c.renewal_months])
      );

      const participationByKey = new Map<string, { status: string; completion_date: string | null }>();
      (participationsRes.data || []).forEach((p: any) => {
        participationByKey.set(`${p.employee_id}|${p.course_id}`, {
          status: p.status,
          completion_date: p.completion_date,
        });
      });

      const courseIdsByEmployee = new Map<string, string[]>();
      (accessRes.data || []).forEach((a: any) => {
        const list = courseIdsByEmployee.get(a.employee_id) || [];
        list.push(a.course_id);
        courseIdsByEmployee.set(a.employee_id, list);
      });

      const now = new Date();
      const matrix: TrainingStatus[] = (employeesRes.data || []).map((emp: any) => {
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
        title: "Permission Denied",
        description: "Keine Berechtigung zum Exportieren von Daten",
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
    doc.text("HSE Hub – Safety Management", 14, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${dateStr} at ${timeStr}`, 14, 17);
    doc.text(`Date range: ${dateRange.replace(/-/g, " ")}`, pageW - 14, 17, { align: "right" });

    // ── Report title ────────────────────────────────────────────
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(reportName || "Safety Report", 14, 34);

    // Section label
    const sectionLabel = navSections.find(s => s.id === activeSection)?.name || activeSection;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(`Section: ${sectionLabel}`, 14, 41);

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
      sectionHeading("Key Performance Indicators");
      autoTable(doc, {
        startY: cursorY,
        head: [["Metric", "Value"]],
        body: [
          ["Total Employees", stats.totalEmployees],
          ["Risk Assessments (GBU)", stats.totalRiskAssessments],
          ["Safety Audits", stats.totalAudits],
          ["Completed Audits", stats.completedAudits],
          ["Incidents", stats.totalIncidents],
          ["Open Incidents", stats.openIncidents],
          ["Closed Incidents", stats.totalIncidents - stats.openIncidents],
          ["Training Courses", stats.totalTrainings],
          ["Training Compliance", `${stats.trainingCompliance}%`],
          ["Measures", stats.totalMeasures],
          ["Completed Measures", stats.completedMeasures],
          ["In-Progress Measures", stats.totalMeasures - stats.completedMeasures],
          ["Tasks", stats.totalTasks],
          ["Completed Tasks", stats.completedTasks],
          ["Health Check-ups", stats.totalCheckUps],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 }, 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 10;

      if (chartData && chartData.length > 0) {
        sectionHeading("Monthly Incident Trend");
        autoTable(doc, {
          startY: cursorY,
          head: [["Month", "Incidents"]],
          body: chartData.map((d: any) => [d.month || d.name || "", d.incidents ?? d.value ?? 0]),
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          margin: { left: 14, right: 14 },
        });
        cursorY = (doc as any).lastAutoTable.finalY + 10;
      }
    } else if (activeSection === "risk-assessments") {
      sectionHeading("Risk Assessments Summary");
      autoTable(doc, {
        startY: cursorY,
        head: [["Metric", "Value"]],
        body: [
          ["Total GBU Risk Assessments", stats.totalRiskAssessments],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 }, 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 10;
    } else if (activeSection === "audits") {
      sectionHeading("Safety Audits Summary");
      const pending = stats.totalAudits - stats.completedAudits;
      const completionRate = stats.totalAudits > 0 ? Math.round((stats.completedAudits / stats.totalAudits) * 100) : 0;
      autoTable(doc, {
        startY: cursorY,
        head: [["Metric", "Value"]],
        body: [
          ["Total Audits", stats.totalAudits],
          ["Completed", stats.completedAudits],
          ["Pending / In Progress", pending],
          ["Completion Rate", `${completionRate}%`],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 }, 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 10;
    } else if (activeSection === "incidents") {
      sectionHeading("Incidents Summary");
      autoTable(doc, {
        startY: cursorY,
        head: [["Metric", "Value"]],
        body: [
          ["Total Incidents", stats.totalIncidents],
          ["Open / Under Investigation", stats.openIncidents],
          ["Closed / Resolved", stats.totalIncidents - stats.openIncidents],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 }, 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 10;
    } else if (activeSection === "trainings") {
      sectionHeading("Training Summary");
      autoTable(doc, {
        startY: cursorY,
        head: [["Metric", "Value"]],
        body: [
          ["Total Training Courses", stats.totalTrainings],
          ["Overall Compliance Rate", `${stats.trainingCompliance}%`],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 }, 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 10;

      if (trainingMatrix && trainingMatrix.length > 0) {
        sectionHeading("Employee Training Matrix");
        autoTable(doc, {
          startY: cursorY,
          head: [["Employee", "Required", "Completed", "Expired", "Compliance", "Status"]],
          body: trainingMatrix.map(item => [
            item.employee_name,
            item.total_required,
            item.completed,
            item.expired,
            `${item.compliance_rate}%`,
            item.compliance_rate >= 80 ? "Compliant" : item.compliance_rate >= 50 ? "Needs Attention" : "Non-Compliant",
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
              if (val === "Compliant") doc.setTextColor(22, 163, 74);
              else if (val === "Needs Attention") doc.setTextColor(202, 138, 4);
              else doc.setTextColor(220, 38, 38);
            }
          },
          margin: { left: 14, right: 14 },
        });
        cursorY = (doc as any).lastAutoTable.finalY + 10;
      }
    } else if (activeSection === "measures") {
      sectionHeading("Measures Summary");
      const completionRate = stats.totalMeasures > 0 ? Math.round((stats.completedMeasures / stats.totalMeasures) * 100) : 0;
      autoTable(doc, {
        startY: cursorY,
        head: [["Metric", "Value"]],
        body: [
          ["Total Measures", stats.totalMeasures],
          ["Completed", stats.completedMeasures],
          ["In Progress", stats.totalMeasures - stats.completedMeasures],
          ["Completion Rate", `${completionRate}%`],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 }, 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 10;
    } else if (activeSection === "tasks") {
      sectionHeading("Tasks Summary");
      const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
      autoTable(doc, {
        startY: cursorY,
        head: [["Metric", "Value"]],
        body: [
          ["Total Tasks", stats.totalTasks],
          ["Completed", stats.completedTasks],
          ["Pending", stats.totalTasks - stats.completedTasks],
          ["Completion Rate", `${completionRate}%`],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 }, 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 10;
    } else if (activeSection === "checkups") {
      sectionHeading("Health Check-ups Summary");
      autoTable(doc, {
        startY: cursorY,
        head: [["Metric", "Value"]],
        body: [
          ["Total Health Check-ups", stats.totalCheckUps],
          ["Completed", stats.completedCheckUps],
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
      doc.text(`Page ${i} of ${totalPages}`, pageW / 2, doc.internal.pageSize.getHeight() - 6, { align: "center" });
      doc.text("HSE Hub – Confidential", 14, doc.internal.pageSize.getHeight() - 6);
      doc.text(dateStr, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: "right" });
    }

    // ── Save ─────────────────────────────────────────────────────
    const fileName = `${(reportName || "safety-report").toLowerCase().replace(/\s+/g, "-")}_${sectionLabel.toLowerCase().replace(/\s+/g, "-")}_${now.toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

    toast({
      title: "✅ PDF Exported",
      description: `"${reportName}" has been downloaded as ${fileName}`,
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
      title: "Date Range Updated",
      description: `Showing data for ${range.replace("-", " ")}`,
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
            const deptName = item.departments?.name || "Unassigned";
            acc[deptName] = (acc[deptName] || 0) + 1;
            return acc;
          }, {});

          return Object.entries(grouped).map(([name, value]) => ({ name, value }));
        } else if (groupBy === "location") {
          // Employees don't have location field - return empty
          console.warn("Employees table does not have a location field");
          return [{ name: "No Location Data", value: 0 }];
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
            const name = item.departments?.name || "Unassigned";
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
            const key = item[column] || "Unknown";
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
            const dept = item.responsible_person?.departments?.name || "Unassigned";
            grouped[dept] = (grouped[dept] || 0) + 1;
          });

          // Add data from risk_assessment_measures table
          (riskMeasuresRes.data || []).forEach((item: any) => {
            const dept = item.responsible_employee?.departments?.name || "Unassigned";
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
              const key = item.location || "Unknown";
              acc[key] = (acc[key] || 0) + 1;
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
            const key = item[incidentGroupCol] || "Unknown";
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
                const empName = item.employees?.full_name || "Unassigned";
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
                const key = item.status || "Unknown";
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
              const key = item.status || "Unknown";
              combined[key] = (combined[key] || 0) + 1;
            });

            // Add data from risk_assessment_measures table (map progress_status to status)
            (riskMeasuresRes.data || []).forEach((item: any) => {
              // Map progress_status names to match status names
              let key = item.progress_status || "Unknown";
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
                const key = item.status || "Unknown";
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
        const key = item[groupColumn] || "Unknown";
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
        title: "Fehler",
        description: "Vorlagendaten konnten nicht geladen werden",
        variant: "destructive",
      });
    }
  };

  const handleSaveReport = (config: ReportConfig) => {
    const existingIndex = customReports.findIndex(r => r.id === config.id);
    let updatedReports;

    if (existingIndex >= 0) {
      // Update existing
      updatedReports = [...customReports];
      updatedReports[existingIndex] = config;
      // Layout doesn't need to change for edits
      setCustomReports(updatedReports);
      saveCustomReports(updatedReports);

      toast({
        title: "Report Updated",
        description: `"${config.title}" has been updated`,
      });
    } else {
      // Add new - INSERT AT BEGINNING (Latest First)
      updatedReports = [config, ...customReports];

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
        title: "Report Created",
        description: `"${config.title}" has been added to your dashboard`,
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
      title: `${config.title} (Copy)`,
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
      title: "Report Duplicated",
      description: `Created a copy of "${config.title}"`,
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
      title: "Report Deleted",
      description: `"${reportToDelete.title}" has been removed`,
    });
    setReportToDelete(null);
  };

  const handleExportReport = (config: ReportConfig) => {
    // Check permission before allowing export
    if (!hasDetailedPermission('reports', 'export_data')) {
      toast({
        title: "Permission Denied",
        description: "Keine Berechtigung zum Exportieren von Daten",
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
    doc.text("HSE Hub – Safety Management", 14, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${dateStr} at ${timeStr}`, 14, 17);

    // Report Title
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(config.title, 14, 34);

    // Metadata
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Metric: ${config.metric}  |  Chart: ${config.chartType}  |  Group by: ${config.groupBy}`, 14, 41);

    let cursorY = 52;

    // Config summary table
    autoTable(doc, {
      startY: cursorY,
      head: [["Property", "Value"]],
      body: [
        ["Metric", config.metric],
        ["Chart Type", config.chartType],
        ["Group By", config.groupBy],
        ["Date Range", config.dateRange?.type?.replace(/_/g, " ") || "All time"],
        ...(config.incidentType ? [["Incident Type", config.incidentType]] : []),
        ...(config.auditTemplate ? [["Audit Template", config.auditTemplate]] : []),
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
      doc.text("Report Data", 16, cursorY + 5.5);
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
      doc.text(`Page ${i} of ${totalPages}`, pageW / 2, doc.internal.pageSize.getHeight() - 6, { align: "center" });
      doc.text("HSE Hub – Confidential", 14, doc.internal.pageSize.getHeight() - 6);
      doc.text(dateStr, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: "right" });
    }

    const fileName = `${config.title.toLowerCase().replace(/\s+/g, "-")}_${now.toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

    toast({
      title: "✅ Report Exported",
      description: `"${config.title}" downloaded as ${fileName}`,
    });
  };

  const handleVisibilityChange = (value: string) => {
    setVisibility(value);
    const visibilityText = value === "only-me" ? "only to you" : value === "team" ? "to your team" : "to the company";
    toast({
      title: "Visibility Updated",
      description: `Report is now visible ${visibilityText}`,
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
    const metric = getMetricForSection(activeSection);
    if (!metric) return [];
    return customReports.filter((report) => report.metric === metric);
  }, [activeSection, customReports, getMetricForSection]);

  const overviewCustomReports = useMemo(() => {
    const sectionMetrics = ["risks", "audits", "incidents", "trainings", "measures", "tasks", "checkups"];
    return customReports.filter((report) => !sectionMetrics.includes(report.metric));
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
                placeholder="Report Name"
              />
            </div>

            <div className="flex items-center gap-3">
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-44">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Abteilungen</SelectItem>
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
                  <SelectItem value="last-7-days">Last 7 days</SelectItem>
                  <SelectItem value="last-30-days">Last 30 days</SelectItem>
                  <SelectItem value="last-90-days">Last 90 days</SelectItem>
                  <SelectItem value="this-month">This month</SelectItem>
                  <SelectItem value="last-month">Last month</SelectItem>
                  <SelectItem value="this-year">This year</SelectItem>
                </SelectContent>
              </Select>

              <Select value={visibility} onValueChange={handleVisibilityChange}>
                <SelectTrigger className="w-48">
                  <Eye className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="only-me">Visible only to me</SelectItem>
                  <SelectItem value="team">Visible to team</SelectItem>
                  <SelectItem value="company">Visible to company</SelectItem>
                </SelectContent>
              </Select>

              {hasDetailedPermission('reports', 'create_dashboards') && (
                <Button className="bg-purple-600 hover:bg-purple-700" size="sm" onClick={handleAddReport}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add report
                </Button>
              )}

              {hasDetailedPermission('reports', 'export_data') && (
                <Button variant="outline" size="sm" onClick={exportReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
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
            <IncidentsSection stats={stats} chartData={chartData} incidentTypeData={incidentTypeData} />
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
            <div className="mt-8 space-y-4">
              <div>
                <h3 className="text-xl font-semibold">Custom Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Reports matching this tab
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sectionCustomReports.map((report) => (
                  <div key={`section-report-${report.id}`} className="min-h-[320px]">
                    <ReportWidget
                      config={report}
                      onEdit={handleEditReport}
                      onDuplicate={handleDuplicateReport}
                      onDelete={handleDeleteReport}
                      onExport={handleExportReport}
                    />
                  </div>
                ))}
              </div>
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
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{reportToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReportToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteReport} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
