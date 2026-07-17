import { useState, useEffect, useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, GripVertical, Shield, Pencil, Copy } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DraggableCard } from "@/components/reports/DraggableCard";
import { getTileConfig, getChartConfig } from "@/components/reports/TileConfigStore";
import { ReportStats, getStatusColor, formatStatusLabel, OnEditTile } from "@/components/reports/types";
import type { ReportConfig } from "@/components/reports/ReportBuilder";
import ReportWidget from "@/components/reports/ReportWidget";
import { useLanguage } from "@/contexts/LanguageContext";

const SECTION_ID = "risk-assessments";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function RiskAssessmentsSection({
  stats,
  chartData,
  riskLevelData,
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
  riskLevelData: any[];
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

  const [tileLabels, setTileLabels] = useState<Record<string, { title: string; subtitle: string }>>(() => {
    const ids = ["risk-total"];
    const result: Record<string, { title: string; subtitle: string }> = {};
    ids.forEach((id) => { const cfg = getTileConfig(SECTION_ID, id); result[id] = { title: cfg.title ?? "", subtitle: cfg.subtitle ?? "" }; });
    return result;
  });
  const getTileLabel = (id: string, dt: string, ds: string) => ({ title: tileLabels[id]?.title || dt, subtitle: tileLabels[id]?.subtitle || ds });

  // Chart overrides
  const [chartOverrides, setChartOverrides] = useState<Record<string, { data: any[]; chartType: string; title?: string }>>(() => {
    const result: Record<string, { data: any[]; chartType: string; title?: string }> = {};
    const stored = getChartConfig(SECTION_ID, "risk-level-chart");
    if (stored) result["risk-level-chart"] = { data: [], chartType: stored.chartType, title: stored.title };
    return result;
  });

  const defaultLayout = {
    lg: [
      { i: "risk-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "risk-level-chart", x: 0, y: 2, w: 12, h: 4, minW: 4, minH: 3, static: false },
    ],
    md: [
      { i: "risk-total", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "risk-level-chart", x: 0, y: 2, w: 10, h: 4, minW: 4, minH: 3, static: false },
    ],
    sm: [
      { i: "risk-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "risk-level-chart", x: 0, y: 2, w: 6, h: 4, minW: 4, minH: 3, static: false },
    ],
  };

  useEffect(() => {
    const timer = setTimeout(() => { isInitialMountRef.current = false; }, 200);
    return () => clearTimeout(timer);
  }, []);

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_risk_assessments');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading risk assessments layout:', error);
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
      localStorage.setItem('hse_layout_risk_assessments', serialized);
    } catch (error) {
      console.error('Error saving risk assessments layout:', error);
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
      try { localStorage.setItem('hse_layout_risk_assessments', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);
  const handleResizeStop = useCallback(() => {
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_risk_assessments', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = defaultLayout;
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_risk_assessments');
    toast({ title: t("reports.toast.layoutResetTitle"), description: t("reports.toast.riskAssessmentsLayoutResetDesc") });
  }, [toast, t]);

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

  const renderChart = (tileId: string, defaultData: any[], defaultChartType: string) => {
    const override = chartOverrides[tileId];
    const data = override?.data?.length ? override.data : defaultData;
    const chartType = override?.chartType || defaultChartType;

    if (data.length === 0) {
      return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t("reports.riskAssessments.noDataForRange")}</div>;
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
            <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="75%">
            {data.map((entry: any, index: number) => (
              <Cell key={`risk-cell-${index}`} fill={getStatusColor(entry.name, index)} />
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
          <h2 className="text-2xl font-bold mb-2">{t("reports.riskAssessments.heading")}</h2>
          <p className="text-muted-foreground">{t("reports.riskAssessments.description")}</p>
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
        <div key="risk-total">
          <DraggableCard
            title={getTileLabel("risk-total", t("reports.riskAssessments.totalTitle"), t("reports.riskAssessments.totalSubtitle")).title}
            subtitle={getTileLabel("risk-total", t("reports.riskAssessments.totalTitle"), t("reports.riskAssessments.totalSubtitle")).subtitle}
            value={stats.totalRiskAssessments}
            icon={<Shield className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
            editSlot={(onEditTile || onAddTileAsReport) ? (<>{onEditTile && <button onClick={(e) => { e.stopPropagation(); handleEditKPITile("risk-total", { id: "risk-total", title: t("reports.riskAssessments.totalTitle"), metric: "risks", groupBy: "risk_level", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Kachel bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}{onAddTileAsReport && <button onClick={(e) => { e.stopPropagation(); onAddTileAsReport({ id: "risk-total", title: getTileLabel("risk-total", t("reports.riskAssessments.totalTitle"), t("reports.riskAssessments.totalSubtitle")).title, metric: "risks", groupBy: "risk_level", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID, data: [] }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Als Bericht hinzufügen"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>}</>) : undefined}
          />
        </div>
        <div key="risk-level-chart" data-grid={{ x: 0, y: 2, w: 12, h: 4, minW: 4, minH: 3 }}>
          <Card className="dashboard-grid-card border shadow-sm h-full group">
            <div className="drag-handle border-b flex items-center justify-between px-3 py-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-0.5">
                {onEditTile && <button onClick={(e) => { e.stopPropagation(); handleEditChartTile("risk-level-chart", { id: "risk-level-chart", title: t("reports.riskAssessments.levelChartTitle"), metric: "risks", groupBy: "risk_level", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "pie", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Diagramm bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                {onAddTileAsReport && <button onClick={(e) => { e.stopPropagation(); const ov = chartOverrides["risk-level-chart"]; onAddTileAsReport({ id: "risk-level-chart", title: ov?.title || t("reports.riskAssessments.levelChartTitle"), metric: "risks", groupBy: "risk_level", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: (ov?.chartType as any) || "pie", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID, data: [] }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Als Bericht hinzufügen"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>}
              </div>
            </div>
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-base">{chartOverrides["risk-level-chart"]?.title || t("reports.riskAssessments.levelChartTitle")}</CardTitle>
              <CardDescription>{t("reports.riskAssessments.levelChartDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 pt-0">
              {renderChart("risk-level-chart", riskLevelData, "pie")}
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
