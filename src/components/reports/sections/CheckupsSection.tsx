import { useState, useEffect, useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, GripVertical, Stethoscope, CheckCircle } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DraggableCard } from "@/components/reports/DraggableCard";
import { TileEditPopover } from "@/components/reports/TileEditPopover";
import { getTileConfig } from "@/components/reports/TileConfigStore";
import { ReportStats, getStatusColor, formatStatusLabel } from "@/components/reports/types";
import { useLanguage } from "@/contexts/LanguageContext";

const SECTION_ID = "checkups";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function CheckupsSection({ stats, checkUpsStatusData }: { stats: ReportStats; checkUpsStatusData: any[] }) {
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
  const updateTileLabel = (id: string, title: string, subtitle: string) => setTileLabels((p) => ({ ...p, [id]: { title, subtitle } }));
  const resetTileLabel = (id: string) => setTileLabels((p) => ({ ...p, [id]: { title: "", subtitle: "" } }));

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
            editSlot={<TileEditPopover sectionId={SECTION_ID} tileId="checkups-total" defaultTitle={t("reports.checkups.totalTitle")} defaultSubtitle={t("reports.checkups.totalSubtitle")} onSave={(cfg) => updateTileLabel("checkups-total", cfg.title ?? "", cfg.subtitle ?? "")} onReset={() => resetTileLabel("checkups-total")} />}
          />
        </div>
        <div key="checkups-completed">
          <DraggableCard
            title={getTileLabel("checkups-completed", t("reports.checkups.completedTitle"), t("reports.checkups.completedSubtitle")).title}
            subtitle={getTileLabel("checkups-completed", t("reports.checkups.completedTitle"), t("reports.checkups.completedSubtitle")).subtitle}
            value={stats.completedCheckUps}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
            editSlot={<TileEditPopover sectionId={SECTION_ID} tileId="checkups-completed" defaultTitle={t("reports.checkups.completedTitle")} defaultSubtitle={t("reports.checkups.completedSubtitle")} onSave={(cfg) => updateTileLabel("checkups-completed", cfg.title ?? "", cfg.subtitle ?? "")} onReset={() => resetTileLabel("checkups-completed")} />}
          />
        </div>
        <div key="checkups-status-chart" data-grid={{ x: 0, y: 2, w: 12, h: 4, minW: 4, minH: 3 }}>
          <Card className="dashboard-grid-card border shadow-sm h-full group">
            <div className="drag-handle border-b flex items-center px-3 py-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-base">{t("reports.checkups.statusChartTitle")}</CardTitle>
              <CardDescription>{t("reports.checkups.statusChartDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 pt-0">
              {checkUpsStatusData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {t("reports.checkups.noDataForRange")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={checkUpsStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="40%" outerRadius="75%">
                      {checkUpsStatusData.map((entry, index) => (
                        <Cell key={`checkup-cell-${index}`} fill={getStatusColor(entry.name, index)} />
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
