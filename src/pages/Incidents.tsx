import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useRealtimeRefetch } from "@/hooks/useRealtimeRefetch";
import {
  ArrowLeft,
  Plus,
  Search,
  AlertCircle,
  AlertTriangle,
  Activity,
  CheckCircle,
  Edit,
  Trash2,
  Eye,
  Filter,
  FileText,
  Calendar as CalendarIcon,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { format } from "date-fns";

interface Incident {
  id: string;
  incident_number: string;
  title: string;
  description: string | null;
  incident_type:
  | "injury"
  | "near_miss"
  | "property_damage"
  | "environmental"
  | "other";
  severity: "minor" | "moderate" | "serious" | "critical" | "fatal";
  incident_date: string;
  location: string | null;
  department_id: string | null;
  affected_employee_id: string | null;
  reported_by_id: string | null;
  root_cause: string | null;
  immediate_actions: string | null;
  investigation_status: string;
  investigation_completed_date: string | null;
  is_reportable?: boolean;
  created_at: string;
  updated_at: string;
  affected_employee?: { full_name: string };
  reported_by?: { full_name: string };
  department?: { name: string };
}

interface Employee {
  id: string;
  full_name: string;
}

interface Department {
  id: string;
  name: string;
}

type IncidentSortKey =
  | "title"
  | "incident_type"
  | "severity"
  | "incident_date"
  | "investigation_status";

export default function Incidents() {
  const { user, companyId, loading } = useAuth();
  const { hasDetailedPermission } = usePermissions();
  const canManageIncidents = hasDetailedPermission("incidents", "create_edit");
  const canDeleteIncidents = hasDetailedPermission("incidents", "delete");
  const canManageMeasures = hasDetailedPermission("measures", "create_edit");

  // Firmenweite Berechtigung (Admin/Sicherheitsbeauftragter) ODER man ist der
  // disziplinarische Leiter der Abteilung dieses Vorfalls.
  const canCreateMeasureForIncident = (incident: any): boolean => {
    if (canManageMeasures) return true;
    const deptId = incident?.department_id;
    if (!deptId) return false;
    return departmentManagers.some((dm) => dm.department_id === deptId && dm.manager_user_id === user?.id);
  };
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingIncident, setViewingIncident] = useState<Incident | null>(null);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [sortKey, setSortKey] = useState<IncidentSortKey>("incident_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [statusHistory, setStatusHistory] = useState<any[]>([]); // kept for audit trail, not displayed

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    incident_type: "near_miss" as
      | "injury"
      | "near_miss"
      | "property_damage"
      | "environmental"
      | "other",
    severity: "minor" as
      | "minor"
      | "moderate"
      | "serious"
      | "critical"
      | "fatal",
    incident_date: "",
    location: "",
    department_id: "",
    affected_employee_id: "",
    reported_by_id: "",
    root_cause: "",
    immediate_actions: "",
    investigation_status: "open",
    is_reportable: false,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (companyId) {
      fetchIncidents();
      fetchEmployees();
      fetchDepartments();
      fetchDepartmentManagers();
    }
  }, [companyId]);

  const fetchStatusHistory = async (incidentId: string) => {
    const { data } = await supabase
      .from("incident_status_history" as any)
      .select("*")
      .eq("incident_id", incidentId)
      .order("changed_at", { ascending: false });
    setStatusHistory(data || []);
  };

  const fetchIncidents = async () => {
    if (!companyId) return;

    try {
      // PostgREST caps unranged selects at 1000 rows - loop until a page
      // comes back short, otherwise companies with >1000 incidents would
      // silently see only the newest 1000 with no error or indication.
      const PAGE_SIZE = 1000;
      const allRows: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("incidents" as any)
          .select(
            `
            *,
            affected_employee:employees!affected_employee_id(full_name),
            reported_by:employees!reported_by_id(full_name),
            department:departments(name)
          `
          )
          .eq("company_id", companyId)
          .order("incident_date", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        allRows.push(...((data as any) || []));
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      setIncidents(allRows);
    } catch (error: any) {
      console.error("Error fetching incidents:", error);
      toast({
        title: "Fehler",
        description: error.message || "Vorfälle konnten nicht geladen werden",
        variant: "destructive",
      });
    }
  };

  // Echtzeit-Sync: Vorfälle
  useRealtimeRefetch(["incidents"], companyId, fetchIncidents);

  // Für Abteilungs-Scoping bei "Korrekturmaßnahme erstellen": disziplinarische
  // Abteilungsleiter dürfen das auch ohne firmenweite measures-Berechtigung.
  const [departmentManagers, setDepartmentManagers] = useState<any[]>([]);
  const fetchDepartmentManagers = async () => {
    if (!companyId) return;
    const { data } = await (supabase as any)
      .from("department_managers")
      .select("department_id, manager_user_id")
      .eq("company_id", companyId)
      .eq("manager_type", "disciplinary");
    setDepartmentManagers(data || []);
  };

  const fetchEmployees = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchDepartments = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error("Error fetching departments:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      const incidentData = {
        company_id: companyId,
        title: formData.title,
        description: formData.description || null,
        incident_type: formData.incident_type,
        severity: formData.severity,
        incident_date: formData.incident_date
          ? new Date(formData.incident_date).toISOString()
          : new Date().toISOString(),
        location: formData.location || null,
        department_id:
          formData.department_id === "none"
            ? null
            : formData.department_id || null,
        affected_employee_id:
          formData.affected_employee_id === "none"
            ? null
            : formData.affected_employee_id || null,
        reported_by_id:
          formData.reported_by_id === "none"
            ? null
            : formData.reported_by_id || null,
        root_cause: formData.root_cause || null,
        immediate_actions: formData.immediate_actions || null,
        investigation_status: formData.investigation_status,
        is_reportable: formData.is_reportable || false,
      };

      if (editingIncident) {
        const { error } = await (supabase as any)
          .from("incidents")
          .update(incidentData)
          .eq("id", editingIncident.id);

        if (error) throw error;

        // Log incident update (using direct RPC like login)
        try {
          await supabase.rpc("create_audit_log", {
            p_action_type: "update_incident",
            p_target_type: "incident",
            p_target_id: editingIncident.id,
            p_target_name: formData.title,
            p_details: {
              severity: formData.severity,
              type: formData.incident_type,
              status: formData.investigation_status
            },
            p_company_id: companyId,
          });
          console.log("✅ Incident update log created:", formData.title);
        } catch (auditLogErr) {
          console.error("❌ Failed to create incident update log:", auditLogErr);
        }

        toast({
          title: "Gespeichert",
          description: "Vorfall wurde aktualisiert",
        });
      } else {
        const { data: newIncident, error } = await supabase
          .from("incidents" as any)
          .insert(incidentData as any)
          .select()
          .single();

        if (error) throw error;

        // Log incident creation
        console.log("🔵 [INCIDENT LOG] Starting audit log creation...");
        console.log("🔵 [INCIDENT LOG] Parameters:", {
          incident_id: newIncident?.id,
          incident_title: formData.title,
          company_id: companyId,
          severity: formData.severity
        });
        
        try {
          const { data: logResult, error: logError } = await supabase.rpc("create_audit_log", {
            p_action_type: "create_incident",
            p_target_type: "incident",
            p_target_id: newIncident?.id,
            p_target_name: formData.title,
            p_details: {
              severity: formData.severity,
              type: formData.incident_type
            },
            p_company_id: companyId,
          });
          
          if (logError) {
            console.error("❌ [INCIDENT LOG] RPC Error:", logError);
          } else {
            console.log("✅ [INCIDENT LOG] Created! Log ID:", logResult);
            
            // Verify the log was created
            const { data: verifyLog } = await supabase
              .from("audit_logs")
              .select("*")
              .eq("id", logResult)
              .single();
            console.log("🔍 [INCIDENT LOG] Verification:", verifyLog);
          }
        } catch (auditLogErr) {
          console.error("❌ [INCIDENT LOG] Exception:", auditLogErr);
        }

        toast({
          title: "Erstellt",
          description: "Vorfall wurde gemeldet",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchIncidents();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Vorfall konnte nicht gespeichert werden",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Vorfall wirklich löschen?")) return;

    try {
      const { error } = await supabase
        .from("incidents" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;

      // Log incident deletion (using direct RPC like login)
      try {
        await supabase.rpc("create_audit_log", {
          p_action_type: "delete_incident",
          p_target_type: "incident",
          p_target_id: id,
          p_target_name: "Incident",
          p_details: { id },
          p_company_id: companyId,
        });
        console.log("✅ Incident deletion log created");
      } catch (auditLogErr) {
        console.error("❌ Failed to create incident deletion log:", auditLogErr);
      }

      toast({ title: "Gelöscht", description: "Vorfall wurde gelöscht" });
      fetchIncidents();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Vorfall konnte nicht gelöscht werden",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (incident: Incident, newStatus: string) => {
    try {
      const updateData: any = {
        investigation_status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === "closed") {
        updateData.investigation_completed_date = new Date().toISOString().split("T")[0];
      } else {
        updateData.investigation_completed_date = null;
      }

      const { error } = await supabase
        .from("incidents" as any)
        .update(updateData)
        .eq("id", incident.id);

      if (error) throw error;

      // Statuswechsel in History schreiben
      await supabase.from("incident_status_history" as any).insert({
        incident_id: incident.id,
        old_status: incident.investigation_status,
        new_status: newStatus,
        changed_by: user?.id,
        company_id: companyId,
      });

      // Lokalen State direkt updaten
      setIncidents((prev) =>
        prev.map((i) =>
          i.id === incident.id ? { ...i, ...updateData } : i
        )
      );
      if (viewingIncident?.id === incident.id) {
        setViewingIncident((prev) => prev ? { ...prev, ...updateData } : null);
      }

      const statusLabels: Record<string, string> = {
        open: "Offen",
        in_progress: "In Bearbeitung",
        closed: "Abgeschlossen",
      };
      toast({
        title: "Status geändert",
        description: `Vorfall ist jetzt: ${statusLabels[newStatus] || newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Status konnte nicht geändert werden",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (incident: Incident) => {
    setEditingIncident(incident);
    setFormData({
      title: incident.title,
      description: incident.description || "",
      incident_type: incident.incident_type,
      severity: incident.severity,
      incident_date: incident.incident_date
        ? incident.incident_date.split("T")[0]
        : "",
      location: incident.location || "",
      department_id: incident.department_id || "none",
      affected_employee_id: incident.affected_employee_id || "none",
      reported_by_id: incident.reported_by_id || "none",
      root_cause: incident.root_cause || "",
      immediate_actions: incident.immediate_actions || "",
      investigation_status: incident.investigation_status,
      is_reportable: incident.is_reportable || false,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      incident_type: "near_miss",
      severity: "minor",
      incident_date: "",
      location: "",
      department_id: "none",
      affected_employee_id: "none",
      reported_by_id: "none",
      root_cause: "",
      immediate_actions: "",
      investigation_status: "open",
      is_reportable: false,
    });
    setEditingIncident(null);
  };

  const getSeverityBadge = (severity: string, clickable = false) => {
    const config: Record<string, { className: string; icon: any }> = {
      minor: { className: "bg-blue-100 text-blue-800", icon: AlertCircle },
      moderate: {
        className: "bg-yellow-100 text-yellow-800",
        icon: AlertCircle,
      },
      serious: {
        className: "bg-orange-100 text-orange-800",
        icon: AlertTriangle,
      },
      critical: { className: "bg-red-100 text-red-800", icon: AlertTriangle },
      fatal: { className: "bg-red-600 text-white", icon: AlertTriangle },
    };
    const { className, icon: Icon } = config[severity] || config.minor;
    return (
      <Badge
        className={`${className} ${clickable ? "cursor-pointer hover:opacity-80" : ""}`}
        onClick={clickable ? () => setFilterSeverity((prev) => (prev === severity ? "all" : severity)) : undefined}
        title={clickable ? "Klicken zum Filtern nach Schweregrad" : undefined}
      >
        <Icon className="w-3 h-3 mr-1" />
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  const getTypeBadge = (type: string, clickable = false) => {
    const colors: Record<string, string> = {
      injury: "bg-red-100 text-red-800",
      near_miss: "bg-yellow-100 text-yellow-800",
      property_damage: "bg-purple-100 text-purple-800",
      environmental: "bg-green-100 text-green-800",
      other: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge
        className={`${colors[type] || colors.other} ${clickable ? "cursor-pointer hover:opacity-80" : ""}`}
        onClick={clickable ? () => setFilterType((prev) => (prev === type ? "all" : type)) : undefined}
        title={clickable ? "Klicken zum Filtern nach Typ" : undefined}
      >
        {type.replace("_", " ").charAt(0).toUpperCase() +
          type.replace("_", " ").slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string, clickable = false) => {
    const isClosed = status === "closed";
    return (
      <Badge
        variant={isClosed ? "outline" : "default"}
        className={clickable ? "cursor-pointer hover:opacity-80" : ""}
        onClick={
          clickable
            ? () => setFilterStatus((prev) => (prev === status ? "all" : status))
            : undefined
        }
        title={clickable ? "Klicken zum Filtern nach Status" : undefined}
      >
        {status}
      </Badge>
    );
  };

  const getEscalationLevel = (incident: any): { level: number; label: string; color: string } | null => {
    if (incident.investigation_status === "closed") return null;
    if (!incident.incident_date) return null;

    // Normalize both sides to local midnight - otherwise Date.now() (current
    // time-of-day) vs. a date-only incident_date (UTC midnight) shifts
    // daysPast by 1 depending on timezone/time of day.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const incidentDay = new Date(incident.incident_date);
    incidentDay.setHours(0, 0, 0, 0);
    const daysPast = Math.floor((today.getTime() - incidentDay.getTime()) / (1000 * 60 * 60 * 24));

    if (daysPast <= 0) return null;
    if (daysPast <= 7)  return { level: 1, label: `${daysPast}T überfällig`, color: "bg-yellow-100 text-yellow-800 border-yellow-200" };
    if (daysPast <= 30) return { level: 2, label: `${daysPast}T überfällig`, color: "bg-orange-100 text-orange-800 border-orange-200" };
    return { level: 3, label: `${daysPast}T überfällig`, color: "bg-red-100 text-red-800 border-red-200" };
  };

  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      incident.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === "all" || incident.incident_type === filterType;
    const matchesSeverity =
      filterSeverity === "all" || incident.severity === filterSeverity;
    const matchesStatus =
      filterStatus === "all" || incident.investigation_status === filterStatus;
    return matchesSearch && matchesType && matchesSeverity && matchesStatus;
  });

  const handleSort = (key: IncidentSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedIncidents = [...filteredIncidents].sort((a, b) => {
    const severityOrder: Record<string, number> = {
      minor: 1,
      moderate: 2,
      serious: 3,
      critical: 4,
      fatal: 5,
    };

    let comparison = 0;
    switch (sortKey) {
      case "title":
        comparison = a.title.localeCompare(b.title, undefined, {
          sensitivity: "base",
        });
        break;
      case "incident_type":
        comparison = a.incident_type.localeCompare(b.incident_type, undefined, {
          sensitivity: "base",
        });
        break;
      case "severity":
        comparison =
          (severityOrder[a.severity] || 0) - (severityOrder[b.severity] || 0);
        break;
      case "incident_date":
        comparison =
          new Date(a.incident_date).getTime() -
          new Date(b.incident_date).getTime();
        break;
      case "investigation_status":
        comparison = a.investigation_status.localeCompare(
          b.investigation_status,
          undefined,
          { sensitivity: "base" }
        );
        break;
      default:
        comparison = 0;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const sortIconFor = (key: IncidentSortKey) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3" />
    ) : (
      <ArrowDown className="w-3 h-3" />
    );
  };

  const exportIncidentPDF = (incident: Incident) => {
    const doc = new jsPDF();

    const typeLabels: Record<string, string> = {
      injury: "Verletzung",
      near_miss: "Beinahe-Unfall",
      property_damage: "Sachschaden",
      environmental: "Umweltvorfall",
      other: "Sonstiges",
    };
    const severityLabels: Record<string, string> = {
      minor: "Gering",
      moderate: "Mäßig",
      serious: "Schwer",
      critical: "Kritisch",
      fatal: "Fatal",
    };
    const statusLabels: Record<string, string> = {
      open: "Offen",
      in_progress: "In Bearbeitung",
      closed: "Abgeschlossen",
    };

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Vorfallbericht", 14, 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Erstellt am: ${format(new Date(), "dd.MM.yyyy")}`, 14, 30);
    if (incident.incident_number) {
      doc.text(`Vorfallsnr.: ${incident.incident_number}`, 14, 36);
    }
    doc.setTextColor(0);

    // Detail-Tabelle (2 Spalten: Label | Wert)
    const rows: [string, string][] = [
      ["Titel", incident.title],
      ["Datum", format(new Date(incident.incident_date), "dd.MM.yyyy")],
      ["Typ", typeLabels[incident.incident_type] || incident.incident_type],
      ["Schweregrad", severityLabels[incident.severity] || incident.severity],
      ["Status", statusLabels[incident.investigation_status] || incident.investigation_status],
      ["Ort", incident.location || "–"],
      ["Abteilung", incident.department?.name || "–"],
      ["Betroffene Person", incident.affected_employee?.full_name || "–"],
      ["Gemeldet von", incident.reported_by?.full_name || "–"],
      ["Beschreibung", incident.description || "–"],
      ["Sofortmaßnahmen", incident.immediate_actions || "–"],
      ["Ursache / Root Cause", incident.root_cause || "–"],
    ];

    autoTable(doc, {
      head: [["Bezeichnung", "Details"]],
      body: rows,
      startY: incident.incident_number ? 42 : 36,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 52 },
        1: { cellWidth: "auto" },
      },
    });

    const filename = `vorfall_${incident.incident_number || incident.id.slice(0, 8)}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
    doc.save(filename);
    toast({ title: "Gespeichert", description: "PDF wurde exportiert" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back")}
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold"><span>{t("incidents.title")}</span></h2>
              <p className="text-muted-foreground">
                <span>{t("incidents.description")}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white overflow-hidden relative group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
          <CardContent className="pt-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80 font-medium uppercase tracking-wide">
                  {t("incidents.total")}
                </p>
                <p className="text-4xl font-bold mt-2"><span>{incidents.length}</span></p>
              </div>
              <Activity className="w-10 h-10 text-white/80" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white overflow-hidden relative group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
          <CardContent className="pt-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80 font-medium uppercase tracking-wide">
                  {t("incidents.injuries")}
                </p>
                <p className="text-4xl font-bold mt-2">
                  <span>{incidents.filter((i) => i.incident_type === "injury").length}</span>
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-white/80" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 text-white overflow-hidden relative group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
          <CardContent className="pt-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80 font-medium uppercase tracking-wide">
                  {t("incidents.nearMisses")}
                </p>
                <p className="text-4xl font-bold mt-2">
                  <span>{
                    incidents.filter((i) => i.incident_type === "near_miss")
                      .length
                  }</span>
                </p>
              </div>
              <AlertCircle className="w-10 h-10 text-white/80" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 text-white overflow-hidden relative group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
          <CardContent className="pt-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80 font-medium uppercase tracking-wide">
                  {t("incidents.underInvestigation")}
                </p>
                <p className="text-4xl font-bold mt-2">
                  <span>{
                    incidents.filter((i) => i.investigation_status === "open")
                      .length
                  }</span>
                </p>
              </div>
              <Eye className="w-10 h-10 text-white/80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  <span>{t("incidents.reports")}</span>
                </CardTitle>
                <CardDescription><span>{t("incidents.reportsDesc")}</span></CardDescription>
              </div>
            </div>
            <Dialog open={isDialogOpen && canManageIncidents} onOpenChange={setIsDialogOpen}>
              {canManageIncidents && (
              <DialogTrigger asChild>
                <Button data-testid="btn-add-incident" onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("incidents.reportIncident")}
                </Button>
              </DialogTrigger>
              )}
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    <span>
                      {editingIncident
                        ? t("incidents.editIncident")
                        : t("incidents.reportNew")}
                    </span>
                  </DialogTitle>
                  <DialogDescription>
                    {t("incidents.documentDesc")}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title">
                      {t("incidents.incidentTitle")} *
                    </Label>
                    <Input
                      id="title"
                      data-testid="incident-form-title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder={t("incidents.titlePlaceholder")}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="type">{t("incidents.type")} *</Label>
                      <Select
                        value={formData.incident_type}
                        onValueChange={(value: any) =>
                          setFormData({ ...formData, incident_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="injury">
                            {t("incidents.injury")}
                          </SelectItem>
                          <SelectItem value="near_miss">
                            {t("incidents.nearMiss")}
                          </SelectItem>
                          <SelectItem value="property_damage">
                            {t("incidents.propertyDamage")}
                          </SelectItem>
                          <SelectItem value="environmental">
                            {t("incidents.environmental")}
                          </SelectItem>
                          <SelectItem value="other">
                            {t("incidents.other")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="severity">
                        {t("incidents.severity")} *
                      </Label>
                      <Select
                        value={formData.severity}
                        onValueChange={(value: any) =>
                          setFormData({ ...formData, severity: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minor">
                            {t("incidents.minor")}
                          </SelectItem>
                          <SelectItem value="moderate">
                            {t("incidents.moderate")}
                          </SelectItem>
                          <SelectItem value="serious">
                            {t("incidents.serious")}
                          </SelectItem>
                          <SelectItem value="critical">
                            {t("incidents.critical")}
                          </SelectItem>
                          <SelectItem value="fatal">
                            {t("incidents.fatal")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="incident_date">
                        {t("incidents.date")} *
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!formData.incident_date && "text-muted-foreground"}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.incident_date ? (
                                format(new Date(formData.incident_date), "PPP")
                              ) : (
                                <span>{t("common.pickDate")}</span>
                              )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.incident_date ? new Date(formData.incident_date) : undefined}
                            onSelect={(date) =>
                              setFormData({
                                ...formData,
                                incident_date: date ? format(date, "yyyy-MM-dd") : "",
                              })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 py-2">
                    <Switch
                      id="is_reportable"
                      checked={formData.is_reportable || false}
                      onCheckedChange={(v) => setFormData(prev => ({...prev, is_reportable: v}))}
                    />
                    <label htmlFor="is_reportable" className="text-sm font-medium cursor-pointer">
                      <span>Meldepflichtig</span>
                      <span className="block text-xs text-muted-foreground">§ 193 SGB VII / DGUV – meldepflichtiger Arbeitsunfall</span>
                    </label>
                  </div>

                  <div>
                    <Label htmlFor="description">
                      {t("incidents.description")}
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder={t("incidents.descriptionPlaceholder")}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">
                        {t("incidents.location")}
                      </Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                        placeholder={t("incidents.locationPlaceholder")}
                      />
                    </div>

                    <div>
                      <Label htmlFor="department">
                        {t("incidents.department")}
                      </Label>
                      <Select
                        value={formData.department_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, department_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("incidents.selectDepartment")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="affected">
                        {t("incidents.affectedEmployee")}
                      </Label>
                      <Select
                        value={formData.affected_employee_id}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            affected_employee_id: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("incidents.selectEmployee")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {t("common.none")}
                          </SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="reported_by">
                        {t("incidents.reportedBy")}
                      </Label>
                      <Select
                        value={formData.reported_by_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, reported_by_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("incidents.selectEmployee")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="immediate_actions">
                      {t("incidents.immediateActions")}
                    </Label>
                    <Textarea
                      id="immediate_actions"
                      value={formData.immediate_actions}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          immediate_actions: e.target.value,
                        })
                      }
                      placeholder={t("incidents.immediateActionsPlaceholder")}
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="root_cause">
                      {t("incidents.rootCause")}
                    </Label>
                    <Textarea
                      id="root_cause"
                      value={formData.root_cause}
                      onChange={(e) =>
                        setFormData({ ...formData, root_cause: e.target.value })
                      }
                      placeholder={t("incidents.rootCausePlaceholder")}
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="investigation_status">
                      {t("incidents.investigationStatus")}
                    </Label>
                    <Select
                      value={formData.investigation_status}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          investigation_status: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">
                          {t("incidents.open")}
                        </SelectItem>
                        <SelectItem value="in_progress">
                          {t("incidents.inProgress")}
                        </SelectItem>
                        <SelectItem value="closed">
                          {t("incidents.closed")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" data-testid="incident-form-submit">
                      <span>
                        {editingIncident
                          ? t("common.update")
                          : t("incidents.report")}
                      </span>{" "}
                      <span>{t("incidents.incident")}</span>
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog
              open={Boolean(viewingIncident)}
              onOpenChange={(open) => {
                if (!open) { setViewingIncident(null); setStatusHistory([]); }
              }}
            >
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Vorfalldetails</DialogTitle>
                  <DialogDescription>
                    Detaillierte Informationen zu diesem Vorfallbericht.
                  </DialogDescription>
                </DialogHeader>

                {viewingIncident && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Titel</p>
                        <p className="font-medium">{viewingIncident.title}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Vorfallnummer</p>
                        <p className="font-medium">
                          {viewingIncident.incident_number || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Typ</p>
                        <div>{getTypeBadge(viewingIncident.incident_type)}</div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Schweregrad</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getSeverityBadge(viewingIncident.severity)}
                          {viewingIncident.is_reportable && (
                            <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-xs">
                              Meldepflichtig
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Datum</p>
                        <p className="font-medium">
                          {format(new Date(viewingIncident.incident_date), "dd.MM.yyyy")}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(viewingIncident.investigation_status)}
                          {(() => { const esc = getEscalationLevel(viewingIncident); return esc ? (
                            <span className={`text-xs px-2 py-1 rounded border font-medium ${esc.color}`}>{esc.label}</span>
                          ) : null; })()}
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ort</p>
                        <p className="font-medium">{viewingIncident.location || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Abteilung</p>
                        <p className="font-medium">
                          {viewingIncident.department?.name || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Betroffene Person</p>
                        <p className="font-medium">
                          {viewingIncident.affected_employee?.full_name || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gemeldet von</p>
                        <p className="font-medium">
                          {viewingIncident.reported_by?.full_name || "-"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Beschreibung</p>
                      <p className="text-sm border rounded-md p-3 bg-muted/20">
                        {viewingIncident.description || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Sofortmaßnahmen</p>
                      <p className="text-sm border rounded-md p-3 bg-muted/20">
                        {viewingIncident.immediate_actions || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Ursache</p>
                      <p className="text-sm border rounded-md p-3 bg-muted/20">
                        {viewingIncident.root_cause || "-"}
                      </p>
                    </div>
                    {/* Workflow-Status-Buttons */}
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg border">
                      <span className="text-xs text-muted-foreground font-medium mr-1">Workflow:</span>
                      {viewingIncident.investigation_status === "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                          onClick={() => handleStatusChange(viewingIncident, "in_progress")}
                        >
                          <Activity className="w-3.5 h-3.5 mr-1.5" />
                          Untersuchung starten
                        </Button>
                      )}
                      {viewingIncident.investigation_status === "in_progress" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleStatusChange(viewingIncident, "closed")}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            Abschließen
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(viewingIncident, "open")}
                          >
                            Zurück zu Offen
                          </Button>
                        </>
                      )}
                      {viewingIncident.investigation_status === "closed" && (
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Abgeschlossen
                            {viewingIncident.investigation_completed_date && (
                              <span className="text-muted-foreground">
                                am {format(new Date(viewingIncident.investigation_completed_date), "dd.MM.yyyy")}
                              </span>
                            )}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(viewingIncident, "open")}
                          >
                            Wieder öffnen
                          </Button>
                        </div>
                      )}
                    </div>


                    <div className="flex justify-between items-center pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportIncidentPDF(viewingIncident)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        PDF exportieren
                      </Button>
                      {canCreateMeasureForIncident(viewingIncident) && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setViewingIncident(null);
                          navigate(`/measures?incident_id=${viewingIncident.id}&incident_title=${encodeURIComponent(viewingIncident.title)}`);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Korrekturmaßnahme erstellen
                      </Button>
                      )}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Suche & Filter</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Tipp: Auf einen Wert in den Spalten Typ, Schwere oder Status klicken, um schnell zu filtern.
            </p>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder={t("incidents.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 border-2 focus:border-primary transition-colors"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("incidents.filterByType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("incidents.allTypes")}</SelectItem>
                  <SelectItem value="injury">
                    {t("incidents.injury")}
                  </SelectItem>
                  <SelectItem value="near_miss">
                    {t("incidents.nearMiss")}
                  </SelectItem>
                  <SelectItem value="property_damage">
                    {t("incidents.propertyDamage")}
                  </SelectItem>
                  <SelectItem value="environmental">
                    {t("incidents.environmental")}
                  </SelectItem>
                  <SelectItem value="other">{t("incidents.other")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("incidents.filterBySeverity")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("incidents.allSeverities")}
                  </SelectItem>
                  <SelectItem value="minor">{t("incidents.minor")}</SelectItem>
                  <SelectItem value="moderate">
                    {t("incidents.moderate")}
                  </SelectItem>
                  <SelectItem value="serious">
                    {t("incidents.serious")}
                  </SelectItem>
                  <SelectItem value="critical">
                    {t("incidents.critical")}
                  </SelectItem>
                  <SelectItem value="fatal">{t("incidents.fatal")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort("title")}
                    >
                      Titel {sortIconFor("title")}
                    </Button>
                  </TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Schweregrad</TableHead>
                  <TableHead>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort("incident_date")}
                    >
                      Datum {sortIconFor("incident_date")}
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center">
                        <AlertTriangle className="w-16 h-16 text-muted-foreground/20 mb-4" />
                        <p className="text-lg font-medium text-muted-foreground mb-1">
                          Keine Vorfälle gefunden
                        </p>
                        <p className="text-sm text-muted-foreground/60">
                          Erfassen Sie einen Vorfall, um zu beginnen
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedIncidents.map((incident) => (
                    <TableRow
                      key={incident.id}
                      data-testid={`incident-row-${incident.id}`}
                      className="hover:bg-muted/70 transition-all duration-200 border-b border-border/50 hover:shadow-sm group"
                    >

                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {incident.title}
                            {(() => { const esc = getEscalationLevel(incident); return esc ? (
                              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${esc.color}`}>{esc.label}</span>
                            ) : null; })()}
                          </div>
                          {incident.affected_employee && (
                            <div className="text-sm text-muted-foreground">
                              {t("incidents.affected")}:{" "}
                              {incident.affected_employee.full_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(incident.incident_type, true)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getSeverityBadge(incident.severity, true)}
                          {incident.is_reportable && (
                            <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-xs">
                              Meldepflichtig
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(
                          new Date(incident.incident_date),
                          "MMM dd, yyyy"
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(incident.investigation_status, true)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setViewingIncident(incident); fetchStatusHistory(incident.id); }}
                            title="Details anzeigen"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canManageIncidents && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(incident)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          )}
                          {canDeleteIncidents && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(incident.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div >
  );
}
