import { useState, useEffect, useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, GripVertical, CheckCircle, TrendingUp, Pencil } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DraggableCard } from "@/components/reports/DraggableCard";
import { getTileConfig, getChartConfig } from "@/components/reports/TileConfigStore";
import { ReportStats, getStatusColor, formatStatusLabel, OnEditTile } from "@/components/reports/types";
import type { ReportConfig } from "@/components/reports/ReportBuilder";
import { useLanguage } from "@/contexts/LanguageContext";

const SECTION_ID = "measures";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function MeasuresSection({ stats, chartData, measuresStatusData, onEditTile }: { stats: ReportStats; chartData: any[]; measuresStatusData: any[]; onEditTile?: OnEditTile }) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');

  const [tileLabels, setTileLabels] = useState<Record<string, { title: string; subtitle: string }>>(() => {
    const ids = ["measures-total", "measures-completed", "measures-progress"];
    const result: Record<string, { title: string; subtitle: string }> = {};
    ids.forEach((id) => { const cfg = getTileConfig(SECTION_ID, id); result[id] = { title: cfg.title ?? "", subtitle: cfg.subtitle ?? "" }; });
    return result;
  });
  const getTileLabel = (id: string, dt: string, ds: string) => ({ title: tileLabels[id]?.title || dt, subtitle: tileLabels[id]?.subtitle || ds });

  const defaultLayout = {
    lg: [
      { i: "measures-total", x: 0, y: 0, w: 6, h: 3, minW: 2, minH: 3, static: false },
      { i: "measures-completed", x: 6, y: 0, w: 6, h: 3, minW: 2, minH: 3, static: false },
      { i: "measures-progress", x: 0, y: 3, w: 6, h: 3, minW: 2, minH: 3, static: false },
      { i: "measures-status-chart", x: 0, y: 6, w: 12, h: 4, minW: 4, minH: 3, static: false },
    ],
    md: [
      { i: "measures-total", x: 0, y: 0, w: 5, h: 3, minW: 2, minH: 3, static: false },
      { i: "measures-completed", x: 5, y: 0, w: 5, h: 3, minW: 2, minH: 3, static: false },
      { i: "measures-progress", x: 0, y: 3, w: 5, h: 3, minW: 2, minH: 3, static: false },
      { i: "measures-status-chart", x: 0, y: 6, w: 10, h: 4, minW: 4, minH: 3, static: false },
    ],
    sm: [
      { i: "measures-total", x: 0, y: 0, w: 6, h: 3, minW: 2, minH: 3, static: false },
      { i: "measures-completed", x: 0, y: 3, w: 6, h: 3, minW: 2, minH: 3, static: false },
      { i: "measures-progress", x: 0, y: 6, w: 6, h: 3, minW: 2, minH: 3, static: false },
      { i: "measures-status-chart", x: 0, y: 9, w: 6, h: 4, minW: 4, minH: 3, static: false },
    ],
  };

  useEffect(() => {
    const timer = setTimeout(() => { isInitialMountRef.current = false; }, 200);
    return () => clearTimeout(timer);
  }, []);

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_measures_v2');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading measures layout:', error);
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
      localStorage.setItem('hse_layout_measures_v2', serialized);
    } catch (error) {
      console.error('Error saving measures layout:', error);
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
      try { localStorage.setItem('hse_layout_measures_v2', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);
  const handleResizeStop = useCallback(() => {
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_measures_v2', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = defaultLayout;
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_measures_v2');
    toast({ title: t("reports.toast.layoutResetTitle"), description: t("reports.toast.measuresLayoutResetDesc") });
  }, [toast, t]);

  // Chart overrides
  const [chartOverrides, setChartOverrides] = useState<Record<string, { data: any[]; chartType: string; title?: string }>>(() => {
    const result: Record<string, { data: any[]; chartType: string; title?: string }> = {};
    const stored = getChartConfig(SECTION_ID, "measures-status-chart");
    if (stored) result["measures-status-chart"] = { data: [], chartType: stored.chartType, title: stored.title };
    return result;
  });

  const handleEditChartTile = (tileId: string, defaultConfig: ReportConfig) => {
    if (!onEditTile) return;
    onEditTile(tileId, defaultConfig, (cfg, data) => {
      setChartOverrides((prev) => ({ ...prev, [tileId]: { data, chartType: cfg.chartType, title: cfg.title } }));
    });
  };

  const renderMeasuresChart = (tileId: string, defaultData: any[], defaultChartType: string) => {
    const override = chartOverrides[tileId];
    const data = override?.data?.length ? override.data : defaultData;
    const chartType = override?.chartType || defaultChartType;
    if (data.length === 0) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t("reports.measures.noDataForRange")}</div>;
    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(v: any, n: any) => [v, formatStatusLabel(String(n))]} />
            <Legend formatter={(v: any) => formatStatusLabel(String(v))} />
            <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="40%" outerRadius="75%">
            {data.map((entry: any, index: number) => <Cell key={`measures-cell-${index}`} fill={getStatusColor(entry.name, index)} />)}
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
          <h2 className="text-2xl font-bold mb-2">{t("reports.measures.heading")}</h2>
          <p className="text-muted-foreground">{t("reports.measures.description")}</p>
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
        <div key="measures-total">
          <DraggableCard
            title={getTileLabel("measures-total", t("reports.measures.totalTitle"), t("reports.measures.totalSubtitle")).title}
            subtitle={getTileLabel("measures-total", t("reports.measures.totalTitle"), t("reports.measures.totalSubtitle")).subtitle}
            value={stats.totalMeasures}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-purple-50 text-purple-600"
          />
        </div>
        <div key="measures-completed">
          <DraggableCard
            title={getTileLabel("measures-completed", t("reports.measures.completedTitle"), t("reports.measures.completedSubtitle")).title}
            subtitle={getTileLabel("measures-completed", t("reports.measures.completedTitle"), t("reports.measures.completedSubtitle")).subtitle}
            value={stats.completedMeasures}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>
        <div key="measures-progress">
          <DraggableCard
            title={getTileLabel("measures-progress", t("reports.measures.inProgressTitle"), t("reports.measures.inProgressSubtitle")).title}
            subtitle={getTileLabel("measures-progress", t("reports.measures.inProgressTitle"), t("reports.measures.inProgressSubtitle")).subtitle}
            value={stats.totalMeasures - stats.completedMeasures}
            icon={<TrendingUp className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
          />
        </div>
        <div key="measures-status-chart" data-grid={{ x: 0, y: 4, w: 12, h: 4, minW: 4, minH: 3 }}>
          <Card className="dashboard-grid-card border shadow-sm h-full group">
            <div className="drag-handle border-b flex items-center justify-between px-3 py-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              {onEditTile && (
                <button onClick={(e) => { e.stopPropagation(); handleEditChartTile("measures-status-chart", { id: "measures-status-chart", title: t("reports.measures.statusChartTitle"), metric: "measures", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "pie", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Diagramm bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
              )}
            </div>
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-base">{chartOverrides["measures-status-chart"]?.title || t("reports.measures.statusChartTitle")}</CardTitle>
              <CardDescription>{t("reports.measures.statusChartDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 pt-0">
              {renderMeasuresChart("measures-status-chart", measuresStatusData, "pie")}
            </CardContent>
          </Card>
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}
