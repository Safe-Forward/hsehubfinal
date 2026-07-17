import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ReportConfig } from "./ReportBuilder";

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ReportConfig;
  rawFilterValue: string; // "" = alle Datensätze anzeigen
  displayFilterValue: string;
}

const VALUE_LABELS: Record<string, string> = {
  open: "Offen", closed: "Geschlossen", completed: "Abgeschlossen",
  in_progress: "In Bearbeitung", pending: "Ausstehend",
  under_investigation: "Unter Untersuchung", resolved: "Gelöst",
  draft: "Entwurf", scheduled: "Geplant", active: "Aktiv",
  planned: "Geplant", not_started: "Nicht gestartet",
  not_applicable: "Nicht zutreffend", cancelled: "Abgebrochen",
  low: "Niedrig", medium: "Mittel", high: "Hoch", critical: "Kritisch",
  other: "Sonstige", unknown: "Unbekannt",
};

const label = (v: string | null | undefined) => (v ? (VALUE_LABELS[v] ?? v) : "—");
const formatDate = (v: string | null | undefined) => {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("de-DE"); } catch { return v; }
};

// "YYYY-MM" → true
const isMonthKey = (v: string) => /^\d{4}-\d{2}$/.test(v);
const monthRange = (mk: string) => {
  const [y, m] = mk.split("-").map(Number);
  return {
    start: new Date(y, m - 1, 1).toISOString(),
    end: new Date(y, m, 1).toISOString(),
  };
};

// Maps combined display-status → risk_assessment_measures.progress_status values
const statusToProgress: Record<string, string[]> = {
  completed: ["completed", "done"],
  in_progress: ["in_progress"],
  planned: ["not_started", "pending"],
  cancelled: ["blocked"],
};
const progressToStatus: Record<string, string> = {
  not_started: "planned", pending: "planned", in_progress: "in_progress",
  blocked: "cancelled", completed: "completed", done: "completed",
};

