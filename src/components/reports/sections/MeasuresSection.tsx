import { useState, useEffect, useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, GripVertical, CheckCircle, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DraggableCard } from "@/components/reports/DraggableCard";
import { ReportStats, getStatusColor, formatStatusLabel } from "@/components/reports/types";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function MeasuresSection({ stats, chartData, measuresStatusData }: { stats: ReportStats; chartData: any[]; measuresStatusData: any[] }) {
  const { toast } = useToast();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');
  const defaultLayout = {
    lg: [
      { i: "measures-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "measures-completed", x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "measures-progress", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "measures-status-chart", x: 0, y: 4, w: 12, h: 4, minW: 4, minH: 3, static: false },
    ],
    md: [
      { i: "measures-total", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "measures-completed", x: 5, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "measures-progress", x: 0, y: 2, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "measures-status-chart", x: 0, y: 4, w: 10, h: 4, minW: 4, minH: 3, static: false },
    ],
    sm: [
      { i: "measures-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "measures-completed", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "measures-progress", x: 0, y: 4, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "measures-status-chart", x: 0, y: 6, w: 6, h: 4, minW: 4, minH: 3, static: false },
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
    toast({ title: "Zurückgesetzt", description: "Maßnahmen-Layout wurde zurückgesetzt" });
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Measures</h2>
          <p className="text-muted-foreground">Tracks corrective and preventive actions derived from risk assessments, audit findings, and incident investigations.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
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
            title="Total Measures"
            subtitle="All measures"
            value={stats.totalMeasures}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-purple-50 text-purple-600"
          />
        </div>
        <div key="measures-completed">
          <DraggableCard
            title="Completed"
            subtitle="Finished measures"
            value={stats.completedMeasures}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>
        <div key="measures-progress">
          <DraggableCard
            title="In Progress"
            subtitle="Active measures"
            value={stats.totalMeasures - stats.completedMeasures}
            icon={<TrendingUp className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
          />
        </div>
        <div key="measures-status-chart" data-grid={{ x: 0, y: 4, w: 12, h: 4, minW: 4, minH: 3 }}>
          <Card className="dashboard-grid-card border shadow-sm h-full group">
            <div className="drag-handle border-b flex items-center px-3 py-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-base">Measures Status Distribution</CardTitle>
              <CardDescription>All measures grouped by status</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 pt-0">
              {measuresStatusData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No data for selected date range
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={measuresStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="40%" outerRadius="75%">
                      {measuresStatusData.map((entry, index) => (
                        <Cell key={`measures-cell-${index}`} fill={getStatusColor(entry.name, index)} />
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
