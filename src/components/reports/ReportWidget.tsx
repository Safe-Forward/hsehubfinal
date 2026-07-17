import { useMemo, useState } from "react";
import {
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Download,
  GripVertical,
  BarChart2
} from "lucide-react";
import DrillDownModal from "./DrillDownModal";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const DATE_RANGE_LABELS: Record<string, string> = {
  last_7_days: "letzte 7 Tage",
  last_30_days: "letzte 30 Tage",
  last_90_days: "letzte 90 Tage",
  last_6_months: "letzte 6 Monate",
  last_12_months: "letzte 12 Monate",
  this_month: "diesen Monat",
  last_month: "letzten Monat",
  this_year: "dieses Jahr",
  last_year: "letztes Jahr",
  custom: "benutzerdefinierter Zeitraum",
};

const GROUP_BY_LABELS: Record<string, string> = {
  status: "Status",
  type: "Typ",
  department: "Abteilung",
  month: "Monat",
  week: "Woche",
  employee: "Mitarbeiter",
  category: "Kategorie",
  severity: "Schweregrad",
  risk_level: "Risikoniveau",
  incident_type: "Vorfallsart",
  investigation_status: "Untersuchungsstatus",
};

const VALUE_LABELS: Record<string, string> = {
  open: "Offen",
  closed: "Geschlossen",
  completed: "Abgeschlossen",
  in_progress: "In Bearbeitung",
  pending: "Ausstehend",
  under_investigation: "Unter Untersuchung",
  resolved: "Gelöst",
  draft: "Entwurf",
  scheduled: "Geplant",
  active: "Aktiv",
  not_applicable: "Nicht zutreffend",
  cancelled: "Abgebrochen",
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  critical: "Kritisch",
  other: "Sonstige",
  unknown: "Unbekannt",
};