export default function DrillDownModal({
  isOpen, onClose, config, rawFilterValue, displayFilterValue,
}: DrillDownModalProps) {
  const { companyId } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !companyId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, companyId, config.metric, config.groupBy, rawFilterValue]);

  const load = async () => {
    setLoading(true);
    setError(null);
    setRows([]);
    try {
      await fetchRows();
    } catch (e: any) {
      console.error("DrillDown error:", e);
      setError("Daten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRows = async () => {
    const groupBy = config.groupBy || "";
    const isMonth = isMonthKey(rawFilterValue);
    const hasFilter = !!rawFilterValue;

    switch (config.metric) {
      case "incidents": {
        let q = supabase
          .from("incidents")
          .select("id, title, incident_date, investigation_status, incident_type, severity, location")
          .eq("company_id", companyId)
          .order("incident_date", { ascending: false })
          .limit(200);

        if (hasFilter) {
          if (isMonth) {
            const { start, end } = monthRange(rawFilterValue);
            q = q.gte("incident_date", start).lt("incident_date", end);
          } else if (groupBy === "department") {
            const { data: depts } = await supabase
              .from("departments").select("id").eq("name", rawFilterValue).eq("company_id", companyId);
            const deptId = depts?.[0]?.id;
            if (deptId) q = (q as any).eq("department_id", deptId);
          } else if (groupBy === "location") {
            q = (q as any).eq("location", rawFilterValue);
          } else if (groupBy === "category" || groupBy === "incident_type") {
            q = (q as any).eq("incident_type", rawFilterValue);
          } else if (groupBy === "investigation_status" || groupBy === "status") {
            q = (q as any).eq("investigation_status", rawFilterValue);
          } else if (groupBy === "severity") {
            q = (q as any).eq("severity", rawFilterValue);
          } else if (groupBy) {
            q = (q as any).eq(groupBy, rawFilterValue);
          }
        }

        const { data, error: e } = await q;
        if (e) throw e;
        setRows(data || []);
        break;
      }

      case "employees": {
        let q = supabase
          .from("employees")
          .select("id, first_name, last_name, position, department_id, departments(name), created_at")
          .eq("company_id", companyId)
          .order("last_name", { ascending: true })
          .limit(200);

        if (hasFilter) {
          if (isMonth) {
            const { start, end } = monthRange(rawFilterValue);
            q = (q as any).gte("created_at", start).lt("created_at", end);
          } else if (groupBy === "department") {
            const { data: depts } = await supabase
              .from("departments").select("id").eq("name", rawFilterValue).eq("company_id", companyId);
            const deptId = depts?.[0]?.id;
            if (deptId) q = (q as any).eq("department_id", deptId);
          } else if (groupBy === "tag") {
            const tagFilter = rawFilterValue.includes(" ") || rawFilterValue.includes(",")
              ? `tags.cs.{"${rawFilterValue}"}` : `tags.cs.{${rawFilterValue}}`;
            q = (q as any).or(tagFilter);
          }
        }

        const { data, error: e } = await q;
        if (e) throw e;
        setRows(data || []);
        break;
      }

      case "audits": {
        const filterCol =
          groupBy === "category" ? "audit_type"
          : groupBy === "iso_code" ? "iso_code"
          : groupBy || "status";

        let q = supabase
          .from("audits")
          .select("id, title, scheduled_date, status, iso_code")
          .eq("company_id", companyId)
          .order("scheduled_date", { ascending: false })
          .limit(200);

        if (hasFilter) {
          if (isMonth) {
            const { start, end } = monthRange(rawFilterValue);
            q = (q as any).gte("created_at", start).lt("created_at", end);
          } else {
            q = (q as any).eq(filterCol, rawFilterValue);
          }
        }

        const { data, error: e } = await q;
        if (e) throw e;
        setRows(data || []);
        break;
      }

      case "risks": {
        let q = supabase
          .from("risk_assessments")
          .select("id, title, risk_level, approval_status, assessment_date, departments(name)")
          .eq("company_id", companyId)
          .order("assessment_date", { ascending: false })
          .limit(200);

        if (hasFilter) {
          if (isMonth) {
            const { start, end } = monthRange(rawFilterValue);
            q = (q as any).gte("assessment_date", start).lt("assessment_date", end);
          } else if (groupBy === "department") {
            const { data: depts } = await supabase
              .from("departments").select("id").eq("name", rawFilterValue).eq("company_id", companyId);
            const deptId = depts?.[0]?.id;
            if (deptId) q = (q as any).eq("department_id", deptId);
          } else {
            q = (q as any).eq(groupBy || "risk_level", rawFilterValue);
          }
        }

        const { data, error: e } = await q;
        if (e) throw e;
        setRows(data || []);
        break;
      }

      case "measures": {
        // Both measures AND risk_assessment_measures must be queried (Reports.tsx combines both)
        let mQ: any = supabase
          .from("measures" as any)
          .select("id, title, status, due_date, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(100);

        let ramQ: any = supabase
          .from("risk_assessment_measures" as any)
          .select("id, measure_building_block, progress_status, target_date, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (hasFilter) {
          if (isMonth) {
            const { start, end } = monthRange(rawFilterValue);
            mQ = mQ.gte("created_at", start).lt("created_at", end);
            ramQ = ramQ.gte("created_at", start).lt("created_at", end);
          } else if (groupBy === "department") {
            const { data: depts } = await supabase
              .from("departments").select("id").eq("name", rawFilterValue).eq("company_id", companyId);
            const deptId = depts?.[0]?.id;
            if (deptId) {
              const { data: emps } = await supabase
                .from("employees").select("id").eq("department_id", deptId).eq("company_id", companyId);
              const empIds = (emps || []).map((e: any) => e.id);
              if (empIds.length > 0) {
                mQ = mQ.in("responsible_person_id", empIds);
                ramQ = ramQ.in("responsible_person", empIds);
              } else {
                setRows([]);
                return;
              }
            }
          } else {
            // Status filter
            mQ = mQ.eq("status", rawFilterValue);
            const progressStatuses = statusToProgress[rawFilterValue] || [rawFilterValue];
            if (progressStatuses.length === 1) {
              ramQ = ramQ.eq("progress_status", progressStatuses[0]);
            } else {
              ramQ = ramQ.in("progress_status", progressStatuses);
            }
          }
        }

        const [mRes, ramRes] = await Promise.all([mQ, ramQ]);
        if (mRes.error) throw mRes.error;

        const mRows = (mRes.data || []).map((r: any) => ({
          id: r.id, title: r.title || "Maßnahme",
          status: r.status, due_date: r.due_date, source: "Maßnahme",
        }));
        const ramRows = (ramRes.data || []).map((r: any) => ({
          id: `ram_${r.id}`, title: r.measure_building_block || "GBU-Maßnahme",
          status: progressToStatus[r.progress_status] || r.progress_status,
          due_date: r.target_date, source: "GBU-Maßnahme",
        }));

        setRows([...mRows, ...ramRows].slice(0, 200));
        break;
      }

      case "trainings": {
        let q: any = supabase
          .from("training_participations")
          .select("id, employee_id, employees(full_name), status, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(200);

        if (hasFilter) {
          if (isMonth) {
            const { start, end } = monthRange(rawFilterValue);
            q = q.gte("created_at", start).lt("created_at", end);
          } else if (groupBy === "status") {
            q = q.eq("status", rawFilterValue);
          } else if (groupBy === "employee_id") {
            // rawFilterValue is employee full_name — look up id first
            const { data: emps } = await supabase
              .from("employees").select("id").eq("company_id", companyId)
              .ilike("full_name", rawFilterValue);
            const empId = emps?.[0]?.id;
            if (empId) q = q.eq("employee_id", empId);
          }
        }

        const { data, error: e } = await q;
        if (e) throw e;
        setRows(data || []);
        break;
      }

      case "checkups": {
        let q: any = supabase
          .from("health_checkups" as any)
          .select("id, status, employee_id, employees(full_name), created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(200);

        if (hasFilter) {
          if (isMonth) {
            const { start, end } = monthRange(rawFilterValue);
            q = q.gte("created_at", start).lt("created_at", end);
          } else if (groupBy === "status") {
            q = q.eq("status", rawFilterValue);
          }
        }

        const { data, error: e } = await q;
        if (e) throw e;
        setRows(data || []);
        break;
      }

      case "tasks": {
        let q: any = supabase
          .from("tasks" as any)
          .select("id, title, status, due_date, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(200);

        if (hasFilter) {
          if (isMonth) {
            const { start, end } = monthRange(rawFilterValue);
            q = q.gte("created_at", start).lt("created_at", end);
          } else {
            q = q.eq(groupBy || "status", rawFilterValue);
          }
        }

        const { data, error: e } = await q;
        if (e) throw e;
        setRows(data || []);
        break;
      }

      default:
        setRows([]);
    }
  };

  const getTitle = () => {
    const metricLabel: Record<string, string> = {
      incidents: "Vorfälle", employees: "Mitarbeiter", audits: "Audits",
      risks: "Risikobewertungen", measures: "Maßnahmen", trainings: "Schulungen",
      tasks: "Aufgaben", checkups: "Gesundheitschecks",
    };
    const m = metricLabel[config.metric] || config.metric;
    if (!rawFilterValue) return `Alle ${m}`;
    return `${m}: ${displayFilterValue}`;
  };

  const getHeaders = (): string[] => {
    switch (config.metric) {
      case "incidents": return ["Titel", "Datum", "Status", "Schweregrad", "Ort"];
      case "employees": return ["Name", "Abteilung", "Position"];
      case "audits": return ["Titel", "Geplant", "Status", "ISO-Code"];
      case "risks": return ["Titel", "Datum", "Risikoniveau", "Genehmigung"];
      case "measures": return ["Titel", "Fällig", "Status", "Typ"];
      case "trainings": return ["Mitarbeiter", "Status", "Datum"];
      case "checkups": return ["Mitarbeiter", "Status", "Datum"];
      case "tasks": return ["Titel", "Fällig", "Status"];
      default: return ["Daten"];
    }
  };

  const renderRow = (row: any, i: number) => {
    switch (config.metric) {
      case "incidents":
        return (
          <tr key={row.id ?? i} className="border-t hover:bg-muted/30">
            <td className="p-3 font-medium">{row.title || "—"}</td>
            <td className="p-3 text-muted-foreground">{formatDate(row.incident_date)}</td>
            <td className="p-3">{label(row.investigation_status)}</td>
            <td className="p-3">{label(row.severity)}</td>
            <td className="p-3 text-muted-foreground">{row.location || "—"}</td>
          </tr>
        );
      case "employees":
        return (
          <tr
            key={row.id ?? i}
            className="border-t hover:bg-muted/30 cursor-pointer"
            onClick={() => { onClose(); navigate(`/employees/${row.id}`); }}
          >
            <td className="p-3 font-medium text-primary">
              <span className="flex items-center gap-1">
                {`${row.first_name || ""} ${row.last_name || ""}`.trim() || "—"}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </span>
            </td>
            <td className="p-3 text-muted-foreground">{(row.departments as any)?.name || "—"}</td>
            <td className="p-3 text-muted-foreground">{row.position || "—"}</td>
          </tr>
        );
      case "audits":
        return (
          <tr key={row.id ?? i} className="border-t hover:bg-muted/30">
            <td className="p-3 font-medium">{row.title || "—"}</td>
            <td className="p-3 text-muted-foreground">{formatDate(row.scheduled_date)}</td>
            <td className="p-3">{label(row.status)}</td>
            <td className="p-3 text-muted-foreground">{row.iso_code || "—"}</td>
          </tr>
        );
      case "risks":
        return (
          <tr key={row.id ?? i} className="border-t hover:bg-muted/30">
            <td className="p-3 font-medium">{row.title || "—"}</td>
            <td className="p-3 text-muted-foreground">{formatDate(row.assessment_date)}</td>
            <td className="p-3">{label(row.risk_level)}</td>
            <td className="p-3">{label(row.approval_status)}</td>
          </tr>
        );
      case "measures":
        return (
          <tr key={row.id ?? i} className="border-t hover:bg-muted/30">
            <td className="p-3 font-medium">{row.title || "—"}</td>
            <td className="p-3 text-muted-foreground">{formatDate(row.due_date)}</td>
            <td className="p-3">{label(row.status)}</td>
            <td className="p-3 text-muted-foreground text-xs">{row.source || "—"}</td>
          </tr>
        );
      case "trainings":
        return (
          <tr key={row.id ?? i} className="border-t hover:bg-muted/30">
            <td className="p-3 font-medium">{(row.employees as any)?.full_name || "—"}</td>
            <td className="p-3">{label(row.status)}</td>
            <td className="p-3 text-muted-foreground">{formatDate(row.created_at)}</td>
          </tr>
        );
      case "checkups":
        return (
          <tr key={row.id ?? i} className="border-t hover:bg-muted/30">
            <td className="p-3 font-medium">{(row.employees as any)?.full_name || row.employee_id || "—"}</td>
            <td className="p-3">{label(row.status)}</td>
            <td className="p-3 text-muted-foreground">{formatDate(row.created_at)}</td>
          </tr>
        );
      case "tasks":
        return (
          <tr key={row.id ?? i} className="border-t hover:bg-muted/30">
            <td className="p-3 font-medium">{row.title || "—"}</td>
            <td className="p-3 text-muted-foreground">{formatDate(row.due_date)}</td>
            <td className="p-3">{label(row.status)}</td>
          </tr>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          {!loading && !error && (
            <p className="text-sm text-muted-foreground">{rows.length} Einträge</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive text-sm">{error}</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Keine Datensätze gefunden.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    {getHeaders().map((h) => (
                      <th key={h} className="text-left p-3 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => renderRow(row, i))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
