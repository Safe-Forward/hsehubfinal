import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Users,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  LogOut,
  Settings,
  FileText,
  ListTodo,
  BarChart,
  TrendingUp,
  TrendingDown,
  Bell,
  SlidersHorizontal,
  Plus,
  ClipboardList,
  UserPlus,
  Zap,
  XCircle,
  GripVertical,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

const ALL_KPI_IDS = [
  "employees",
  "overdueObligations",
  "recentIncidents",
  "recentHazards",
  "openMeasures",
  "overdueMeasures",
  "upcomingCheckups",
  "trainingCompletionRate",
  "auditComplianceRate",
];

// Virtual widgets — appear in "Kacheln anpassen" but render no KPI card
const SIDEBAR_WIDGET_IDS = ["sidebarMeasuresBadge"];

const sidebarWidgetLabels: Record<string, string> = {
  sidebarMeasuresBadge: "Maßnahmen-Badge (Sidebar)",
};

const DEFAULT_KPI_IDS = [
  "employees",
  "overdueObligations",
  "recentIncidents",
  "recentHazards",
  "overdueMeasures",
  "upcomingCheckups",
  "trainingCompletionRate",
  "auditComplianceRate",
];

export default function Dashboard() {
  const { user, userRole, companyId, companyName, loading, signOut } =
    useAuth();
  const { logError } = useAuditLog();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    employees: 0,
    riskAssessments: 0,
    audits: 0,
    tasks: 0,
    complianceRate: 0,
    overdueObligations: 0,
    recentIncidents: 0,
    recentHazards: 0,
    openMeasures: 0,
    overdueMeasures: 0,
    upcomingCheckups: 0,
    trainingCompletionRate: 0,
    // For context labels
    totalMeasures: 0,
    overdueCheckups: 0,
  });

  const [investigationStats, setInvestigationStats] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("upcoming");
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [currentEmployeeName, setCurrentEmployeeName] = useState<string | null>(null);

  // Customizable KPI cards
  const [visibleKpis, setVisibleKpis] = useState<string[]>(DEFAULT_KPI_IDS);
  const [kpiSettingsOpen, setKpiSettingsOpen] = useState(false);

  // Drag-to-reorder for KPI cards
  const draggedKpiRef = useRef<string | null>(null);
  const [dragOverKpiId, setDragOverKpiId] = useState<string | null>(null);

  // Drag-to-reorder for bottom widgets
  const [sectionOrder, setSectionOrder] = useState<string[]>(["investigations", "tasks"]);
  const draggedSectionRef = useRef<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);

  // Overdue measures older than 30 days (for critical warnings)
  const [oldOverdueMeasures, setOldOverdueMeasures] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hse_dashboard_visible_kpis");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const allValidIds = [...ALL_KPI_IDS, ...SIDEBAR_WIDGET_IDS];
          setVisibleKpis(parsed.filter((id: string) => allValidIds.includes(id)));
        }
      }
    } catch (e) {
      console.error("Error loading KPI preferences:", e);
    }
    try {
      const storedSections = localStorage.getItem("hse_dashboard_section_order");
      if (storedSections) {
        const parsed = JSON.parse(storedSections);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSectionOrder(parsed.filter((id: string) => ["investigations", "tasks"].includes(id)));
        }
      }
    } catch (e) {
      console.error("Error loading section order:", e);
    }
  }, []);

  const toggleKpiVisibility = (id: string) => {
    setVisibleKpis((prev) => {
      const updated = prev.includes(id)
        ? prev.filter((k) => k !== id)
        : [...prev, id];
      localStorage.setItem("hse_dashboard_visible_kpis", JSON.stringify(updated));
      // Notify same-tab listeners (storage event only fires cross-tab)
      window.dispatchEvent(new CustomEvent("hse_kpi_prefs_changed"));
      return updated;
    });
  };

  useEffect(() => {
    const fetchEmployeeId = async () => {
      if (user?.email && companyId) {
        console.log("🔍 Looking up Employee ID for:", user.email, "Company:", companyId);

        const { data: empByEmail, error } = await supabase
          .from("employees")
          .select("id, full_name")
          .eq("email", user.email)
          .eq("company_id", companyId)
          .maybeSingle();

        if (error) {
          console.error("❌ Error fetching employee ID:", error);
        }

        if (empByEmail) {
          console.log("✅ Found Employee ID (by email):", empByEmail.id);
          setCurrentEmployeeId(empByEmail.id);
          setCurrentEmployeeName(empByEmail.full_name);
        } else {
          const { data: empByEmailInsen } = await supabase
            .from("employees")
            .select("id, full_name")
            .ilike("email", user.email)
            .eq("company_id", companyId)
            .maybeSingle();

          if (empByEmailInsen) {
            console.log("✅ Found Employee ID (case-insensitive email):", empByEmailInsen.id);
            setCurrentEmployeeId(empByEmailInsen.id);
            setCurrentEmployeeName(empByEmailInsen.full_name);
          } else {
            console.log("⚠️ Email lookup failed — trying auth user_id fallback for:", user.id);
            const { data: empByUserId } = await supabase
              .from("employees")
              .select("id, full_name")
              .eq("user_id", user.id)
              .eq("company_id", companyId)
              .maybeSingle();

            if (empByUserId) {
              console.log("✅ Found Employee ID (by user_id):", empByUserId.id);
              setCurrentEmployeeId(empByUserId.id);
              setCurrentEmployeeName(empByUserId.full_name);
            } else {
              console.log("⚠️ Not in employees table — trying team_members by user_id...");
              const { data: memberByUserId } = await supabase
                .from("team_members")
                .select("id, first_name, last_name")
                .eq("user_id", user.id)
                .eq("company_id", companyId)
                .maybeSingle();

              if (memberByUserId) {
                const fullName = `${memberByUserId.first_name} ${memberByUserId.last_name}`.trim();
                console.log("✅ Found in team_members (by user_id):", fullName);
                setCurrentEmployeeName(fullName);
              } else {
                const { data: memberByEmail } = await supabase
                  .from("team_members")
                  .select("id, first_name, last_name")
                  .ilike("email", user.email)
                  .eq("company_id", companyId)
                  .maybeSingle();

                if (memberByEmail) {
                  const fullName = `${memberByEmail.first_name} ${memberByEmail.last_name}`.trim();
                  console.log("✅ Found in team_members (by email):", fullName);
                  setCurrentEmployeeName(fullName);
                } else {
                  console.warn("⚠️ No profile found in employees or team_members. Showing broadcast tasks only.");
                  setCurrentEmployeeName("");
                }
              }
            }
          }
        }
      }
    };

    if (user && companyId) {
      fetchEmployeeId();
    }
  }, [user, companyId]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (companyId && userRole !== "super_admin") {
      fetchStats();
      fetchInvestigationStats();
    }
  }, [companyId, userRole]);

  useEffect(() => {
    if (!companyId || userRole === "super_admin") return;

    const statTables = [
      "employees",
      "training_records",
      "measures",
      "risk_assessment_measures",
      "health_checkups",
      "incidents",
      "risk_assessments",
    ];

    const channels = statTables.map((table) =>
      supabase
        .channel(`dashboard_stats_${companyId}_${table}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `company_id=eq.${companyId}`,
          },
          () => {
            fetchStats();
          }
        )
        .subscribe()
    );

    const refreshInterval = window.setInterval(() => {
      fetchStats();
    }, 60000);

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      window.clearInterval(refreshInterval);
    };
  }, [companyId, userRole]);

  useEffect(() => {
    if (companyId && userRole !== "super_admin" && currentEmployeeName !== null) {
      fetchTasks();
    }
  }, [companyId, userRole, currentEmployeeId, currentEmployeeName, taskStatusFilter]);

  const fetchStats = async () => {
    if (!companyId) return;

    try {
      const [employeesRes, risksRes, auditsRes, tasksRes, auditProgressRes] =
        await Promise.all([
          supabase
            .from("employees")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId),
          supabase
            .from("risk_assessments")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId),
          supabase
            .from("audits")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId),
          supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId),
          supabase
            .from("audits")
            .select("total_items, completed_items")
            .eq("company_id", companyId),
        ]);

      const totalAudits = auditsRes.count || 0;
      const auditItems = auditProgressRes.data || [];
      const totalItemsSum = auditItems.reduce(
        (sum: number, a: any) => sum + (a.total_items || 0),
        0
      );
      const completedItemsSum = auditItems.reduce(
        (sum: number, a: any) => sum + (a.completed_items || 0),
        0
      );
      const complianceRate =
        totalItemsSum > 0
          ? Math.round((completedItemsSum / totalItemsSum) * 100)
          : 0;

      const overdueObligations = await fetchOverdueObligations();
      const recentIncidents = await fetchRecentIncidents();
      const recentHazards = await fetchRecentHazards();
      const measuresStats = await fetchMeasuresStats();
      const upcomingCheckups = await fetchUpcomingCheckups();
      const trainingCompletionRate = await fetchTrainingCompletionRate();

      // Fetch overdue measures older than 30 days for critical warnings (measures + RAM)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
      const [{ count: oldOverdueCount }, { count: oldOverdueRamCount }] = await Promise.all([
        supabase
          .from("measures")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .neq("status", "completed")
          .lt("due_date", thirtyDaysAgoStr),
        (supabase as any)
          .from("risk_assessment_measures")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .not("progress_status", "in", "(completed,done)")
          .lt("due_date", thirtyDaysAgoStr),
      ]);
      setOldOverdueMeasures((oldOverdueCount || 0) + (oldOverdueRamCount || 0));

      // Overdue checkups count for context
      const today = new Date().toISOString().split("T")[0];
      const [overdueCheckupsByDue, overdueCheckupsByAppt] = await Promise.all([
        supabase
          .from("health_checkups")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .in("status", ["open", "planned"])
          .lt("due_date", today),
        supabase
          .from("health_checkups")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .in("status", ["open", "planned"])
          .is("due_date", null)
          .lt("appointment_date", today),
      ]);
      const overdueCheckups = (overdueCheckupsByDue.count || 0) + (overdueCheckupsByAppt.count || 0);

      setStats({
        employees: employeesRes.count || 0,
        riskAssessments: risksRes.count || 0,
        audits: totalAudits || 0,
        tasks: tasksRes.count || 0,
        complianceRate,
        overdueObligations,
        recentIncidents,
        recentHazards,
        openMeasures: measuresStats.open,
        overdueMeasures: measuresStats.overdue,
        upcomingCheckups,
        trainingCompletionRate,
        totalMeasures: measuresStats.open,
        overdueCheckups,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchOverdueObligations = async (): Promise<number> => {
    if (!companyId) return 0;

    try {
      const today = new Date().toISOString().split("T")[0];

      const [
        expiredTrainings,
        overdueMeasures,
        overdueCheckupsByDueDate,
        overdueCheckupsByAppointmentDate,
        overdueInvestigations,
      ] = await Promise.all([
        supabase
          .from("training_records")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .lt("expiry_date", today),
        supabase
          .from("measures")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .lt("due_date", today)
          .neq("status", "completed"),
        supabase
          .from("health_checkups")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .in("status", ["open", "planned"])
          .lt("due_date", today),
        supabase
          .from("health_checkups")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .in("status", ["open", "planned"])
          .is("due_date", null)
          .lt("appointment_date", today),
        supabase
          .from("investigations")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .in("status", ["due", "planned", "open", "in_progress"])
          .lt("due_date", today),
      ]);

      return (
        (expiredTrainings.count || 0) +
        (overdueMeasures.count || 0) +
        (overdueCheckupsByDueDate.count || 0) +
        (overdueCheckupsByAppointmentDate.count || 0) +
        (overdueInvestigations.count || 0)
      );
    } catch (error) {
      console.error("Error fetching overdue obligations:", error);
      return 0;
    }
  };

  const fetchRecentIncidents = async (): Promise<number> => {
    if (!companyId) return 0;

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const dateString = sevenDaysAgo.toISOString().split("T")[0];

      const { count, error } = await supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("incident_date", dateString);

      if (error) {
        console.error("Error fetching recent incidents:", error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error("Error fetching recent incidents:", error);
      return 0;
    }
  };

  const fetchInvestigationStats = async () => {
    if (!companyId) return;

    try {
      console.log("=== Fetching Investigation Stats ===");
      console.log("Company ID:", companyId);

      const { data: checkupsData, error: checkupsError } = await supabase
        .from("health_checkups")
        .select("id, status")
        .eq("company_id", companyId);

      if (checkupsError) throw checkupsError;

      console.log("✅ Health checkups fetched:", checkupsData?.length || 0);

      const statusCounts = {
        open: 0,
        planned: 0,
        due: 0,
        done: 0,
      };

      checkupsData?.forEach((checkup: any) => {
        const status = (checkup.status || "").toLowerCase();
        if (status === "open" || status === "in_progress") statusCounts.open++;
        else if (status === "planned") statusCounts.planned++;
        else if (status === "due") statusCounts.due++;
        else if (status === "done" || status === "completed" || status === "closed") statusCounts.done++;
        else statusCounts.open++;
      });

      const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

      console.log("Combined Status Breakdown:", statusCounts);

      setInvestigationStats([
        { status: "Open", count: statusCounts.open, color: "#6b7280", percent: statusCounts.open / (total || 1) },
        { status: "Planned", count: statusCounts.planned, color: "#3b82f6", percent: statusCounts.planned / (total || 1) },
        { status: "Due", count: statusCounts.due, color: "#f59e0b", percent: statusCounts.due / (total || 1) },
        { status: "Done", count: statusCounts.done, color: "#10b981", percent: statusCounts.done / (total || 1) },
      ]);

      return;
    } catch (error) {
      console.error("Error fetching investigation stats:", error);
    }
  };

  const fetchTasks = async () => {
    if (!companyId) return;

    try {
      let query = supabase
        .from("tasks")
        .select(
          `
          id,
          title,
          description,
          due_date,
          status,
          priority,
          assigned_to,
          employee_profile_id,
          profile_employee:employees!tasks_employee_profile_id_fkey (
            id,
            full_name
          )
        `
        )
        .eq("company_id", companyId);

      if (taskStatusFilter === "upcoming") {
        query = query.in("status", ["pending", "in_progress"]);
      } else if (taskStatusFilter === "completed") {
        query = query.eq("status", "completed");
      }

      const { data: rawData, error } = await query
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching tasks:", error);
        throw error;
      }

      let filteredData = rawData || [];

      filteredData = currentEmployeeId
        ? filteredData.filter((task: any) => task.assigned_to === currentEmployeeId)
        : [];

      filteredData = filteredData.slice(0, 20);

      console.log("Fetched tasks data:", filteredData);
      console.log("Current task status filter:", taskStatusFilter);
      console.log("Number of tasks after filter:", filteredData.length);

      setTasks(filteredData);
    } catch (error) {
      console.error("Error in fetchTasks:", error);
      setTasks([]);
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "completed" ? "pending" : "completed";

      const { error } = await (supabase as any)
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;

      await fetchTasks();
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const fetchRecentHazards = async (): Promise<number> => {
    if (!companyId) return 0;

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count } = await supabase
        .from("risk_assessments")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("created_at", sevenDaysAgo.toISOString());

      return count || 0;
    } catch (error) {
      console.error("Error fetching recent hazards:", error);
      return 0;
    }
  };

  const fetchMeasuresStats = async (): Promise<{ open: number; overdue: number }> => {
    if (!companyId) return { open: 0, overdue: 0 };

    try {
      const today = new Date().toISOString().split("T")[0];
      // RAM completed statuses: progress_status IN ('completed', 'done')
      const RAM_COMPLETED = ["completed", "done"];

      const [openRes, overdueRes, ramOpenRes, ramOverdueRes] = await Promise.all([
        // measures table — open
        supabase
          .from("measures")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .neq("status", "completed"),
        // measures table — overdue
        supabase
          .from("measures")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .neq("status", "completed")
          .lt("due_date", today),
        // risk_assessment_measures — open (progress_status not completed/done)
        (supabase as any)
          .from("risk_assessment_measures")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .not("progress_status", "in", `(${RAM_COMPLETED.join(",")})`),
        // risk_assessment_measures — overdue
        (supabase as any)
          .from("risk_assessment_measures")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .not("progress_status", "in", `(${RAM_COMPLETED.join(",")})`)
          .lt("due_date", today),
      ]);

      return {
        open: (openRes.count || 0) + (ramOpenRes.count || 0),
        overdue: (overdueRes.count || 0) + (ramOverdueRes.count || 0),
      };
    } catch (error) {
      console.error("Error fetching measures stats:", error);
      return { open: 0, overdue: 0 };
    }
  };

  const fetchUpcomingCheckups = async (): Promise<number> => {
    if (!companyId) return 0;

    try {
      const today = new Date().toISOString().split("T")[0];
      const future = new Date();
      future.setDate(future.getDate() + 30);
      const futureStr = future.toISOString().split("T")[0];

      const [byDueDate, byAppointment] = await Promise.all([
        supabase
          .from("health_checkups")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .in("status", ["open", "planned"])
          .gte("due_date", today)
          .lte("due_date", futureStr),
        supabase
          .from("health_checkups")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .in("status", ["open", "planned"])
          .is("due_date", null)
          .gte("appointment_date", today)
          .lte("appointment_date", futureStr),
      ]);

      return (byDueDate.count || 0) + (byAppointment.count || 0);
    } catch (error) {
      console.error("Error fetching upcoming checkups:", error);
      return 0;
    }
  };

  const fetchTrainingCompletionRate = async (): Promise<number> => {
    if (!companyId) return 0;

    try {
      const { data: accessData, error: accessError } = await (supabase as any)
        .from("course_employee_access")
        .select("employee_id, course_id")
        .eq("company_id", companyId);

      if (accessError) throw accessError;

      const total = accessData?.length || 0;
      if (total === 0) return 0;

      const employeeIds = [...new Set((accessData || []).map((a: any) => a.employee_id))];

      const { data: certData, error: certError } = await (supabase as any)
        .from("course_certificates")
        .select("employee_id, course_id")
        .in("employee_id", employeeIds);

      if (certError) throw certError;

      const certSet = new Set(
        (certData || []).map((c: any) => `${c.employee_id}_${c.course_id}`)
      );

      const completed = (accessData || []).filter((a: any) =>
        certSet.has(`${a.employee_id}_${a.course_id}`)
      ).length;

      return Math.round((completed / total) * 100);
    } catch (error) {
      console.error("Error fetching training completion rate:", error);
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole === "super_admin") {
    if (typeof window !== "undefined" && window.location.pathname === "/dashboard") {
      navigate("/super-admin/dashboard", { replace: true });
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin":
        return "destructive";
      case "company_admin":
        return "default";
      default:
        return "secondary";
    }
  };

  // ─── Critical warnings logic ───────────────────────────────────────────────
  const criticalWarnings: { label: string; count: number; link: string }[] = [];
  if (stats.overdueCheckups > 0) {
    criticalWarnings.push({
      label: `${stats.overdueCheckups} überfällige Untersuchung${stats.overdueCheckups !== 1 ? "en" : ""}`,
      count: stats.overdueCheckups,
      link: "/health-checkups",
    });
  }
  if (oldOverdueMeasures > 0) {
    criticalWarnings.push({
      label: `${oldOverdueMeasures} offene Maßnahme${oldOverdueMeasures !== 1 ? "n" : ""} älter als 30 Tage`,
      count: oldOverdueMeasures,
      link: "/measures",
    });
  }
  if (stats.recentIncidents > 0) {
    criticalWarnings.push({
      label: `${stats.recentIncidents} Vorfall${stats.recentIncidents !== 1 ? "fälle" : ""} in den letzten 7 Tagen`,
      count: stats.recentIncidents,
      link: "/incidents",
    });
  }

  // ─── KPI card config with trend + color logic ──────────────────────────────
  const kpiConfig: {
    [key: string]: {
      title: string;
      value: string | number;
      subtitle?: string;
      icon: any;
      gradient: string;
      isCritical?: boolean;
      isGood?: boolean;
      trend?: "up" | "down" | "neutral";
      context?: string;
    };
  } = {
    employees: {
      title: t("dashboard.totalEmployees"),
      value: stats.employees,
      icon: Users,
      gradient: "from-blue-500 via-blue-600 to-blue-700",
    },
    overdueObligations: {
      title: t("dashboard.overdueObligations"),
      value: stats.overdueObligations,
      icon: AlertTriangle,
      gradient: "from-red-500 via-red-600 to-red-700",
    },
    recentIncidents: {
      title: `${t("dashboard.last7Days")}: ${t("dashboard.incidents")}`,
      value: stats.recentIncidents,
      icon: AlertTriangle,
      gradient: "from-orange-500 via-orange-600 to-red-600",
    },
    recentHazards: {
      title: `${t("dashboard.last7Days")}: ${t("dashboard.hazards")}`,
      value: stats.recentHazards,
      icon: Shield,
      gradient: "from-amber-500 via-amber-600 to-orange-600",
    },
    openMeasures: {
      title: "Offene Maßnahmen",
      value: stats.openMeasures,
      icon: ListTodo,
      gradient: "from-purple-500 via-purple-600 to-purple-700",
    },
    overdueMeasures: {
      title: "Überfällige Maßnahmen",
      value: stats.overdueMeasures,
      icon: AlertTriangle,
      gradient: "from-rose-500 via-rose-600 to-red-700",
    },
    upcomingCheckups: {
      title: "Anstehende Untersuchungen (30 Tage)",
      value: stats.upcomingCheckups,
      icon: Clock,
      gradient: "from-cyan-500 via-cyan-600 to-cyan-700",
    },
    trainingCompletionRate: {
      title: "Schulungsabschlussquote",
      value: `${stats.trainingCompletionRate}%`,
      icon: FileCheck,
      gradient: "from-violet-500 via-violet-600 to-violet-700",
      context: stats.employees > 0 ? `von ${stats.employees} Mitarbeitern` : undefined,
    },
    auditComplianceRate: {
      title: "Audit Compliance-Rate",
      value: `${stats.complianceRate}%`,
      icon: BarChart,
      gradient: "from-indigo-500 via-indigo-600 to-indigo-700",
    },
  };

  const kpiLabels: Record<string, string> = {
    employees: t("dashboard.totalEmployees"),
    overdueObligations: t("dashboard.overdueObligations"),
    recentIncidents: `${t("dashboard.last7Days")}: ${t("dashboard.incidents")}`,
    recentHazards: `${t("dashboard.last7Days")}: ${t("dashboard.hazards")}`,
    openMeasures: "Offene Maßnahmen",
    overdueMeasures: "Überfällige Maßnahmen",
    upcomingCheckups: "Anstehende Untersuchungen (30 Tage)",
    trainingCompletionRate: "Schulungsabschlussquote",
    auditComplianceRate: "Audit Compliance-Rate",
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* ── Header ── */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            {companyName ? (
              <span>
                {companyName} {t("dashboard.title")}
              </span>
            ) : (
              <span>{t("dashboard.title")}</span>
            )}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t("dashboard.welcome")}
          </p>
        </div>

        <div className="ml-4 flex gap-2">
          {user && !companyId && (
            <Button onClick={() => navigate("/setup-company")}>
              {t("dashboard.setupCompany")}
            </Button>
          )}
        </div>
      </div>

      <>
        {/* ── KPI Settings ── */}
        <div className="flex items-center justify-end mb-3">
          <Popover open={kpiSettingsOpen} onOpenChange={setKpiSettingsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Kacheln anpassen
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <p className="text-sm font-medium mb-3">Sichtbare Kacheln</p>
              <div className="space-y-2">
                {ALL_KPI_IDS.map((id) => (
                  <label
                    key={id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={visibleKpis.includes(id)}
                      onCheckedChange={() => toggleKpiVisibility(id)}
                    />
                    {kpiLabels[id]}
                  </label>
                ))}
              </div>
              <div className="border-t border-border mt-3 pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Sidebar</p>
                <div className="space-y-2">
                  {SIDEBAR_WIDGET_IDS.map((id) => (
                    <label
                      key={id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={visibleKpis.includes(id)}
                        onCheckedChange={() => toggleKpiVisibility(id)}
                      />
                      {sidebarWidgetLabels[id]}
                    </label>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-10 sm:mb-12">
          {visibleKpis.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground border rounded-xl">
              Keine Kacheln ausgewählt. Klicke auf "Kacheln anpassen" um
              Kacheln hinzuzufügen.
            </div>
          ) : (
            visibleKpis.filter((id) => !SIDEBAR_WIDGET_IDS.includes(id)).map((id) => {
              const config = kpiConfig[id];
              if (!config) return null;
              const Icon = config.icon;
              const isDragOver = dragOverKpiId === id;
              return (
                <Card
                  key={id}
                  draggable
                  onDragStart={() => { draggedKpiRef.current = id; }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverKpiId(id); }}
                  onDragLeave={() => setDragOverKpiId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = draggedKpiRef.current;
                    if (!from || from === id) { setDragOverKpiId(null); return; }
                    const newOrder = [...visibleKpis];
                    const fromIdx = newOrder.indexOf(from);
                    const toIdx = newOrder.indexOf(id);
                    newOrder.splice(fromIdx, 1);
                    newOrder.splice(toIdx, 0, from);
                    setVisibleKpis(newOrder);
                    localStorage.setItem("hse_dashboard_visible_kpis", JSON.stringify(newOrder));
                    window.dispatchEvent(new CustomEvent("hse_kpi_prefs_changed"));
                    draggedKpiRef.current = null;
                    setDragOverKpiId(null);
                  }}
                  onDragEnd={() => { draggedKpiRef.current = null; setDragOverKpiId(null); }}
                  className={`border-0 shadow-xl bg-gradient-to-br ${config.gradient} text-white overflow-hidden relative group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 isolate cursor-grab active:cursor-grabbing ${isDragOver ? "ring-2 ring-white/70 scale-[1.02]" : ""}`}
                >
                  {/* Drag handle indicator */}
                  <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-60 transition-opacity">
                    <GripVertical className="w-4 h-4 text-white" />
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-xs sm:text-sm font-semibold text-white/90 tracking-wide leading-tight">
                      {config.title}
                    </CardTitle>
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white/25 backdrop-blur-md flex items-center justify-center shadow-lg ring-2 ring-white/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 flex-shrink-0">
                      <Icon className="h-5 w-5 sm:h-7 sm:w-7 text-white drop-shadow-md" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 pb-3">
                    <div className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
                      {config.value}
                    </div>
                    {config.context && (
                      <p className="text-xs sm:text-sm text-white/80 mt-1 leading-tight">
                        {config.context}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* ── Dashboard Widgets ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {sectionOrder.map((sectionId) => sectionId === "investigations" ? (
          /* Investigation Statistics Chart */
          <div
            key="investigations"
            draggable
            onDragStart={() => { draggedSectionRef.current = "investigations"; }}
            onDragOver={(e) => { e.preventDefault(); setDragOverSectionId("investigations"); }}
            onDragLeave={() => setDragOverSectionId(null)}
            onDrop={(e) => {
              e.preventDefault();
              const from = draggedSectionRef.current;
              if (!from || from === "investigations") { setDragOverSectionId(null); return; }
              const newOrder = sectionOrder[0] === from
                ? ["investigations", from]
                : [from, "investigations"];
              setSectionOrder(newOrder);
              localStorage.setItem("hse_dashboard_section_order", JSON.stringify(newOrder));
              draggedSectionRef.current = null;
              setDragOverSectionId(null);
            }}
            onDragEnd={() => { draggedSectionRef.current = null; setDragOverSectionId(null); }}
            className={`transition-all duration-200 ${dragOverSectionId === "investigations" ? "ring-2 ring-primary/50 rounded-xl" : ""}`}
          >
          <Card className="border-0 shadow-sm h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-4 h-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5" />
                  {t("dashboard.investigationsByStatus")}
                </CardTitle>
              </div>
              <CardDescription>
                {t("dashboard.investigationStatusOverview")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {investigationStats.reduce(
                (sum, item) => sum + item.count,
                0
              ) === 0 ? (
                <div className="flex items-center justify-center h-[280px] sm:h-[300px] text-muted-foreground">
                  {t("investigations.noInvestigations")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 0 }}>
                    <Pie
                      data={investigationStats}
                      cx="50%"
                      cy="50%"
                      outerRadius="55%"
                      innerRadius={0}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="status"
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {investigationStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any, props: any) => {
                        return [
                          `${value} (${(
                            (value /
                              investigationStats.reduce(
                                (sum, item) => sum + item.count,
                                0
                              )) *
                            100
                          ).toFixed(1)}%)`,
                          props.payload.status,
                        ];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {investigationStats.map((item, index) => {
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span
                        className="text-sm font-medium"
                        style={{ color: item.color }}
                      >
                        {item.status}: {item.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          </div>
          ) : (
          /* Task Overview */
          <div
            key="tasks"
            draggable
            onDragStart={() => { draggedSectionRef.current = "tasks"; }}
            onDragOver={(e) => { e.preventDefault(); setDragOverSectionId("tasks"); }}
            onDragLeave={() => setDragOverSectionId(null)}
            onDrop={(e) => {
              e.preventDefault();
              const from = draggedSectionRef.current;
              if (!from || from === "tasks") { setDragOverSectionId(null); return; }
              const newOrder = sectionOrder[0] === from
                ? ["tasks", from]
                : [from, "tasks"];
              setSectionOrder(newOrder);
              localStorage.setItem("hse_dashboard_section_order", JSON.stringify(newOrder));
              draggedSectionRef.current = null;
              setDragOverSectionId(null);
            }}
            onDragEnd={() => { draggedSectionRef.current = null; setDragOverSectionId(null); }}
            className={`transition-all duration-200 ${dragOverSectionId === "tasks" ? "ring-2 ring-primary/50 rounded-xl" : ""}`}
          >
          <Card className="border-0 shadow-sm h-full">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing mb-1">
                    <GripVertical className="w-4 h-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                    <CardTitle className="flex items-center gap-2">
                      <ListTodo className="w-5 h-5" />
                      {t("dashboard.taskOverview")}
                    </CardTitle>
                  </div>
                  <CardDescription>
                    {taskStatusFilter === "upcoming"
                      ? t("dashboard.upcomingTasks")
                      : t("dashboard.completedTasks")}
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant={
                      taskStatusFilter === "upcoming" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setTaskStatusFilter("upcoming")}
                  >
                    {t("dashboard.upcoming")}
                  </Button>
                  <Button
                    variant={
                      taskStatusFilter === "completed" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setTaskStatusFilter("completed")}
                  >
                    {t("dashboard.completed")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px] sm:h-[300px] pr-4">
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <ListTodo className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm">
                      {t("dashboard.noTasks")} (
                      {taskStatusFilter === "upcoming"
                        ? t("dashboard.upcomingTasks").toLowerCase()
                        : t("dashboard.completedTasks").toLowerCase()}
                      )
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="group relative flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-muted/30 to-muted/50 hover:from-muted/50 hover:to-muted/70 border border-border/50 hover:border-border transition-all duration-200 hover:shadow-md"
                      >
                        {/* Custom Checkbox */}
                        <div className="relative flex items-center justify-center mt-0.5">
                          <input
                            type="checkbox"
                            checked={task.status === "completed"}
                            onChange={() =>
                              toggleTaskStatus(task.id, task.status)
                            }
                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-muted-foreground/30 bg-background checked:bg-primary checked:border-primary transition-all duration-200 hover:border-primary/50"
                          />
                          <CheckCircle className="absolute w-3.5 h-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                        </div>

                        {/* Task Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-semibold text-sm mb-1.5 ${
                              task.status === "completed"
                                ? "line-through text-muted-foreground"
                                : ""
                            }`}
                          >
                            {task.title}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {(task as any).profile_employee ? (
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span className="text-muted-foreground/70">Profil:</span>
                                <Link
                                  to={`/employees/${
                                    (task as any).employee_profile_id ||
                                    task.assigned_to
                                  }`}
                                  className="hover:text-primary hover:underline transition-colors"
                                >
                                  {(task as any).profile_employee.full_name}
                                </Link>
                              </div>
                            ) : null}

                            {task.due_date && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(
                                    task.due_date
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Priority Badge */}
                        {task.priority && (
                          <Badge
                            variant={
                              task.priority === "high" ||
                              task.priority === "urgent"
                                ? "destructive"
                                : task.priority === "medium"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs font-semibold px-2.5 py-0.5 flex items-center gap-1 flex-shrink-0"
                          >
                            {task.priority === "high" ||
                            task.priority === "urgent" ? (
                              <AlertTriangle className="w-3 h-3" />
                            ) : task.priority === "medium" ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                            )}
                            {t(`dashboard.${task.priority}`)}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
          </div>
          ))}
        </div>
      </>
    </div>
  );
}
