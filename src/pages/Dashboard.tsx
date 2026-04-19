import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
  Bell,
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

export default function Dashboard() {
  const { user, userRole, companyId, companyName, loading, signOut } =
    useAuth();
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
  });

  const [investigationStats, setInvestigationStats] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("upcoming");
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [currentEmployeeName, setCurrentEmployeeName] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployeeId = async () => {
      if (user?.email && companyId) {
        console.log("🔍 Looking up Employee ID for:", user.email, "Company:", companyId);

        // Find employee by email and company_id (Reliable fallback since auth_user_id column might not exist)
        // Use ilike for case-insensitive matching
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
          // Fallback 1: case-insensitive email match
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
            // Fallback 2: match by auth user_id stored in employees.user_id column
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
              // Fallback 3: look up team_members table by user_id
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
                // Fallback 4: look up team_members by email
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
                  // Sentinel "" triggers fetchTasks to at least show broadcast tasks
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
      fetchTasks();
    }
  }, [companyId, userRole, taskStatusFilter]);

  useEffect(() => {
    if (!companyId || userRole === "super_admin") return;

    // Keep top stat cards in sync with inserts/updates/deletes.
    const statTables = [
      "employees",
      "training_records",
      "measures",
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

    // Fallback refresh in case realtime is unavailable in some environments.
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
    // Re-fetch tasks whenever employee identity resolves (currentEmployeeName becomes
    // a string — even "" means "lookup finished, no profile found, show broadcast only")
    if (companyId && userRole !== "super_admin" && currentEmployeeName !== null) {
      fetchTasks();
    }
  }, [companyId, userRole, currentEmployeeId, currentEmployeeName]);

  const fetchStats = async () => {
    if (!companyId) return;

    try {
      // Fetch counts for key tables and compute compliance rate
      const [employeesRes, risksRes, auditsRes, tasksRes, completedAuditsRes] =
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
          // completed audits for compliance calculation
          supabase
            .from("audits")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("status", "completed"),
        ]);

      const totalAudits = auditsRes.count || 0;
      const completedAudits = completedAuditsRes.count || 0;
      const complianceRate =
        totalAudits > 0
          ? Math.round((completedAudits / totalAudits) * 100)
          : 85;

      // Calculate overdue obligations
      const overdueObligations = await fetchOverdueObligations();

      // Calculate recent incidents (last 7 days)
      const recentIncidents = await fetchRecentIncidents();

      // Calculate recent hazards (last 7 days)
      const recentHazards = await fetchRecentHazards();

      setStats({
        employees: employeesRes.count || 0,
        riskAssessments: risksRes.count || 0,
        audits: totalAudits || 0,
        tasks: tasksRes.count || 0,
        complianceRate,
        overdueObligations,
        recentIncidents,
        recentHazards,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchOverdueObligations = async (): Promise<number> => {
    if (!companyId) return 0;

    try {
      const today = new Date().toISOString().split("T")[0];

      // Count expired trainings, overdue measures, and overdue health checkups.
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
      sevenDaysAgo.setHours(0, 0, 0, 0); // Start of day

      // Use date-only format (YYYY-MM-DD) for comparison to avoid timezone issues
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

      // Fetch ONLY health checkups as per user requirement (ignoring 'investigations' table)
      const { data: checkupsData, error: checkupsError } = await supabase
        .from("health_checkups")
        .select("id, status")
        .eq("company_id", companyId);

      if (checkupsError) throw checkupsError;

      console.log("✅ Health checkups fetched:", checkupsData?.length || 0);

      // Mock investigations result to keep existing logic structure temporarily (or rewrite below)
      // Actually, better to rewrite the processing logic here.

      // Initialize status counts
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

      return; // Early return to skip the old logic below
    } catch (error) {
      console.error("Error fetching investigation stats:", error);
    }
  };



  const fetchTasks = async () => {
    if (!companyId) return;

    // No guard here — even users without a linked employee profile
    // should see broadcast tasks (tasks with no @mention).
    // The client-side filter below handles all cases correctly.

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
          assigned_employee:employees!tasks_assigned_to_fkey (
            id,
            full_name
          )
        `
        )
        .eq("company_id", companyId);

      // Apply status filter based on dropdown selection
      if (taskStatusFilter === "upcoming") {
        query = query.in("status", ["pending", "in_progress"]);
      } else if (taskStatusFilter === "completed") {
        query = query.eq("status", "completed");
      }

      // Task visibility logic (evaluated CLIENT-SIDE after fetch):
      // Broadcast  → neither title nor description has any @  → everyone sees it
      // Mentioned  → title OR description contains @TheirName   → only that person
      // Assigned   → assigned_to = their employee ID           → always visible
      // Admin/SA   → see everything (no filter applied)

      const { data: rawData, error } = await query
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching tasks:", error);
        throw error;
      }

      let filteredData = rawData || [];

      // Apply client-side visibility filter for all users (including admins)
      filteredData = filteredData.filter((task: any) => {
        const title = (task.title || "").toLowerCase();
        const desc = (task.description || "").toLowerCase();
        const hasAnyMention = title.includes("@") || desc.includes("@");

        // Broadcast task: no @ in either field — show to everyone
        if (!hasAnyMention) return true;

        // Check if this employee is @mentioned (in title or description)
        if (currentEmployeeName) {
          const nameLower = currentEmployeeName.toLowerCase();
          if (title.includes(`@${nameLower}`) || desc.includes(`@${nameLower}`)) {
            return true;
          }
        }

        // Directly assigned to this employee
        if (currentEmployeeId && task.assigned_to === currentEmployeeId) {
          return true;
        }

        return false;
      });

      // Keep limit at 20 after client-side filter
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

      // Refresh tasks
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

  if (loading) {
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

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            {companyName
              ? `${companyName} ${t("dashboard.title")}`
              : `${t("dashboard.title")}`}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t("dashboard.welcome")}
          </p>
        </div>

        {/* Show setup button when user is logged in but has no company */}
        {
          user && !companyId && (
            <div className="ml-4">
              <Button onClick={() => navigate("/setup-company")}>
                {t("dashboard.setupCompany")}
              </Button>
            </div>
          )
        }
      </div >

      {userRole === "super_admin" ? (
        <>
          {/* Redirect super admin to their dashboard and don't show any UI */}
          {typeof window !== "undefined" &&
            window.location.pathname === "/dashboard" &&
            navigate("/super-admin/dashboard", { replace: true })}
          {/* Don't render anything for super admin on /dashboard route */}
          <div className="flex items-center justify-center min-h-[50vh]">
            <p className="text-muted-foreground">Redirecting to Super Admin Dashboard...</p>
          </div>
        </>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10 sm:mb-12">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white overflow-hidden relative group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 isolate">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                <CardTitle className="text-sm font-semibold text-white/90 tracking-wide">
                  {t("dashboard.totalEmployees")}
                </CardTitle>
                <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur-md flex items-center justify-center shadow-lg ring-2 ring-white/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Users className="h-7 w-7 text-white drop-shadow-md" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-5xl font-bold text-white mb-1 tracking-tight">
                  {stats.employees}
                </div>

              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white overflow-hidden relative group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 isolate">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                <CardTitle className="text-sm font-semibold text-white/90 tracking-wide">
                  {t("dashboard.overdueObligations")}
                </CardTitle>
                <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur-md flex items-center justify-center shadow-lg ring-2 ring-white/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <AlertTriangle className="h-7 w-7 text-white drop-shadow-md" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-5xl font-bold text-white mb-1 tracking-tight">
                  {stats.overdueObligations}
                </div>

              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 text-white overflow-hidden relative group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 isolate">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                <CardTitle className="text-sm font-semibold text-white/90 tracking-wide">
                  {t("dashboard.last7Days")}: {t("dashboard.incidents")}
                </CardTitle>
                <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur-md flex items-center justify-center shadow-lg ring-2 ring-white/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <svg
                    className="h-7 w-7 text-white drop-shadow-md"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-5xl font-bold text-white mb-1 tracking-tight">
                  {stats.recentIncidents}
                </div>

              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 text-white overflow-hidden relative group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 isolate">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                <CardTitle className="text-sm font-semibold text-white/90 tracking-wide">
                  {t("dashboard.last7Days")}: {t("dashboard.hazards")}
                </CardTitle>
                <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur-md flex items-center justify-center shadow-lg ring-2 ring-white/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Shield className="h-7 w-7 text-white drop-shadow-md" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-5xl font-bold text-white mb-1 tracking-tight">
                  {stats.recentHazards}
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Dashboard Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Investigation Statistics Chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5" />
                  {t("dashboard.investigationsByStatus")}
                </CardTitle>
                <CardDescription>
                  {t("dashboard.investigationStatusOverview")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {investigationStats.reduce(
                  (sum, item) => sum + item.count,
                  0
                ) === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    {t("investigations.noInvestigations")}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 0 }}>
                      {/* Default Legend removed as requested */}
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
                          className="w-3 h-3 rounded-full"
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

            {/* Task Overview */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ListTodo className="w-5 h-5" />
                      {t("dashboard.taskOverview")}
                    </CardTitle>
                    <CardDescription>
                      {taskStatusFilter === "upcoming"
                        ? t("dashboard.upcomingTasks")
                        : t("dashboard.completedTasks")}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
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
                <ScrollArea className="h-[300px] pr-4">
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
                              className={`font-semibold text-sm mb-1.5 ${task.status === "completed"
                                ? "line-through text-muted-foreground"
                                : ""
                                }`}
                            >
                              {task.title}
                            </p>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {/* Assigned To */}
                              {task.assigned_employee ? (
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  <Link
                                    to={`/employees/${task.assigned_to}`}
                                    className="hover:text-primary hover:underline transition-colors"
                                  >
                                    {task.assigned_employee.full_name}
                                  </Link>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  <span>{t("dashboard.unassigned")}</span>
                                </div>
                              )}

                              {/* Due Date */}
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
                              className="text-xs font-semibold px-2.5 py-0.5 flex items-center gap-1"
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
        </>
      )
      }
    </div >
  );
}
