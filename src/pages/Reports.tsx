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
  EyeOff,
  ChevronDown,
  TrendingUp,
  BarChart3,
  GripVertical,
  RotateCcw,
  Lock,
  Unlock,
  Settings2,
} from "lucide-react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";

// Wrap ResponsiveGridLayout with WidthProvider
const ResponsiveGridLayout = WidthProvider(Responsive);

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import ReportBuilder, { ReportConfig } from "@/components/reports/ReportBuilder";
import ReportLibrary from "@/components/reports/ReportLibrary";
import ReportWidget from "@/components/reports/ReportWidget";
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

interface ReportStats {
  totalEmployees: number;
  totalRiskAssessments: number;
  totalAudits: number;
  totalTasks: number;
  totalIncidents: number;
  totalMeasures: number;
  totalTrainings: number;
  totalCheckUps: number;
  completedAudits: number;
  completedTasks: number;
  completedMeasures: number;
  openIncidents: number;
  trainingCompliance: number;
}

interface TrainingStatus {
  employee_name: string;
  total_required: number;
  completed: number;
  expired: number;
  compliance_rate: number;
}

interface NavSection {
  id: string;
  name: string;
  icon: React.ReactNode;
}

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
    openIncidents: 0,
    trainingCompliance: 0,
  });

  const [trainingMatrix, setTrainingMatrix] = useState<TrainingStatus[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

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
      description: "Custom reports layout has been reset",
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
    if (companyId) {
      fetchReportData();
      fetchChartData();
    }
  }, [companyId, dateRange]);

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
        openIncidentsRes,
        trainingRes,
      ] = await Promise.all([
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .gte("created_at", startIso)
          .lte("created_at", endIso),
        supabase
          .from("risk_assessments")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .gte("assessment_date", startIso)
          .lte("assessment_date", endIso),
        supabase
          .from("audits")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .gte("created_at", startIso)
          .lte("created_at", endIso),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .gte("created_at", startIso)
          .lte("created_at", endIso),
        supabase
          .from("incidents" as any)
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .gte("incident_date", startIso)
          .lte("incident_date", endIso),
        supabase
          .from("measures" as any)
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .gte("created_at", startIso)
          .lte("created_at", endIso),
        supabase
          .from("risk_assessment_measures")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .gte("created_at", startIso)
          .lte("created_at", endIso),
        supabase
          .from("courses")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .gte("created_at", startIso)
          .lte("created_at", endIso),
        supabase
          .from("health_checkups")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .gte("created_at", startIso)
          .lte("created_at", endIso),
        inRange(
          supabase
            .from("audits")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("status", "completed"),
          "created_at"
        ),
        inRange(
          supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("status", "completed"),
          "created_at"
        ),
        inRange(
          supabase
            .from("measures" as any)
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("status", "completed"),
          "created_at"
        ),
        inRange(
          supabase
            .from("risk_assessment_measures")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("progress_status", "completed"),
          "created_at"
        ),
        inRange(
          supabase
            .from("incidents" as any)
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("investigation_status", "open"),
          "incident_date"
        ),
        supabase
          .from("training_records")
          .select("*")
          .eq("company_id", companyId)
          .gte("created_at", startIso)
          .lte("created_at", endIso),
      ]);

      const totalTraining = trainingRes.data?.length || 0;
      const completedTraining =
        trainingRes.data?.filter((t) => t.status === "completed").length || 0;
      const trainingComplianceRate =
        totalTraining > 0
          ? Math.round((completedTraining / totalTraining) * 100)
          : 0;

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
        openIncidents: openIncidentsRes.count || 0,
        trainingCompliance: trainingComplianceRate,
      });

      await fetchTrainingMatrix(startIso, endIso);
    } catch (error: any) {
      console.error("Error fetching report data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch report data",
        variant: "destructive",
      });
    }
  };

  const fetchTrainingMatrix = async (startIso: string, endIso: string) => {
    if (!companyId) return;

    try {
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (empError) throw empError;

      const matrix: TrainingStatus[] = [];

      for (const emp of employees || []) {
        const { data: trainings, error: trainError } = await supabase
          .from("training_records")
          .select("*")
          .eq("employee_id", emp.id)
          .gte("created_at", startIso)
          .lte("created_at", endIso);

        if (trainError) throw trainError;

        const total = trainings?.length || 0;
        const completed =
          trainings?.filter((t) => t.status === "completed").length || 0;
        const expired =
          trainings?.filter((t) => t.status === "expired").length || 0;
        const compliance =
          total > 0 ? Math.round((completed / total) * 100) : 0;

        matrix.push({
          employee_name: emp.full_name,
          total_required: total,
          completed,
          expired,
          compliance_rate: compliance,
        });
      }

      setTrainingMatrix(matrix);
    } catch (error: any) {
      console.error("Error fetching training matrix:", error);
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

      const chartDataPromises = buckets.map(async (bucket) => {
        const [incidentsRes, trainingsRes, tasksRes] = await Promise.all([
          supabase
            .from("incidents")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("incident_date", bucket.startDate.toISOString())
            .lte("incident_date", bucket.endDate.toISOString()),
          supabase
            .from("training_records")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("created_at", bucket.startDate.toISOString())
            .lte("created_at", bucket.endDate.toISOString()),
          supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("created_at", bucket.startDate.toISOString())
            .lte("created_at", bucket.endDate.toISOString()),
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

  const exportReport = () => {
    // Check permission before allowing export
    if (!hasDetailedPermission('reports', 'export_data')) {
      toast({
        title: "Permission Denied",
        description: "You do not have permission to export data",
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
            // Query training_records table
            if (groupBy === "employee_id") {
              // Training Compliance by Employee
              const { data, error } = await supabase
                .from("training_records")
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
                .from("training_records")
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
                .from("training_records")
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
        title: "Error",
        description: "Failed to load template data",
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
        description: "You do not have permission to export data",
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
            <RiskAssessmentsSection stats={stats} chartData={chartData} />
          )}
          {activeSection === "audits" && (
            <AuditsSection stats={stats} chartData={chartData} />
          )}
          {activeSection === "incidents" && (
            <IncidentsSection stats={stats} chartData={chartData} />
          )}
          {activeSection === "trainings" && (
            <TrainingsSection stats={stats} trainingMatrix={trainingMatrix} chartData={chartData} />
          )}
          {activeSection === "measures" && (
            <MeasuresSection stats={stats} chartData={chartData} />
          )}
          {activeSection === "tasks" && (
            <TasksSection stats={stats} chartData={chartData} />
          )}
          {activeSection === "checkups" && (
            <CheckupsSection stats={stats} />
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

// Section Components

// Default layout for the dashboard grid
const defaultLayouts = {
  lg: [
    { i: "risk-assessments", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "safety-audits", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "incidents", x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "training-compliance", x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "incident-trends", x: 0, y: 2, w: 12, h: 4, minW: 6, minH: 3, static: false },
    { i: "audit-completion", x: 0, y: 6, w: 6, h: 3, minW: 4, minH: 2, static: false },
    { i: "task-completion", x: 6, y: 6, w: 6, h: 3, minW: 4, minH: 2, static: false },
  ],
  md: [
    { i: "risk-assessments", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
    { i: "safety-audits", x: 5, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
    { i: "incidents", x: 0, y: 2, w: 5, h: 2, minW: 2, minH: 2, static: false },
    { i: "training-compliance", x: 5, y: 2, w: 5, h: 2, minW: 2, minH: 2, static: false },
    { i: "incident-trends", x: 0, y: 4, w: 10, h: 4, minW: 6, minH: 3, static: false },
    { i: "audit-completion", x: 0, y: 8, w: 5, h: 3, minW: 4, minH: 2, static: false },
    { i: "task-completion", x: 5, y: 8, w: 5, h: 3, minW: 4, minH: 2, static: false },
  ],
  sm: [
    { i: "risk-assessments", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "safety-audits", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "incidents", x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "training-compliance", x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "incident-trends", x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3, static: false },
    { i: "audit-completion", x: 0, y: 8, w: 6, h: 3, minW: 3, minH: 2, static: false },
    { i: "task-completion", x: 0, y: 11, w: 6, h: 3, minW: 3, minH: 2, static: false },
  ],
};

const LAYOUT_STORAGE_KEY = "hse_dashboard_layout";

// Storage keys for each section
const SECTION_LAYOUT_KEYS = {
  overview: "hse_layout_overview",
  "risk-assessments": "hse_layout_risk_assessments",
  audits: "hse_layout_audits",
  incidents: "hse_layout_incidents",
  trainings: "hse_layout_trainings",
  measures: "hse_layout_measures",
  tasks: "hse_layout_tasks",
  checkups: "hse_layout_checkups",
  customReports: "hse_layout_custom_reports",
};

const CUSTOM_REPORTS_LAYOUT_KEY = "hse_custom_reports_grid_layout_v3_2col"; // v3: 2-column layout

// Generate default layout for custom reports (2 per row for better visibility)
const generateCustomReportsLayout = (reportCount: number) => {
  const layouts: any[] = [];
  for (let i = 0; i < reportCount; i++) {
    layouts.push({
      i: `custom-report-${i}`,
      x: (i % 2) * 6,  // 2 columns layout (50% width each)
      y: Math.floor(i / 2) * 4,  // Row spacing
      w: 6,  // Width: 6 grid units (50% of 12)
      h: 4,  // Height: 4 units (280px)
      minW: 4,  // Minimum width
      minH: 3,  // Minimum height
      static: false,
    });
  }
  return layouts;
};

function OverviewSection({
  stats,
  chartData,
  customReports,
  customReportsLayouts,
  onCustomReportsLayoutChange,
  onResetCustomLayouts,
  onEditReport,
  onDuplicateReport,
  onDeleteReport,
  onExportReport,
  onViewReport,
}: {
  stats: ReportStats;
  chartData: any[];
  customReports: ReportConfig[];
  customReportsLayouts: { [key: string]: any[] };
  onCustomReportsLayoutChange: (currentLayout: any[], allLayouts: { [key: string]: any[] }) => void;
  onResetCustomLayouts: () => void;
  onEditReport: (config: ReportConfig) => void;
  onDuplicateReport: (config: ReportConfig) => void;
  onDeleteReport: (id: string) => void;
  onExportReport: (config: ReportConfig) => void;
  onViewReport: (config: ReportConfig) => void;
}) {
  const { toast } = useToast();
  const UNIFIED_LAYOUT_KEY = "hse_unified_dashboard_layout_v5";

  // Mounted state to suppress CSS transition glitch on first render
  const [isMounted, setIsMounted] = useState(false);
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const layoutsRef = useRef<{ [key: string]: any[] }>({});
  const hiddenCardsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Small delay to let the grid measure its container width before enabling transitions
    const timer = setTimeout(() => {
      setIsMounted(true);
      isInitialMountRef.current = false;
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Hidden cards state
  const HIDDEN_CARDS_KEY = "hse_hidden_overview_cards";
  const OVERVIEW_CARDS = useMemo(() => [
    { id: "risk-assessments", label: "Risk Assessments", icon: <Shield className="w-4 h-4" /> },
    { id: "safety-audits", label: "Safety Audits", icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: "incidents", label: "Incidents", icon: <AlertTriangle className="w-4 h-4" /> },
    { id: "training-compliance", label: "Training Compliance", icon: <GraduationCap className="w-4 h-4" /> },
    { id: "incident-trends", label: "Incident Trends", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "audit-completion", label: "Audit Completion", icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: "task-completion", label: "Task Completion", icon: <ListChecks className="w-4 h-4" /> },
  ], []);

  const [hiddenCards, setHiddenCards] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(HIDDEN_CARDS_KEY);
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {
      console.error("Error loading hidden cards:", e);
    }
    return new Set();
  });

  const toggleCardVisibility = useCallback((cardId: string) => {
    setHiddenCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      localStorage.setItem(HIDDEN_CARDS_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Reset initial mount flag when hiddenCards changes (grid will remount with new key)
  useEffect(() => {
    isInitialMountRef.current = true;
    const timer = setTimeout(() => {
      isInitialMountRef.current = false;
    }, 200);
    return () => clearTimeout(timer);
  }, [hiddenCards]);

  // Standard card base positions (y offsets for lg)
  const standardCardDefaults = useMemo(() => ({
    lg: [
      { i: "risk-assessments", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "safety-audits", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "incidents", x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "training-compliance", x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-trends", x: 0, y: 2, w: 12, h: 4, minW: 6, minH: 3, static: false },
      { i: "audit-completion", x: 0, y: 6, w: 6, h: 3, minW: 4, minH: 2, static: false },
      { i: "task-completion", x: 6, y: 6, w: 6, h: 3, minW: 4, minH: 2, static: false },
    ],
    md: [
      { i: "risk-assessments", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "safety-audits", x: 5, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "incidents", x: 0, y: 2, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "training-compliance", x: 5, y: 2, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-trends", x: 0, y: 4, w: 10, h: 4, minW: 6, minH: 3, static: false },
      { i: "audit-completion", x: 0, y: 8, w: 5, h: 3, minW: 4, minH: 2, static: false },
      { i: "task-completion", x: 5, y: 8, w: 5, h: 3, minW: 4, minH: 2, static: false },
    ],
    sm: [
      { i: "risk-assessments", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "safety-audits", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "incidents", x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "training-compliance", x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-trends", x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3, static: false },
      { i: "audit-completion", x: 0, y: 8, w: 6, h: 3, minW: 3, minH: 2, static: false },
      { i: "task-completion", x: 0, y: 11, w: 6, h: 3, minW: 3, minH: 2, static: false },
    ],
  }), []);

  // Generate layout items for custom reports, placed after standard cards
  // Must be breakpoint-aware: lg=12cols, md=10cols, sm=6cols
  const generateCustomReportLayoutItems = useCallback((reports: ReportConfig[], startY: number, breakpoint: string) => {
    const totalCols = breakpoint === 'lg' ? 12 : breakpoint === 'md' ? 10 : 6;
    const isSmall = breakpoint === 'sm';
    // On sm, full width; on md/lg, half width (2 per row)
    const itemW = isSmall ? totalCols : Math.floor(totalCols / 2);
    const perRow = isSmall ? 1 : 2;

    return reports.map((report, index) => ({
      i: `report-${report.id}`,
      x: isSmall ? 0 : (index % perRow) * itemW,
      y: startY + Math.floor(index / perRow) * 3,
      w: itemW,
      h: 3,
      minW: Math.min(3, totalCols),
      minH: 2,
      static: false,
    }));
  }, []);

  // Build unified default layout (standard + custom reports)
  const buildDefaultUnifiedLayout = useCallback(() => {
    const breakpoints = ['lg', 'md', 'sm'] as const;
    const unifiedLayout: { [key: string]: any[] } = {};

    breakpoints.forEach(bp => {
      const standardItems = standardCardDefaults[bp];
      const maxStandardY = Math.max(...standardItems.map(item => item.y + item.h), 0);
      const customItems = generateCustomReportLayoutItems(customReports, maxStandardY, bp);
      unifiedLayout[bp] = [...standardItems, ...customItems];
    });

    return unifiedLayout;
  }, [standardCardDefaults, customReports, generateCustomReportLayoutItems]);

  // Load unified layouts from localStorage or build defaults
  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem(UNIFIED_LAYOUT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge: ensure all current custom reports + standard cards have layout entries
        const allRequiredIds = new Set([
          ...standardCardDefaults.lg.map(item => item.i),
          ...customReports.map(r => `report-${r.id}`),
        ]);
        const savedIds = new Set((parsed.lg || []).map((item: any) => item.i));
        const missingIds = [...allRequiredIds].filter(id => !savedIds.has(id));

        if (missingIds.length === 0) {
          // Remove stale items (deleted custom reports)
          const result: { [key: string]: any[] } = {};
          Object.keys(parsed).forEach(bp => {
            result[bp] = parsed[bp].filter((item: any) => allRequiredIds.has(item.i));
          });
          return result;
        }
        // If there are missing ids, fall through to build default
      }
    } catch (error) {
      console.error("Error loading unified layout:", error);
    }
    return buildDefaultUnifiedLayout();
  });

  // When customReports change, ensure layout has entries for all reports
  useEffect(() => {
    setLayouts(prev => {
      const allRequiredIds = new Set([
        ...standardCardDefaults.lg.map(item => item.i),
        ...customReports.map(r => `report-${r.id}`),
      ]);
      const currentIds = new Set((prev.lg || []).map((item: any) => item.i));
      const missingIds = [...allRequiredIds].filter(id => !currentIds.has(id));
      const staleIds = [...currentIds].filter(id => !allRequiredIds.has(id));

      if (missingIds.length === 0 && staleIds.length === 0) return prev;

      const bpCols: Record<string, number> = { lg: 12, md: 10, sm: 6 };
      const breakpoints = ['lg', 'md', 'sm'];
      const newLayouts: { [key: string]: any[] } = {};

      breakpoints.forEach(bp => {
        const totalCols = bpCols[bp];
        const isSmall = bp === 'sm';
        const itemW = isSmall ? totalCols : Math.floor(totalCols / 2);
        const perRow = isSmall ? 1 : 2;

        let bpItems = [...(prev[bp] || [])];
        // Remove stale items
        bpItems = bpItems.filter(item => !staleIds.includes(item.i));
        // Add missing items
        const maxY = bpItems.length > 0 ? Math.max(...bpItems.map(item => item.y + item.h)) : 0;
        missingIds.forEach((id, idx) => {
          const isReport = id.startsWith("report-");
          bpItems.push({
            i: id,
            x: isSmall ? 0 : (idx % perRow) * itemW,
            y: maxY + Math.floor(idx / perRow) * 3,
            w: isReport ? itemW : (standardCardDefaults[bp as keyof typeof standardCardDefaults]?.find((s: any) => s.i === id)?.w || 3),
            h: isReport ? 3 : 2,
            minW: isReport ? Math.min(3, totalCols) : 2,
            minH: 2,
            static: false,
          });
        });
        newLayouts[bp] = bpItems;
      });

      localStorage.setItem(UNIFIED_LAYOUT_KEY, JSON.stringify(newLayouts));
      return newLayouts;
    });
  }, [customReports, standardCardDefaults]);

  // Keep refs in sync with state to avoid dependency issues in callbacks
  useEffect(() => {
    layoutsRef.current = layouts;
  }, [layouts]);

  useEffect(() => {
    hiddenCardsRef.current = hiddenCards;
  }, [hiddenCards]);

  // Save layouts to localStorage when they change (deferred during drag)
  const lastSavedLayoutRef = useRef<string>('');

  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    // Skip processing during initial mount to avoid infinite loop
    if (isInitialMountRef.current) return;

    if (isDraggingRef.current) {
      // During drag, just store the pending layout but don't save yet
      pendingLayoutRef.current = allLayouts;
      return;
    }

    // NOTE: Do NOT call setLayouts here — doing so triggers a re-render which causes
    // ResponsiveGridLayout to fire onLayoutChange again, creating an infinite loop.
    // Layout state is only updated on drag stop / resize stop.
    // Just persist to localStorage if something changed.

    // IMPORTANT: Merge with existing layouts to preserve hidden cards' positions
    // allLayouts only contains visible cards, so we need to add back hidden ones
    const mergedLayouts: { [key: string]: any[] } = {};
    const currentLayouts = layoutsRef.current;
    const currentHiddenCards = hiddenCardsRef.current;

    Object.keys(currentLayouts).forEach(bp => {
      // Get current visible layout from allLayouts
      const visibleLayout = allLayouts[bp] || [];
      // Get hidden cards' positions from existing layouts
      const hiddenLayout = (currentLayouts[bp] || []).filter((item: any) => currentHiddenCards.has(item.i));
      // Merge both
      mergedLayouts[bp] = [...visibleLayout, ...hiddenLayout];
    });

    const serialized = JSON.stringify(mergedLayouts);
    if (serialized === lastSavedLayoutRef.current) return;
    lastSavedLayoutRef.current = serialized;
    try {
      localStorage.setItem(UNIFIED_LAYOUT_KEY, serialized);
    } catch (error) {
      console.error("Error saving unified layout:", error);
    }
  }, []);

  // Drag start/stop handlers to defer layout saves
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleDragStop = useCallback((layout: any[], oldItem: any, newItem: any, placeholder: any, e: any, element: any) => {
    isDraggingRef.current = false;
    // Apply the pending layout that accumulated during drag
    if (pendingLayoutRef.current) {
      // Merge with hidden cards to preserve their positions
      const mergedLayouts: { [key: string]: any[] } = {};
      const currentLayouts = layoutsRef.current;
      const currentHiddenCards = hiddenCardsRef.current;

      Object.keys(currentLayouts).forEach(bp => {
        const visibleLayout = pendingLayoutRef.current![bp] || [];
        const hiddenLayout = (currentLayouts[bp] || []).filter((item: any) => currentHiddenCards.has(item.i));
        mergedLayouts[bp] = [...visibleLayout, ...hiddenLayout];
      });

      const serialized = JSON.stringify(mergedLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(mergedLayouts);
      try {
        localStorage.setItem(UNIFIED_LAYOUT_KEY, serialized);
      } catch (error) {
        console.error("Error saving unified layout:", error);
      }
      pendingLayoutRef.current = null;
    }
  }, []);

  const handleResizeStop = useCallback((layout: any[], oldItem: any, newItem: any, placeholder: any, e: any, element: any) => {
    // On resize stop, update state using updater form (no stale closure on `layouts`)
    const currentHiddenCards = hiddenCardsRef.current;

    setLayouts(prev => {
      const updated = { ...prev };
      // Match the breakpoint by layout length and merge with hidden cards
      Object.keys(updated).forEach(bp => {
        const visibleCount = layout.filter(item => !currentHiddenCards.has(item.i)).length;
        const prevVisibleCount = (updated[bp] || []).filter((item: any) => !currentHiddenCards.has(item.i)).length;

        if (visibleCount === prevVisibleCount) {
          // This is the matching breakpoint
          const hiddenLayout = (updated[bp] || []).filter((item: any) => currentHiddenCards.has(item.i));
          updated[bp] = [...layout, ...hiddenLayout];
        }
      });
      const serialized = JSON.stringify(updated);
      lastSavedLayoutRef.current = serialized;
      try {
        localStorage.setItem(UNIFIED_LAYOUT_KEY, serialized);
      } catch (error) {
        console.error("Error saving unified layout:", error);
      }
      return updated;
    });
  }, []);

  // Filter layouts to only include visible cards
  const visibleLayouts = useMemo(() => {
    const filtered: { [key: string]: any[] } = {};
    Object.keys(layouts).forEach(bp => {
      filtered[bp] = layouts[bp].filter((item: any) => !hiddenCards.has(item.i));
    });
    return filtered;
  }, [layouts, hiddenCards]);

  // Reset layout to default
  const resetLayout = useCallback(() => {
    const defaultResetLayouts = buildDefaultUnifiedLayout();
    setLayouts(defaultResetLayouts);
    localStorage.setItem(UNIFIED_LAYOUT_KEY, JSON.stringify(defaultResetLayouts));

    // Reset hidden cards
    setHiddenCards(new Set());
    localStorage.removeItem(HIDDEN_CARDS_KEY);

    toast({
      title: "Layout Reset",
      description: "Dashboard layout has been reset to default view",
    });
  }, [buildDefaultUnifiedLayout, toast]);

  // Get hidden card info for display
  const hiddenCardsList = useMemo(() => {
    const hiddenStandard = OVERVIEW_CARDS.filter(c => hiddenCards.has(c.id));
    const hiddenCustom = customReports.filter(r => hiddenCards.has(`report-${r.id}`));
    return { hiddenStandard, hiddenCustom };
  }, [hiddenCards, OVERVIEW_CARDS, customReports]);

  const totalHidden = hiddenCardsList.hiddenStandard.length + hiddenCardsList.hiddenCustom.length;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="w-4 h-4 mr-2" />
              Manage Widgets
              {totalHidden > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                  {totalHidden} hidden
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-1">Show / Hide Cards</h4>
                <p className="text-xs text-muted-foreground">Toggle visibility of dashboard widgets</p>
              </div>
              {OVERVIEW_CARDS.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Standard</p>
                  {OVERVIEW_CARDS.map(card => (
                    <div key={card.id} className="flex items-center justify-between">
                      <label htmlFor={`toggle-${card.id}`} className="text-sm cursor-pointer">{card.label}</label>
                      <Switch
                        id={`toggle-${card.id}`}
                        checked={!hiddenCards.has(card.id)}
                        onCheckedChange={() => toggleCardVisibility(card.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
              {customReports.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custom Reports</p>
                  {customReports.map(report => (
                    <div key={report.id} className="flex items-center justify-between">
                      <label htmlFor={`toggle-report-${report.id}`} className="text-sm cursor-pointer truncate mr-2">{report.title}</label>
                      <Switch
                        id={`toggle-report-${report.id}`}
                        checked={!hiddenCards.has(`report-${report.id}`)}
                        onCheckedChange={() => toggleCardVisibility(`report-${report.id}`)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      {/* Unified Resizable/Draggable Grid Layout (standard + custom cards together) */}
      <ResponsiveGridLayout
        key={Array.from(hiddenCards).sort().join(',')}
        className={`layout${isMounted ? '' : ' no-transition'}`}
        layouts={visibleLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        useCSSTransforms={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
      >
        {/* --- Standard Cards --- */}
        {!hiddenCards.has("risk-assessments") && <div key="risk-assessments">
          <DraggableCard
            title="Risk Assessments"
            subtitle="Total GBU"
            value={stats.totalRiskAssessments}
            icon={<Shield className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
            onHide={() => toggleCardVisibility("risk-assessments")}
          />
        </div>}

        {!hiddenCards.has("safety-audits") && <div key="safety-audits">
          <DraggableCard
            title="Safety Audits"
            subtitle={`${stats.completedAudits} completed`}
            value={stats.totalAudits}
            icon={<ClipboardCheck className="w-5 h-5" />}
            color="bg-blue-50 text-blue-600"
            onHide={() => toggleCardVisibility("safety-audits")}
          />
        </div>}

        {!hiddenCards.has("incidents") && <div key="incidents">
          <DraggableCard
            title="Incidents"
            subtitle={`${stats.openIncidents} open cases`}
            value={stats.totalIncidents}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="bg-red-50 text-red-600"
            onHide={() => toggleCardVisibility("incidents")}
          />
        </div>}

        {!hiddenCards.has("training-compliance") && <div key="training-compliance">
          <DraggableCard
            title="Training Compliance"
            subtitle="Overall rate"
            value={`${stats.trainingCompliance}%`}
            icon={<GraduationCap className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
            onHide={() => toggleCardVisibility("training-compliance")}
          />
        </div>}

        {!hiddenCards.has("incident-trends") && <div key="incident-trends">
          <Card className="dashboard-grid-card border shadow-sm h-full group">
            <div className="drag-handle border-b flex items-center justify-between px-3">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <button
                onClick={(e) => { e.stopPropagation(); toggleCardVisibility("incident-trends"); }}
                className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
                title="Hide this card"
              >
                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <CardHeader className="py-4 pb-3">
              <CardTitle className="text-lg">Incident Trends</CardTitle>
              <CardDescription>Monthly incident reports over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="incidents"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIncidents)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>}

        {!hiddenCards.has("audit-completion") && <div key="audit-completion">
          <Card className="dashboard-grid-card border shadow-sm h-full overflow-hidden group">
            <div className="drag-handle border-b flex items-center justify-between px-3">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <button
                onClick={(e) => { e.stopPropagation(); toggleCardVisibility("audit-completion"); }}
                className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
                title="Hide this card"
              >
                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <CardHeader className="py-2 pb-1 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-blue-600" />
                Audit Completion
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center pb-3 pt-1 px-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center py-1.5 px-2 rounded-md bg-blue-50">
                  <div className="text-lg font-bold text-blue-600">{stats.totalAudits}</div>
                  <div className="text-[9px] text-blue-600/70">Total</div>
                </div>
                <div className="flex-1 text-center py-1.5 px-2 rounded-md bg-green-50">
                  <div className="text-lg font-bold text-green-600">{stats.completedAudits}</div>
                  <div className="text-[9px] text-green-600/70">Done</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xl font-bold">
                    {stats.totalAudits > 0 ? Math.round((stats.completedAudits / stats.totalAudits) * 100) : 0}%
                  </div>
                  <div className="text-[9px] text-muted-foreground">Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>}

        {!hiddenCards.has("task-completion") && <div key="task-completion">
          <Card className="dashboard-grid-card border shadow-sm h-full overflow-hidden group">
            <div className="drag-handle border-b flex items-center justify-between px-3">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <button
                onClick={(e) => { e.stopPropagation(); toggleCardVisibility("task-completion"); }}
                className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
                title="Hide this card"
              >
                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <CardHeader className="py-2 pb-1 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-blue-600" />
                Task Completion
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center pb-3 pt-1 px-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center py-1.5 px-2 rounded-md bg-blue-50">
                  <div className="text-lg font-bold text-blue-600">{stats.totalTasks}</div>
                  <div className="text-[9px] text-blue-600/70">Total</div>
                </div>
                <div className="flex-1 text-center py-1.5 px-2 rounded-md bg-green-50">
                  <div className="text-lg font-bold text-green-600">{stats.completedTasks}</div>
                  <div className="text-[9px] text-green-600/70">Done</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xl font-bold">
                    {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
                  </div>
                  <div className="text-[9px] text-muted-foreground">Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>}

        {/* --- Custom Report Cards (in the same grid) --- */}
        {customReports.map((report) => (
          !hiddenCards.has(`report-${report.id}`) && <div key={`report-${report.id}`} className="h-full">
            <ReportWidget
              config={report}
              onEdit={onEditReport}
              onDuplicate={onDuplicateReport}
              onDelete={onDeleteReport}
              onExport={onExportReport}
            />
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Hidden Cards Section */}
      {totalHidden > 0 && (
        <div className="border rounded-lg bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <EyeOff className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-muted-foreground">Hidden Widgets ({totalHidden})</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {hiddenCardsList.hiddenStandard.map(card => (
              <button
                key={card.id}
                onClick={() => toggleCardVisibility(card.id)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
              >
                {card.icon}
                <span>{card.label}</span>
                <Eye className="w-3.5 h-3.5 ml-1 text-muted-foreground" />
              </button>
            ))}
            {hiddenCardsList.hiddenCustom.map(report => (
              <button
                key={report.id}
                onClick={() => toggleCardVisibility(`report-${report.id}`)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
              >
                <BarChart3 className="w-4 h-4" />
                <span>{report.title}</span>
                <Eye className="w-3.5 h-3.5 ml-1 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Draggable Grid Section Wrapper
interface DraggableGridSectionProps {
  sectionId: string;
  title: string;
  description: string;
  defaultLayout: any[];
  handleColor?: string;
  children: (lockStates: { [key: string]: boolean }, toggleLock: (id: string) => void) => React.ReactNode;
}

function DraggableGridSection({
  sectionId,
  title,
  description,
  defaultLayout,
  handleColor = "text-primary",
  children,
}: DraggableGridSectionProps) {
  const { toast } = useToast();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');

  useEffect(() => {
    const timer = setTimeout(() => { isInitialMountRef.current = false; }, 200);
    return () => clearTimeout(timer);
  }, []);

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem(SECTION_LAYOUT_KEYS[sectionId as keyof typeof SECTION_LAYOUT_KEYS]);
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error(`Error loading ${sectionId} layout:`, error);
    }
    return { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
  });

  const [lockStates, setLockStates] = useState<{ [key: string]: boolean }>({});

  const handleLayoutChange = useCallback(
    (currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
      if (isInitialMountRef.current) return;
      if (isDraggingRef.current) {
        pendingLayoutRef.current = allLayouts;
        return;
      }
      // Only persist if actually changed
      const serialized = JSON.stringify(allLayouts);
      if (serialized === lastSavedLayoutRef.current) return;
      lastSavedLayoutRef.current = serialized;
      try {
        localStorage.setItem(SECTION_LAYOUT_KEYS[sectionId as keyof typeof SECTION_LAYOUT_KEYS], serialized);
      } catch (error) {
        console.error(`Error saving ${sectionId} layout:`, error);
      }
    },
    [sectionId]
  );

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleDragStop = useCallback(() => {
    isDraggingRef.current = false;
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try {
        localStorage.setItem(SECTION_LAYOUT_KEYS[sectionId as keyof typeof SECTION_LAYOUT_KEYS], serialized);
      } catch (error) {
        console.error(`Error saving ${sectionId} layout:`, error);
      }
      pendingLayoutRef.current = null;
    }
  }, [sectionId]);

  const handleResizeStop = useCallback(() => {
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try {
        localStorage.setItem(SECTION_LAYOUT_KEYS[sectionId as keyof typeof SECTION_LAYOUT_KEYS], serialized);
      } catch (error) {
        console.error(`Error saving ${sectionId} layout:`, error);
      }
      pendingLayoutRef.current = null;
    }
  }, [sectionId]);

  // Reset layout to default
  const onResetLayout = useCallback(() => {
    const defaultLayouts = { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
    setLayouts(defaultLayouts);
    localStorage.removeItem(SECTION_LAYOUT_KEYS[sectionId as keyof typeof SECTION_LAYOUT_KEYS]);
    toast({
      title: "Layout Reset",
      description: `${title} layout has been reset to default`,
    });
  }, [defaultLayout, sectionId, title, toast]);

  const toggleLock = useCallback((itemId: string) => {
    setLockStates((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  // Update layout to respect lock states
  const layoutsWithLocks = useMemo(() => {
    const updatedLayouts = { ...layouts };
    Object.keys(updatedLayouts).forEach((breakpoint) => {
      updatedLayouts[breakpoint] = updatedLayouts[breakpoint].map((item: any) => ({
        ...item,
        static: lockStates[item.i] || false,
      }));
    });
    return updatedLayouts;
  }, [layouts, lockStates]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">

        <div>
          {/* Title and description removed per user request */}
        </div>
        <Button variant="outline" size="sm" onClick={onResetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layoutsWithLocks}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        useCSSTransforms={false}
        preventCollision={false}
        autoSize={true}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType={null}
      >
        {children(lockStates, toggleLock)}
      </ResponsiveGridLayout>
    </div>
  );
}

// Enhanced Draggable Card with Lock Feature
function EnhancedDraggableCard({
  id,
  title,
  subtitle,
  value,
  icon,
  color,
  handleColor = "text-muted-foreground",
  isLocked = false,
  onToggleLock,
}: {
  id: string;
  title: string;
  subtitle: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  handleColor?: string;
  isLocked?: boolean;
  onToggleLock?: () => void;
}) {
  return (
    <Card className="dashboard-grid-card border hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
      <div className="drag-handle border-b flex items-center justify-between px-3">
        <GripVertical className={`w-4 h-4 ${handleColor} ${isLocked ? 'opacity-30' : ''}`} />
        {onToggleLock && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock();
            }}
            className="p-1 hover:bg-muted rounded transition-colors"
            title={isLocked ? "Unlock card" : "Lock card"}
          >
            {isLocked ? (
              <Lock className="w-3 h-3 text-orange-500" />
            ) : (
              <Unlock className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
            )}
          </button>
        )}
      </div>
      <CardContent className="p-6 flex-1 flex flex-col justify-center group">
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

// Draggable KPI Card Component
function DraggableCard({
  title,
  subtitle,
  value,
  icon,
  color,
  onHide,
}: {
  title: string;
  subtitle: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  onHide?: () => void;
}) {
  return (
    <Card className="dashboard-grid-card border hover:border-primary/50 transition-colors shadow-sm h-full group">
      <div className="drag-handle border-b cursor-grab active:cursor-grabbing flex-shrink-0 flex items-center justify-between px-2">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
        {onHide && (
          <button
            onClick={(e) => { e.stopPropagation(); onHide(); }}
            className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
            title="Hide this card"
          >
            <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-3 overflow-hidden">
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0 mb-2`}>
          {icon}
        </div>
        <h3 className="font-medium text-foreground text-sm leading-tight">{title}</h3>
        <p className="text-muted-foreground text-xs mb-1">{subtitle}</p>
        <p className="font-bold text-foreground text-xl">{value}</p>
      </CardContent>
    </Card>
  );
}

// KPI Card Component (non-draggable version for sections)
function KPICard({
  title,
  subtitle,
  value,
  icon,
  color,
}: {
  title: string;
  subtitle: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="border hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
          {icon}
        </div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

// Sections with draggable card layouts
function RiskAssessmentsSection({ stats, chartData }: { stats: ReportStats; chartData: any[] }) {
  const { toast } = useToast();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');
  const defaultLayout = {
    lg: [{ i: "risk-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false }],
    md: [{ i: "risk-total", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false }],
    sm: [{ i: "risk-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false }],
  };

  useEffect(() => {
    const timer = setTimeout(() => { isInitialMountRef.current = false; }, 200);
    return () => clearTimeout(timer);
  }, []);

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_risk_assessments');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading risk assessments layout:', error);
    }
    return defaultLayout;
  });

  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    if (isInitialMountRef.current) return;
    if (isDraggingRef.current) {
      pendingLayoutRef.current = allLayouts;
      return;
    }
    const serialized = JSON.stringify(allLayouts);
    if (serialized === lastSavedLayoutRef.current) return;
    lastSavedLayoutRef.current = serialized;
    try {
      localStorage.setItem('hse_layout_risk_assessments', serialized);
    } catch (error) {
      console.error('Error saving risk assessments layout:', error);
    }
  }, []);

  const handleDragStart = useCallback(() => { isDraggingRef.current = true; }, []);
  const handleDragStop = useCallback(() => {
    isDraggingRef.current = false;
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_risk_assessments', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);
  const handleResizeStop = useCallback(() => {
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_risk_assessments', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = defaultLayout;
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_risk_assessments');
    toast({ title: "Layout Reset", description: "Risk Assessments layout has been reset to default" });
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Risk Assessments</h2>
          <p className="text-muted-foreground">GBU and hazard analysis. Drag cards to reposition, drag corners to resize.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
      >
        <div key="risk-total">
          <DraggableCard
            title="Total GBU"
            subtitle="Risk assessments"
            value={stats.totalRiskAssessments}
            icon={<Shield className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
          />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}

function AuditsSection({ stats, chartData }: { stats: ReportStats; chartData: any[] }) {
  const { toast } = useToast();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');
  const defaultLayout = {
    lg: [
      { i: "audit-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "audit-completed", x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
    ],
    md: [
      { i: "audit-total", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "audit-completed", x: 5, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
    ],
    sm: [
      { i: "audit-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "audit-completed", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
    ],
  };

  useEffect(() => {
    const timer = setTimeout(() => { isInitialMountRef.current = false; }, 200);
    return () => clearTimeout(timer);
  }, []);

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_audits');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading audits layout:', error);
    }
    return defaultLayout;
  });

  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    if (isInitialMountRef.current) return;
    if (isDraggingRef.current) {
      pendingLayoutRef.current = allLayouts;
      return;
    }
    const serialized = JSON.stringify(allLayouts);
    if (serialized === lastSavedLayoutRef.current) return;
    lastSavedLayoutRef.current = serialized;
    try {
      localStorage.setItem('hse_layout_audits', serialized);
    } catch (error) {
      console.error('Error saving audits layout:', error);
    }
  }, []);

  const handleDragStart = useCallback(() => { isDraggingRef.current = true; }, []);
  const handleDragStop = useCallback(() => {
    isDraggingRef.current = false;
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_audits', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);
  const handleResizeStop = useCallback(() => {
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_audits', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = defaultLayout;
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_audits');
    toast({ title: "Layout Reset", description: "Audits layout has been reset to default" });
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Safety Audits</h2>
          <p className="text-muted-foreground">Tracks compliance checks and ISO standard audits. This shows audit completion status and helps ensure regulatory compliance.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
      >
        <div key="audit-total">
          <DraggableCard
            title="Total Audits"
            subtitle="All audits"
            value={stats.totalAudits}
            icon={<ClipboardCheck className="w-5 h-5" />}
            color="bg-blue-50 text-blue-600"
          />
        </div>
        <div key="audit-completed">
          <DraggableCard
            title="Completed"
            subtitle="Finished audits"
            value={stats.completedAudits}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}

function IncidentsSection({ stats, chartData }: { stats: ReportStats; chartData: any[] }) {
  const { toast } = useToast();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');
  const defaultLayout = {
    lg: [
      { i: "incident-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-open", x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-closed", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
    ],
    md: [
      { i: "incident-total", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-open", x: 5, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-closed", x: 0, y: 2, w: 5, h: 2, minW: 2, minH: 2, static: false },
    ],
    sm: [
      { i: "incident-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-open", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-closed", x: 0, y: 4, w: 6, h: 2, minW: 2, minH: 2, static: false },
    ],
  };

  useEffect(() => {
    const timer = setTimeout(() => { isInitialMountRef.current = false; }, 200);
    return () => clearTimeout(timer);
  }, []);

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_incidents');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading incidents layout:', error);
    }
    return defaultLayout;
  });

  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    if (isInitialMountRef.current) return;
    if (isDraggingRef.current) {
      pendingLayoutRef.current = allLayouts;
      return;
    }
    const serialized = JSON.stringify(allLayouts);
    if (serialized === lastSavedLayoutRef.current) return;
    lastSavedLayoutRef.current = serialized;
    try {
      localStorage.setItem('hse_layout_incidents', serialized);
    } catch (error) {
      console.error('Error saving incidents layout:', error);
    }
  }, []);

  const handleDragStart = useCallback(() => { isDraggingRef.current = true; }, []);
  const handleDragStop = useCallback(() => {
    isDraggingRef.current = false;
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_incidents', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);
  const handleResizeStop = useCallback(() => {
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_incidents', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = defaultLayout;
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_incidents');
    toast({ title: "Layout Reset", description: "Incidents layout has been reset to default" });
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Incidents</h2>
          <p className="text-muted-foreground">Workplace incident tracking. Drag cards to reposition, drag corners to resize.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
      >
        <div key="incident-total">
          <DraggableCard
            title="Total Incidents"
            subtitle="All incidents"
            value={stats.totalIncidents}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="bg-red-50 text-red-600"
          />
        </div>
        <div key="incident-open">
          <DraggableCard
            title="Open Cases"
            subtitle="Under investigation"
            value={stats.openIncidents}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
          />
        </div>
        <div key="incident-closed">
          <DraggableCard
            title="Closed"
            subtitle="Resolved incidents"
            value={stats.totalIncidents - stats.openIncidents}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}

function TrainingsSection({
  stats,
  trainingMatrix,
  chartData,
}: {
  stats: ReportStats;
  trainingMatrix: TrainingStatus[];
  chartData: any[];
}) {
  const { toast } = useToast();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');
  const defaultLayout = {
    lg: [
      { i: "training-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "training-compliance", x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
    ],
    md: [
      { i: "training-total", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "training-compliance", x: 5, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
    ],
    sm: [
      { i: "training-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "training-compliance", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
    ],
  };

  useEffect(() => {
    const timer = setTimeout(() => { isInitialMountRef.current = false; }, 200);
    return () => clearTimeout(timer);
  }, []);

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_trainings');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading trainings layout:', error);
    }
    return defaultLayout;
  });

  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    if (isInitialMountRef.current) return;
    if (isDraggingRef.current) {
      pendingLayoutRef.current = allLayouts;
      return;
    }
    const serialized = JSON.stringify(allLayouts);
    if (serialized === lastSavedLayoutRef.current) return;
    lastSavedLayoutRef.current = serialized;
    try {
      localStorage.setItem('hse_layout_trainings', serialized);
    } catch (error) {
      console.error('Error saving trainings layout:', error);
    }
  }, []);

  const handleDragStart = useCallback(() => { isDraggingRef.current = true; }, []);
  const handleDragStop = useCallback(() => {
    isDraggingRef.current = false;
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_trainings', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);
  const handleResizeStop = useCallback(() => {
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_trainings', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);


  const resetLayout = useCallback(() => {
    const defaultLayouts = { lg: defaultLayout, md: defaultLayout, sm: defaultLayout } as any;
    setLayouts(defaultLayouts);
    try {
      localStorage.removeItem('hse_layout_trainings');
    } catch (e) {
      console.error(e);
    }
    toast({ title: "Layout Reset", description: "Trainings layout has been reset to default" });
  }, [toast]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Trainings</h2>
          <p className="text-muted-foreground">Employee training compliance. Drag cards to reposition, drag corners to resize.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
      >
        <div key="training-total">
          <DraggableCard
            title="Total Courses"
            subtitle="Training programs"
            value={stats.totalTrainings}
            icon={<GraduationCap className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>
        <div key="training-compliance">
          <DraggableCard
            title="Compliance Rate"
            subtitle="Overall compliance"
            value={`${stats.trainingCompliance}%`}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-blue-50 text-blue-600"
          />
        </div>
      </ResponsiveGridLayout>

      {/* Training Matrix */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Employee Training Matrix</CardTitle>
          <CardDescription>Training compliance by employee</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Employee Name</TableHead>
                  <TableHead className="font-semibold">Required</TableHead>
                  <TableHead className="font-semibold">Completed</TableHead>
                  <TableHead className="font-semibold">Expired</TableHead>
                  <TableHead className="font-semibold">Compliance</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainingMatrix.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No training data available
                    </TableCell>
                  </TableRow>
                ) : (
                  trainingMatrix.map((item, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{item.employee_name}</TableCell>
                      <TableCell>{item.total_required}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {item.completed}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.expired > 0 ? (
                          <Badge variant="destructive">{item.expired}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{item.compliance_rate}%</TableCell>
                      <TableCell>
                        {item.compliance_rate >= 80 ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Compliant
                          </Badge>
                        ) : item.compliance_rate >= 50 ? (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            Needs Attention
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Non-Compliant</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MeasuresSection({ stats, chartData }: { stats: ReportStats; chartData: any[] }) {
  const { toast } = useToast();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');
  const defaultLayout = {
    lg: [
      { i: "measures-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "measures-completed", x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "measures-progress", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
    ],
    md: [
      { i: "measures-total", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "measures-completed", x: 5, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "measures-progress", x: 0, y: 2, w: 5, h: 2, minW: 2, minH: 2, static: false },
    ],
    sm: [
      { i: "measures-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "measures-completed", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "measures-progress", x: 0, y: 4, w: 6, h: 2, minW: 2, minH: 2, static: false },
    ],
  };

  useEffect(() => {
    const timer = setTimeout(() => { isInitialMountRef.current = false; }, 200);
    return () => clearTimeout(timer);
  }, []);

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_measures_v2');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading measures layout:', error);
    }
    return defaultLayout;
  });

  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    if (isInitialMountRef.current) return;
    if (isDraggingRef.current) {
      pendingLayoutRef.current = allLayouts;
      return;
    }
    const serialized = JSON.stringify(allLayouts);
    if (serialized === lastSavedLayoutRef.current) return;
    lastSavedLayoutRef.current = serialized;
    try {
      localStorage.setItem('hse_layout_measures_v2', serialized);
    } catch (error) {
      console.error('Error saving measures layout:', error);
    }
  }, []);

  const handleDragStart = useCallback(() => { isDraggingRef.current = true; }, []);
  const handleDragStop = useCallback(() => {
    isDraggingRef.current = false;
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_measures_v2', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);
  const handleResizeStop = useCallback(() => {
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_measures_v2', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = defaultLayout;
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_measures_v2');
    toast({ title: "Layout Reset", description: "Measures layout has been reset to default" });
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Measures</h2>
          <p className="text-muted-foreground">Tracks corrective and preventive actions derived from risk assessments, audit findings, and incident investigations.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
      >
        <div key="measures-total">
          <DraggableCard
            title="Total Measures"
            subtitle="All measures"
            value={stats.totalMeasures}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-purple-50 text-purple-600"
          />
        </div>
        <div key="measures-completed">
          <DraggableCard
            title="Completed"
            subtitle="Finished measures"
            value={stats.completedMeasures}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>
        <div key="measures-progress">
          <DraggableCard
            title="In Progress"
            subtitle="Active measures"
            value={stats.totalMeasures - stats.completedMeasures}
            icon={<TrendingUp className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
          />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}

function TasksSection({ stats, chartData }: { stats: ReportStats; chartData: any[] }) {
  const { toast } = useToast();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');
  const defaultLayout = {
    lg: [
      { i: "tasks-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "tasks-completed", x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
    ],
    md: [
      { i: "tasks-total", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "tasks-completed", x: 5, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
    ],
    sm: [
      { i: "tasks-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "tasks-completed", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
    ],
  };

  useEffect(() => {
    const timer = setTimeout(() => { isInitialMountRef.current = false; }, 200);
    return () => clearTimeout(timer);
  }, []);

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_tasks');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading tasks layout:', error);
    }
    return defaultLayout;
  });

  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    if (isInitialMountRef.current) return;
    if (isDraggingRef.current) {
      pendingLayoutRef.current = allLayouts;
      return;
    }
    const serialized = JSON.stringify(allLayouts);
    if (serialized === lastSavedLayoutRef.current) return;
    lastSavedLayoutRef.current = serialized;
    try {
      localStorage.setItem('hse_layout_tasks', serialized);
    } catch (error) {
      console.error('Error saving tasks layout:', error);
    }
  }, []);

  const handleDragStart = useCallback(() => { isDraggingRef.current = true; }, []);
  const handleDragStop = useCallback(() => {
    isDraggingRef.current = false;
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_tasks', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);
  const handleResizeStop = useCallback(() => {
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_tasks', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = defaultLayout;
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_tasks');
    toast({ title: "Layout Reset", description: "Tasks layout has been reset to default" });
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Tasks</h2>
          <p className="text-muted-foreground">Task management and completion. Drag cards to reposition, drag corners to resize.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
      >
        <div key="tasks-total">
          <DraggableCard
            title="Total Tasks"
            subtitle="All tasks"
            value={stats.totalTasks}
            icon={<ListChecks className="w-5 h-5" />}
            color="bg-indigo-50 text-indigo-600"
          />
        </div>
        <div key="tasks-completed">
          <DraggableCard
            title="Completed"
            subtitle="Finished tasks"
            value={stats.completedTasks}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}

function CheckupsSection({ stats }: { stats: ReportStats }) {
  const { toast } = useToast();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');
  const defaultLayout = {
    lg: [{ i: "checkups-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false }],
    md: [{ i: "checkups-total", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false }],
    sm: [{ i: "checkups-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false }],
  };

  useEffect(() => {
    const timer = setTimeout(() => { isInitialMountRef.current = false; }, 200);
    return () => clearTimeout(timer);
  }, []);

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_checkups');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading checkups layout:', error);
    }
    return defaultLayout;
  });

  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    if (isInitialMountRef.current) return;
    if (isDraggingRef.current) {
      pendingLayoutRef.current = allLayouts;
      return;
    }
    const serialized = JSON.stringify(allLayouts);
    if (serialized === lastSavedLayoutRef.current) return;
    lastSavedLayoutRef.current = serialized;
    try {
      localStorage.setItem('hse_layout_checkups', serialized);
    } catch (error) {
      console.error('Error saving checkups layout:', error);
    }
  }, []);

  const handleDragStart = useCallback(() => { isDraggingRef.current = true; }, []);
  const handleDragStop = useCallback(() => {
    isDraggingRef.current = false;
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_checkups', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);
  const handleResizeStop = useCallback(() => {
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_checkups', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = defaultLayout;
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_checkups');
    toast({ title: "Layout Reset", description: "Checkups layout has been reset to default" });
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Health Check-ups</h2>
          <p className="text-muted-foreground">Tracks G-Investigation health examinations (e.g., vision tests, hearing tests) for occupational medical care compliance.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
      >
        <div key="checkups-total">
          <DraggableCard
            title="Total Check-ups"
            subtitle="Health monitoring"
            value={stats.totalCheckUps}
            icon={<Stethoscope className="w-5 h-5" />}
            color="bg-teal-50 text-teal-600"
          />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}
