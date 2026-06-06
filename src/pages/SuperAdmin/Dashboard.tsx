import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Puzzle,
  Package,
  FileText,
  BarChart3,
  ArrowUpRight,
  Clock,
  Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface DashboardStats {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  cancelledCompanies: number;
  totalRevenue: number;
  addonRevenue: number;
  totalUsers: number;
  totalAddons: number;
}

interface TierDistribution {
  name: string;
  value: number;
  color: string;
}

interface MonthlyRevenue {
  month: string;
  subscriptions: number;
  addons: number;
}

export default function SuperAdminDashboard() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    trialCompanies: 0,
    cancelledCompanies: 0,
    totalRevenue: 0,
    addonRevenue: 0,
    totalUsers: 0,
    totalAddons: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [recentCompanies, setRecentCompanies] = useState<any[]>([]);
  const [tierDistribution, setTierDistribution] = useState<TierDistribution[]>([]);
  const [expiringTrials, setExpiringTrials] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState("all-time");

  const getDateRangeBounds = (range: string) => {
    if (range === "all-time") return { startDate: null, endDate: null };
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
        startDate.setHours(0, 0, 0, 0);
        break;
      case "last-month": {
        const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
        const lastMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0, 23, 59, 59, 999);
        return {
          startDate: lastMonth,
          endDate: lastMonthEnd,
        };
      }
      case "this-year":
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        return { startDate: null, endDate: null };
    }

    return { startDate, endDate };
  };

  useEffect(() => {
    if (!loading && (!user || userRole !== "super_admin")) {
      navigate("/dashboard");
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    if (user && userRole === "super_admin") {
      fetchStats();
      fetchRecentCompanies();
      fetchTierDistribution();
      fetchExpiringTrials();
      fetchRecentActivity();
    }
  }, [user, userRole, dateRange]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const { startDate, endDate } = getDateRangeBounds(dateRange);

      // Fetch total companies
      let totalCompaniesQuery = supabase
        .from("companies")
        .select("id", { count: "exact", head: true });
      if (startDate && endDate) {
        totalCompaniesQuery = totalCompaniesQuery
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      }
      const { count: totalCompanies } = await totalCompaniesQuery;

      // Fetch active companies
      let activeCompaniesQuery = supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "active");
      if (startDate && endDate) {
        activeCompaniesQuery = activeCompaniesQuery
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      }
      const { count: activeCompanies } = await activeCompaniesQuery;

      // Fetch trial companies
      let trialCompaniesQuery = supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "trial");
      if (startDate && endDate) {
        trialCompaniesQuery = trialCompaniesQuery
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      }
      const { count: trialCompanies } = await trialCompaniesQuery;

      // Fetch cancelled companies
      let cancelledCompaniesQuery = supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "cancelled");
      if (startDate && endDate) {
        cancelledCompaniesQuery = cancelledCompaniesQuery
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      }
      const { count: cancelledCompanies } = await cancelledCompaniesQuery;

      // Fetch total users
      // Fetch total users
      let totalUsersQuery = supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true });
      if (startDate && endDate) {
        totalUsersQuery = totalUsersQuery
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      }
      const { count: totalUsers } = await totalUsersQuery;

      // Fetch companies with overdue invoices (defaulters)
      const { data: overdueInvoices } = await supabase
        .from("invoices")
        .select("company_id")
        .eq("status", "overdue");
      const defaulterCompanyIds = new Set(overdueInvoices?.map(i => i.company_id) || []);

      // Fetch companies that are not active or trial
      const { data: inactiveCompanies } = await supabase
        .from("companies")
        .select("id")
        .not("subscription_status", "in", '("active","trial")');
      const inactiveCompanyIds = new Set(inactiveCompanies?.map(c => c.id) || []);

      // Fetch total addons sold
      let totalAddonsQuery = supabase
        .from("company_addons")
        .select("id, company_id, price_paid")
        .eq("status", "active");
      if (startDate && endDate) {
        totalAddonsQuery = totalAddonsQuery
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      }
      const { data: addonsData } = await totalAddonsQuery;

      // Filter addons to exclude defaulters and inactive/cancelled companies
      const activeAddonsList = addonsData?.filter(addon => 
        !defaulterCompanyIds.has(addon.company_id) && !inactiveCompanyIds.has(addon.company_id)
      ) || [];
      const totalAddons = activeAddonsList.length;

      // Calculate subscription revenue - also filter out companies with overdue invoices
      let activeSubscriptionsQuery = supabase
        .from("companies")
        .select("id, subscription_tier")
        .eq("subscription_status", "active");
      if (startDate && endDate) {
        activeSubscriptionsQuery = activeSubscriptionsQuery
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      }
      const { data: activeSubscriptions } = await activeSubscriptionsQuery;

      const validSubscriptions = activeSubscriptions?.filter(company => 
        !defaulterCompanyIds.has(company.id)
      ) || [];

      const tierPrices: Record<string, number> = {
        basic: 149,
        standard: 249,
        premium: 349,
      };

      const totalRevenue =
        validSubscriptions.reduce((sum, company) => {
          return sum + (tierPrices[company.subscription_tier] || 0);
        }, 0) || 0;

      // Calculate addon revenue using the filtered activeAddonsList
      const addonRevenue = activeAddonsList.reduce((sum, addon) => {
        return sum + (addon.price_paid || 0);
      }, 0) || 0;

      setStats({
        totalCompanies: totalCompanies || 0,
        activeCompanies: activeCompanies || 0,
        trialCompanies: trialCompanies || 0,
        cancelledCompanies: cancelledCompanies || 0,
        totalRevenue,
        addonRevenue,
        totalUsers: totalUsers || 0,
        totalAddons: totalAddons || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchTierDistribution = async () => {
    try {
      const { startDate, endDate } = getDateRangeBounds(dateRange);
      let query = supabase
        .from("companies")
        .select("subscription_tier")
        .in("subscription_status", ["active", "trial"]);
      
      if (startDate && endDate) {
        query = query
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      }
      
      const { data: companies } = await query;

      const distribution: Record<string, number> = { basic: 0, standard: 0, premium: 0 };
      companies?.forEach(c => {
        distribution[c.subscription_tier] = (distribution[c.subscription_tier] || 0) + 1;
      });

      setTierDistribution([
        { name: "Basic", value: distribution.basic, color: "#3B82F6" },
        { name: "Standard", value: distribution.standard, color: "#8B5CF6" },
        { name: "Premium", value: distribution.premium, color: "#F59E0B" },
      ]);
    } catch (error) {
      console.error("Error fetching tier distribution:", error);
    }
  };

  const fetchExpiringTrials = async () => {
    try {
      const { startDate, endDate } = getDateRangeBounds(dateRange);
      let query = supabase
        .from("companies")
        .select("id, name, email, trial_ends_at, created_at")
        .eq("subscription_status", "trial");

      if (startDate && endDate) {
        query = query
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      }

      const { data } = await query
        .order("created_at", { ascending: true })
        .limit(5);

      setExpiringTrials(data || []);
    } catch (error) {
      console.error("Error fetching expiring trials:", error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { startDate, endDate } = getDateRangeBounds(dateRange);
      let query = supabase
        .from("subscription_history")
        .select(`
          *,
          companies:company_id(name)
        `);

      if (startDate && endDate) {
        query = query
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      }

      const { data } = await query
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentActivity(data || []);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }
  };

  const fetchRecentCompanies = async () => {
    try {
      const { startDate, endDate } = getDateRangeBounds(dateRange);
      let query = supabase
        .from("companies")
        .select("*");

      if (startDate && endDate) {
        query = query
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentCompanies(data || []);
    } catch (error) {
      console.error("Error fetching recent companies:", error);
    }
  };

  if (loading || loadingStats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">Super Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Manage companies, subscriptions, add-ons, and system-wide settings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48 bg-white dark:bg-card">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select timeline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-time">All time</SelectItem>
              <SelectItem value="last-7-days">Last 7 days</SelectItem>
              <SelectItem value="last-30-days">Last 30 days</SelectItem>
              <SelectItem value="last-90-days">Last 90 days</SelectItem>
              <SelectItem value="this-month">This month</SelectItem>
              <SelectItem value="last-month">Last month</SelectItem>
              <SelectItem value="this-year">This year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-sm bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Companies
            </CardTitle>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {stats.totalCompanies}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.activeCompanies} active, {stats.trialCompanies} trial
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Estimated Monthly Revenue
            </CardTitle>
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              €{(stats.totalRevenue + stats.addonRevenue).toLocaleString()}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Subscriptions: €{stats.totalRevenue}</span>
              <span className="text-xs text-green-600">+€{stats.addonRevenue} add-ons</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Users
            </CardTitle>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {stats.totalUsers}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Across all companies
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active Add-ons
            </CardTitle>
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Puzzle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {stats.totalAddons}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Sold to companies
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Status & Critical Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              System Status
            </CardTitle>
            <CardDescription>Current system health overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Database</p>
                  <p className="text-xs text-muted-foreground">Supabase PostgreSQL</p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-600">Operational</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">API Services</p>
                  <p className="text-xs text-muted-foreground">Response time: 45ms</p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-600">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Authentication</p>
                  <p className="text-xs text-muted-foreground">Supabase Auth</p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-600">Active</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Critical Alerts
            </CardTitle>
            <CardDescription>Issues requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Trials Expiring Soon */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  Trials Expiring Soon
                </h4>
                {expiringTrials.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-sm">
                    No trials expiring soon
                  </p>
                ) : (
                  expiringTrials.map((company) => {
                    const createdDate = new Date(company.created_at);
                    const trialEndDate = company.trial_ends_at
                      ? new Date(company.trial_ends_at)
                      : new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                    const daysLeft = Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                    return (
                      <div
                        key={company.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">{company.name}</p>
                          <p className="text-xs text-muted-foreground">{company.email}</p>
                        </div>
                        <Badge variant={daysLeft <= 2 ? "destructive" : "secondary"}>
                          {daysLeft} days left
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Tier Distribution</CardTitle>
            <CardDescription>Breakdown of companies by plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tierDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {tierDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} companies`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Companies */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Companies</CardTitle>
                <CardDescription>
                  Latest registered organizations
                </CardDescription>
              </div>
              <Link
                to="/super-admin/companies"
                className="text-sm text-primary hover:underline"
              >
                View All →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCompanies.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No companies registered yet
                </p>
              ) : (
                recentCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {company.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant={
                          company.subscription_status === "active"
                            ? "default"
                            : company.subscription_status === "trial"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {company.subscription_tier}
                      </Badge>
                      <Badge
                        variant={
                          company.subscription_status === "active"
                            ? "default"
                            : company.subscription_status === "trial"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {company.subscription_status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
