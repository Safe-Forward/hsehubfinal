import { useState, useEffect, useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, ListChecks, CheckCircle } from "lucide-react";
import { DraggableCard } from "@/components/reports/DraggableCard";
import { ReportStats } from "@/components/reports/types";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function TasksSection({ stats, chartData }: { stats: ReportStats; chartData: any[] }) {
  const { toast } = useToast();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');
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
    toast({ title: "Zurückgesetzt", description: "Aufgaben-Layout wurde zurückgesetzt" });
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Tasks</h2>
          <p className="text-muted-foreground">Task management and completion. Drag cards to reposition, drag corners to resize.</p>
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
        <div key="tasks-total">
          <DraggableCard
            title="Total Tasks"
            subtitle="All tasks"
            value={stats.totalTasks}
            icon={<ListChecks className="w-5 h-5" />}
            color="bg-indigo-50 text-indigo-600"
          />
        </div>
        <div key="tasks-completed">
          <DraggableCard
            title="Completed"
            subtitle="Finished tasks"
            value={stats.completedTasks}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}
