import { useState, useEffect, useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, GripVertical, AlertTriangle, CheckCircle, ShieldAlert, ShieldCheck, Users, Pencil, Copy } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const CHART_COLORS = ['#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#6366f1'];
import { DraggableCard } from "@/components/reports/DraggableCard";
import { getTileConfig, getChartConfig } from "@/components/reports/TileConfigStore";
import { ReportStats, getStatusColor, formatStatusLabel, OnEditTile } from "@/components/reports/types";
import type { ReportConfig } from "@/components/reports/ReportBuilder";
import ReportWidget from "@/components/reports/ReportWidget";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const SECTION_ID = "incidents";

const ResponsiveGridLayout = WidthProvider(Responsive);

// ─── Accident KPI types (inlined from AccidentKPISection) ───────────────────

interface DepartmentKPI {
  id: string;
  name: string;
  accidentFreeDays: number | null;
  lastAccidentDate: string | null;
  reportableCount: number;
  employeeCount: number;
  teurRate: number;
}

interface AccidentKPIData {
  accidentFreeDaysGlobal: number | null;
  lastAccidentDateGlobal: string | null;
  totalEmployees: number;
  reportableTotal: number;
  fatalTotal: number;
  injuryTotal: number;
  nearMissTotal: number;
  teurRate: number;
  departments: DepartmentKPI[];
}

