import { useState, useEffect, useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, GripVertical, Shield } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DraggableCard } from "@/components/reports/DraggableCard";
import { TileEditPopover } from "@/components/reports/TileEditPopover";
import { getTileConfig } from "@/components/reports/TileConfigStore";
import { ReportStats, getStatusColor, formatStatusLabel } from "@/components/reports/types";
import { useLanguage } from "@/contexts/LanguageContext";

const SECTION_ID = "risk-assessments";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function RiskAssessmentsSection({ stats, chartData, riskLevelData }: { stats: ReportStats; chartData: any[]; riskLevelData: any[] }) {
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
  const updateTileLabel = (id: string, title: string, subtitle: string) => setTileLabels((p) => ({ ...p, [id]: { title, subtitle } }));
  const resetTileLabel = (id: string) => setTileLabels((p) => ({ ...p, [id]: { title: "", subtitle: "" } }));

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
            editSlot={<TileEditPopover sectionId={SECTION_ID} tileId="risk-total" defaultTitle={t("reports.riskAssessments.totalTitle")} defaultSubtitle={t("reports.riskAssessments.totalSubtitle")} onSave={(cfg) => updateTileLabel("risk-total", cfg.title ?? "", cfg.subtitle ?? "")} onReset={() => resetTileLabel("risk-total")} />}
          />
        </div>
        <div key="risk-level-chart" data-grid={{ x: 0, y: 2, w: 12, h: 4, minW: 4, minH: 3 }}>
          <Card className="dashboard-grid-card border shadow-sm h-full group">
            <div className="drag-handle border-b flex items-center px-3 py-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-base">{t("reports.riskAssessments.levelChartTitle")}</CardTitle>
              <CardDescription>{t("reports.riskAssessments.levelChartDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 pt-0">
              {riskLevelData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {t("reports.riskAssessments.noDataForRange")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskLevelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="75%">
                      {riskLevelData.map((entry, index) => (
                        <Cell key={`risk-cell-${index}`} fill={getStatusColor(entry.name, index)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any, name: any) => [value, formatStatusLabel(String(name))]} />
                    <Legend formatter={(value: any) => formatStatusLabel(String(value))} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}
