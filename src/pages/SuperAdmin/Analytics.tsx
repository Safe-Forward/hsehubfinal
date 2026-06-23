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
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  HardDrive,
  FileText,
  GraduationCap,
  Download,
  RefreshCcw,
  Activity,
  Server,
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface CompanyUsage {
  id: string;
  name: string;
  subscription_tier: string;
  subscription_status: string;
  max_employees: number;
  employee_count: number;
  document_count: number;
  course_count: number;
  audit_count: number;
  incident_count: number;
  risk_assessment_count: number;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  last_activity_at: string;
}

interface RevenueData {
  month: string;
  subscriptions: number;
  addons: number;
  total: number;
}

interface GrowthData {
  month: string;
  companies: number;
  users: number;
}


const COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444"];

export default function Analytics() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [loadingData, setLoadingData] = useState(true);
  const [dateRange, setDateRange] = useState("30days");

  const [companyUsage, setCompanyUsage] = useState<CompanyUsage[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [tierBreakdown, setTierBreakdown] = useState<any[]>([]);
  const [featureUsage, setFeatureUsage] = useState<any[]>([]);
  const [selectedFeatureCompany, setSelectedFeatureCompany] = useState<string>("all");


  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    totalMRR: 0,
    mrrGrowth: 0,
    avgRevenuePerCompany: 0,
    churnRate: 0,
    totalStorage: 0,
    avgStoragePerCompany: 0,
  });

  useEffect(() => {
    if (!loading && (!user || userRole !== "super_admin")) {
      navigate("/dashboard");
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    if (user && userRole === "super_admin") {
      fetchAnalytics();
    }
  }, [user, userRole, dateRange]);

  // Realtime subscriptions for automatic updates
  useEffect(() => {
    if (!user || userRole !== "super_admin") return;

    console.log('Setting up realtime subscriptions for Analytics...');

    // Subscribe to changes on all feature tables
    const tables = ['employees', 'documents', 'courses', 'audits', 'incidents', 'risk_assessments'];
    const channels = tables.map(table => {
      const channel = supabase
        .channel(`${table}_changes`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: table
          },
          (payload) => {
            console.log(`Realtime change detected in ${table}:`, payload);
            // Refetch feature usage when any change occurs
            fetchFeatureUsage();
          }
        )
        .subscribe();

      return channel;
    });

    // Cleanup subscriptions on unmount
    return () => {
      console.log('Cleaning up realtime subscriptions...');
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, userRole]);


  const fetchAnalytics = async () => {
    setLoadingData(true);
    await Promise.all([
      fetchCompanyUsage(),
      fetchRevenueData(),
      fetchGrowthData(),
      fetchTierBreakdown(),
      fetchFeatureUsage(),
      calculateSummaryStats(),
    ]);
    setLoadingData(false);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getStoragePercentage = (used: number, limit: number): number => {
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const fetchCompanyUsage = async () => {
    try {
      const { data: companies, error } = await supabase
        .from("companies")
        .select("*")
        .order("last_activity_at", { ascending: false });

      if (error) throw error;

      const usagePromises = (companies || []).map(async (company) => {
        const [
          employees,
          documents,
          courses,
          audits,
          incidents,
          riskAssessments,
          documentStorage,
        ] = await Promise.all([
          supabase
            .from("employees")
            .select("id", { count: "exact", head: true })
            .eq("company_id", company.id),
          supabase
            .from("documents")
            .select("id", { count: "exact", head: true })
            .eq("company_id", company.id),
          supabase
            .from("courses")
            .select("id", { count: "exact", head: true })
            .eq("company_id", company.id),
          supabase
            .from("audits")
            .select("id", { count: "exact", head: true })
            .eq("company_id", company.id),
          supabase
            .from("incidents")
            .select("id", { count: "exact", head: true })
            .eq("company_id", company.id),
          supabase
            .from("risk_assessments")
            .select("id", { count: "exact", head: true })
            .eq("company_id", company.id),
          supabase
            .from("documents")
            .select("file_size")
            .eq("company_id", company.id),
        ]);

        // Calculate total storage from documents
        const totalStorage = (documentStorage.data || []).reduce(
          (sum, doc: any) => sum + (doc.file_size || 0),
          0
        );

        return {
          ...company,
          employee_count: employees.count || 0,
          document_count: documents.count || 0,
          course_count: courses.count || 0,
          audit_count: audits.count || 0,
          incident_count: incidents.count || 0,
          risk_assessment_count: riskAssessments.count || 0,
          storage_used_bytes: totalStorage,
          storage_limit_bytes: 5368709120, // 5GB default limit
        };
      });

      const usageData = await Promise.all(usagePromises);
      setCompanyUsage(usageData);
    } catch (error) {
      console.error("Error fetching company usage:", error);
    }
  };

  const fetchRevenueData = async () => {
    // Generate mock revenue data for the last 6 months
    const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mockData = months.map((month, index) => ({
      month,
      subscriptions: 2000 + index * 500 + Math.floor(Math.random() * 500),
      addons: 300 + index * 100 + Math.floor(Math.random() * 200),
      total: 0,
    }));
    mockData.forEach((d) => (d.total = d.subscriptions + d.addons));
    setRevenueData(mockData);
  };

  const fetchGrowthData = async () => {
    // Generate mock growth data
    const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mockData = months.map((month, index) => ({
      month,
      companies: 5 + index * 2 + Math.floor(Math.random() * 3),
      users: 20 + index * 10 + Math.floor(Math.random() * 15),
    }));
    setGrowthData(mockData);
  };

  const fetchTierBreakdown = async () => {
    try {
      const { data: companies } = await supabase
        .from("companies")
        .select("subscription_tier, subscription_status")
        .in("subscription_status", ["active", "trial"]);

      const breakdown: Record<string, number> = {};
      companies?.forEach((c) => {
        breakdown[c.subscription_tier] = (breakdown[c.subscription_tier] || 0) + 1;
      });

      const tierData = Object.entries(breakdown).map(([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: COLORS[index % COLORS.length],
      }));

      setTierBreakdown(tierData);
    } catch (error) {
      console.error("Error fetching tier breakdown:", error);
    }
  };

  const fetchFeatureUsage = async (companyId: string = selectedFeatureCompany) => {
    try {
      console.log('Fetching feature usage for:', companyId);

      const getQuery = (table: string) => {
        let query = supabase.from(table).select("id", { count: "exact", head: true });
        if (companyId !== "all") {
          query = query.eq("company_id", companyId);
        }
        return query;
      };

      // Count usage of different features across all companies
      const [employees, documents, courses, audits, incidents, riskAssessments] = await Promise.all([
        getQuery("employees"),
        getQuery("documents"),
        getQuery("courses"),
        getQuery("audits"),
        getQuery("incidents"),
        getQuery("risk_assessments"),
      ]);

      console.log('Feature usage results:', {
        employees: employees.count,
        documents: documents.count,
        courses: courses.count,
        audits: audits.count,
        incidents: incidents.count,
        riskAssessments: riskAssessments.count,
      });

      setFeatureUsage([
        { name: "Employees", count: employees.count || 0 },
        { name: "Documents", count: documents.count || 0 },
        { name: "Courses", count: courses.count || 0 },
        { name: "Audits", count: audits.count || 0 },
        { name: "Incidents", count: incidents.count || 0 },
        { name: "Risk Assessments", count: riskAssessments.count || 0 },
      ]);

      console.log('Feature usage state updated');
    } catch (error) {
      console.error("Error fetching feature usage:", error);
    }
  };

  const calculateSummaryStats = async () => {
    try {
      const { data: companies } = await supabase
        .from("companies")
        .select("subscription_tier, subscription_status, storage_used_bytes")
        .eq("subscription_status", "active");

      const tierPrices: Record<string, number> = {
        basic: 149,
        standard: 249,
        premium: 349,
      };

      const totalMRR =
        companies?.reduce((sum, c) => sum + (tierPrices[c.subscription_tier] || 0), 0) || 0;
      const totalStorage =
        companies?.reduce((sum, c) => sum + (c.storage_used_bytes || 0), 0) || 0;
      const companyCount = companies?.length || 1;

      setSummaryStats({
        totalMRR,
        mrrGrowth: 12.5, // Mock growth percentage
        avgRevenuePerCompany: totalMRR / companyCount,
        churnRate: 2.3, // Mock churn rate
        totalStorage,
        avgStoragePerCompany: totalStorage / companyCount,
      });
    } catch (error) {
      console.error("Error calculating summary stats:", error);
    }
  };



  if (loading || loadingData) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">Platform Analytics</h2>
          <p className="text-muted-foreground">
            Detailed insights into platform usage and revenue
          </p>
        </div>
        <div className="flex gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>


      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{summaryStats.totalMRR.toLocaleString()}</div>
            <div className="flex items-center text-sm text-green-600 mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +{summaryStats.mrrGrowth}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Revenue per Company</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{summaryStats.avgRevenuePerCompany.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per active subscription</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.churnRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Monthly churn</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(summaryStats.totalStorage)}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all companies</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly subscription and add-on revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `€${value}`} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="subscriptions"
                    stackId="1"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.6}
                    name="Subscriptions"
                  />
                  <Area
                    type="monotone"
                    dataKey="addons"
                    stackId="1"
                    stroke="#8B5CF6"
                    fill="#8B5CF6"
                    fillOpacity={0.6}
                    name="Add-ons"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Growth Metrics</CardTitle>
            <CardDescription>New companies and users over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="companies"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="New Companies"
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="New Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Usage & Tier Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Feature Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Feature Usage</CardTitle>
              <CardDescription>Total records created across all companies</CardDescription>
            </div>
            <Select
              value={selectedFeatureCompany}
              onValueChange={(value) => {
                setSelectedFeatureCompany(value);
                fetchFeatureUsage(value);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companyUsage.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureUsage} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Distribution</CardTitle>
            <CardDescription>Companies by subscription tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 0 }}>
                  <Pie
                    data={tierBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius="40%"
                    outerRadius="60%"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {tierBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconSize={10}
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle>Company Resource Usage</CardTitle>
          <CardDescription>
            Detailed view of each company's resource consumption
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead>Audits</TableHead>
                <TableHead>Incidents</TableHead>
                <TableHead>Risks</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companyUsage.slice(0, 10).map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {company.subscription_status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        company.subscription_tier === "premium"
                          ? "bg-amber-100 text-amber-800"
                          : company.subscription_tier === "standard"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                      }
                    >
                      {company.subscription_tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>
                        {company.employee_count}/{company.max_employees}
                      </span>
                      <Progress
                        value={(company.employee_count / company.max_employees) * 100}
                        className="w-16 h-2"
                      />
                    </div>
                  </TableCell>
                  <TableCell>{company.document_count}</TableCell>
                  <TableCell>{company.course_count}</TableCell>
                  <TableCell>{company.audit_count}</TableCell>
                  <TableCell>{company.incident_count}</TableCell>
                  <TableCell>{company.risk_assessment_count}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {formatBytes(company.storage_used_bytes || 0)}
                      </span>
                      <Progress
                        value={getStoragePercentage(
                          company.storage_used_bytes || 0,
                          company.storage_limit_bytes || 5368709120
                        )}
                        className="w-16 h-2"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {company.last_activity_at
                      ? new Date(company.last_activity_at).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
