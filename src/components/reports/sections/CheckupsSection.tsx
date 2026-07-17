import { useState, useEffect, useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, GripVertical, Stethoscope, CheckCircle, Pencil } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DraggableCard } from "@/components/reports/DraggableCard";
import { getTileConfig, getChartConfig } from "@/components/reports/TileConfigStore";
import { ReportStats, getStatusColor, formatStatusLabel, OnEditTile } from "@/components/reports/types";
import type { ReportConfig } from "@/components/reports/ReportBuilder";
import ReportWidget from "@/components/reports/ReportWidget";
import { useLanguage } from "@/contexts/LanguageContext";

const SECTION_ID = "checkups";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function CheckupsSection({ stats, checkUpsStatusData, onEditTile, customReports, onEditReport, onDuplicateReport, onDeleteReport, onExportReport }: { stats: ReportStats; checkUpsStatusData: any[]; onEditTile?: OnEditTile; customReports?: ReportConfig[]; onEditReport?: (c: ReportConfig) => void; onDuplicateReport?: (c: ReportConfig) => void; onDeleteReport?: (id: string) => void; onExportReport?: (c: ReportConfig) => void }) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');

  const [tileLabels, setTileLabels] = useState<Record<string, { title: string; subtitle: string }>>(() => {
    const ids = ["checkups-total", "checkups-completed"];
    const result: Record<string, { title: string; subtitle: string }> = {};
    ids.forEach((id) => { const cfg = getTileConfig(SECTION_ID, id); result[id] = { title: cfg.title ?? "", subtitle: cfg.subtitle ?? "" }; });
    return result;
  });
  const getTileLabel = (id: string, dt: string, ds: string) => ({ title: tileLabels[id]?.title || dt, subtitle: tileLabels[id]?.subtitle || ds });

  const defaultLayout = {
    lg: [
      { i: "checkups-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "checkups-completed", x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "checkups-status-chart", x: 0, y: 2, w: 12, h: 4, minW: 4, minH: 3, static: false },
    ],
    md: [
      { i: "checkups-total", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "checkups-completed", x: 5, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "checkups-status-chart", x: 0, y: 2, w: 10, h: 4, minW: 4, minH: 3, static: false },
    ],
    sm: [
      { i: "checkups-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "checkups-completed", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "checkups-status-chart", x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3, static: false },
    ],
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
    toast({ title: t("reports.toast.layoutResetTitle"), description: t("reports.toast.checkupsLayoutResetDesc") });
  }, [toast, t]);

  // Chart overrides
  const [chartOverrides, setChartOverrides] = useState<Record<string, { data: any[]; chartType: string; title?: string }>>(() => {
    const result: Record<string, { data: any[]; chartType: string; title?: string }> = {};
    const stored = getChartConfig(SECTION_ID, "checkups-status-chart");
    if (stored) result["checkups-status-chart"] = { data: [], chartType: stored.chartType, title: stored.title };
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

  const renderCheckupsChart = (tileId: string, defaultData: any[], defaultChartType: string) => {
    const override = chartOverrides[tileId];
    const data = override?.data?.length ? override.data : defaultData;
    const chartType = override?.chartType || defaultChartType;
    if (data.length === 0) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t("reports.checkups.noDataForRange")}</div>;
    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(v: any, n: any) => [v, formatStatusLabel(String(n))]} />
            <Legend formatter={(v: any) => formatStatusLabel(String(v))} />
            <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="40%" outerRadius="75%">
            {data.map((entry: any, index: number) => <Cell key={`checkup-cell-${index}`} fill={getStatusColor(entry.name, index)} />)}
          </Pie>
          <Tooltip formatter={(value: any, name: any) => [value, formatStatusLabel(String(name))]} />
          <Legend formatter={(value: any) => formatStatusLabel(String(value))} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t("reports.checkups.heading")}</h2>
          <p className="text-muted-foreground">{t("reports.checkups.description")}</p>
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
        <div key="checkups-total">
          <DraggableCard
            title={getTileLabel("checkups-total", t("reports.checkups.totalTitle"), t("reports.checkups.totalSubtitle")).title}
            subtitle={getTileLabel("checkups-total", t("reports.checkups.totalTitle"), t("reports.checkups.totalSubtitle")).subtitle}
            value={stats.totalCheckUps}
            icon={<Stethoscope className="w-5 h-5" />}
            color="bg-teal-50 text-teal-600"
            editSlot={onEditTile ? (
              <button onClick={(e) => { e.stopPropagation(); handleEditKPITile("checkups-total", { id: "checkups-total", title: t("reports.checkups.totalTitle"), metric: "checkups", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Kachel bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
            ) : undefined}
          />
        </div>
        <div key="checkups-completed">
          <DraggableCard
            title={getTileLabel("checkups-completed", t("reports.checkups.completedTitle"), t("reports.checkups.completedSubtitle")).title}
            subtitle={getTileLabel("checkups-completed", t("reports.checkups.completedTitle"), t("reports.checkups.completedSubtitle")).subtitle}
            value={stats.completedCheckUps}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
            editSlot={onEditTile ? (
              <button onClick={(e) => { e.stopPropagation(); handleEditKPITile("checkups-completed", { id: "checkups-completed", title: t("reports.checkups.completedTitle"), metric: "checkups", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Kachel bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
            ) : undefined}
          />
        </div>
        <div key="checkups-status-chart" data-grid={{ x: 0, y: 2, w: 12, h: 4, minW: 4, minH: 3 }}>
          <Card className="dashboard-grid-card border shadow-sm h-full group">
            <div className="drag-handle border-b flex items-center justify-between px-3 py-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              {onEditTile && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditChartTile("checkups-status-chart", { id: "checkups-status-chart", title: chartOverrides["checkups-status-chart"]?.title || t("reports.checkups.statusChartTitle"), metric: "checkups", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: (chartOverrides["checkups-status-chart"]?.chartType as any) || "pie", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }}
                  className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Diagramm bearbeiten"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-base">{chartOverrides["checkups-status-chart"]?.title || t("reports.checkups.statusChartTitle")}</CardTitle>
              <CardDescription>{t("reports.checkups.statusChartDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 pt-0">
              {renderCheckupsChart("checkups-status-chart", checkUpsStatusData, "pie")}
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
