import { useState, useEffect, useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, GraduationCap, CheckCircle, Pencil, Copy } from "lucide-react";
import { DraggableCard } from "@/components/reports/DraggableCard";
import { getTileConfig } from "@/components/reports/TileConfigStore";
import { ReportStats, TrainingStatus, OnEditTile } from "@/components/reports/types";
import type { ReportConfig } from "@/components/reports/ReportBuilder";
import ReportWidget from "@/components/reports/ReportWidget";
import DrillDownModal from "@/components/reports/DrillDownModal";
import { useLanguage } from "@/contexts/LanguageContext";

const SECTION_ID = "trainings";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function TrainingsSection({
  stats,
  trainingMatrix,
  chartData,
  onEditTile,
  onAddTileAsReport,
  customReports,
  onEditReport,
  onDuplicateReport,
  onDeleteReport,
  onExportReport,
  selectedDateRange,
  activeDepartmentId,
}: {
  stats: ReportStats;
  trainingMatrix: TrainingStatus[];
  chartData: any[];
  onEditTile?: OnEditTile;
  onAddTileAsReport?: (config: ReportConfig) => void;
  customReports?: ReportConfig[];
  onEditReport?: (c: ReportConfig) => void;
  onDuplicateReport?: (c: ReportConfig) => void;
  onDeleteReport?: (id: string) => void;
  onExportReport?: (c: ReportConfig) => void;
  selectedDateRange?: string;
  activeDepartmentId?: string;
}) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');

  const [tileLabels, setTileLabels] = useState<Record<string, { title: string; subtitle: string }>>(() => {
    const ids = ["training-total", "training-compliance"];
    const result: Record<string, { title: string; subtitle: string }> = {};
    ids.forEach((id) => { const cfg = getTileConfig(SECTION_ID, id); result[id] = { title: cfg.title ?? "", subtitle: cfg.subtitle ?? "" }; });
    return result;
  });
  const getTileLabel = (id: string, dt: string, ds: string) => ({ title: tileLabels[id]?.title || dt, subtitle: tileLabels[id]?.subtitle || ds });

  const [drillDown, setDrillDown] = useState<{
    config: Pick<ReportConfig, "metric"> & Partial<ReportConfig>;
    raw: string;
    display: string;
  } | null>(null);
  const openDrillDown = (
    config: Pick<ReportConfig, "metric"> & Partial<ReportConfig>,
    raw: string,
    display: string
  ) => setDrillDown({ config, raw, display });

  const [matrixPage, setMatrixPage] = useState(1);
  const matrixPageSize = 10;
  const matrixPageCount = Math.max(1, Math.ceil(trainingMatrix.length / matrixPageSize));
  const paginatedMatrix = trainingMatrix.slice(
    (matrixPage - 1) * matrixPageSize,
    matrixPage * matrixPageSize
  );
  useEffect(() => {
    if (matrixPage > matrixPageCount) setMatrixPage(1);
  }, [matrixPageCount, matrixPage]);
  const defaultLayout = {
    lg: [
      { i: "training-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "training-compliance", x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
    ],
    md: [
      { i: "training-total", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "training-compliance", x: 5, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
    ],
    sm: [
      { i: "training-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "training-compliance", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
    ],
  };

  useEffect(() => {
    const timer = setTimeout(() => { isInitialMountRef.current = false; }, 200);
    return () => clearTimeout(timer);
  }, []);

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_trainings');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading trainings layout:', error);
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
      localStorage.setItem('hse_layout_trainings', serialized);
    } catch (error) {
      console.error('Error saving trainings layout:', error);
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
      try { localStorage.setItem('hse_layout_trainings', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);
  const handleResizeStop = useCallback(() => {
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_trainings', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = defaultLayout;
    setLayouts(defaultLayouts);
    try {
      localStorage.removeItem('hse_layout_trainings');
    } catch (e) {
      console.error(e);
    }
    toast({ title: t("reports.toast.layoutResetTitle"), description: t("reports.toast.trainingsLayoutResetDesc") });
  }, [toast, t]);

  const handleEditKPITile = (tileId: string, defaultConfig: ReportConfig) => {
    if (!onEditTile) return;
    onEditTile(tileId, defaultConfig, (cfg) => {
      if (cfg.title) setTileLabels((prev) => ({ ...prev, [tileId]: { title: cfg.title!, subtitle: prev[tileId]?.subtitle ?? "" } }));
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t("reports.trainings.heading")}</h2>
          <p className="text-muted-foreground">{t("reports.trainings.description")}</p>
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
        <div key="training-total">
          <DraggableCard
            title={getTileLabel("training-total", t("reports.trainings.totalTitle"), t("reports.trainings.totalSubtitle")).title}
            subtitle={getTileLabel("training-total", t("reports.trainings.totalTitle"), t("reports.trainings.totalSubtitle")).subtitle}
            value={stats.totalTrainings}
            icon={<GraduationCap className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
            onValueClick={() => openDrillDown({ metric: "courses", groupBy: "" } as ReportConfig, "", "Alle Kurse")}
            editSlot={(onEditTile || onAddTileAsReport) ? (<>{onEditTile && <button onClick={(e) => { e.stopPropagation(); handleEditKPITile("training-total", { id: "training-total", title: t("reports.trainings.totalTitle"), metric: "trainings", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Kachel bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}{onAddTileAsReport && <button onClick={(e) => { e.stopPropagation(); onAddTileAsReport({ id: "training-total", title: getTileLabel("training-total", t("reports.trainings.totalTitle"), t("reports.trainings.totalSubtitle")).title, metric: "trainings", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID, data: [] }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Als Bericht hinzufügen"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>}</>) : undefined}
          />
        </div>
        <div key="training-compliance">
          <DraggableCard
            title={getTileLabel("training-compliance", t("reports.trainings.complianceTitle"), t("reports.trainings.complianceSubtitle")).title}
            subtitle={getTileLabel("training-compliance", t("reports.trainings.complianceTitle"), t("reports.trainings.complianceSubtitle")).subtitle}
            value={`${stats.trainingCompliance}%`}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-blue-50 text-blue-600"
            onValueClick={undefined}
            editSlot={(onEditTile || onAddTileAsReport) ? (<>{onEditTile && <button onClick={(e) => { e.stopPropagation(); handleEditKPITile("training-compliance", { id: "training-compliance", title: t("reports.trainings.complianceTitle"), metric: "trainings", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Kachel bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}{onAddTileAsReport && <button onClick={(e) => { e.stopPropagation(); onAddTileAsReport({ id: "training-compliance", title: getTileLabel("training-compliance", t("reports.trainings.complianceTitle"), t("reports.trainings.complianceSubtitle")).title, metric: "trainings", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: SECTION_ID, data: [] }); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Als Bericht hinzufügen"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>}</>) : undefined}
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

      {/* Training Matrix */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>{t("reports.trainings.matrixTitle")}</CardTitle>
          <CardDescription>{t("reports.trainings.matrixDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">{t("reports.trainings.table.employeeName")}</TableHead>
                  <TableHead className="font-semibold">{t("reports.trainings.table.required")}</TableHead>
                  <TableHead className="font-semibold">{t("reports.trainings.table.completed")}</TableHead>
                  <TableHead className="font-semibold">{t("reports.trainings.table.expired")}</TableHead>
                  <TableHead className="font-semibold">{t("reports.trainings.table.compliance")}</TableHead>
                  <TableHead className="font-semibold">{t("reports.trainings.table.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainingMatrix.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t("reports.trainings.noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMatrix.map((item, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{item.employee_name}</TableCell>
                      <TableCell>{item.total_required}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {item.completed}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.expired > 0 ? (
                          <Badge variant="destructive">{item.expired}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{item.compliance_rate}%</TableCell>
                      <TableCell>
                        {item.compliance_rate >= 80 ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            {t("reports.trainings.compliant")}
                          </Badge>
                        ) : item.compliance_rate >= 50 ? (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            {t("reports.trainings.needsAttention")}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">{t("reports.trainings.nonCompliant")}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {trainingMatrix.length > matrixPageSize && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-muted-foreground">
                {t("reports.trainings.pageInfo")
                  .replace("{page}", String(matrixPage))
                  .replace("{pageCount}", String(matrixPageCount))
                  .replace("{count}", String(trainingMatrix.length))}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={matrixPage <= 1}
                  onClick={() => setMatrixPage((p) => Math.max(1, p - 1))}
                >
                  {t("reports.trainings.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={matrixPage >= matrixPageCount}
                  onClick={() => setMatrixPage((p) => Math.min(matrixPageCount, p + 1))}
                >
                  {t("reports.trainings.next")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {drillDown && (
        <DrillDownModal
          isOpen={!!drillDown}
          onClose={() => setDrillDown(null)}
          config={drillDown.config}
          rawFilterValue={drillDown.raw}
          displayFilterValue={drillDown.display}
          filterDateRange={selectedDateRange}
          filterDepartmentId={activeDepartmentId}
        />
      )}
    </div>
  );
}
