import { useState, useEffect, useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, GripVertical, AlertTriangle, CheckCircle, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { DraggableCard } from "@/components/reports/DraggableCard";
import { ReportStats, getStatusColor, formatStatusLabel } from "@/components/reports/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const ResponsiveGridLayout = WidthProvider(Responsive);

// ─── Accident KPI types (inlined from AccidentKPISection) ───────────────────

interface DepartmentKPI {
  id: string;
  name: string;
  accidentFreeDays: number | null;
  lastAccidentDate: string | null;
  reportableCount: number;
  employeeCount: number;
  teurRate: number;
}

interface AccidentKPIData {
  accidentFreeDaysGlobal: number | null;
  lastAccidentDateGlobal: string | null;
  totalEmployees: number;
  reportableTotal: number;
  fatalTotal: number;
  injuryTotal: number;
  nearMissTotal: number;
  teurRate: number;
  departments: DepartmentKPI[];
}

const REPORTABLE_SEVERITIES = ["serious", "critical", "fatal"] as const;

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function IncidentsSection({
  stats,
  chartData,
  incidentTypeData,
  companyId,
  selectedYear,
  departmentFilter = "all",
}: {
  stats: ReportStats;
  chartData: any[];
  incidentTypeData: any[];
  companyId: string;
  selectedYear: number;
  departmentFilter?: string;
}) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const isInitialMountRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingLayoutRef = useRef<{ [key: string]: any[] } | null>(null);
  const lastSavedLayoutRef = useRef<string>('');

  // ── Accident KPI state ──────────────────────────────────────────────────────
  const [accidentKPI, setAccidentKPI] = useState<AccidentKPIData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    const loadKPIs = async () => {
      setKpiLoading(true);
      try {
        const yearStart = `${selectedYear}-01-01`;
        const yearEnd = `${selectedYear}-12-31`;
        const deptActive = departmentFilter !== "all";

        let allIncidentsQ = (supabase as any)
          .from("incidents")
          .select("incident_date, severity, incident_type, department_id")
          .eq("company_id", companyId)
          .in("severity", REPORTABLE_SEVERITIES)
          .eq("incident_type", "injury")
          .order("incident_date", { ascending: false });
        if (deptActive) allIncidentsQ = allIncidentsQ.eq("department_id", departmentFilter);

        let employeesQ = supabase
          .from("employees")
          .select("id, department_id", { count: "exact" })
          .eq("company_id", companyId)
          .eq("is_active", true);
        if (deptActive) employeesQ = (employeesQ as any).eq("department_id", departmentFilter);

        let yearIncidentsQ = (supabase as any)
          .from("incidents")
          .select("id, severity, incident_type, department_id, incident_date")
          .eq("company_id", companyId)
          .gte("incident_date", yearStart)
          .lte("incident_date", yearEnd);
        if (deptActive) yearIncidentsQ = yearIncidentsQ.eq("department_id", departmentFilter);

        const [allIncidentsRes, employeesRes, departmentsRes, yearIncidentsRes] = await Promise.all([
          allIncidentsQ,
          employeesQ,
          supabase
            .from("departments")
            .select("id, name")
            .eq("company_id", companyId)
            .order("name"),
          yearIncidentsQ,
        ]);

        const allReportable: Array<{ incident_date: string; severity: string; incident_type: string; department_id: string | null }> =
          allIncidentsRes.data || [];
        const yearIncidents: Array<{ id: string; severity: string; incident_type: string; department_id: string | null; incident_date: string }> =
          yearIncidentsRes.data || [];
        const employees: Array<{ id: string; department_id: string | null }> = employeesRes.data || [];
        const departments: Array<{ id: string; name: string }> = departmentsRes.data || [];
        const totalEmployees = employeesRes.count ?? employees.length;

        const lastGlobal = allReportable[0]?.incident_date ?? null;
        const accidentFreeDaysGlobal = daysSince(lastGlobal);

        const reportableInYear = yearIncidents.filter(
          (i) => REPORTABLE_SEVERITIES.includes(i.severity as any) && i.incident_type === "injury"
        );
        const fatalInYear = yearIncidents.filter((i) => i.severity === "fatal");
        const nearMissInYear = yearIncidents.filter((i) => i.incident_type === "near_miss");
        const seriousInjuryInYear = reportableInYear.filter((i) => i.severity !== "fatal");

        const teurRate =
          totalEmployees > 0
            ? parseFloat(((reportableInYear.length / totalEmployees) * 1000).toFixed(2))
            : 0;

        const employeesByDept = new Map<string, number>();
        employees.forEach((e) => {
          const dId = e.department_id ?? "__none__";
          employeesByDept.set(dId, (employeesByDept.get(dId) ?? 0) + 1);
        });

        const lastByDept = new Map<string, string>();
        allReportable.forEach((i) => {
          const dId = i.department_id ?? "__none__";
          if (!lastByDept.has(dId)) lastByDept.set(dId, i.incident_date);
        });

        const reportableByDept = new Map<string, number>();
        reportableInYear.forEach((i) => {
          const dId = i.department_id ?? "__none__";
          reportableByDept.set(dId, (reportableByDept.get(dId) ?? 0) + 1);
        });

        const deptKPIs: DepartmentKPI[] = departments.map((dept) => {
          const empCount = employeesByDept.get(dept.id) ?? 0;
          const lastDate = lastByDept.get(dept.id) ?? null;
          const reportableCount = reportableByDept.get(dept.id) ?? 0;
          const rate = empCount > 0 ? parseFloat(((reportableCount / empCount) * 1000).toFixed(2)) : 0;
          return {
            id: dept.id,
            name: dept.name,
            accidentFreeDays: daysSince(lastDate),
            lastAccidentDate: lastDate,
            reportableCount,
            employeeCount: empCount,
            teurRate: rate,
          };
        });

        setAccidentKPI({
          accidentFreeDaysGlobal,
          lastAccidentDateGlobal: lastGlobal,
          totalEmployees,
          reportableTotal: reportableInYear.length,
          fatalTotal: fatalInYear.length,
          injuryTotal: seriousInjuryInYear.length,
          nearMissTotal: nearMissInYear.length,
          teurRate,
          departments: deptKPIs,
        });
      } catch (err) {
        console.error("IncidentsSection: error loading accident KPIs", err);
      } finally {
        setKpiLoading(false);
      }
    };
    loadKPIs();
  }, [companyId, selectedYear]);

  // ─────────────────────────────────────────────────────────────────────────────

  const defaultLayout = {
    lg: [
      { i: "incident-total", x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-open", x: 4, y: 0, w: 4, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-closed", x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-reportable", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "accident-free", x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "teur-rate", x: 9, y: 2, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-trend-chart", x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3, static: false },
      { i: "incident-type-chart", x: 6, y: 4, w: 6, h: 4, minW: 4, minH: 3, static: false },
      { i: "dept-table", x: 0, y: 8, w: 12, h: 5, minW: 6, minH: 4, static: false },
    ],
    md: [
      { i: "incident-total", x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-open", x: 4, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-closed", x: 7, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-reportable", x: 0, y: 2, w: 5, h: 2, minW: 2, minH: 2, static: false },
      { i: "accident-free", x: 5, y: 2, w: 3, h: 2, minW: 2, minH: 2, static: false },
      { i: "teur-rate", x: 8, y: 2, w: 2, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-trend-chart", x: 0, y: 4, w: 5, h: 4, minW: 4, minH: 3, static: false },
      { i: "incident-type-chart", x: 5, y: 4, w: 5, h: 4, minW: 4, minH: 3, static: false },
      { i: "dept-table", x: 0, y: 8, w: 10, h: 5, minW: 6, minH: 4, static: false },
    ],
    sm: [
      { i: "incident-total", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-open", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-closed", x: 0, y: 4, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-reportable", x: 0, y: 6, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "accident-free", x: 0, y: 8, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "teur-rate", x: 0, y: 10, w: 6, h: 2, minW: 2, minH: 2, static: false },
      { i: "incident-trend-chart", x: 0, y: 12, w: 6, h: 4, minW: 4, minH: 3, static: false },
      { i: "incident-type-chart", x: 0, y: 16, w: 6, h: 4, minW: 4, minH: 3, static: false },
      { i: "dept-table", x: 0, y: 20, w: 6, h: 5, minW: 6, minH: 4, static: false },
    ],
  };

  useEffect(() => {
    const timer = setTimeout(() => { isInitialMountRef.current = false; }, 200);
    return () => clearTimeout(timer);
  }, []);

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_incidents');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading incidents layout:', error);
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
      localStorage.setItem('hse_layout_incidents', serialized);
    } catch (error) {
      console.error('Error saving incidents layout:', error);
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
      try { localStorage.setItem('hse_layout_incidents', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);
  const handleResizeStop = useCallback(() => {
    if (pendingLayoutRef.current) {
      const allLayouts = pendingLayoutRef.current;
      const serialized = JSON.stringify(allLayouts);
      lastSavedLayoutRef.current = serialized;
      setLayouts(allLayouts);
      try { localStorage.setItem('hse_layout_incidents', serialized); } catch (e) { }
      pendingLayoutRef.current = null;
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = defaultLayout;
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_incidents');
    toast({ title: t("reports.toast.layoutResetTitle"), description: t("reports.toast.incidentsLayoutResetDesc") });
  }, [toast, t]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t("reports.incidents.heading")}</h2>
          <p className="text-muted-foreground">{t("reports.incidents.description")}</p>
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
        <div key="incident-total">
          <DraggableCard
            title={t("reports.incidents.totalTitle")}
            subtitle={t("reports.incidents.totalSubtitle")}
            value={stats.totalIncidents}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="bg-red-50 text-red-600"
          />
        </div>
        <div key="incident-open">
          <DraggableCard
            title={t("reports.incidents.openTitle")}
            subtitle={t("reports.incidents.openSubtitle")}
            value={stats.openIncidents}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
          />
        </div>
        <div key="incident-closed">
          <DraggableCard
            title={t("reports.incidents.closedTitle")}
            subtitle={t("reports.incidents.closedSubtitle")}
            value={stats.totalIncidents - stats.openIncidents}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>
        <div key="incident-reportable">
          <DraggableCard
            title="Meldepflichtige Vorfälle"
            subtitle={`§ 193 SGB VII / DGUV — ${stats.totalIncidents > 0 ? Math.round((stats.reportableIncidents / stats.totalIncidents) * 100) : 0}% aller Vorfälle`}
            value={`${stats.reportableIncidents} / ${stats.totalIncidents}`}
            icon={<ShieldAlert className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
          />
        </div>
        <div key="incident-trend-chart" data-grid={{ x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3 }}>
          <Card className="dashboard-grid-card border shadow-sm h-full group">
            <div className="drag-handle border-b flex items-center px-3 py-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-base">{t("reports.incidents.trendChartTitle")}</CardTitle>
              <CardDescription>{t("reports.incidents.trendChartDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 pt-0">
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {t("reports.incidents.noDataForRange")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="incidents" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
        <div key="incident-type-chart" data-grid={{ x: 6, y: 4, w: 6, h: 4, minW: 4, minH: 3 }}>
          <Card className="dashboard-grid-card border shadow-sm h-full group">
            <div className="drag-handle border-b flex items-center px-3 py-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-base">{t("reports.incidents.typeChartTitle")}</CardTitle>
              <CardDescription>{t("reports.incidents.typeChartDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 pt-0">
              {incidentTypeData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {t("reports.incidents.noDataForRange")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={incidentTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="75%">
                      {incidentTypeData.map((entry, index) => (
                        <Cell key={`incident-type-cell-${index}`} fill={getStatusColor(entry.name, index)} />
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

        {/* ── Accident KPI tiles ── */}
        <div key="accident-free">
          <DraggableCard
            title="Tage unfallfrei"
            subtitle={
              kpiLoading
                ? "Lade …"
                : accidentKPI?.lastAccidentDateGlobal
                ? `Letzter Unfall: ${formatDate(accidentKPI.lastAccidentDateGlobal)}`
                : "Kein meldepflichtiger Unfall erfasst"
            }
            value={kpiLoading ? "…" : (accidentKPI?.accidentFreeDaysGlobal ?? "∞")}
            icon={<ShieldCheck className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>
        <div key="teur-rate">
          <DraggableCard
            title="Unfälle je 1.000 MA"
            subtitle={
              kpiLoading
                ? "Lade …"
                : accidentKPI
                ? `${accidentKPI.reportableTotal} Unfälle / ${accidentKPI.totalEmployees} MA`
                : "Tausend-Mitarbeiter-Quote (TEUR)"
            }
            value={kpiLoading ? "…" : (accidentKPI?.teurRate ?? 0)}
            icon={<Users className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
          />
        </div>
        <div key="dept-table">
          <Card className="dashboard-grid-card border shadow-sm h-full group">
            <div className="drag-handle border-b flex items-center px-3 py-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Auswertung nach Abteilung
              </CardTitle>
              <CardDescription>
                Unfallfreie Tage, meldepflichtige Vorfälle und TEUR-Quote pro Abteilung
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-auto">
              {kpiLoading ? (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2" />
                  Lade …
                </div>
              ) : !accidentKPI || accidentKPI.departments.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                  Keine Abteilungsdaten vorhanden
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3 font-semibold">Abteilung</th>
                        <th className="text-right px-4 py-3 font-semibold">Tage unfallfrei</th>
                        <th className="text-left px-4 py-3 font-semibold">Letzter Unfall</th>
                        <th className="text-right px-4 py-3 font-semibold">Meldepfl. Unfälle ({selectedYear})</th>
                        <th className="text-right px-4 py-3 font-semibold">Mitarbeiter</th>
                        <th className="text-right px-4 py-3 font-semibold">TEUR-Quote</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accidentKPI.departments.map((dept) => (
                        <tr key={dept.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{dept.name}</td>
                          <td className="px-4 py-3 text-right">
                            {dept.accidentFreeDays === null ? (
                              <span className="text-green-700 font-bold">∞</span>
                            ) : (
                              <span
                                className={
                                  dept.accidentFreeDays >= 180
                                    ? "text-green-700 font-bold"
                                    : dept.accidentFreeDays >= 30
                                    ? "text-amber-600 font-semibold"
                                    : "text-red-600 font-bold"
                                }
                              >
                                {dept.accidentFreeDays}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {formatDate(dept.lastAccidentDate)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant={dept.reportableCount > 0 ? "destructive" : "secondary"}>
                              {dept.reportableCount}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{dept.employeeCount}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            {dept.teurRate.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}