const REPORTABLE_SEVERITIES = ["serious", "critical", "fatal"] as const;

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function IncidentsSection({
  stats,
  chartData,
  incidentTypeData,
  companyId,
  selectedYear,
  departmentFilter = "all",
  onEditTile,
  onAddTileAsReport,
  customReports,
  onEditReport,
  onDuplicateReport,
  onDeleteReport,
  onExportReport,
}: {
  stats: ReportStats;
  chartData: any[];
  incidentTypeData: any[];
  companyId: string;
  selectedYear: number;
  departmentFilter?: string;
  onEditTile?: OnEditTile;
  onAddTileAsReport?: (config: ReportConfig) => void;
  customReports?: ReportConfig[];
  onEditReport?: (c: ReportConfig) => void;
  onDuplicateReport?: (c: ReportConfig) => void;
  onDeleteReport?: (id: string) => void;
  onExportReport?: (c: ReportConfig) => void;
}) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');

  // ── Tile label overrides ────────────────────────────────────────────────────
  const [tileLabels, setTileLabels] = useState<Record<string, { title: string; subtitle: string }>>(() => {
    const tileIds = ["incident-total", "incident-open", "incident-closed", "incident-reportable", "accident-free", "teur-rate", "dept-table"];
    const result: Record<string, { title: string; subtitle: string }> = {};
    tileIds.forEach((id) => {
      const cfg = getTileConfig(SECTION_ID, id);
      result[id] = { title: cfg.title ?? "", subtitle: cfg.subtitle ?? "" };
    });
    return result;
  });
  const getTileLabel = (id: string, defaultTitle: string, defaultSubtitle: string) => ({
    title: tileLabels[id]?.title || defaultTitle,
    subtitle: tileLabels[id]?.subtitle || defaultSubtitle,
  });


  // Chart overrides from ReportBuilder
  const [chartOverrides, setChartOverrides] = useState<Record<string, { data: any[]; chartType: string; title?: string }>>(() => {
    const result: Record<string, { data: any[]; chartType: string; title?: string }> = {};
    for (const tileId of ["incident-trend-chart", "incident-type-chart"]) {
      const stored = getChartConfig(SECTION_ID, tileId);
      if (stored) result[tileId] = { data: [], chartType: stored.chartType, title: stored.title };
    }
    return result;
  });

  const handleEditChartTile = (tileId: string, defaultConfig: ReportConfig) => {
    if (!onEditTile) return;
    onEditTile(tileId, defaultConfig, (cfg, data) => {
      setChartOverrides((prev) => ({ ...prev, [tileId]: { data, chartType: cfg.chartType, title: cfg.title } }));
    });
  };

  const handleEditKPITile = (tileId: string, defaultConfig: ReportConfig) => {
    if (!onEditTile) return;
    onEditTile(tileId, defaultConfig, (cfg) => {
      if (cfg.title) setTileLabels((prev) => ({ ...prev, [tileId]: { title: cfg.title!, subtitle: prev[tileId]?.subtitle ?? "" } }));
    });
  };

  const renderChart = (data: any[], chartType: string) => {
    if (chartType === "pie") {
      return (
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="75%">
            {data.map((_: any, idx: number) => (
              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      );
    }
    if (chartType === "line") {
      return (
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" stroke="#888" fontSize={12} />
          <YAxis stroke="#888" fontSize={12} allowDecimals={false} />
          <Tooltip />
          <Area type="monotone" dataKey="value" fill="#ef4444" stroke="#ef4444" />
        </AreaChart>
      );
    }
    // default: bar
    return (
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" stroke="#888" fontSize={12} />
        <YAxis stroke="#888" fontSize={12} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    );
  };

  // ── Accident KPI state ──────────────────────────────────────────────────────
  const [accidentKPI, setAccidentKPI] = useState<AccidentKPIData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    const loadKPIs = async () => {
      setKpiLoading(true);
      try {
        const yearStart = `${selectedYear}-01-01`;
        const yearEnd = `${selectedYear}-12-31`;
        const deptActive = departmentFilter !== "all";

        let allIncidentsQ = (supabase as any)
          .from("incidents")
          .select("incident_date, severity, incident_type, department_id, is_reportable")
          .eq("company_id", companyId)
          .eq("is_reportable", true)
          .order("incident_date", { ascending: false });
        if (deptActive) allIncidentsQ = allIncidentsQ.eq("department_id", departmentFilter);

        let employeesQ = supabase
          .from("employees")
          .select("id, department_id", { count: "exact" })
          .eq("company_id", companyId)
          .eq("is_active", true);
        if (deptActive) employeesQ = (employeesQ as any).eq("department_id", departmentFilter);

        let yearIncidentsQ = (supabase as any)
          .from("incidents")
          .select("id, severity, incident_type, department_id, incident_date, is_reportable")
          .eq("company_id", companyId)
          .gte("incident_date", yearStart)
          .lte("incident_date", yearEnd);
        if (deptActive) yearIncidentsQ = yearIncidentsQ.eq("department_id", departmentFilter);

        const [allIncidentsRes, employeesRes, departmentsRes, yearIncidentsRes] = await Promise.all([
          allIncidentsQ,
          employeesQ,
          supabase
            .from("departments")
            .select("id, name")
            .eq("company_id", companyId)
            .order("name"),
          yearIncidentsQ,
        ]);

        const allReportable: Array<{ incident_date: string; severity: string; incident_type: string; department_id: string | null; is_reportable: boolean }> =
          allIncidentsRes.data || [];
        const yearIncidents: Array<{ id: string; severity: string; incident_type: string; department_id: string | null; incident_date: string; is_reportable: boolean }> =
          yearIncidentsRes.data || [];
        const employees: Array<{ id: string; department_id: string | null }> = employeesRes.data || [];
        const departments: Array<{ id: string; name: string }> = departmentsRes.data || [];
        const totalEmployees = employeesRes.count ?? employees.length;

        const lastGlobal = allReportable[0]?.incident_date ?? null;
        const accidentFreeDaysGlobal = daysSince(lastGlobal);

        const reportableInYear = yearIncidents.filter((i) => i.is_reportable === true);
        const fatalInYear = yearIncidents.filter((i) => i.severity === "fatal");
        const nearMissInYear = yearIncidents.filter((i) => i.incident_type === "near_miss");
        const seriousInjuryInYear = reportableInYear.filter((i) => i.severity !== "fatal");

        const teurRate =
          totalEmployees > 0
            ? parseFloat(((reportableInYear.length / totalEmployees) * 1000).toFixed(2))
            : 0;

        const employeesByDept = new Map<string, number>();
        employees.forEach((e) => {
          const dId = e.department_id ?? "__none__";
          employeesByDept.set(dId, (employeesByDept.get(dId) ?? 0) + 1);
        });

        const lastByDept = new Map<string, string>();
        allReportable.forEach((i) => {
          const dId = i.department_id ?? "__none__";
          if (!lastByDept.has(dId)) lastByDept.set(dId, i.incident_date);
        });

        const reportableByDept = new Map<string, number>();
        reportableInYear.forEach((i) => {
          const dId = i.department_id ?? "__none__";
          reportableByDept.set(dId, (reportableByDept.get(dId) ?? 0) + 1);
        });

        const deptKPIs: DepartmentKPI[] = departments.map((dept) => {
          const empCount = employeesByDept.get(dept.id) ?? 0;
          const lastDate = lastByDept.get(dept.id) ?? null;
          const reportableCount = reportableByDept.get(dept.id) ?? 0;
          const rate = empCount > 0 ? parseFloat(((reportableCount / empCount) * 1000).toFixed(2)) : 0;
          return {
            id: dept.id,
            name: dept.name,
            accidentFreeDays: daysSince(lastDate),
            lastAccidentDate: lastDate,
            reportableCount,
            employeeCount: empCount,
            teurRate: rate,
          };
        });

        setAccidentKPI({
          accidentFreeDaysGlobal,
          lastAccidentDateGlobal: lastGlobal,
          totalEmployees,
          reportableTotal: reportableInYear.length,
          fatalTotal: fatalInYear.length,
          injuryTotal: seriousInjuryInYear.length,
          nearMissTotal: nearMissInYear.length,
          teurRate,
          departments: deptKPIs,
        });
      } catch (err) {
        console.error("IncidentsSection: error loading accident KPIs", err);
      } finally {
        setKpiLoading(false);
      }
    };
    loadKPIs();
  }, [companyId, selectedYear]);

  // ─────────────────────────────────────────────────────────────────────────────

  const defaultLayout = {
    lg: [
      { i: "incident-total", x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-open", x: 4, y: 0, w: 4, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-closed", x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-reportable", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "accident-free", x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "teur-rate", x: 9, y: 2, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-trend-chart", x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3, static: false },
      { i: "incident-type-chart", x: 6, y: 4, w: 6, h: 4, minW: 4, minH: 3, static: false },
      { i: "dept-table", x: 0, y: 8, w: 12, h: 5, minW: 6, minH: 4, static: false },
    ],
    md: [
      { i: "incident-total", x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-open", x: 4, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-closed", x: 7, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-reportable", x: 0, y: 2, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "accident-free", x: 5, y: 2, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "teur-rate", x: 8, y: 2, w: 2, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-trend-chart", x: 0, y: 4, w: 5, h: 4, minW: 4, minH: 3, static: false },
      { i: "incident-type-chart", x: 5, y: 4, w: 5, h: 4, minW: 4, minH: 3, static: false },
      { i: "dept-table", x: 0, y: 8, w: 10, h: 5, minW: 6, minH: 4, static: false },
    ],
    sm: [
      { i: "incident-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-open", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-closed", x: 0, y: 4, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-reportable", x: 0, y: 6, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "accident-free", x: 0, y: 8, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "teur-rate", x: 0, y: 10, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-trend-chart", x: 0, y: 12, w: 6, h: 4, minW: 4, minH: 3, static: false },
      { i: "incident-type-chart", x: 0, y: 16, w: 6, h: 4, minW: 4, minH: 3, static: false },
      { i: "dept-table", x: 0, y: 20, w: 6, h: 5, minW: 6, minH: 4, static: false },
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
    toast({ title: t("reports.toast.layoutResetTitle"), description: t("reports.toast.incidentsLayoutResetDesc") });
  }, [toast, t]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t("reports.incidents.heading")}</h2>
          <p className="text-muted-foreground">{t("reports.incidents.description")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          {t("reports.overview.resetLayout")}
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
            title={getTileLabel("incident-total", t("reports.incidents.totalTitle"), t("reports.incidents.totalSubtitle")).title}
            subtitle={getTileLabel("incident-total", t("reports.incidents.totalTitle"), t("reports.incidents.totalSubtitle")).subtitle}
            value={stats.totalIncidents}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="bg-red-50 text-red-600"
            editSlot={(onEditTile || onAddTileAsReport) ? (<>{onEditTile && <button onClick={(e) => { e.stopPropagation(); handleEditKPITile("incident-total", { id: "incident-total", title: t("reports.incidents.totalTitle"), metric: "incidents", groupBy: "status", dateProperty: "incident_date", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Kachel bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}{onAddTileAsReport && <button onClick={(e) => { e.stopPropagation(); onAddTileAsReport({ id: "incident-total", title: getTileLabel("incident-total", t("reports.incidents.totalTitle"), t("reports.incidents.totalSubtitle")).title, metric: "incidents", groupBy: "status", dateProperty: "incident_date", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID, data: [] }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Als Bericht hinzufügen"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>}</>) : undefined}
          />
        </div>
        <div key="incident-open">
          <DraggableCard
            title={getTileLabel("incident-open", t("reports.incidents.openTitle"), t("reports.incidents.openSubtitle")).title}
            subtitle={getTileLabel("incident-open", t("reports.incidents.openTitle"), t("reports.incidents.openSubtitle")).subtitle}
            value={stats.openIncidents}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
            editSlot={(onEditTile || onAddTileAsReport) ? (<>{onEditTile && <button onClick={(e) => { e.stopPropagation(); handleEditKPITile("incident-open", { id: "incident-open", title: t("reports.incidents.openTitle"), metric: "incidents", groupBy: "status", dateProperty: "incident_date", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Kachel bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}{onAddTileAsReport && <button onClick={(e) => { e.stopPropagation(); onAddTileAsReport({ id: "incident-open", title: getTileLabel("incident-open", t("reports.incidents.openTitle"), t("reports.incidents.openSubtitle")).title, metric: "incidents", groupBy: "status", dateProperty: "incident_date", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID, data: [] }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Als Bericht hinzufügen"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>}</>) : undefined}
          />
        </div>
        <div key="incident-closed">
          <DraggableCard
            title={getTileLabel("incident-closed", t("reports.incidents.closedTitle"), t("reports.incidents.closedSubtitle")).title}
            subtitle={getTileLabel("incident-closed", t("reports.incidents.closedTitle"), t("reports.incidents.closedSubtitle")).subtitle}
            value={stats.totalIncidents - stats.openIncidents}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
            editSlot={(onEditTile || onAddTileAsReport) ? (<>{onEditTile && <button onClick={(e) => { e.stopPropagation(); handleEditKPITile("incident-closed", { id: "incident-closed", title: t("reports.incidents.closedTitle"), metric: "incidents", groupBy: "status", dateProperty: "incident_date", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Kachel bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}{onAddTileAsReport && <button onClick={(e) => { e.stopPropagation(); onAddTileAsReport({ id: "incident-closed", title: getTileLabel("incident-closed", t("reports.incidents.closedTitle"), t("reports.incidents.closedSubtitle")).title, metric: "incidents", groupBy: "status", dateProperty: "incident_date", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID, data: [] }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Als Bericht hinzufügen"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>}</>) : undefined}
          />
        </div>
        <div key="incident-reportable">
          <DraggableCard
            title={getTileLabel("incident-reportable", "Meldepflichtige Vorfälle", `§ 193 SGB VII / DGUV — ${stats.totalIncidents > 0 ? Math.round((stats.reportableIncidents / stats.totalIncidents) * 100) : 0}% aller Vorfälle`).title}
            subtitle={getTileLabel("incident-reportable", "Meldepflichtige Vorfälle", `§ 193 SGB VII / DGUV — ${stats.totalIncidents > 0 ? Math.round((stats.reportableIncidents / stats.totalIncidents) * 100) : 0}% aller Vorfälle`).subtitle}
            value={`${stats.reportableIncidents} / ${stats.totalIncidents}`}
            icon={<ShieldAlert className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
            editSlot={(onEditTile || onAddTileAsReport) ? (<>{onEditTile && <button onClick={(e) => { e.stopPropagation(); handleEditKPITile("incident-reportable", { id: "incident-reportable", title: "Meldepflichtige Vorfälle", metric: "incidents", groupBy: "status", dateProperty: "incident_date", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Kachel bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}{onAddTileAsReport && <button onClick={(e) => { e.stopPropagation(); onAddTileAsReport({ id: "incident-reportable", title: getTileLabel("incident-reportable", "Meldepflichtige Vorfälle", "").title, metric: "incidents", groupBy: "status", dateProperty: "incident_date", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID, data: [] }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Als Bericht hinzufügen"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>}</>) : undefined}
          />
        </div>
        <div key="incident-trend-chart" data-grid={{ x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3 }}>
          <Card className="dashboard-grid-card border shadow-sm h-full group">
            <div className="drag-handle border-b flex items-center justify-between px-3 py-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-0.5">
                {onEditTile && <button onClick={(e) => { e.stopPropagation(); handleEditChartTile("incident-trend-chart", { id: "incident-trend-chart", title: t("reports.incidents.trendChartTitle"), metric: "incidents", groupBy: "investigation_status", dateProperty: "incident_date", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Diagramm bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                {onAddTileAsReport && <button onClick={(e) => { e.stopPropagation(); const ov = chartOverrides["incident-trend-chart"]; onAddTileAsReport({ id: "incident-trend-chart", title: ov?.title || t("reports.incidents.trendChartTitle"), metric: "incidents", groupBy: "investigation_status", dateProperty: "incident_date", dateRange: { type: "last_30_days" }, chartType: (ov?.chartType as any) || "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID, data: [] }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Als Bericht hinzufügen"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>}
              </div>
            </div>
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-base">{chartOverrides["incident-trend-chart"]?.title || t("reports.incidents.trendChartTitle")}</CardTitle>
              <CardDescription>{t("reports.incidents.trendChartDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 pt-0">
              {(() => {
                const override = chartOverrides["incident-trend-chart"];
                const data = override?.data?.length ? override.data : chartData;
                // chartType gilt IMMER wenn override vorhanden, auch ohne Daten-Override
                const chartType = override?.chartType || "bar";
                if (data.length === 0) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t("reports.incidents.noDataForRange")}</div>;
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    {renderChart(data, chartType)}
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>
        </div>
        <div key="incident-type-chart" data-grid={{ x: 6, y: 4, w: 6, h: 4, minW: 4, minH: 3 }}>
          <Card className="dashboard-grid-card border shadow-sm h-full group">
            <div className="drag-handle border-b flex items-center justify-between px-3 py-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-0.5">
                {onEditTile && <button onClick={(e) => { e.stopPropagation(); handleEditChartTile("incident-type-chart", { id: "incident-type-chart", title: t("reports.incidents.typeChartTitle"), metric: "incidents", groupBy: "incident_type", dateProperty: "incident_date", dateRange: { type: "last_30_days" }, chartType: "pie", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Diagramm bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                {onAddTileAsReport && <button onClick={(e) => { e.stopPropagation(); const ov = chartOverrides["incident-type-chart"]; onAddTileAsReport({ id: "incident-type-chart", title: ov?.title || t("reports.incidents.typeChartTitle"), metric: "incidents", groupBy: "incident_type", dateProperty: "incident_date", dateRange: { type: "last_30_days" }, chartType: (ov?.chartType as any) || "pie", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID, data: [] }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Als Bericht hinzufügen"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>}
              </div>
            </div>
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-base">{chartOverrides["incident-type-chart"]?.title || t("reports.incidents.typeChartTitle")}</CardTitle>
              <CardDescription>{t("reports.incidents.typeChartDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 pt-0">
              {(() => {
                const override = chartOverrides["incident-type-chart"];
                const data = override?.data?.length ? override.data : incidentTypeData;
                // chartType gilt IMMER wenn override vorhanden, auch ohne Daten-Override
                const chartType = override?.chartType || "pie";
                if (data.length === 0) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t("reports.incidents.noDataForRange")}</div>;
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    {renderChart(data, chartType)}
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* ── Accident KPI tiles ── */}
        <div key="accident-free">
          <DraggableCard
            title={getTileLabel("accident-free", "Tage unfallfrei", kpiLoading ? "Lade …" : accidentKPI?.lastAccidentDateGlobal ? `Letzter Unfall: ${formatDate(accidentKPI.lastAccidentDateGlobal)}` : "Kein meldepflichtiger Unfall erfasst").title}
            subtitle={getTileLabel("accident-free", "Tage unfallfrei", kpiLoading ? "Lade …" : accidentKPI?.lastAccidentDateGlobal ? `Letzter Unfall: ${formatDate(accidentKPI.lastAccidentDateGlobal)}` : "Kein meldepflichtiger Unfall erfasst").subtitle}
            value={kpiLoading ? "…" : (accidentKPI?.accidentFreeDaysGlobal ?? "∞")}
            icon={<ShieldCheck className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
            editSlot={(onEditTile || onAddTileAsReport) ? (<>{onEditTile && <button onClick={(e) => { e.stopPropagation(); handleEditKPITile("accident-free", { id: "accident-free", title: "Tage unfallfrei", metric: "incidents", groupBy: "status", dateProperty: "incident_date", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Kachel bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}{onAddTileAsReport && <button onClick={(e) => { e.stopPropagation(); onAddTileAsReport({ id: "accident-free", title: getTileLabel("accident-free", "Tage unfallfrei", "").title, metric: "incidents", groupBy: "status", dateProperty: "incident_date", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID, data: [] }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Als Bericht hinzufügen"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>}</>) : undefined}
          />
        </div>
        <div key="teur-rate">
          <DraggableCard
            title={getTileLabel("teur-rate", "Unfälle je 1.000 MA", "Tausend-Mitarbeiter-Quote (TEUR)").title}
            subtitle={getTileLabel("teur-rate", "Unfälle je 1.000 MA", "Tausend-Mitarbeiter-Quote (TEUR)").subtitle}
            value={kpiLoading ? "…" : (accidentKPI?.teurRate ?? 0)}
            icon={<Users className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
            editSlot={(onEditTile || onAddTileAsReport) ? (<>{onEditTile && <button onClick={(e) => { e.stopPropagation(); handleEditKPITile("teur-rate", { id: "teur-rate", title: "Unfälle je 1.000 MA", metric: "incidents", groupBy: "status", dateProperty: "incident_date", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Kachel bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}{onAddTileAsReport && <button onClick={(e) => { e.stopPropagation(); onAddTileAsReport({ id: "teur-rate", title: getTileLabel("teur-rate", "Unfälle je 1.000 MA", "").title, metric: "incidents", groupBy: "status", dateProperty: "incident_date", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID, data: [] }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Als Bericht hinzufügen"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>}</>) : undefined}
          />
        </div>
        <div key="dept-table">
          <Card className="dashboard-grid-card border shadow-sm h-full group">
            <div className="drag-handle border-b flex items-center justify-between px-3 py-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-0.5">
                {onEditTile && <button onClick={(e) => { e.stopPropagation(); handleEditKPITile("dept-table", { id: "dept-table", title: "Auswertung nach Abteilung", metric: "incidents", groupBy: "department", dateProperty: "incident_date", dateRange: { type: "this_year" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Kachel bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                {onAddTileAsReport && <button onClick={(e) => { e.stopPropagation(); onAddTileAsReport({ id: "dept-table", title: tileLabels["dept-table"]?.title || "Auswertung nach Abteilung", metric: "incidents", groupBy: "department", dateProperty: "incident_date", dateRange: { type: "this_year" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID, data: [] }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Als Bericht hinzufügen"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>}
              </div>
            </div>
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                {tileLabels["dept-table"]?.title || "Auswertung nach Abteilung"}
              </CardTitle>
              <CardDescription>
                Unfallfreie Tage, meldepflichtige Vorfälle und TEUR-Quote pro Abteilung
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-auto">
              {kpiLoading ? (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2" />
                  Lade …
                </div>
              ) : !accidentKPI || accidentKPI.departments.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                  Keine Abteilungsdaten vorhanden
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3 font-semibold">Abteilung</th>
                        <th className="text-right px-4 py-3 font-semibold">Tage unfallfrei</th>
                        <th className="text-left px-4 py-3 font-semibold">Letzter Unfall</th>
                        <th className="text-right px-4 py-3 font-semibold">Meldepfl. Unfälle ({selectedYear})</th>
                        <th className="text-right px-4 py-3 font-semibold">Mitarbeiter</th>
                        <th className="text-right px-4 py-3 font-semibold">TEUR-Quote</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accidentKPI.departments.map((dept) => (
                        <tr key={dept.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{dept.name}</td>
                          <td className="px-4 py-3 text-right">
                            {dept.accidentFreeDays === null ? (
                              <span className="text-green-700 font-bold">∞</span>
                            ) : (
                              <span
                                className={
                                  dept.accidentFreeDays >= 180
                                    ? "text-green-700 font-bold"
                                    : dept.accidentFreeDays >= 30
                                    ? "text-amber-600 font-semibold"
                                    : "text-red-600 font-bold"
                                }
                              >
                                {dept.accidentFreeDays}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {formatDate(dept.lastAccidentDate)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant={dept.reportableCount > 0 ? "destructive" : "secondary"}>
                              {dept.reportableCount}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{dept.employeeCount}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            {dept.teurRate.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {customReports && customReports.map((report) => (
          <div key={`report-${report.id}`} data-grid={{ x: 0, y: 999, w: 6, h: 3, minW: 3, minH: 2 }} className="h-full">
            <ReportWidget
              config={report}
              onEdit={onEditReport || (() => {})}
              onDuplicate={onDuplicateReport || (() => {})}
              onDelete={onDeleteReport || (() => {})}
              onExport={onExportReport || (() => {})}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
