import { useState, useEffect, useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, GripVertical, ClipboardCheck, CheckCircle, Pencil } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DraggableCard } from "@/components/reports/DraggableCard";
import { TileEditPopover } from "@/components/reports/TileEditPopover";
import { getTileConfig, getChartConfig } from "@/components/reports/TileConfigStore";
import { ReportStats, getStatusColor, formatStatusLabel, OnEditTile } from "@/components/reports/types";
import type { ReportConfig } from "@/components/reports/ReportBuilder";
import { useLanguage } from "@/contexts/LanguageContext";

const SECTION_ID = "audits";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function AuditsSection({
  stats,
  chartData,
  auditStatusData,
  onEditTile,
}: {
  stats: ReportStats;
  chartData: any[];
  auditStatusData: any[];
  onEditTile?: OnEditTile;
}) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');

  const [tileLabels, setTileLabels] = useState<Record<string, { title: string; subtitle: string }>>(() => {
    const ids = ["audit-total", "audit-completed"];
    const result: Record<string, { title: string; subtitle: string }> = {};
    ids.forEach((id) => { const cfg = getTileConfig(SECTION_ID, id); result[id] = { title: cfg.title ?? "", subtitle: cfg.subtitle ?? "" }; });
    return result;
  });
  const getTileLabel = (id: string, dt: string, ds: string) => ({ title: tileLabels[id]?.title || dt, subtitle: tileLabels[id]?.subtitle || ds });
  const updateTileLabel = (id: string, title: string, subtitle: string) => setTileLabels((p) => ({ ...p, [id]: { title, subtitle } }));
  const resetTileLabel = (id: string) => setTileLabels((p) => ({ ...p, [id]: { title: "", subtitle: "" } }));

  // Chart overrides (from ReportBuilder edits)
  const [chartOverrides, setChartOverrides] = useState<Record<string, { data: any[]; chartType: string; title?: string }>>(() => {
    const result: Record<string, { data: any[]; chartType: string; title?: string }> = {};
    const storedChart = getChartConfig(SECTION_ID, "audit-status-chart");
    if (storedChart) result["audit-status-chart"] = { data: [], chartType: storedChart.chartType, title: storedChart.title };
    return result;
  });

  const defaultLayout = {
    lg: [
      { i: "audit-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "audit-completed", x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "audit-status-chart", x: 0, y: 2, w: 12, h: 4, minW: 4, minH: 3, static: false },
    ],
    md: [
      { i: "audit-total", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "audit-completed", x: 5, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "audit-status-chart", x: 0, y: 2, w: 10, h: 4, minW: 4, minH: 3, static: false },
    ],
    sm: [
      { i: "audit-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "audit-completed", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "audit-status-chart", x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3, static: false },
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
    toast({ title: t("reports.toast.layoutResetTitle"), description: t("reports.toast.auditsLayoutResetDesc") });
  }, [toast, t]);

  const handleEditChartTile = (tileId: string, defaultConfig: ReportConfig) => {
    if (!onEditTile) return;
    onEditTile(tileId, defaultConfig, (cfg, data) => {
      setChartOverrides((prev) => ({ ...prev, [tileId]: { data, chartType: cfg.chartType, title: cfg.title } }));
      if (cfg.title) setTileLabels((prev) => ({ ...prev, [tileId]: { title: cfg.title!, subtitle: prev[tileId]?.subtitle ?? "" } }));
    });
  };

  const renderChart = (tileId: string, defaultData: any[], defaultChartType: string) => {
    const override = chartOverrides[tileId];
    const data = override?.data?.length ? override.data : defaultData;
    const chartType = override?.chartType || defaultChartType;

    if (data.length === 0) {
      return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t("reports.audits.noDataForRange")}</div>;
    }

    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(v: any, n: any) => [v, formatStatusLabel(String(n))]} />
            <Legend formatter={(v: any) => formatStatusLabel(String(v))} />
            <Bar dataKey="value" fill="#0088FE" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="40%" outerRadius="75%">
            {data.map((entry: any, index: number) => (
              <Cell key={`audit-cell-${index}`} fill={getStatusColor(entry.name, index)} />
            ))}
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
          <h2 className="text-2xl font-bold mb-2">{t("reports.audits.heading")}</h2>
          <p className="text-muted-foreground">{t("reports.audits.description")}</p>
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
        <div key="audit-total">
          <DraggableCard
            title={getTileLabel("audit-total", t("reports.audits.totalTitle"), t("reports.audits.totalSubtitle")).title}
            subtitle={getTileLabel("audit-total", t("reports.audits.totalTitle"), t("reports.audits.totalSubtitle")).subtitle}
            value={stats.totalAudits}
            icon={<ClipboardCheck className="w-5 h-5" />}
            color="bg-blue-50 text-blue-600"
            editSlot={
              <>
                <TileEditPopover sectionId={SECTION_ID} tileId="audit-total" defaultTitle={t("reports.audits.totalTitle")} defaultSubtitle={t("reports.audits.totalSubtitle")} onSave={(cfg) => updateTileLabel("audit-total", cfg.title ?? "", cfg.subtitle ?? "")} onReset={() => resetTileLabel("audit-total")} />
                {onEditTile && (
                  <button onClick={(e) => { e.stopPropagation(); onEditTile("audit-total", { id: "audit-total", title: t("reports.audits.totalTitle"), metric: "audits", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }, (cfg, data) => { if (cfg.title) updateTileLabel("audit-total", cfg.title, tileLabels["audit-total"]?.subtitle ?? ""); }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Diagramm bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                )}
              </>
            }
          />
        </div>
        <div key="audit-completed">
          <DraggableCard
            title={getTileLabel("audit-completed", t("reports.audits.completedTitle"), t("reports.audits.completedSubtitle")).title}
            subtitle={getTileLabel("audit-completed", t("reports.audits.completedTitle"), t("reports.audits.completedSubtitle")).subtitle}
            value={stats.completedAudits}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
            editSlot={
              <>
                <TileEditPopover sectionId={SECTION_ID} tileId="audit-completed" defaultTitle={t("reports.audits.completedTitle")} defaultSubtitle={t("reports.audits.completedSubtitle")} onSave={(cfg) => updateTileLabel("audit-completed", cfg.title ?? "", cfg.subtitle ?? "")} onReset={() => resetTileLabel("audit-completed")} />
                {onEditTile && (
                  <button onClick={(e) => { e.stopPropagation(); onEditTile("audit-completed", { id: "audit-completed", title: t("reports.audits.completedTitle"), metric: "audits", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }, (cfg, data) => { if (cfg.title) updateTileLabel("audit-completed", cfg.title, tileLabels["audit-completed"]?.subtitle ?? ""); }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Diagramm bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                )}
              </>
            }
          />
        </div>
        <div key="audit-status-chart" data-grid={{ x: 0, y: 2, w: 12, h: 4, minW: 4, minH: 3 }}>
          <Card className="dashboard-grid-card border shadow-sm h-full group">
            <div className="drag-handle border-b flex items-center justify-between px-3 py-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              {onEditTile && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditChartTile("audit-status-chart", { id: "audit-status-chart", title: t("reports.audits.statusChartTitle"), metric: "audits", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "pie", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }}
                  className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Diagramm bearbeiten"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-base">{chartOverrides["audit-status-chart"]?.title || t("reports.audits.statusChartTitle")}</CardTitle>
              <CardDescription>{t("reports.audits.statusChartDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 pt-0">
              {renderChart("audit-status-chart", auditStatusData, "pie")}
            </CardContent>
          </Card>
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}
