import { useState, useEffect, useRef } from "react";
import { X, BarChart3, PieChart, TrendingUp, Plus, Tag } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface ReportConfig {
  id: string;
  title: string;
  metric: string;
  groupBy: string;
  dateProperty: string;
  dateRange: {
    type: string;
    startDate?: string;
    endDate?: string;
  };
  chartType: 'pie' | 'bar' | 'line';
  sortBy: string;
  displayMode?: 'chart' | 'table' | 'summary';
  data?: any[];
  incidentType?: string;
  auditTemplate?: string;
  targetSection?: string; // section where the report should appear (overrides metric-based routing)
  tagFilters?: string[];
  profileFieldFilters?: Array<{ field_name: string; value: string }>;
}

interface ReportBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ReportConfig) => void;
  initialConfig?: ReportConfig | null;
  data?: any[];
  onRefreshData?: (config: Partial<ReportConfig>) => Promise<any[]>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export default function ReportBuilder({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  data = [],
  onRefreshData,
}: ReportBuilderProps) {
  const { t } = useLanguage();
  const { companyId } = useAuth();
  const [config, setConfig] = useState<ReportConfig>(
    initialConfig || {
      id: Date.now().toString(),
      title: t("reports.builder.newReportTitle"),
      metric: "employees",
      groupBy: "department",
      dateProperty: "created_at",
      dateRange: {
        type: "last_30_days",
      },
      chartType: "bar",
      sortBy: "value",
      displayMode: "chart",
    }
  );

  // Local chart data state that can be refreshed
  const [chartData, setChartData] = useState<any[]>(data);
  const [isLoading, setIsLoading] = useState(false);

  // Tag filter state
  const [tagFilters, setTagFilters] = useState<string[]>(initialConfig?.tagFilters || []);
  const [tagInput, setTagInput] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Profilfeld-Filter state
  const [profileFieldFilters, setProfileFieldFilters] = useState<Array<{ field_name: string; value: string }>>(
    initialConfig?.profileFieldFilters || []
  );
  const [availableProfileFields, setAvailableProfileFields] = useState<string[]>([]);
  const [pfFieldInput, setPfFieldInput] = useState("");
  const [pfValueInput, setPfValueInput] = useState("");

  // Sync config when initialConfig changes (e.g., when editing different reports)
  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
      // Also update chart data from initial config
      setChartData(initialConfig.data || data || []);
      setTagFilters(initialConfig.tagFilters || []);
      setProfileFieldFilters(initialConfig.profileFieldFilters || []);
    }
  }, [initialConfig]);

  // Lade verfügbare Profilfeld-Namen
  useEffect(() => {
    if (!companyId || !isOpen) return;
    supabase
      .from("profile_field_templates" as any)
      .select("field_name")
      .eq("company_id", companyId)
      .then(({ data: pfData }) => {
        if (pfData) {
          const unique = [...new Set((pfData as any[]).map((r: any) => r.field_name as string))];
          setAvailableProfileFields(unique);
        }
      })
      .catch(() => {/* Tabelle existiert evtl. noch nicht */});
  }, [companyId, isOpen]);

  // Sync chart data when data prop changes
  useEffect(() => {
    if (data && data.length > 0) {
      setChartData(data);
    }
  }, [data]);

  // Refresh data when metric, groupBy, or dateRange changes
  const handleConfigChange = async (key: string, value: any) => {
    let newConfig = { ...config, [key]: value };
    
    // If metric changed, reset groupBy to a valid default
    if (key === 'metric') {
      const availableGroupBy = getGroupByOptionsForMetric(value);
      if (availableGroupBy.length > 0 && !availableGroupBy.find(opt => opt.value === config.groupBy)) {
        newConfig.groupBy = availableGroupBy[0].value;
      }
    }
    
    setConfig(newConfig);

    // If metric, groupBy, or dateRange changed and we have a refresh callback, fetch new data
    if ((key === 'metric' || key === 'groupBy' || key === 'dateRange' || key === 'dateProperty') && onRefreshData) {
      setIsLoading(true);
      try {
        const newData = await onRefreshData(newConfig);
        setChartData(newData || []);
      } catch (error) {
        console.error("Error refreshing data:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  const updateConfig = (key: string, value: any) => {
    handleConfigChange(key, value);
  };

  // Get available groupBy options based on selected metric
  const getGroupByOptionsForMetric = (metric: string) => {
    switch (metric) {
      case 'employees':
        return [
          { value: 'department', label: t("reports.builder.groupBy.department") },
          { value: 'created_at', label: t("reports.builder.groupBy.hireDate") },
          { value: 'tag', label: t("reports.builder.groupBy.tag") || "Tag" },
        ];
      case 'incidents':
        return [
          { value: 'investigation_status', label: t("reports.builder.groupBy.status") },
          { value: 'incident_type', label: t("reports.builder.groupBy.category") },
          { value: 'severity', label: t("reports.builder.groupBy.severity") },
          { value: 'location', label: t("reports.builder.groupBy.location") },
          { value: 'created_at', label: t("reports.builder.groupBy.date") },
          { value: 'department', label: t("reports.builder.groupBy.department") },
        ];
      case 'audits':
        return [
          { value: 'status', label: t("reports.builder.groupBy.status") },
          { value: 'iso_code', label: t("reports.builder.groupBy.isoCode") },
          { value: 'created_at', label: t("reports.builder.groupBy.date") },
        ];
      case 'trainings':
        return [
          { value: 'status', label: t("reports.builder.groupBy.status") },
          { value: 'employee_id', label: t("reports.builder.groupBy.employee") },
          { value: 'created_at', label: t("reports.builder.groupBy.date") },
        ];
      case 'risks':
        return [
          { value: 'risk_level', label: t("reports.builder.groupBy.riskLevel") },
          { value: 'department', label: t("reports.builder.groupBy.department") },
          { value: 'approval_status', label: t("reports.builder.groupBy.approvalStatus") },
        ];
      case 'measures':
        return [
          { value: 'status', label: t("reports.builder.groupBy.status") },
          { value: 'department', label: t("reports.builder.groupBy.department") },
          { value: 'tag', label: t("reports.builder.groupBy.tag") || "Tag" },
        ];
      case 'checkups':
        return [
          { value: 'status', label: t("reports.builder.groupBy.status") },
          { value: 'created_at', label: t("reports.builder.groupBy.date") },
        ];
      case 'tasks':
        return [
          { value: 'status', label: t("reports.builder.groupBy.status") },
          { value: 'priority', label: t("reports.builder.groupBy.priority") },
          { value: 'assigned_to', label: t("reports.builder.groupBy.assignedTo") },
        ];
      default:
        return [
          { value: 'department', label: t("reports.builder.groupBy.department") },
          { value: 'status', label: t("reports.builder.groupBy.status") },
        ];
    }
  };
  
  const getGroupByOptions = () => getGroupByOptionsForMetric(config.metric);

  const handleSave = () => {
    // Ensure data is included in the saved config
    const configWithData = {
      ...config,
      data: chartData && chartData.length > 0 ? chartData : config.data || [],
      tagFilters: tagFilters.length > 0 ? tagFilters : undefined,
      profileFieldFilters: profileFieldFilters.length > 0 ? profileFieldFilters : undefined,
    };
    onSave(configWithData);
    onClose();
  };

  const handleAddProfileFieldFilter = () => {
    const field = pfFieldInput.trim();
    const val = pfValueInput.trim();
    if (!field || !val) return;
    if (!profileFieldFilters.some((f) => f.field_name === field && f.value === val)) {
      setProfileFieldFilters((prev) => [...prev, { field_name: field, value: val }]);
    }
    setPfFieldInput("");
    setPfValueInput("");
  };

  const handleRemoveProfileFieldFilter = (idx: number) => {
    setProfileFieldFilters((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tagFilters.includes(trimmed)) {
      setTagFilters((prev) => [...prev, trimmed]);
    }
    setTagInput("");
    tagInputRef.current?.focus();
  };

  const handleRemoveTag = (tag: string) => {
    setTagFilters((prev) => prev.filter((t) => t !== tag));
  };

  const hasData = chartData.length > 0;

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground border-2 border-dashed rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
          <p>{t("reports.builder.loadingData")}</p>
        </div>
      );
    }

    if (!hasData) {
      return (
        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground border-2 border-dashed rounded-lg">
          <BarChart3 className="w-8 h-8 mb-2 opacity-20" />
          <p>{t("reports.builder.noDataAvailable")}</p>
        </div>
      );
    }

    switch (config.chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPie margin={{ top: 20, right: 30, left: 30, bottom: 0 }}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius="50%"
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconSize={10}
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              />
            </RechartsPie>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold">{t("reports.builder.title")}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Configuration Section */}
          <div className="grid grid-cols-2 gap-4">
            {/* Report Title */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="title">{t("reports.builder.reportTitleLabel")}</Label>
              <Input
                id="title"
                value={config.title}
                onChange={(e) => updateConfig('title', e.target.value)}
                placeholder={t("reports.builder.reportTitlePlaceholder")}
              />
            </div>

            {/* Metric Selection */}
            <div className="space-y-2">
              <Label htmlFor="metric">{t("reports.builder.metricLabel")}</Label>
              <Select value={config.metric} onValueChange={(val) => updateConfig('metric', val)}>
                <SelectTrigger id="metric">
                  <SelectValue placeholder={t("reports.builder.metricPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employees">{t("reports.builder.metric.employees")}</SelectItem>
                  <SelectItem value="incidents">{t("reports.builder.metric.incidents")}</SelectItem>
                  <SelectItem value="audits">{t("reports.builder.metric.audits")}</SelectItem>
                  <SelectItem value="trainings">{t("reports.builder.metric.trainings")}</SelectItem>
                  <SelectItem value="risks">{t("reports.builder.metric.risks")}</SelectItem>
                  <SelectItem value="checkups">{t("reports.builder.metric.checkups")}</SelectItem>
                  <SelectItem value="measures">{t("reports.builder.metric.measures")}</SelectItem>
                  <SelectItem value="tasks">{t("reports.builder.metric.tasks")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Group By */}
            <div className="space-y-2">
              <Label htmlFor="groupBy">{t("reports.builder.groupByLabel")}</Label>
              <Select value={config.groupBy} onValueChange={(val) => updateConfig('groupBy', val)}>
                <SelectTrigger id="groupBy">
                  <SelectValue placeholder={t("reports.builder.groupByPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {getGroupByOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Property */}
            <div className="space-y-2">
              <Label htmlFor="dateProperty">{t("reports.builder.datePropertyLabel")}</Label>
              <Select value={config.dateProperty} onValueChange={(val) => updateConfig('dateProperty', val)}>
                <SelectTrigger id="dateProperty">
                  <SelectValue placeholder={t("reports.builder.datePropertyPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">{t("reports.builder.dateProperty.createdAt")}</SelectItem>
                  <SelectItem value="updated_at">{t("reports.builder.dateProperty.updatedAt")}</SelectItem>
                  <SelectItem value="due_date">{t("reports.builder.dateProperty.dueDate")}</SelectItem>
                  <SelectItem value="completed_at">{t("reports.builder.dateProperty.completedAt")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label htmlFor="dateRange">{t("reports.builder.dateRangeLabel")}</Label>
              <Select
                value={config.dateRange.type}
                onValueChange={(val) => updateConfig('dateRange', { ...config.dateRange, type: val })}
              >
                <SelectTrigger id="dateRange">
                  <SelectValue placeholder={t("reports.builder.dateRangePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t("reports.builder.dateRange.today")}</SelectItem>
                  <SelectItem value="last_7_days">{t("reports.builder.dateRange.last7Days")}</SelectItem>
                  <SelectItem value="last_30_days">{t("reports.builder.dateRange.last30Days")}</SelectItem>
                  <SelectItem value="last_90_days">{t("reports.builder.dateRange.last90Days")}</SelectItem>
                  <SelectItem value="this_month">{t("reports.builder.dateRange.thisMonth")}</SelectItem>
                  <SelectItem value="this_year">{t("reports.builder.dateRange.thisYear")}</SelectItem>
                  <SelectItem value="custom">{t("reports.builder.dateRange.custom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chart Type */}
            <div className="space-y-2">
              <Label>{t("reports.builder.chartTypeLabel")}</Label>
              <div className="flex gap-2">
                <Button
                  variant={config.chartType === 'pie' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateConfig('chartType', 'pie')}
                  className="flex-1"
                >
                  <PieChart className="w-4 h-4 mr-2" />
                  {t("reports.builder.chartType.pie")}
                </Button>
                <Button
                  variant={config.chartType === 'bar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateConfig('chartType', 'bar')}
                  className="flex-1"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {t("reports.builder.chartType.bar")}
                </Button>
                <Button
                  variant={config.chartType === 'line' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateConfig('chartType', 'line')}
                  className="flex-1"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {t("reports.builder.chartType.line")}
                </Button>
              </div>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label htmlFor="sortBy">{t("reports.builder.sortByLabel")}</Label>
              <Select value={config.sortBy} onValueChange={(val) => updateConfig('sortBy', val)}>
                <SelectTrigger id="sortBy">
                  <SelectValue placeholder={t("reports.builder.sortByPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value">{t("reports.builder.sortBy.value")}</SelectItem>
                  <SelectItem value="alphabetical">{t("reports.builder.sortBy.alphabetical")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview Tabs */}
          <Tabs
            value={config.displayMode || 'chart'}
            onValueChange={(v) => setConfig(prev => ({ ...prev, displayMode: v as 'chart' | 'table' | 'summary' }))}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chart">{t("reports.builder.tabs.chart")}</TabsTrigger>
              <TabsTrigger value="table">{t("reports.builder.tabs.table")}</TabsTrigger>
              <TabsTrigger value="summary">{t("reports.builder.tabs.summary")}</TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="mt-4">
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-medium mb-4">{config.title}</h3>
                {renderChart()}
              </div>
            </TabsContent>

            <TabsContent value="table" className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-3 font-semibold">{t("reports.builder.table.name")}</th>
                      <th className="text-right p-3 font-semibold">{t("reports.builder.table.value")}</th>
                      <th className="text-right p-3 font-semibold">{t("reports.builder.table.percentage")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((item, index) => {
                      const total = chartData.reduce((sum, d) => sum + d.value, 0);
                      const percentage = ((item.value / total) * 100).toFixed(1);
                      return (
                        <tr key={index} className="border-b">
                          <td className="p-3">{item.name}</td>
                          <td className="p-3 text-right font-medium">{item.value}</td>
                          <td className="p-3 text-right text-muted-foreground">{percentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="mt-4">
              <div className="border rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground">{t("reports.builder.summary.totalCount")}</div>
                    <div className="text-2xl font-bold">
                      {chartData.reduce((sum, d) => sum + d.value, 0)}
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground">{t("reports.builder.summary.average")}</div>
                    <div className="text-2xl font-bold">
                      {(chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length).toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground">{t("reports.builder.summary.categories")}</div>
                    <div className="text-2xl font-bold">{chartData.length}</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p><strong>{t("reports.builder.summary.dateRange")}</strong> {config.dateRange.type.replace(/_/g, ' ')}</p>
                  <p><strong>{t("reports.builder.summary.groupedBy")}</strong> {config.groupBy}</p>
                  <p><strong>{t("reports.builder.summary.metric")}</strong> {config.metric}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          {/* Tag-Filter */}
          <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Tag-Filter</span>
            </div>
            <div className="flex gap-2">
              <Input
                ref={tagInputRef}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Tag eingeben …"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
                <Plus className="w-4 h-4 mr-1" />
                Hinzufügen
              </Button>
            </div>
            {tagFilters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tagFilters.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-sm font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 rounded-full hover:bg-blue-200 p-0.5 transition-colors"
                      aria-label={`Tag "${tag}" entfernen`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Profilfeld-Filter */}
          <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Profilfeld-Filter</span>
            </div>
            <div className="flex gap-2">
              {availableProfileFields.length > 0 ? (
                <select
                  value={pfFieldInput}
                  onChange={(e) => setPfFieldInput(e.target.value)}
                  className="flex-1 border rounded-md px-3 py-2 text-sm bg-white"
                >
                  <option value="">Feldname wählen …</option>
                  {availableProfileFields.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              ) : (
                <Input
                  value={pfFieldInput}
                  onChange={(e) => setPfFieldInput(e.target.value)}
                  placeholder="Feldname (z.B. Führerscheinklasse)"
                  className="flex-1"
                />
              )}
              <Input
                value={pfValueInput}
                onChange={(e) => setPfValueInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddProfileFieldFilter(); } }}
                placeholder="Wert (z.B. Stapler)"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddProfileFieldFilter}>
                <Plus className="w-4 h-4 mr-1" />
                Hinzufügen
              </Button>
            </div>
            {profileFieldFilters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profileFieldFilters.map((pf, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-800 px-3 py-1 text-sm font-medium"
                  >
                    {pf.field_name}: {pf.value}
                    <button
                      type="button"
                      onClick={() => handleRemoveProfileFieldFilter(idx)}
                      className="ml-1 rounded-full hover:bg-purple-200 p-0.5 transition-colors"
                      aria-label={`Filter "${pf.field_name}: ${pf.value}" entfernen`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("reports.builder.cancel")}
          </Button>
          <Button onClick={handleSave}>
            {initialConfig ? t("reports.builder.saveReport") : t("reports.builder.addReport")}
          </Button>
        </div>
      </div>
    </div>
  );
}
