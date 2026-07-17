import { useState, useEffect, useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, ListChecks, CheckCircle, Pencil } from "lucide-react";
import { DraggableCard } from "@/components/reports/DraggableCard";
import { getTileConfig } from "@/components/reports/TileConfigStore";
import { ReportStats, OnEditTile } from "@/components/reports/types";
import type { ReportConfig } from "@/components/reports/ReportBuilder";
import ReportWidget from "@/components/reports/ReportWidget";
import { useLanguage } from "@/contexts/LanguageContext";

const SECTION_ID = "tasks";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function TasksSection({ stats, chartData, onEditTile, customReports, onEditReport, onDuplicateReport, onDeleteReport, onExportReport }: { stats: ReportStats; chartData: any[]; onEditTile?: OnEditTile; customReports?: ReportConfig[]; onEditReport?: (c: ReportConfig) => void; onDuplicateReport?: (c: ReportConfig) => void; onDeleteReport?: (id: string) => void; onExportReport?: (c: ReportConfig) => void }) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');

  const [tileLabels, setTileLabels] = useState<Record<string, { title: string; subtitle: string }>>(() => {
    const ids = ["tasks-total", "tasks-completed"];
    const result: Record<string, { title: string; subtitle: string }> = {};
    ids.forEach((id) => { const cfg = getTileConfig(SECTION_ID, id); result[id] = { title: cfg.title ?? "", subtitle: cfg.subtitle ?? "" }; });
    return result;
  });
  const getTileLabel = (id: string, dt: string, ds: string) => ({ title: tileLabels[id]?.title || dt, subtitle: tileLabels[id]?.subtitle || ds });

  const defaultLayout = {
    lg: [
      { i: "tasks-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "tasks-completed", x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
    ],
    md: [
      { i: "tasks-total", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "tasks-completed", x: 5, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
    ],
    sm: [
      { i: "tasks-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "tasks-completed", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
    ],
  };

  useEffect(() => {
    const timer = setTimeout(() => { isInitialMountRef.current = false; }, 200);
    return () => clearTimeout(timer);
  }, []);

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_tasks');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading tasks layout:', error);
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
      localStorage.setItem('hse_layout_tasks', serialized);
    } catch (error) {
      console.error('Error saving tasks layout:', error);
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
      try { localStorage.setItem('hse_layout_tasks', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);
  const handleResizeStop = useCallback(() => {
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_tasks', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = defaultLayout;
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_tasks');
    toast({ title: t("reports.toast.layoutResetTitle"), description: t("reports.toast.tasksLayoutResetDesc") });
  }, [toast, t]);

  const handleEditKPITile = (tileId: string, defaultConfig: ReportConfig) => {
    if (!onEditTile) return;
    onEditTile(tileId, defaultConfig, (cfg) => {
      if (cfg.title) setTileLabels((prev) => ({ ...prev, [tileId]: { title: cfg.title!, subtitle: prev[tileId]?.subtitle ?? "" } }));
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t("reports.tasks.heading")}</h2>
          <p className="text-muted-foreground">{t("reports.tasks.description")}</p>
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
        <div key="tasks-total">
          <DraggableCard
            title={getTileLabel("tasks-total", t("reports.tasks.totalTitle"), t("reports.tasks.totalSubtitle")).title}
            subtitle={getTileLabel("tasks-total", t("reports.tasks.totalTitle"), t("reports.tasks.totalSubtitle")).subtitle}
            value={stats.totalTasks}
            icon={<ListChecks className="w-5 h-5" />}
            color="bg-indigo-50 text-indigo-600"
            editSlot={onEditTile ? (
              <button onClick={(e) => { e.stopPropagation(); handleEditKPITile("tasks-total", { id: "tasks-total", title: t("reports.tasks.totalTitle"), metric: "tasks", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Kachel bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
            ) : undefined}
          />
        </div>
        <div key="tasks-completed">
          <DraggableCard
            title={getTileLabel("tasks-completed", t("reports.tasks.completedTitle"), t("reports.tasks.completedSubtitle")).title}
            subtitle={getTileLabel("tasks-completed", t("reports.tasks.completedTitle"), t("reports.tasks.completedSubtitle")).subtitle}
            value={stats.completedTasks}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
            editSlot={onEditTile ? (
              <button onClick={(e) => { e.stopPropagation(); handleEditKPITile("tasks-completed", { id: "tasks-completed", title: t("reports.tasks.completedTitle"), metric: "tasks", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Kachel bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
            ) : undefined}
          />
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
