import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Settings2, Shield, ClipboardCheck, AlertTriangle, GraduationCap, TrendingUp,
  ListChecks, GripVertical, EyeOff, Eye, BarChart3, RotateCcw, Pencil,
} from "lucide-react";
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { DraggableCard } from "@/components/reports/DraggableCard";
import { ReportStats, OnEditTile } from "@/components/reports/types";
import ReportWidget, { ReportConfig } from "@/components/reports/ReportWidget";
import DrillDownModal from "@/components/reports/DrillDownModal";
import { useLanguage } from "@/contexts/LanguageContext";

export function OverviewSection({
  stats,
  chartData,
  customReports,
  customReportsLayouts,
  onCustomReportsLayoutChange,
  onResetCustomLayouts,
  onEditReport,
  onDuplicateReport,
  onDeleteReport,
  onExportReport,
  onViewReport,
  onEditTile,
  selectedDateRange,
  activeDepartmentId,
}: {
  stats: ReportStats;
  chartData: any[];
  customReports: ReportConfig[];
  customReportsLayouts: { [key: string]: any[] };
  onCustomReportsLayoutChange: (currentLayout: any[], allLayouts: { [key: string]: any[] }) => void;
  onResetCustomLayouts: () => void;
  onEditReport: (config: ReportConfig) => void;
  onDuplicateReport: (config: ReportConfig) => void;
  onDeleteReport: (id: string) => void;
  onExportReport: (config: ReportConfig) => void;
  onViewReport: (config: ReportConfig) => void;
  onEditTile?: OnEditTile;
  selectedDateRange?: string;
  activeDepartmentId?: string;
}) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const UNIFIED_LAYOUT_KEY = "hse_unified_dashboard_layout_v5";

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

  // Mounted state to suppress CSS transition glitch on first render
  const [isMounted, setIsMounted] = useState(false);
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const layoutsRef = useRef<{ [key: string]: any[] }>({});
  const hiddenCardsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Small delay to let the grid measure its container width before enabling transitions
    const timer = setTimeout(() => {
      setIsMounted(true);
      isInitialMountRef.current = false;
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Hidden cards state
  const HIDDEN_CARDS_KEY = "hse_hidden_overview_cards";
  const OVERVIEW_CARDS = useMemo(() => [
    { id: "risk-assessments", label: t("reports.overview.card.riskAssessments"), icon: <Shield className="w-4 h-4" /> },
    { id: "safety-audits", label: t("reports.overview.card.safetyAudits"), icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: "incidents", label: t("reports.overview.card.incidents"), icon: <AlertTriangle className="w-4 h-4" /> },
    { id: "training-compliance", label: t("reports.overview.card.trainingCompliance"), icon: <GraduationCap className="w-4 h-4" /> },
    { id: "incident-trends", label: t("reports.overview.card.incidentTrends"), icon: <TrendingUp className="w-4 h-4" /> },
    { id: "audit-completion", label: t("reports.overview.card.auditCompletion"), icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: "task-completion", label: t("reports.overview.card.taskCompletion"), icon: <ListChecks className="w-4 h-4" /> },
  ], [t]);

  const [hiddenCards, setHiddenCards] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(HIDDEN_CARDS_KEY);
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {
      console.error("Error loading hidden cards:", e);
    }
    return new Set();
  });

  const toggleCardVisibility = useCallback((cardId: string) => {
    setHiddenCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      localStorage.setItem(HIDDEN_CARDS_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Reset initial mount flag when hiddenCards changes (grid will remount with new key)
  useEffect(() => {
    isInitialMountRef.current = true;
    const timer = setTimeout(() => {
      isInitialMountRef.current = false;
    }, 200);
    return () => clearTimeout(timer);
  }, [hiddenCards]);

  // Standard card base positions (y offsets for lg)
  const standardCardDefaults = useMemo(() => ({
    lg: [
      { i: "risk-assessments", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "safety-audits", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "incidents", x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "training-compliance", x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-trends", x: 0, y: 2, w: 12, h: 4, minW: 6, minH: 3, static: false },
      { i: "audit-completion", x: 0, y: 6, w: 6, h: 3, minW: 4, minH: 2, static: false },
      { i: "task-completion", x: 6, y: 6, w: 6, h: 3, minW: 4, minH: 2, static: false },
    ],
    md: [
      { i: "risk-assessments", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "safety-audits", x: 5, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "incidents", x: 0, y: 2, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "training-compliance", x: 5, y: 2, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-trends", x: 0, y: 4, w: 10, h: 4, minW: 6, minH: 3, static: false },
      { i: "audit-completion", x: 0, y: 8, w: 5, h: 3, minW: 4, minH: 2, static: false },
      { i: "task-completion", x: 5, y: 8, w: 5, h: 3, minW: 4, minH: 2, static: false },
    ],
    sm: [
      { i: "risk-assessments", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "safety-audits", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "incidents", x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "training-compliance", x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-trends", x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3, static: false },
      { i: "audit-completion", x: 0, y: 8, w: 6, h: 3, minW: 3, minH: 2, static: false },
      { i: "task-completion", x: 0, y: 11, w: 6, h: 3, minW: 3, minH: 2, static: false },
    ],
  }), []);

  // Generate layout items for custom reports, placed after standard cards
  // Must be breakpoint-aware: lg=12cols, md=10cols, sm=6cols
  const generateCustomReportLayoutItems = useCallback((reports: ReportConfig[], startY: number, breakpoint: string) => {
    const totalCols = breakpoint === 'lg' ? 12 : breakpoint === 'md' ? 10 : 6;
    const isSmall = breakpoint === 'sm';
    // On sm, full width; on md/lg, half width (2 per row)
    const itemW = isSmall ? totalCols : Math.floor(totalCols / 2);
    const perRow = isSmall ? 1 : 2;

    return reports.map((report, index) => ({
      i: `report-${report.id}`,
      x: isSmall ? 0 : (index % perRow) * itemW,
      y: startY + Math.floor(index / perRow) * 3,
      w: itemW,
      h: 3,
      minW: Math.min(3, totalCols),
      minH: 2,
      static: false,
    }));
  }, []);

  // Build unified default layout (standard + custom reports)
  const buildDefaultUnifiedLayout = useCallback(() => {
    const breakpoints = ['lg', 'md', 'sm'] as const;
    const unifiedLayout: { [key: string]: any[] } = {};

    breakpoints.forEach(bp => {
      const standardItems = standardCardDefaults[bp];
      const maxStandardY = Math.max(...standardItems.map(item => item.y + item.h), 0);
      const customItems = generateCustomReportLayoutItems(customReports, maxStandardY, bp);
      unifiedLayout[bp] = [...standardItems, ...customItems];
    });

    return unifiedLayout;
  }, [standardCardDefaults, customReports, generateCustomReportLayoutItems]);

  // Load unified layouts from localStorage or build defaults
  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem(UNIFIED_LAYOUT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge: ensure all current custom reports + standard cards have layout entries
        const allRequiredIds = new Set([
          ...standardCardDefaults.lg.map(item => item.i),
          ...customReports.map(r => `report-${r.id}`),
        ]);
        const savedIds = new Set((parsed.lg || []).map((item: any) => item.i));
        const missingIds = [...allRequiredIds].filter(id => !savedIds.has(id));

        if (missingIds.length === 0) {
          // Remove stale items (deleted custom reports)
          const result: { [key: string]: any[] } = {};
          Object.keys(parsed).forEach(bp => {
            result[bp] = parsed[bp].filter((item: any) => allRequiredIds.has(item.i));
          });
          return result;
        }
        // If there are missing ids, fall through to build default
      }
    } catch (error) {
      console.error("Error loading unified layout:", error);
    }
    return buildDefaultUnifiedLayout();
  });

  // When customReports change, ensure layout has entries for all reports
  useEffect(() => {
    setLayouts(prev => {
      const allRequiredIds = new Set([
        ...standardCardDefaults.lg.map(item => item.i),
        ...customReports.map(r => `report-${r.id}`),
      ]);
      const currentIds = new Set((prev.lg || []).map((item: any) => item.i));
      const missingIds = [...allRequiredIds].filter(id => !currentIds.has(id));
      const staleIds = [...currentIds].filter(id => !allRequiredIds.has(id));

      if (missingIds.length === 0 && staleIds.length === 0) return prev;

      const bpCols: Record<string, number> = { lg: 12, md: 10, sm: 6 };
      const breakpoints = ['lg', 'md', 'sm'];
      const newLayouts: { [key: string]: any[] } = {};

      breakpoints.forEach(bp => {
        const totalCols = bpCols[bp];
        const isSmall = bp === 'sm';
        const itemW = isSmall ? totalCols : Math.floor(totalCols / 2);
        const perRow = isSmall ? 1 : 2;

        let bpItems = [...(prev[bp] || [])];
        // Remove stale items
        bpItems = bpItems.filter(item => !staleIds.includes(item.i));
        // Add missing items
        const maxY = bpItems.length > 0 ? Math.max(...bpItems.map(item => item.y + item.h)) : 0;
        missingIds.forEach((id, idx) => {
          const isReport = id.startsWith("report-");
          bpItems.push({
            i: id,
            x: isSmall ? 0 : (idx % perRow) * itemW,
            y: maxY + Math.floor(idx / perRow) * 3,
            w: isReport ? itemW : (standardCardDefaults[bp as keyof typeof standardCardDefaults]?.find((s: any) => s.i === id)?.w || 3),
            h: isReport ? 3 : 2,
            minW: isReport ? Math.min(3, totalCols) : 2,
            minH: 2,
            static: false,
          });
        });
        newLayouts[bp] = bpItems;
      });

      localStorage.setItem(UNIFIED_LAYOUT_KEY, JSON.stringify(newLayouts));
      return newLayouts;
    });
  }, [customReports, standardCardDefaults]);

  // Keep refs in sync with state to avoid dependency issues in callbacks
  useEffect(() => {
    layoutsRef.current = layouts;
  }, [layouts]);

  useEffect(() => {
    hiddenCardsRef.current = hiddenCards;
  }, [hiddenCards]);

  // Save layouts to localStorage when they change (deferred during drag)
  const lastSavedLayoutRef = useRef<string>('');

  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    // Skip processing during initial mount to avoid infinite loop
    if (isInitialMountRef.current) return;

    if (isDraggingRef.current) {
      // During drag, just store the pending layout but don't save yet
      pendingLayoutRef.current = allLayouts;
      return;
    }

    // NOTE: Do NOT call setLayouts here — doing so triggers a re-render which causes
    // ResponsiveGridLayout to fire onLayoutChange again, creating an infinite loop.
    // Layout state is only updated on drag stop / resize stop.
    // Just persist to localStorage if something changed.

    // IMPORTANT: Merge with existing layouts to preserve hidden cards' positions
    // allLayouts only contains visible cards, so we need to add back hidden ones
    const mergedLayouts: { [key: string]: any[] } = {};
    const currentLayouts = layoutsRef.current;
    const currentHiddenCards = hiddenCardsRef.current;

    Object.keys(currentLayouts).forEach(bp => {
      // Get current visible layout from allLayouts
      const visibleLayout = allLayouts[bp] || [];
      // Get hidden cards' positions from existing layouts
      const hiddenLayout = (currentLayouts[bp] || []).filter((item: any) => currentHiddenCards.has(item.i));
      // Merge both
      mergedLayouts[bp] = [...visibleLayout, ...hiddenLayout];
    });

    const serialized = JSON.stringify(mergedLayouts);
    if (serialized === lastSavedLayoutRef.current) return;
    lastSavedLayoutRef.current = serialized;
    try {
      localStorage.setItem(UNIFIED_LAYOUT_KEY, serialized);
    } catch (error) {
      console.error("Error saving unified layout:", error);
    }
  }, []);

  // Drag start/stop handlers to defer layout saves
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleDragStop = useCallback((layout: any[], oldItem: any, newItem: any, placeholder: any, e: any, element: any) => {
    isDraggingRef.current = false;
    // Apply the pending layout that accumulated during drag
    if (pendingLayoutRef.current) {
      // Merge with hidden cards to preserve their positions
      const mergedLayouts: { [key: string]: any[] } = {};
      const currentLayouts = layoutsRef.current;
      const currentHiddenCards = hiddenCardsRef.current;

      Object.keys(currentLayouts).forEach(bp => {
        const visibleLayout = pendingLayoutRef.current![bp] || [];
        const hiddenLayout = (currentLayouts[bp] || []).filter((item: any) => currentHiddenCards.has(item.i));
        mergedLayouts[bp] = [...visibleLayout, ...hiddenLayout];
      });

      const serialized = JSON.stringify(mergedLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(mergedLayouts);
      try {
        localStorage.setItem(UNIFIED_LAYOUT_KEY, serialized);
      } catch (error) {
        console.error("Error saving unified layout:", error);
      }
      pendingLayoutRef.current = null;
    }
  }, []);

  const handleResizeStop = useCallback((layout: any[], oldItem: any, newItem: any, placeholder: any, e: any, element: any) => {
    // On resize stop, update state using updater form (no stale closure on `layouts`)
    const currentHiddenCards = hiddenCardsRef.current;

    setLayouts(prev => {
      const updated = { ...prev };
      // Match the breakpoint by layout length and merge with hidden cards
      Object.keys(updated).forEach(bp => {
        const visibleCount = layout.filter(item => !currentHiddenCards.has(item.i)).length;
        const prevVisibleCount = (updated[bp] || []).filter((item: any) => !currentHiddenCards.has(item.i)).length;

        if (visibleCount === prevVisibleCount) {
          // This is the matching breakpoint
          const hiddenLayout = (updated[bp] || []).filter((item: any) => currentHiddenCards.has(item.i));
          updated[bp] = [...layout, ...hiddenLayout];
        }
      });
      const serialized = JSON.stringify(updated);
      lastSavedLayoutRef.current = serialized;
      try {
        localStorage.setItem(UNIFIED_LAYOUT_KEY, serialized);
      } catch (error) {
        console.error("Error saving unified layout:", error);
      }
      return updated;
    });
  }, []);

  // Filter layouts to only include visible cards
  const visibleLayouts = useMemo(() => {
    const filtered: { [key: string]: any[] } = {};
    Object.keys(layouts).forEach(bp => {
      filtered[bp] = layouts[bp].filter((item: any) => !hiddenCards.has(item.i));
    });
    return filtered;
  }, [layouts, hiddenCards]);

  // Reset layout to default
  const resetLayout = useCallback(() => {
    const defaultResetLayouts = buildDefaultUnifiedLayout();
    setLayouts(defaultResetLayouts);
    localStorage.setItem(UNIFIED_LAYOUT_KEY, JSON.stringify(defaultResetLayouts));

    // Reset hidden cards
    setHiddenCards(new Set());
    localStorage.removeItem(HIDDEN_CARDS_KEY);

    toast({
      title: t("reports.toast.layoutResetTitle"),
      description: t("reports.toast.dashboardLayoutResetDesc"),
    });
  }, [buildDefaultUnifiedLayout, toast, t]);

  // Get hidden card info for display
  const hiddenCardsList = useMemo(() => {
    const hiddenStandard = OVERVIEW_CARDS.filter(c => hiddenCards.has(c.id));
    const hiddenCustom = customReports.filter(r => hiddenCards.has(`report-${r.id}`));
    return { hiddenStandard, hiddenCustom };
  }, [hiddenCards, OVERVIEW_CARDS, customReports]);

  const totalHidden = hiddenCardsList.hiddenStandard.length + hiddenCardsList.hiddenCustom.length;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="w-4 h-4 mr-2" />
              {t("reports.overview.manageWidgets")}
              {totalHidden > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                  {t("reports.overview.hiddenCount").replace("{count}", String(totalHidden))}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-1">{t("reports.overview.showHideCards")}</h4>
                <p className="text-xs text-muted-foreground">{t("reports.overview.toggleVisibilityHint")}</p>
              </div>
              {OVERVIEW_CARDS.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("reports.overview.standard")}</p>
                  {OVERVIEW_CARDS.map(card => (
                    <div key={card.id} className="flex items-center justify-between">
                      <label htmlFor={`toggle-${card.id}`} className="text-sm cursor-pointer">{card.label}</label>
                      <Switch
                        id={`toggle-${card.id}`}
                        checked={!hiddenCards.has(card.id)}
                        onCheckedChange={() => toggleCardVisibility(card.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
              {customReports.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("reports.overview.customReports")}</p>
                  {customReports.map(report => (
                    <div key={report.id} className="flex items-center justify-between">
                      <label htmlFor={`toggle-report-${report.id}`} className="text-sm cursor-pointer truncate mr-2">{report.title}</label>
                      <Switch
                        id={`toggle-report-${report.id}`}
                        checked={!hiddenCards.has(`report-${report.id}`)}
                        onCheckedChange={() => toggleCardVisibility(`report-${report.id}`)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          {t("reports.overview.resetLayout")}
        </Button>
      </div>

      {/* Unified Resizable/Draggable Grid Layout (standard + custom cards together) */}
      <ResponsiveGridLayoutWrapper
        hiddenCards={hiddenCards}
        visibleLayouts={visibleLayouts}
        isMounted={isMounted}
        handleLayoutChange={handleLayoutChange}
        handleDragStart={handleDragStart}
        handleDragStop={handleDragStop}
        handleResizeStop={handleResizeStop}
      >
        {/* --- Standard Cards --- */}
        {!hiddenCards.has("risk-assessments") && <div key="risk-assessments">
          <DraggableCard
            title={t("reports.overview.card.riskAssessments")}
            subtitle={t("reports.overview.subtitle.totalGbu")}
            value={stats.totalRiskAssessments}
            icon={<Shield className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
            onHide={() => toggleCardVisibility("risk-assessments")}
            onValueClick={() => openDrillDown({ metric: "risks", groupBy: "" } as ReportConfig, "", "Alle Risikobewertungen")}
            editSlot={onEditTile ? <button onClick={(e) => { e.stopPropagation(); onEditTile("risk-assessments", { id: "risk-assessments", title: t("reports.overview.card.riskAssessments"), metric: "risks", groupBy: "risk_level", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: "overview" }, (_cfg, _d) => {}); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Diagramm bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button> : undefined}
          />
        </div>}

        {!hiddenCards.has("safety-audits") && <div key="safety-audits">
          <DraggableCard
            title={t("reports.overview.card.safetyAudits")}
            subtitle={t("reports.overview.subtitle.completedCount").replace("{count}", String(stats.completedAudits))}
            value={stats.totalAudits}
            icon={<ClipboardCheck className="w-5 h-5" />}
            color="bg-blue-50 text-blue-600"
            onHide={() => toggleCardVisibility("safety-audits")}
            onValueClick={() => openDrillDown({ metric: "audits", groupBy: "" } as ReportConfig, "", "Alle Audits")}
            editSlot={onEditTile ? <button onClick={(e) => { e.stopPropagation(); onEditTile("safety-audits", { id: "safety-audits", title: t("reports.overview.card.safetyAudits"), metric: "audits", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: "overview" }, (_cfg, _d) => {}); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Diagramm bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button> : undefined}
          />
        </div>}

        {!hiddenCards.has("incidents") && <div key="incidents">
          <DraggableCard
            title={t("reports.overview.card.incidents")}
            subtitle={t("reports.overview.subtitle.openCases").replace("{count}", String(stats.openIncidents))}
            value={stats.totalIncidents}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="bg-red-50 text-red-600"
            onHide={() => toggleCardVisibility("incidents")}
            onValueClick={() => openDrillDown({ metric: "incidents", groupBy: "" } as ReportConfig, "", "Alle Vorfälle")}
            editSlot={onEditTile ? <button onClick={(e) => { e.stopPropagation(); onEditTile("incidents", { id: "incidents", title: t("reports.overview.card.incidents"), metric: "incidents", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: "overview" }, (_cfg, _d) => {}); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Diagramm bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button> : undefined}
          />
        </div>}

        {!hiddenCards.has("training-compliance") && <div key="training-compliance">
          <DraggableCard
            title={t("reports.overview.card.trainingCompliance")}
            subtitle={t("reports.overview.subtitle.overallRate")}
            value={`${stats.trainingCompliance}%`}
            icon={<GraduationCap className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
            onHide={() => toggleCardVisibility("training-compliance")}
            onValueClick={() => openDrillDown({ metric: "trainings", groupBy: "" } as ReportConfig, "", "Alle Schulungen")}
            editSlot={onEditTile ? <button onClick={(e) => { e.stopPropagation(); onEditTile("training-compliance", { id: "training-compliance", title: t("reports.overview.card.trainingCompliance"), metric: "trainings", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: "overview" }, (_cfg, _d) => {}); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Diagramm bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button> : undefined}
          />
        </div>}

        {!hiddenCards.has("incident-trends") && <div key="incident-trends">
          <Card className="dashboard-grid-card border shadow-sm h-full group">
            <div className="drag-handle border-b flex items-center justify-between px-3">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-1">
                {onEditTile && <button onClick={(e) => { e.stopPropagation(); onEditTile("incident-trends", { id: "incident-trends", title: t("reports.overview.card.incidentTrends"), metric: "incidents", groupBy: "month", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "line", sortBy: "value", displayMode: "chart", targetSection: "overview" }, (_cfg, _d) => {}); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Diagramm bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCardVisibility("incident-trends"); }}
                  className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
                  title={t("reports.draggableCard.hide")}
                >
                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <CardHeader className="py-4 pb-3">
              <CardTitle className="text-lg">{t("reports.overview.card.incidentTrends")}</CardTitle>
              <CardDescription>{t("reports.overview.incidentTrendsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="incidents"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIncidents)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>}

        {!hiddenCards.has("audit-completion") && <div key="audit-completion">
          <Card className="dashboard-grid-card border shadow-sm h-full overflow-hidden group">
            <div className="drag-handle border-b flex items-center justify-between px-3">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-1">
                {onEditTile && <button onClick={(e) => { e.stopPropagation(); onEditTile("audit-completion", { id: "audit-completion", title: t("reports.overview.card.auditCompletion"), metric: "audits", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: "overview" }, (_cfg, _d) => {}); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Diagramm bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCardVisibility("audit-completion"); }}
                  className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
                  title={t("reports.draggableCard.hide")}
                >
                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <CardHeader className="py-2 pb-1 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-blue-600" />
                {t("reports.overview.card.auditCompletion")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center pb-3 pt-1 px-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center py-1.5 px-2 rounded-md bg-blue-50">
                  <div className="text-lg font-bold text-blue-600">{stats.totalAudits}</div>
                  <div className="text-[9px] text-blue-600/70">{t("reports.overview.total")}</div>
                </div>
                <div className="flex-1 text-center py-1.5 px-2 rounded-md bg-green-50">
                  <div className="text-lg font-bold text-green-600">{stats.completedAudits}</div>
                  <div className="text-[9px] text-green-600/70">{t("reports.overview.done")}</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xl font-bold">
                    {stats.totalAudits > 0 ? Math.round((stats.completedAudits / stats.totalAudits) * 100) : 0}%
                  </div>
                  <div className="text-[9px] text-muted-foreground">{t("reports.overview.rate")}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>}

        {!hiddenCards.has("task-completion") && <div key="task-completion">
          <Card className="dashboard-grid-card border shadow-sm h-full overflow-hidden group">
            <div className="drag-handle border-b flex items-center justify-between px-3">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-1">
                {onEditTile && <button onClick={(e) => { e.stopPropagation(); onEditTile("task-completion", { id: "task-completion", title: t("reports.overview.card.taskCompletion"), metric: "tasks", groupBy: "status", dateProperty: "created_at", dateRange: { type: "last_30_days" }, chartType: "bar", sortBy: "value", displayMode: "chart", targetSection: "overview" }, (_cfg, _d) => {}); }} className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100" title="Diagramm bearbeiten"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCardVisibility("task-completion"); }}
                  className="p-0.5 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
                  title={t("reports.draggableCard.hide")}
                >
                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <CardHeader className="py-2 pb-1 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-blue-600" />
                {t("reports.overview.card.taskCompletion")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center pb-3 pt-1 px-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center py-1.5 px-2 rounded-md bg-blue-50">
                  <div className="text-lg font-bold text-blue-600">{stats.totalTasks}</div>
                  <div className="text-[9px] text-blue-600/70">{t("reports.overview.total")}</div>
                </div>
                <div className="flex-1 text-center py-1.5 px-2 rounded-md bg-green-50">
                  <div className="text-lg font-bold text-green-600">{stats.completedTasks}</div>
                  <div className="text-[9px] text-green-600/70">{t("reports.overview.done")}</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xl font-bold">
                    {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
                  </div>
                  <div className="text-[9px] text-muted-foreground">{t("reports.overview.rate")}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>}

        {/* --- Custom Report Cards (in the same grid) --- */}
        {customReports.map((report) => (
          !hiddenCards.has(`report-${report.id}`) && <div key={`report-${report.id}`} className="h-full">
            <ReportWidget
              config={report}
              onEdit={onEditReport}
              onDuplicate={onDuplicateReport}
              onDelete={onDeleteReport}
              onExport={onExportReport}
            />
          </div>
        ))}
      </ResponsiveGridLayoutWrapper>

      {/* Hidden Cards Section */}
      {totalHidden > 0 && (
        <div className="border rounded-lg bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <EyeOff className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-muted-foreground">{t("reports.overview.hiddenWidgets").replace("{count}", String(totalHidden))}</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {hiddenCardsList.hiddenStandard.map(card => (
              <button
                key={card.id}
                onClick={() => toggleCardVisibility(card.id)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
              >
                {card.icon}
                <span>{card.label}</span>
                <Eye className="w-3.5 h-3.5 ml-1 text-muted-foreground" />
              </button>
            ))}
            {hiddenCardsList.hiddenCustom.map(report => (
              <button
                key={report.id}
                onClick={() => toggleCardVisibility(`report-${report.id}`)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
              >
                <BarChart3 className="w-4 h-4" />
                <span>{report.title}</span>
                <Eye className="w-3.5 h-3.5 ml-1 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

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

const InnerResponsiveGridLayout = WidthProvider(Responsive);

function ResponsiveGridLayoutWrapper({
  hiddenCards,
  visibleLayouts,
  isMounted,
  handleLayoutChange,
  handleDragStart,
  handleDragStop,
  handleResizeStop,
  children,
}: {
  hiddenCards: Set<string>;
  visibleLayouts: { [key: string]: any[] };
  isMounted: boolean;
  handleLayoutChange: (currentLayout: any[], allLayouts: { [key: string]: any[] }) => void;
  handleDragStart: () => void;
  handleDragStop: (...args: any[]) => void;
  handleResizeStop: (...args: any[]) => void;
  children: React.ReactNode;
}) {
  return (
    <InnerResponsiveGridLayout
      key={Array.from(hiddenCards).sort().join(',')}
      className={`layout${isMounted ? '' : ' no-transition'}`}
      layouts={visibleLayouts}
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
      useCSSTransforms={true}
      margin={[12, 12]}
      containerPadding={[0, 0]}
      compactType="vertical"
      preventCollision={false}
    >
      {children}
    </InnerResponsiveGridLayout>
  );
}
