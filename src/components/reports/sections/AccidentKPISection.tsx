import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DepartmentKPI {
  id: string;
  name: string;
  accidentFreeDays: number | null; // null = no accident on record
  lastAccidentDate: string | null;
  reportableCount: number;
  employeeCount: number;
  teurRate: number; // incidents per 1 000 employees
}

interface ReportableCategory {
  label: string;
  count: number;
  description: string;
}

interface AccidentKPIData {
  accidentFreeDaysGlobal: number | null; // null = no accident on record ever
  lastAccidentDateGlobal: string | null;
  totalEmployees: number;
  // Reportable incident totals for the year
  reportableTotal: number;
  fatalTotal: number;
  injuryTotal: number; // serious/critical (Krankenhausaufenthalt)
  nearMissTotal: number;
  // Global TEUR rate
  teurRate: number;
  departments: DepartmentKPI[];
}

interface Props {
  companyId: string;
  selectedYear: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * In the current schema there is no explicit `is_reportable` column.
 * We approximate "reportable" (meldepflichtig nach §§ 193-202 SGB VII) as:
 *   - severity IN ('serious', 'critical', 'fatal') AND incident_type = 'injury'
 *   - OR incident_type = 'fatal'
 *
 * Fatal accidents are always their own sub-category.
 * "Serious injury with hospitalisation" ≈ severity = 'critical' | 'serious'.
 * Near-miss / Wegeunfall are tracked via incident_type.
 */
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

// ─── Component ────────────────────────────────────────────────────────────────

export function AccidentKPISection({ companyId, selectedYear }: Props) {
  const [data, setData] = useState<AccidentKPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    loadKPIs();
  }, [companyId, selectedYear]);

  const loadKPIs = async () => {
    setLoading(true);
    try {
      const yearStart = `${selectedYear}-01-01`;
      const yearEnd = `${selectedYear}-12-31`;

      // ── Parallel fetches ──────────────────────────────────────────────────
      const [
        allIncidentsRes,
        employeesRes,
        departmentsRes,
        yearIncidentsRes,
      ] = await Promise.all([
        // All-time incidents (to find last reportable = accidents free days)
        (supabase as any)
          .from("incidents")
          .select("incident_date, severity, incident_type, department_id")
          .eq("company_id", companyId)
          .in("severity", REPORTABLE_SEVERITIES)
          .eq("incident_type", "injury")
          .order("incident_date", { ascending: false }),

        // Total employee count
        supabase
          .from("employees")
          .select("id, department_id", { count: "exact" })
          .eq("company_id", companyId)
          .eq("is_active", true),

        // All departments
        supabase
          .from("departments")
          .select("id, name")
          .eq("company_id", companyId)
          .order("name"),

        // Year incidents for breakdown
        (supabase as any)
          .from("incidents")
          .select("id, severity, incident_type, department_id, incident_date")
          .eq("company_id", companyId)
          .gte("incident_date", yearStart)
          .lte("incident_date", yearEnd),
      ]);

      const allReportable: Array<{ incident_date: string; severity: string; incident_type: string; department_id: string | null }> =
        allIncidentsRes.data || [];
      const yearIncidents: Array<{ id: string; severity: string; incident_type: string; department_id: string | null; incident_date: string }> =
        yearIncidentsRes.data || [];
      const employees: Array<{ id: string; department_id: string | null }> =
        employeesRes.data || [];
      const departments: Array<{ id: string; name: string }> =
        departmentsRes.data || [];

      const totalEmployees = employeesRes.count ?? employees.length;

      // ── Global accident-free days ─────────────────────────────────────────
      const lastGlobal = allReportable[0]?.incident_date ?? null;
      const accidentFreeDaysGlobal = daysSince(lastGlobal); // null when no accident ever recorded

      // ── Year breakdown ────────────────────────────────────────────────────
      const reportableInYear = yearIncidents.filter(
        (i) => REPORTABLE_SEVERITIES.includes(i.severity as any) && i.incident_type === "injury"
      );
      const fatalInYear = yearIncidents.filter((i) => i.severity === "fatal");
      const nearMissInYear = yearIncidents.filter((i) => i.incident_type === "near_miss");
      // serious/critical (no fatal) → Schwere Verletzung mit Krankenhausaufenthalt
      const seriousInjuryInYear = reportableInYear.filter((i) => i.severity !== "fatal");

      // TEUR global rate
      const teurRate =
        totalEmployees > 0
          ? parseFloat(((reportableInYear.length / totalEmployees) * 1000).toFixed(2))
          : 0;

      // ── Per-department breakdown ──────────────────────────────────────────
      const employeesByDept = new Map<string, number>();
      employees.forEach((e) => {
        const dId = e.department_id ?? "__none__";
        employeesByDept.set(dId, (employeesByDept.get(dId) ?? 0) + 1);
      });

      // Last reportable incident per department (all-time, from allReportable)
      const lastByDept = new Map<string, string>();
      // allReportable is already ordered desc; first hit per dept = last accident
      allReportable.forEach((i) => {
        const dId = i.department_id ?? "__none__";
        if (!lastByDept.has(dId)) lastByDept.set(dId, i.incident_date);
      });

      // Reportable count per department in selected year
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

      setData({
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
      console.error("AccidentKPISection: error loading KPIs", err);
      toast.error("Unfall-KPIs konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
        Lade Unfall-KPIs …
      </div>
    );
  }

  if (!data) return (
    <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
      Unfall-KPIs konnten nicht geladen werden.
    </div>
  );

  const reportableCategories: ReportableCategory[] = [
    {
      label: "Meldepflichtige Arbeitsunfälle gesamt",
      count: data.reportableTotal,
      description: "Schwere/kritische Verletzungen (§§ 193–202 SGB VII)",
    },
    {
      label: "Tödliche Arbeitsunfälle",
      count: data.fatalTotal,
      description: "Severity = Fatal",
    },
    {
      label: "Schwere Verletzungen / Krankenhausaufenthalt",
      count: data.injuryTotal,
      description: "Severity = Serious oder Critical",
    },
    {
      label: "Beinahe-Unfälle (Near Miss)",
      count: data.nearMissTotal,
      description: "Incident type = Near Miss",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section heading */}
      <div>
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-green-600" />
          Meldepflichtige Vorfälle &amp; Unfall-KPIs
        </h2>
        <p className="text-muted-foreground text-sm">
          Auswertung für das Jahr {selectedYear} — meldepflichtig gem. §§&nbsp;193–202 SGB VII
        </p>
      </div>

      {/* ── Row 1: Big counter + year breakdown + TEUR ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Accident-free days (global) */}
        <Card className="col-span-1 border-2 border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 uppercase tracking-wide">
              Tage unfallfrei (gesamt)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-7xl font-black text-green-700 leading-none tabular-nums">
              {data.accidentFreeDaysGlobal ?? "∞"}
            </div>
            <p className="mt-2 text-sm text-green-600 font-medium">Tage ohne meldepflichtigen Arbeitsunfall</p>
            {data.lastAccidentDateGlobal ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Letzter Unfall: {formatDate(data.lastAccidentDateGlobal)}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Kein meldepflichtiger Unfall erfasst</p>
            )}
          </CardContent>
        </Card>

        {/* Year reportable breakdown */}
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide">
              Meldepflichtige Vorfälle {selectedYear}
            </CardTitle>
            <CardDescription>Aufschlüsselung nach DGUV-Kategorien</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {reportableCategories.map((cat) => (
              <div key={cat.label} className="flex items-center justify-between py-1 border-b last:border-0">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-sm font-medium truncate">{cat.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                </div>
                <Badge
                  variant={cat.count > 0 ? "destructive" : "secondary"}
                  className="shrink-0 min-w-[2rem] justify-center"
                >
                  {cat.count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* TEUR rate */}
        <Card className="col-span-1 border-2 border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 uppercase tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4" />
              Unfälle je 1.000 Mitarbeiter
            </CardTitle>
            <CardDescription className="text-orange-600/80">Tausend-Mitarbeiter-Quote (TEUR)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black text-orange-700 tabular-nums">{data.teurRate}</div>
            <p className="mt-2 text-sm text-orange-600">
              Basis: {data.reportableTotal} Unfälle / {data.totalEmployees} Mitarbeiter
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Zeitraum: 01.01.{selectedYear} – 31.12.{selectedYear}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Department table ── */}
      {data.departments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Auswertung nach Abteilung
            </CardTitle>
            <CardDescription>Unfallfreie Tage, meldepflichtige Vorfälle und TEUR-Quote pro Abteilung</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
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
                  {data.departments.map((dept) => (
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
