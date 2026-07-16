import { useState } from "react";
import {
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Download,
  GripVertical
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ReportConfig } from "./ReportBuilder";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReportWidgetProps {
  config: ReportConfig;
  data?: any[];
  onEdit: (config: ReportConfig) => void;
  onDuplicate: (config: ReportConfig) => void;
  onDelete: (id: string) => void;
  onExport: (config: ReportConfig) => void;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

// Get subtitle based on report configuration
const getSubtitle = (config: ReportConfig, t: (key: string) => string) => {
  if (config.metric === 'incidents') {
    return config.incidentType
      ? t("reports.widget.subtitleIncidentTypeOverTime").replace("{type}", config.incidentType)
      : t("reports.widget.subtitleIncidentsDefault");
  }
  if (config.metric === 'audits') {
    return config.auditTemplate
      ? t("reports.widget.subtitleAuditTemplate").replace("{template}", config.auditTemplate)
      : t("reports.widget.subtitleAuditsDefault");
  }
  if (config.metric === 'trainings') {
    return t("reports.widget.subtitleTrainings");
  }
  if (config.metric === 'employees') {
    return config.groupBy
      ? t("reports.widget.subtitleEmployeesByGroup").replace("{groupBy}", config.groupBy)
      : t("reports.widget.subtitleEmployeesDefault");
  }
  if (config.groupBy) {
    return t("reports.widget.subtitleGroupedBy").replace("{groupBy}", config.groupBy);
  }
  return t("reports.widget.subtitleDefault");
};

export default function ReportWidget({
  config,
  data = [],
  onEdit,
  onDuplicate,
  onDelete,
  onExport,
}: ReportWidgetProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'chart' | 'table' | 'summary'>(config.displayMode || 'chart');
  // Use provided data or config data
  const chartData = (data && data.length > 0) ? data : (config.data || []);

  // Check if there's actual data (non-zero totals) and not just empty categories
  const hasData = chartData && chartData.length > 0 && chartData.some(d => d.value > 0);
  const subtitle = getSubtitle(config, t);

  const renderChart = () => {
    if (!hasData) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground min-h-[150px]">
          <div className="text-center">
            <BarChart className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">{t("reports.widget.noDataAvailable")}</p>
          </div>
        </div>
      );
    }

    switch (config.chartType) {
      case 'line':
        // Area chart like Incident Trends
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${config.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill={`url(#gradient-${config.id})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="40%"
                outerRadius="70%"
                paddingAngle={2}
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

      default:
        // Default to area chart
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-default-${config.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill={`url(#gradient-default-${config.id})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden border rounded-xl hover:shadow-md transition-shadow">
      {/* Drag Handle */}
      <div className="drag-handle cursor-grab active:cursor-grabbing flex items-center justify-center py-2 border-b hover:bg-muted/30 transition-colors">
        <GripVertical className="w-4 h-4 text-muted-foreground/40" />
      </div>

      {/* Header */}
      <CardHeader className="px-4 py-3 flex-row items-start justify-between space-y-0">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base font-semibold text-foreground">
            {config.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {subtitle}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onEdit(config);
            }}>
              <Edit className="mr-2 h-4 w-4" />
              {t("reports.widget.editReport")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onDuplicate(config);
            }}>
              <Copy className="mr-2 h-4 w-4" />
              {t("reports.widget.duplicate")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onExport(config);
            }}>
              <Download className="mr-2 h-4 w-4" />
              {t("reports.widget.exportData")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(config.id);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("reports.widget.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
          <div className="px-4 pt-2">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="chart">Diagramm</TabsTrigger>
              <TabsTrigger value="table">Datentabelle</TabsTrigger>
              <TabsTrigger value="summary">Zusammenfassung</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chart" className="flex-1 px-4 pb-4 mt-2">
            <div className="h-full min-h-[150px]">
              {renderChart()}
            </div>
          </TabsContent>

          <TabsContent value="table" className="px-4 pb-4 mt-2">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Keine Daten verfügbar</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-right p-3 font-medium">Wert</th>
                      <th className="text-right p-3 font-medium">Anteil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((item, index) => {
                      const total = chartData.reduce((s, d) => s + (d.value || 0), 0);
                      const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={index} className="border-t hover:bg-muted/30">
                          <td className="p-3">{item.name}</td>
                          <td className="p-3 text-right font-medium">{item.value}</td>
                          <td className="p-3 text-right text-muted-foreground">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="summary" className="px-4 pb-4 mt-2">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Keine Daten verfügbar</div>
            ) : (() => {
              const total = chartData.reduce((s, d) => s + (d.value || 0), 0);
              const avg = chartData.length > 0 ? (total / chartData.length) : 0;
              return (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="text-xs text-muted-foreground mb-1">Gesamtanzahl</div>
                    <div className="text-2xl font-bold">{total}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <div className="text-xs text-muted-foreground mb-1">Durchschnitt</div>
                    <div className="text-2xl font-bold">{avg.toFixed(1)}</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <div className="text-xs text-muted-foreground mb-1">Kategorien</div>
                    <div className="text-2xl font-bold">{chartData.length}</div>
                  </div>
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}
