import { useState, useEffect, useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, GraduationCap, CheckCircle } from "lucide-react";
import { DraggableCard } from "@/components/reports/DraggableCard";
import { ReportStats, TrainingStatus } from "@/components/reports/types";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function TrainingsSection({
  stats,
  trainingMatrix,
  chartData,
}: {
  stats: ReportStats;
  trainingMatrix: TrainingStatus[];
  chartData: any[];
}) {
  const { toast } = useToast();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');
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
    toast({ title: "Zurückgesetzt", description: "Schulungen-Layout wurde zurückgesetzt" });
  }, [toast]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Trainings</h2>
          <p className="text-muted-foreground">Employee training compliance. Drag cards to reposition, drag corners to resize.</p>
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
        <div key="training-total">
          <DraggableCard
            title="Total Courses"
            subtitle="Training programs"
            value={stats.totalTrainings}
            icon={<GraduationCap className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>
        <div key="training-compliance">
          <DraggableCard
            title="Compliance Rate"
            subtitle="Overall compliance"
            value={`${stats.trainingCompliance}%`}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-blue-50 text-blue-600"
          />
        </div>
      </ResponsiveGridLayout>

      {/* Training Matrix */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Employee Training Matrix</CardTitle>
          <CardDescription>Training compliance by employee</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Employee Name</TableHead>
                  <TableHead className="font-semibold">Required</TableHead>
                  <TableHead className="font-semibold">Completed</TableHead>
                  <TableHead className="font-semibold">Expired</TableHead>
                  <TableHead className="font-semibold">Compliance</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainingMatrix.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No training data available
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
                            Compliant
                          </Badge>
                        ) : item.compliance_rate >= 50 ? (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            Needs Attention
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Non-Compliant</Badge>
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
                Seite {matrixPage} von {matrixPageCount} ({trainingMatrix.length} Mitarbeiter)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={matrixPage <= 1}
                  onClick={() => setMatrixPage((p) => Math.max(1, p - 1))}
                >
                  Zurück
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={matrixPage >= matrixPageCount}
                  onClick={() => setMatrixPage((p) => Math.min(matrixPageCount, p + 1))}
                >
                  Weiter
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