const getSubtitle = (config: ReportConfig) => {
  const parts: string[] = [];
  if (config.groupBy) {
    parts.push(`nach ${GROUP_BY_LABELS[config.groupBy] || config.groupBy}`);
  }
  const rangeType = config.dateRange?.type;
  if (rangeType && rangeType !== "custom") {
    parts.push(DATE_RANGE_LABELS[rangeType] || rangeType);
  } else if (rangeType === "custom" && config.dateRange?.startDate && config.dateRange?.endDate) {
    parts.push(`${config.dateRange.startDate} – ${config.dateRange.endDate}`);
  }
  return parts.join(" · ") || "Benutzerdefinierter Bericht";
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
  const [drillDown, setDrillDown] = useState<{ raw: string; display: string } | null>(null);
  const openDrillDown = (raw: string, display: string) => setDrillDown({ raw, display });

  const chartData = (data && data.length > 0) ? data : (config.data || []);

  // rawName preserved for drill-down queries; name is the German display label
  const displayData = useMemo(
    () => chartData.map(d => ({ ...d, rawName: d.rawName ?? d.name, name: VALUE_LABELS[d.name] ?? d.name })),
    [chartData]
  );

  // Key change forces Recharts to remount when data content or chart type changes
  const chartKey = useMemo(() => {
    const hash = displayData.map(d => `${d.name}:${d.value}`).join('|');
    return `${config.id}-${config.chartType}-${hash}`;
  }, [config.id, config.chartType, displayData]);

  const hasData = displayData.length > 0 && displayData.some(d => d.value > 0);
  const subtitle = getSubtitle(config);
  const displayMode = config.displayMode || 'chart';

  const renderChart = () => {
    if (!hasData) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground min-h-[150px]">
          <div className="text-center">
            <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">{t("reports.widget.noDataAvailable")}</p>
          </div>
        </div>
      );
    }

    switch (config.chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} style={{ cursor: 'pointer' }}
              onClick={(d: any) => { const p = d?.activePayload?.[0]?.payload; if (p) openDrillDown(p.rawName ?? p.name, p.name); }}>
              <defs>
                <linearGradient id={`gradient-${config.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={30} />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fill={`url(#gradient-${config.id})`} />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} style={{ cursor: 'pointer' }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={30} />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]}
                onClick={(d: any) => openDrillDown(d.rawName ?? d.name, d.name)} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <Pie data={displayData} cx="50%" cy="50%" innerRadius="40%" outerRadius="70%" paddingAngle={2} dataKey="value"
                style={{ cursor: 'pointer' }}
                onClick={(d: any) => openDrillDown(d.rawName ?? d.name, d.name)}>
                {displayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            </RechartsPie>
          </ResponsiveContainer>
        );

      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} style={{ cursor: 'pointer' }}
              onClick={(d: any) => { const p = d?.activePayload?.[0]?.payload; if (p) openDrillDown(p.rawName ?? p.name, p.name); }}>
              <defs>
                <linearGradient id={`gradient-default-${config.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={30} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fill={`url(#gradient-default-${config.id})`} />
            </AreaChart>
          </ResponsiveContainer>
        );
    }
  };

  const renderTable = () => (
    displayData.length === 0 ? (
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
            {displayData.map((item, index) => {
              const total = displayData.reduce((s, d) => s + (d.value || 0), 0);
              const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0";
              return (
                <tr key={index} className="border-t hover:bg-muted/30 cursor-pointer"
                  onClick={() => openDrillDown(item.rawName ?? item.name, item.name)}>
                  <td className="p-3 text-primary font-medium">{item.name}</td>
                  <td className="p-3 text-right font-bold">{item.value}</td>
                  <td className="p-3 text-right text-muted-foreground">{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )
  );

  const renderSummary = () => {
    if (displayData.length === 0) {
      return <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Keine Daten verfügbar</div>;
    }
    const total = displayData.reduce((s, d) => s + (d.value || 0), 0);
    const avg = displayData.length > 0 ? total / displayData.length : 0;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {/* Gesamtanzahl: klickbar → alle Datensätze */}
          <div
            className="bg-blue-50 p-3 rounded-lg text-center cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => openDrillDown("", "Alle")}
          >
            <div className="text-xs text-muted-foreground mb-1">Gesamtanzahl</div>
            <div className="text-2xl font-bold text-blue-700">{total}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">Durchschnitt</div>
            <div className="text-2xl font-bold">{avg.toFixed(1)}</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">Kategorien</div>
            <div className="text-2xl font-bold">{displayData.length}</div>
          </div>
        </div>
        {/* Aufschlüsselung: jede Gruppe ist anklickbar */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {displayData.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-t first:border-t-0 hover:bg-muted/40 cursor-pointer"
                  onClick={() => openDrillDown(item.rawName ?? item.name, item.name)}
                >
                  <td className="px-3 py-2 text-primary font-medium">{item.name}</td>
                  <td className="px-3 py-2 text-right font-bold">{item.value}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {total > 0 ? `${((item.value / total) * 100).toFixed(0)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (displayMode) {
      case 'table':
        return (
          <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: 280 }}>
            {renderTable()}
          </div>
        );
      case 'summary':
        return (
          <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: 300 }}>
            {renderSummary()}
          </div>
        );
      default:
        return (
          <div key={chartKey} className="flex-1 px-4 pb-4 min-h-[150px]">
            {renderChart()}
          </div>
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
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(config); }}>
              <Edit className="mr-2 h-4 w-4" />
              {t("reports.widget.editReport")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(config); }}>
              <Copy className="mr-2 h-4 w-4" />
              {t("reports.widget.duplicate")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onExport(config); }}>
              <Download className="mr-2 h-4 w-4" />
              {t("reports.widget.exportData")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(config.id); }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("reports.widget.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      {/* Content — rendered directly from config.displayMode, no tab switcher */}
      <div className="flex-1 flex flex-col overflow-hidden mt-2">
        {renderContent()}
      </div>

      {drillDown && (
        <DrillDownModal
          isOpen={!!drillDown}
          onClose={() => setDrillDown(null)}
          config={config}
          rawFilterValue={drillDown.raw}
          displayFilterValue={drillDown.display}
        />
      )}
    </Card>
  );
}
