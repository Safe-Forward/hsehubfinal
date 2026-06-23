import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRealtimeRefetch } from "@/hooks/useRealtimeRefetch";
import {
  ArrowLeft,
  Plus,
  Search,
  CheckCircle,
  Clock,
  X,
  Edit,
  Trash2,
  FileDown,
  AlertTriangle,
  ShieldAlert,
  ClipboardCheck,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
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
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Measure {
  id: string;
  title: string;
  description: string | null;
  measure_type: "preventive" | "corrective" | "improvement";
  status: "planned" | "in_progress" | "completed" | "cancelled";
  responsible_person_id: string | null;
  due_date: string | null;
  completion_date: string | null;
  risk_assessment_id: string | null;
  audit_id: string | null;
  incident_id: string | null;
  verification_method: string | null;
  created_at: string;
  responsible_person?: {
    full_name: string;
  };
}

interface Employee {
  id: string;
  full_name: string;
}

export default function Measures() {
  const { user, companyId, loading } = useAuth();
  const { hasDetailedPermission } = usePermissions();
  const canManageMeasures = hasDetailedPermission("measures", "create_edit");
  const canDeleteMeasures = hasDetailedPermission("measures", "delete");
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [measures, setMeasures] = useState<Measure[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeasure, setEditingMeasure] = useState<Measure | null>(null);
  const [linkedIncidentId, setLinkedIncidentId] = useState<string | null>(null);
  const [linkedRiskAssessmentId, setLinkedRiskAssessmentId] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string>("all");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    measure_type: "corrective" as "preventive" | "corrective" | "improvement",
    status: "planned" as "planned" | "in_progress" | "completed" | "cancelled",
    responsible_person_id: "",
    due_date: "",
    completion_date: "",
    verification_method: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Auto-open form when coming from Incidents page
  useEffect(() => {
    const incidentId = searchParams.get("incident_id");
    const incidentTitle = searchParams.get("incident_title");
    if (incidentId && incidentTitle) {
      setLinkedIncidentId(incidentId);
      setFormData((prev) => ({
        ...prev,
        title: `Korrekturmaßnahme: ${decodeURIComponent(incidentTitle)}`,
        measure_type: "corrective",
      }));
      setIsDialogOpen(true);
    }
  }, [searchParams]);

  // Auto-open form when coming from Risk Assessments (GBU) page
  useEffect(() => {
    const riskId = searchParams.get("risk_assessment_id");
    const riskTitle = searchParams.get("risk_assessment_title");
    if (riskId && riskTitle) {
      setLinkedRiskAssessmentId(riskId);
      setFormData((prev) => ({
        ...prev,
        title: `Maßnahme: ${decodeURIComponent(riskTitle)}`,
        measure_type: "preventive",
      }));
      setIsDialogOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (companyId) {
      fetchMeasures();
      fetchEmployees();
    }
  }, [companyId]);

  const fetchMeasures = async () => {
    if (!companyId) return;

    try {
      // FK-Constraint measures_incident_id_fkey existiert in der DB (ON DELETE SET NULL)
      // → direkter Join möglich
      const { data, error } = await supabase
        .from("measures" as any)
        .select(
          `
          *,
          responsible_person:employees!responsible_person_id(full_name),
          incident:incidents!incident_id(title),
          risk_assessment:risk_assessments!risk_assessment_id(title),
          audit:audits!audit_id(title)
        `
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Auch GBU-Inline-Maßnahmen (risk_assessment_measures) laden und mergen
      const { data: ramData } = await supabase
        .from("risk_assessment_measures" as any)
        .select(`
          *,
          risk_assessment:risk_assessments!risk_assessment_id(id, title)
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      // Status-Mapping: progress_status → measures.status
      const statusMap: Record<string, string> = {
        not_started: "planned",
        pending: "planned",
        in_progress: "in_progress",
        blocked: "cancelled",
        completed: "completed",
        done: "completed",
      };

      const mappedRam = ((ramData as any) || []).map((ram: any) => ({
        // Fake-ID mit Prefix damit kein Konflikt mit measures.id
        id: `ram_${ram.id}`,
        _is_ram: true, // Marker: kommt aus risk_assessment_measures
        _ram_id: ram.id,
        title: ram.measure_building_block || "GBU-Maßnahme",
        description: ram.notes || null,
        measure_type: "preventive" as const,
        status: statusMap[ram.progress_status] || "planned",
        responsible_person: ram.responsible_person_name
          ? { full_name: ram.responsible_person_name }
          : null,
        due_date: ram.due_date || null,
        completion_date: null,
        verification_method: null,
        incident_id: null,
        risk_assessment_id: ram.risk_assessment_id,
        audit_id: null,
        company_id: ram.company_id,
        created_at: ram.created_at,
        // Join-Daten
        incident: null,
        risk_assessment: ram.risk_assessment || null,
        audit: null,
      }));

      setMeasures([...(data as any || []), ...mappedRam]);
    } catch (error: any) {
      console.error("Error fetching measures:", error);
      toast({
        title: "Fehler",
        description: error.message || "Maßnahmen konnten nicht geladen werden",
        variant: "destructive",
      });
    }
  };

  // Echtzeit-Sync: measures + GBU-Maßnahmen
  useRealtimeRefetch(["measures", "risk_assessment_measures"], companyId, fetchMeasures);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      const measureData = {
        company_id: companyId,
        title: formData.title,
        description: formData.description || null,
        measure_type: formData.measure_type,
        status: formData.status,
        responsible_person_id:
          formData.responsible_person_id === "none"
            ? null
            : formData.responsible_person_id || null,
        due_date: formData.due_date || null,
        completion_date: formData.completion_date || null,
        verification_method: formData.verification_method || null,
        incident_id: linkedIncidentId || null,
        risk_assessment_id: linkedRiskAssessmentId || null,
      };

      if (editingMeasure && (editingMeasure as any)._is_ram) {
        // GBU-Inline-Maßnahme → zurück in risk_assessment_measures speichern
        const statusToProgress: Record<string, string> = {
          planned: "not_started",
          in_progress: "in_progress",
          completed: "completed",
          cancelled: "blocked",
        };
        const { error } = await (supabase as any)
          .from("risk_assessment_measures")
          .update({
            measure_building_block: formData.title,
            notes: formData.description || null,
            progress_status: statusToProgress[formData.status] || "not_started",
            due_date: formData.due_date || null,
          })
          .eq("id", (editingMeasure as any)._ram_id);

        if (error) throw error;
        toast({ title: "Gespeichert", description: "GBU-Maßnahme wurde aktualisiert" });
      } else if (editingMeasure) {
        const { error } = await (supabase as any)
          .from("measures")
          .update(measureData)
          .eq("id", editingMeasure.id);

        if (error) throw error;
        toast({
          title: "Gespeichert",
          description: "Maßnahme wurde aktualisiert",
        });
      } else {
        const { error } = await supabase
          .from("measures" as any)
          .insert(measureData as any);

        if (error) throw error;
        toast({
          title: "Gespeichert",
          description: "Maßnahme wurde erstellt",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchMeasures();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Maßnahme konnte nicht gespeichert werden",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Maßnahme wirklich löschen?")) return;

    try {
      if (id.startsWith("ram_")) {
        // GBU-Inline-Maßnahme → aus risk_assessment_measures löschen
        const ramId = id.replace("ram_", "");
        const { error } = await (supabase as any)
          .from("risk_assessment_measures")
          .delete()
          .eq("id", ramId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("measures" as any)
          .delete()
          .eq("id", id);
        if (error) throw error;
      }
      toast({ title: "Gespeichert", description: "Maßnahme wurde gelöscht" });
      fetchMeasures();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Maßnahme konnte nicht gelöscht werden",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (measure: Measure) => {
    setEditingMeasure(measure);
    // Bestehende Links wiederherstellen — sonst werden sie beim Speichern auf null gesetzt
    setLinkedIncidentId(measure.incident_id || null);
    setLinkedRiskAssessmentId(measure.risk_assessment_id || null);
    setFormData({
      title: measure.title,
      description: measure.description || "",
      measure_type: measure.measure_type,
      status: measure.status,
      responsible_person_id: measure.responsible_person_id || "none",
      due_date: measure.due_date || "",
      completion_date: measure.completion_date || "",
      verification_method: measure.verification_method || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      measure_type: "corrective",
      status: "planned",
      responsible_person_id: "none",
      due_date: "",
      completion_date: "",
      verification_method: "",
    });
    setEditingMeasure(null);
    setLinkedIncidentId(null);
    setLinkedRiskAssessmentId(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      planned: { variant: "secondary", label: "Geplant" },
      in_progress: { variant: "default", label: "In Bearbeitung" },
      completed: { variant: "outline", label: "Abgeschlossen" },
      cancelled: { variant: "destructive", label: "Abgebrochen" },
    };
    const config = variants[status] || variants.planned;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      preventive: "bg-blue-100 text-blue-800",
      corrective: "bg-orange-100 text-orange-800",
      improvement: "bg-green-100 text-green-800",
    };
    const labels: Record<string, string> = {
      preventive: "Präventiv",
      corrective: "Korrigierend",
      improvement: "Verbesserung",
    };
    return (
      <Badge className={colors[type] || colors.corrective}>
        {labels[type] || type}
      </Badge>
    );
  };

  const filteredMeasures = measures.filter((measure) => {
    const matchesSearch = measure.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || measure.status === filterStatus;
    const matchesType =
      filterType === "all" || measure.measure_type === filterType;
    const matchesSource = (() => {
      if (filterSource === "all") return true;
      if (filterSource === "incident") return !!(measure as any).incident?.title;
      if (filterSource === "risk_assessment") return !!(measure as any).risk_assessment?.title;
      if (filterSource === "audit") return !!(measure as any).audit?.title;
      if (filterSource === "manual")
        return !(measure as any).incident?.title &&
               !(measure as any).risk_assessment?.title &&
               !(measure as any).audit?.title;
      return true;
    })();
    return matchesSearch && matchesStatus && matchesType && matchesSource;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text("Maßnahmen & Kontrollen – Bericht", 14, 22);
    doc.setFontSize(11);
    doc.text(`Erstellt am: ${format(new Date(), "dd.MM.yyyy")}`, 14, 30);

    // Prepare table data
    const tableData = filteredMeasures.map((measure) => [
      measure.title,
      measure.measure_type.charAt(0).toUpperCase() +
      measure.measure_type.slice(1),
      measure.status.charAt(0).toUpperCase() + measure.status.slice(1),
      measure.responsible_person?.full_name || "Nicht zugewiesen",
      measure.due_date
        ? format(new Date(measure.due_date), "dd.MM.yyyy")
        : "Kein Fälligkeitsdatum",
    ]);

    autoTable(doc, {
      head: [["Maßnahme", "Typ", "Status", "Verantwortlich", "Fälligkeitsdatum"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`measures_report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({
      title: "Gespeichert",
      description: "PDF wurde exportiert",
    });
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
          <div>
            <h2 className="text-3xl font-bold">{t("measures.title")}</h2>
            <p className="text-muted-foreground">{t("measures.subtitle")}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("measures.title")}</CardTitle>
              <CardDescription>{t("measures.subtitle")}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToPDF}>
                <FileDown className="w-4 h-4 mr-2" />
                {t("measures.exportPDF")}
              </Button>
              <Dialog open={isDialogOpen && canManageMeasures} onOpenChange={setIsDialogOpen}>
                {canManageMeasures && (
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("measures.new")}
                  </Button>
                </DialogTrigger>
                )}
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingMeasure ? t("measures.edit") : t("measures.new")}
                    </DialogTitle>
                    <DialogDescription>
                      {t("measures.subtitle")}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {linkedIncidentId && (
                      <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-md px-3 py-2">
                        ⚠ Verknüpft mit Vorfall — wird automatisch zugeordnet
                      </div>
                    )}
                    {linkedRiskAssessmentId && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-md px-3 py-2">
                        🛡 Verknüpft mit Gefährdungsbeurteilung (GBU) — wird automatisch zugeordnet
                      </div>
                    )}
                    <div>
                      <Label htmlFor="title">
                        {t("measures.measureTitle")} *
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        placeholder="z.B. Schutzvorrichtungen an Maschinen nachrüsten"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type">Measure Type *</Label>
                        <Select
                          value={formData.measure_type}
                          onValueChange={(value: any) =>
                            setFormData({ ...formData, measure_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="corrective">
                              Corrective
                            </SelectItem>
                            <SelectItem value="preventive">
                              Preventive
                            </SelectItem>
                            <SelectItem value="improvement">
                              Improvement
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="status">Status *</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value: any) =>
                            setFormData({ ...formData, status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="in_progress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="Ausführliche Beschreibung der Maßnahme"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="responsible">Responsible Person</Label>
                      <Select
                        value={formData.responsible_person_id}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            responsible_person_id: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Verantwortliche Person auswählen" />
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="due_date">Fälligkeitsdatum</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full justify-start text-left font-normal ${!formData.due_date && "text-muted-foreground"}`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.due_date ? (
                                format(new Date(formData.due_date), "PPP")
                              ) : (
                                <span>{t("common.pickDate")}</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.due_date ? new Date(formData.due_date) : undefined}
                              onSelect={(date) =>
                                setFormData({
                                  ...formData,
                                  due_date: date ? format(date, "yyyy-MM-dd") : "",
                                })
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label htmlFor="completion_date">Abschlussdatum</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full justify-start text-left font-normal ${!formData.completion_date && "text-muted-foreground"}`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.completion_date ? (
                                format(new Date(formData.completion_date), "PPP")
                              ) : (
                                <span>{t("common.pickDate")}</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.completion_date ? new Date(formData.completion_date) : undefined}
                              onSelect={(date) =>
                                setFormData({
                                  ...formData,
                                  completion_date: date ? format(date, "yyyy-MM-dd") : "",
                                })
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="verification">Verifizierungsmethode</Label>
                      <Textarea
                        id="verification"
                        value={formData.verification_method}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            verification_method: e.target.value,
                          })
                        }
                        placeholder="Wie wird diese Maßnahme verifiziert?"
                        rows={2}
                      />
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
                        Abbrechen
                      </Button>
                      <Button type="submit">
                        {editingMeasure ? "Aktualisieren" : "Erstellen"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Maßnahmen suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Nach Status filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="planned">Geplant</SelectItem>
                <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                <SelectItem value="completed">Abgeschlossen</SelectItem>
                <SelectItem value="cancelled">Abgebrochen</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Nach Herkunft filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Herkunft</SelectItem>
                <SelectItem value="incident">⚠ Vorfall</SelectItem>
                <SelectItem value="risk_assessment">🛡 GBU</SelectItem>
                <SelectItem value="audit">✓ Audit</SelectItem>
                <SelectItem value="manual">— Manuell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Maßnahme</TableHead>
                  <TableHead>Herkunft</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verantwortlich</TableHead>
                  <TableHead>Fälligkeitsdatum</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeasures.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Keine Maßnahmen gefunden. Erstellen Sie eine, um zu beginnen.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMeasures.map((measure) => (
                    <TableRow key={measure.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{measure.title}</div>
                          {measure.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {measure.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(measure.incident_id || (measure as any).incident?.title) ? (
                          <Badge
                            variant="outline"
                            className="text-xs text-orange-700 border-orange-300 cursor-default gap-1"
                            title={(measure as any).incident?.title || measure.incident_id || ""}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Vorfall
                          </Badge>
                        ) : (measure.risk_assessment_id || (measure as any).risk_assessment?.title) ? (
                          <Badge
                            variant="outline"
                            className="text-xs text-blue-700 border-blue-300 cursor-default gap-1"
                            title={(measure as any).risk_assessment?.title || "Risikobewertung"}
                          >
                            <ShieldAlert className="w-3 h-3" />
                            Risikobewertung
                          </Badge>
                        ) : ((measure as any).audit_id || (measure as any).audit?.title) ? (
                          <Badge
                            variant="outline"
                            className="text-xs text-purple-700 border-purple-300 cursor-default gap-1"
                            title={(measure as any).audit?.title || "Audit"}
                          >
                            <ClipboardCheck className="w-3 h-3" />
                            Audit
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(measure.status)}</TableCell>
                      <TableCell>
                        {measure.responsible_person?.full_name || (
                          <span className="text-muted-foreground">
                            Nicht zugewiesen
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {measure.due_date ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(measure.due_date), "dd.MM.yyyy")}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Kein Fälligkeitsdatum
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canManageMeasures && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(measure)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          )}
                          {canDeleteMeasures && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(measure.id)}
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
    </div>
  );
}
