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
  rawFilterValue: string;
  displayFilterValue: string;
}

const VALUE_LABELS: Record<string, string> = {
  open: "Offen", closed: "Geschlossen", completed: "Abgeschlossen",
  in_progress: "In Bearbeitung", pending: "Ausstehend",
  under_investigation: "Unter Untersuchung", resolved: "Gelöst",
  draft: "Entwurf", scheduled: "Geplant", active: "Aktiv",
  not_applicable: "Nicht zutreffend", cancelled: "Abgebrochen",
  low: "Niedrig", medium: "Mittel", high: "Hoch", critical: "Kritisch",
  other: "Sonstige", unknown: "Unbekannt",
};

const label = (v: string | null | undefined) => (v ? (VALUE_LABELS[v] ?? v) : "—");

const formatDate = (v: string | null | undefined) => {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("de-DE"); } catch { return v; }
};

function calcDateRange(dateRange: ReportConfig["dateRange"]) {
  const end = new Date();
  let start = new Date();
  switch (dateRange?.type) {
    case "custom":
      return { start: dateRange.startDate ?? start.toISOString(), end: dateRange.endDate ?? end.toISOString() };
    case "last_7_days": start.setDate(end.getDate() - 7); break;
    case "last_30_days": start.setDate(end.getDate() - 30); break;
    case "last_90_days": start.setDate(end.getDate() - 90); break;
    case "last_6_months": start.setMonth(end.getMonth() - 6); break;
    case "last_12_months": start.setFullYear(end.getFullYear() - 1); break;
    case "this_month": start = new Date(end.getFullYear(), end.getMonth(), 1); break;
    case "last_month": start = new Date(end.getFullYear(), end.getMonth() - 1, 1); end.setDate(0); break;
    case "this_year": start = new Date(end.getFullYear(), 0, 1); break;
    case "last_year": start = new Date(end.getFullYear() - 1, 0, 1); end.setFullYear(end.getFullYear() - 1, 11, 31); break;
    default: start.setFullYear(end.getFullYear() - 10);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

// Time-based groupBys — no group filter, just date range
const TIME_GROUP_BYS = ["created_at", "incident_date", "assessment_date", "scheduled_date", "month", "week"];

export default function DrillDownModal({ isOpen, onClose, config, rawFilterValue, displayFilterValue }: DrillDownModalProps) {
  const { companyId } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !companyId) return;
    load();
  }, [isOpen, companyId, config, rawFilterValue]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = calcDateRange(config.dateRange);
      const groupBy = config.groupBy || "";
      const isTimeGroup = TIME_GROUP_BYS.includes(groupBy);

      switch (config.metric) {
        case "incidents": {
          const dateCol = "incident_date";
          let q = supabase
            .from("incidents")
            .select("id, title, incident_date, investigation_status, incident_type, severity, location")
            .eq("company_id", companyId)
            .gte(dateCol, start).lte(dateCol, end);
          if (!isTimeGroup && rawFilterValue) {
            const col = groupBy === "category" ? "incident_type"
              : groupBy === "status" ? "investigation_status"
              : groupBy;
            q = (q as any).eq(col, rawFilterValue);
          }
          const { data, error: e } = await q.order("incident_date", { ascending: false }).limit(100);
          if (e) throw e;
          setRows(data || []);
          break;
        }

        case "employees": {
          let q = supabase
            .from("employees")
            .select("id, first_name, last_name, position, departments(name), created_at")
            .eq("company_id", companyId)
            .gte("created_at", start).lte("created_at", end);
          if (!isTimeGroup && rawFilterValue) {
            if (groupBy === "department") {
              // Two-step: look up department_id first
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
          const { data, error: e } = await q.order("created_at", { ascending: false }).limit(100);
          if (e) throw e;
          setRows(data || []);
          break;
        }

        case "audits": {
          let q = supabase
            .from("audits")
            .select("id, title, scheduled_date, status, iso_code")
            .eq("company_id", companyId)
            .gte("created_at", start).lte("created_at", end);
          if (!isTimeGroup && rawFilterValue) {
            const col = groupBy === "category" ? "audit_type" : groupBy || "status";
            q = (q as any).eq(col, rawFilterValue);
          }
          const { data, error: e } = await q.order("scheduled_date", { ascending: false }).limit(100);
          if (e) throw e;
          setRows(data || []);
          break;
        }

        case "risks": {
          const dateCol = "assessment_date";
          let q = supabase
            .from("risk_assessments")
            .select("id, title, risk_level, approval_status, assessment_date, departments(name)")
            .eq("company_id", companyId)
            .gte(dateCol, start).lte(dateCol, end);
          if (!isTimeGroup && rawFilterValue) {
            if (groupBy === "department") {
              const { data: depts } = await supabase
                .from("departments").select("id").eq("name", rawFilterValue).eq("company_id", companyId);
              const deptId = depts?.[0]?.id;
              if (deptId) q = (q as any).eq("department_id", deptId);
            } else {
              q = (q as any).eq(groupBy || "risk_level", rawFilterValue);
            }
          }
          const { data, error: e } = await q.order("assessment_date", { ascending: false }).limit(100);
          if (e) throw e;
          setRows(data || []);
          break;
        }

        case "measures": {
          let q = supabase
            .from("measures" as any)
            .select("id, title, status, due_date, created_at")
            .eq("company_id", companyId)
            .gte("created_at", start).lte("created_at", end);
          if (!isTimeGroup && rawFilterValue && groupBy !== "department") {
            q = (q as any).eq(groupBy || "status", rawFilterValue);
          }
          const { data, error: e } = await q.order("created_at", { ascending: false }).limit(100);
          if (e) throw e;
          setRows(data || []);
          break;
        }

        case "trainings": {
          let q = supabase
            .from("training_participations")
            .select("id, employee_id, employees(full_name), status, created_at")
            .eq("company_id", companyId)
            .gte("created_at", start).lte("created_at", end);
          if (!isTimeGroup && rawFilterValue && groupBy === "status") {
            q = (q as any).eq("status", rawFilterValue);
          }
          const { data, error: e } = await q.order("created_at", { ascending: false }).limit(100);
          if (e) throw e;
          setRows(data || []);
          break;
        }

        case "tasks": {
          let q = supabase
            .from("tasks" as any)
            .select("id, title, status, due_date, created_at")
            .eq("company_id", companyId)
            .gte("created_at", start).lte("created_at", end);
          if (!isTimeGroup && rawFilterValue) {
            q = (q as any).eq(groupBy || "status", rawFilterValue);
          }
          const { data, error: e } = await q.order("created_at", { ascending: false }).limit(100);
          if (e) throw e;
          setRows(data || []);
          break;
        }

        default:
          setRows([]);
      }
    } catch (e: any) {
      setError("Daten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    const metricLabel: Record<string, string> = {
      incidents: "Vorfälle", employees: "Mitarbeiter", audits: "Audits",
      risks: "Risikobewertungen", measures: "Maßnahmen", trainings: "Schulungen", tasks: "Aufgaben",
    };
    const m = metricLabel[config.metric] || config.metric;
    return `${m}: ${displayFilterValue}`;
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
          <tr key={row.id ?? i} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => { onClose(); navigate(`/employees/${row.id}`); }}>
            <td className="p-3 font-medium text-primary flex items-center gap-1">
              {`${row.first_name || ""} ${row.last_name || ""}`.trim() || "—"}
              <ExternalLink className="w-3 h-3 shrink-0" />
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

  const getHeaders = () => {
    switch (config.metric) {
      case "incidents": return ["Titel", "Datum", "Status", "Schweregrad", "Ort"];
      case "employees": return ["Name", "Abteilung", "Position"];
      case "audits": return ["Titel", "Geplant", "Status", "ISO-Code"];
      case "risks": return ["Titel", "Datum", "Risikoniveau", "Genehmigung"];
      case "measures": return ["Titel", "Fällig", "Status"];
      case "trainings": return ["Mitarbeiter", "Status", "Datum"];
      case "tasks": return ["Titel", "Fällig", "Status"];
      default: return ["Daten"];
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <p className="text-sm text-muted-foreground">{rows.length} Einträge</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive text-sm">{error}</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Keine Datensätze gefunden.</div>
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
