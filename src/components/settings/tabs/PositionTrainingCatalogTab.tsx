import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  BriefcaseBusiness,
  X,
  CheckCircle,
  Search,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Position {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  department_id: string | null;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
}

interface TrainingType {
  id: string;
  name: string;
  description: string | null;
  duration_hours: number | null;
  validity_months: number | null;
}

interface PositionRequirement {
  id: string;
  position_id: string;
  training_type_id: string;
  is_mandatory: boolean;
  training_type?: TrainingType;
}

interface Props {
  companyId: string;
}

const emptyPositionForm = { name: "", description: "", department_id: "" };

// deptKeywords: which department name fragments trigger this catalog entry
const POSITION_CATALOG = [
  {
    key: "gabelstaplerfahrer",
    deptKeywords: ["lager", "logistik"],
    name: "Gabelstaplerfahrer",
    description: "Betrieb von Flurförderzeugen im Lager und auf dem Betriebsgelände",
    icon: "🏗️",
    trainings: [
      { name: "Gabelstapler-Fahrerlaubnis (DGUV G 308-001)", durationHours: 16, validityMonths: 36 },
      { name: "Fahrerschulung Flurförderzeuge (DGUV V 68)", durationHours: 8, validityMonths: 36 },
      { name: "Sicherheitsunterweisung Flurförderzeuge", durationHours: 2, validityMonths: 12 },
      { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12 },
      { name: "Brandschutzunterweisung", durationHours: 1, validityMonths: 12 },
    ],
  },
  {
    key: "elektriker",
    deptKeywords: ["technik", "elektro", "it"],
    name: "Elektriker / Elektrofachkraft",
    description: "Elektrotechnische Arbeiten, Installation und Prüfung elektrischer Anlagen",
    icon: "⚡",
    trainings: [
      { name: "Elektrische Anlagen / Schaltberechtigung (DGUV V 3)", durationHours: 8, validityMonths: 36 },
      { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12 },
      { name: "PSA-Unterweisung", durationHours: 1, validityMonths: 12 },
      { name: "Erste Hilfe", durationHours: 16, validityMonths: 24 },
    ],
  },
  {
    key: "kfz_mechatroniker",
    deptKeywords: ["technik", "kfz", "fahrzeug", "werkstatt"],
    name: "Kfz-Mechatroniker / HV-Techniker",
    description: "Wartung und Reparatur von Fahrzeugen inkl. Elektro- und Hybridantrieben",
    icon: "🔌",
    trainings: [
      { name: "Hochvolt-Schulung (DGUV I 209-093)", durationHours: 16, validityMonths: 36 },
      { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12 },
      { name: "PSA-Unterweisung", durationHours: 1, validityMonths: 12 },
    ],
  },
  {
    key: "schweisser",
    deptKeywords: ["produktion", "fertigung", "metall", "werkstatt"],
    name: "Schweißer",
    description: "Schweiß- und Schneidarbeiten an Metall- und Stahlkonstruktionen",
    icon: "🔥",
    trainings: [
      { name: "Schweißerlaubnis / Qualifikation (DVS)", durationHours: 24, validityMonths: 24 },
      { name: "Schweißen und Heißarbeiten (BGR 500)", durationHours: 4, validityMonths: 24 },
      { name: "PSA-Unterweisung", durationHours: 1, validityMonths: 12 },
      { name: "PSA Augenschutz", durationHours: 1, validityMonths: 12 },
      { name: "Brandschutzunterweisung", durationHours: 1, validityMonths: 12 },
    ],
  },
  {
    key: "schlosser",
    deptKeywords: ["produktion", "fertigung", "metall", "werkstatt"],
    name: "Schlosser / Metallbearbeiter",
    description: "Metallverarbeitung, Maschinenwartung und mechanische Reparaturen",
    icon: "🔧",
    trainings: [
      { name: "Maschinenführer-Unterweisung", durationHours: 4, validityMonths: 12 },
      { name: "PSA-Unterweisung", durationHours: 1, validityMonths: 12 },
      { name: "Lärm- und Vibrations-Unterweisung (LärmVibrationsArbSchV)", durationHours: 2, validityMonths: 12 },
      { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12 },
    ],
  },
  {
    key: "kranfuehrer",
    deptKeywords: ["produktion", "lager", "logistik", "schwerlast"],
    name: "Kranführer",
    description: "Bedienung von Kran- und Hebezeugeinrichtungen",
    icon: "🏗️",
    trainings: [
      { name: "Kranführerschein (DGUV G 309-004)", durationHours: 32, validityMonths: 60 },
      { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12 },
      { name: "PSA-Unterweisung", durationHours: 1, validityMonths: 12 },
    ],
  },
  {
    key: "maschinenführer",
    deptKeywords: ["produktion", "fertigung", "maschinen"],
    name: "Maschinenführer / Produktionsmitarbeiter",
    description: "Bedienung und Überwachung von Produktions- und Fertigungsmaschinen",
    icon: "⚙️",
    trainings: [
      { name: "Maschinenführer-Unterweisung", durationHours: 4, validityMonths: 12 },
      { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12 },
      { name: "Lärm- und Vibrations-Unterweisung (LärmVibrationsArbSchV)", durationHours: 2, validityMonths: 12 },
      { name: "PSA-Unterweisung", durationHours: 1, validityMonths: 12 },
      { name: "Brandschutzunterweisung", durationHours: 1, validityMonths: 12 },
    ],
  },
  {
    key: "dachdecker",
    deptKeywords: ["baustelle", "bau", "dach", "gerüst"],
    name: "Dachdecker / Gerüstbauer",
    description: "Dach- und Abdichtungsarbeiten sowie Gerüstbau auf Baustellen",
    icon: "🏠",
    trainings: [
      { name: "Absturzsicherung / PSAgA (DGUV R 112-198)", durationHours: 8, validityMonths: 12 },
      { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12 },
      { name: "PSA-Unterweisung", durationHours: 1, validityMonths: 12 },
      { name: "Brandschutzunterweisung", durationHours: 1, validityMonths: 12 },
    ],
  },
  {
    key: "maler",
    deptKeywords: ["baustelle", "bau", "lack"],
    name: "Maler und Lackierer",
    description: "Oberflächen- und Beschichtungsarbeiten an Gebäuden und Bauteilen",
    icon: "🎨",
    trainings: [
      { name: "Gefahrstoffunterweisung (§ 14 GefStoffV)", durationHours: 4, validityMonths: 12 },
      { name: "Absturzsicherung / PSAgA (DGUV R 112-198)", durationHours: 8, validityMonths: 12 },
      { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12 },
      { name: "PSA-Unterweisung", durationHours: 1, validityMonths: 12 },
    ],
  },
  {
    key: "kanalarbeiter",
    deptKeywords: ["baustelle", "bau", "tiefbau", "kanal"],
    name: "Kanalarbeiter / Tiefbauer",
    description: "Arbeiten in Kanälen, Schächten und anderen engen unterirdischen Räumen",
    icon: "⛏️",
    trainings: [
      { name: "Arbeiten in engen Räumen (DGUV R 113-004)", durationHours: 8, validityMonths: 12 },
      { name: "Atemschutzunterweisung (DGUV R 112-190)", durationHours: 4, validityMonths: 12 },
      { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12 },
      { name: "PSA-Unterweisung", durationHours: 1, validityMonths: 12 },
    ],
  },
  {
    key: "lager",
    deptKeywords: ["lager", "logistik"],
    name: "Lagerarbeiter",
    description: "Warenannahme, Einlagerung, Kommissionierung und Versand",
    icon: "📦",
    trainings: [
      { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12 },
      { name: "Heben und Tragen / Rückengerechtes Arbeiten", durationHours: 2, validityMonths: 12 },
      { name: "Brandschutzunterweisung", durationHours: 1, validityMonths: 12 },
      { name: "PSA-Unterweisung", durationHours: 1, validityMonths: 12 },
    ],
  },
  {
    key: "fahrer",
    deptKeywords: ["logistik", "transport", "fahrer", "lager"],
    name: "Berufskraftfahrer / Dienstfahrer",
    description: "Güter- und Personentransport sowie regelmäßige Dienstfahrten",
    icon: "🚛",
    trainings: [
      { name: "Fahrsicherheitstraining für Firmenfahrzeuge", durationHours: 8, validityMonths: 36 },
      { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12 },
      { name: "Erste Hilfe", durationHours: 16, validityMonths: 24 },
    ],
  },
  {
    key: "chemikant",
    deptKeywords: ["chemie", "labor", "produktion"],
    name: "Chemikant / Chemiefachkraft",
    description: "Bedienung und Überwachung chemischer Produktionsanlagen",
    icon: "🧪",
    trainings: [
      { name: "Gefahrstoffunterweisung (§ 14 GefStoffV)", durationHours: 4, validityMonths: 12 },
      { name: "Explosionsschutz-Unterweisung (ATEX)", durationHours: 4, validityMonths: 12 },
      { name: "PSA-Unterweisung", durationHours: 1, validityMonths: 12 },
      { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12 },
      { name: "Erste Hilfe", durationHours: 16, validityMonths: 24 },
    ],
  },
  {
    key: "laborant",
    deptKeywords: ["labor", "forschung", "chemie", "analyse"],
    name: "Laborant / Forschungsmitarbeiter",
    description: "Arbeiten mit chemischen, biologischen oder radioaktiven Stoffen im Labor",
    icon: "🔬",
    trainings: [
      { name: "Gefahrstoffunterweisung (§ 14 GefStoffV)", durationHours: 4, validityMonths: 12 },
      { name: "Biologische Arbeitsstoffe (BioStoffV § 12)", durationHours: 4, validityMonths: 12 },
      { name: "Laserschutzunterweisung (OStrV)", durationHours: 4, validityMonths: 12 },
      { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12 },
    ],
  },
  {
    key: "buero",
    deptKeywords: ["verwaltung", "büro", "office", "admin", "sachbearbeitung"],
    name: "Bürokraft / Verwaltung",
    description: "Büroarbeiten, Sachbearbeitung und administrative Tätigkeiten",
    icon: "💼",
    trainings: [
      { name: "Bildschirmarbeitsplatz-Unterweisung", durationHours: 1, validityMonths: 12 },
      { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12 },
      { name: "Datenschutz (DSGVO)", durationHours: 2, validityMonths: 12 },
    ],
  },
  {
    key: "it_admin",
    deptKeywords: ["it", "technik", "verwaltung", "system", "edv"],
    name: "IT-Administrator / Systemtechniker",
    description: "Betreuung von IT-Systemen, Netzwerken und Rechenzentren",
    icon: "💻",
    trainings: [
      { name: "Bildschirmarbeitsplatz-Unterweisung", durationHours: 1, validityMonths: 12 },
      { name: "Datenschutz (DSGVO)", durationHours: 2, validityMonths: 12 },
      { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12 },
      { name: "Elektrische Anlagen / Schaltberechtigung (DGUV V 3)", durationHours: 8, validityMonths: 36 },
    ],
  },
  {
    key: "pflegepersonal",
    deptKeywords: ["pflege", "medizin", "gesundheit", "klinik"],
    name: "Pflegepersonal / Medizinische Fachkraft",
    description: "Pflegerische und medizinische Versorgung von Patienten",
    icon: "🏥",
    trainings: [
      { name: "Biologische Arbeitsstoffe (BioStoffV § 12)", durationHours: 4, validityMonths: 12 },
      { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12 },
      { name: "Heben und Tragen / Rückengerechtes Arbeiten", durationHours: 2, validityMonths: 12 },
      { name: "Erste Hilfe", durationHours: 16, validityMonths: 24 },
    ],
  },
];

export function PositionTrainingCatalogTab({ companyId }: Props) {
  const { toast } = useToast();

  const [positions, setPositions] = useState<Position[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [requirements, setRequirements] = useState<Record<string, PositionRequirement[]>>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptTrainingReqs, setDeptTrainingReqs] = useState<Record<string, string[]>>({});
  const [deptTrainingSearch, setDeptTrainingSearch] = useState<Record<string, string>>({});

  // Expand/collapse
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());

  // Position add/edit dialog
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [positionForm, setPositionForm] = useState(emptyPositionForm);
  const [savingPosition, setSavingPosition] = useState(false);

  // Training assignment dialog
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [selectedTrainings, setSelectedTrainings] = useState<Set<string>>(new Set());
  const [savingTrainings, setSavingTrainings] = useState(false);
  const emptyNewTraining = { name: "", duration_hours: "", validity_months: "" };
  const [showNewTrainingForm, setShowNewTrainingForm] = useState(false);
  const [newTrainingForm, setNewTrainingForm] = useState(emptyNewTraining);
  const [creatingTraining, setCreatingTraining] = useState(false);
  const [trainingSearch, setTrainingSearch] = useState("");

  // Add-for-dept dialog (replaces old catalog tab)
  const [addPosDeptId, setAddPosDeptId] = useState<string | null>(null);
  const [addPosDialogOpen, setAddPosDialogOpen] = useState(false);
  const [addPosTab, setAddPosTab] = useState<"catalog" | "create">("catalog");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [addingKey, setAddingKey] = useState<string | null>(null);

  // Delete
  const [deletePositionId, setDeletePositionId] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) fetchAll();
  }, [companyId]);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchPositions(), fetchTrainingTypes(), fetchDepartments(), fetchDeptTrainingReqs()]);
    setLoading(false);
  }

  async function fetchDepartments() {
    const { data } = await supabase
      .from("departments")
      .select("id, name")
      .eq("company_id", companyId)
      .order("name");
    setDepartments(data || []);
    // Expand all depts by default
    setExpandedDepts(new Set((data || []).map((d: Department) => d.id)));
  }

  async function fetchDeptTrainingReqs() {
    const { data } = await (supabase as any)
      .from("department_training_requirements")
      .select("department_id, training_type_id")
      .eq("company_id", companyId);
    const map: Record<string, string[]> = {};
    (data || []).forEach((r: any) => {
      if (!map[r.department_id]) map[r.department_id] = [];
      map[r.department_id].push(r.training_type_id);
    });
    setDeptTrainingReqs(map);
  }

  async function toggleDeptTraining(deptId: string, trainingTypeId: string) {
    const current = deptTrainingReqs[deptId] || [];
    const isSet = current.includes(trainingTypeId);
    try {
      if (isSet) {
        await (supabase as any)
          .from("department_training_requirements")
          .delete()
          .eq("department_id", deptId)
          .eq("training_type_id", trainingTypeId)
          .eq("company_id", companyId);
        setDeptTrainingReqs((prev) => ({
          ...prev,
          [deptId]: (prev[deptId] || []).filter((id) => id !== trainingTypeId),
        }));
      } else {
        await (supabase as any)
          .from("department_training_requirements")
          .insert({ department_id: deptId, training_type_id: trainingTypeId, company_id: companyId, is_mandatory: true });
        setDeptTrainingReqs((prev) => ({
          ...prev,
          [deptId]: [...(prev[deptId] || []), trainingTypeId],
        }));
      }
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  }

  async function fetchPositions() {
    const { data, error } = await supabase
      .from("company_positions")
      .select("id, company_id, name, description, is_active, department_id, created_at")
      .eq("company_id", companyId)
      .order("name");
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    setPositions(data || []);
    if (data && data.length > 0) {
      await fetchRequirementsForPositions(data.map((p) => p.id));
    }
  }

  async function fetchTrainingTypes() {
    const { data, error } = await supabase
      .from("training_types")
      .select("id, name, description, duration_hours, validity_months")
      .eq("company_id", companyId)
      .order("name");
    if (error) return;
    setTrainingTypes(data || []);
  }

  async function fetchRequirementsForPositions(positionIds: string[]) {
    if (positionIds.length === 0) return;
    const { data, error } = await supabase
      .from("position_training_requirements")
      .select("*, training_type:training_types(id, name, description, duration_hours, validity_months)")
      .in("position_id", positionIds);
    if (error) return;
    const grouped: Record<string, PositionRequirement[]> = {};
    for (const req of data || []) {
      if (!grouped[req.position_id]) grouped[req.position_id] = [];
      grouped[req.position_id].push(req as PositionRequirement);
    }
    setRequirements(grouped);
  }

  function toggleDeptExpand(deptId: string) {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  }

  function toggleExpand(positionId: string) {
    setExpandedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(positionId)) next.delete(positionId);
      else next.add(positionId);
      return next;
    });
  }

  // ── Position CRUD ────────────────────────────────────────────────────────

  function openCreatePosition(deptId?: string) {
    setEditingPositionId(null);
    setPositionForm({ ...emptyPositionForm, department_id: deptId || "" });
    setPositionDialogOpen(true);
  }

  function openEditPosition(p: Position) {
    setEditingPositionId(p.id);
    setPositionForm({ name: p.name, description: p.description || "", department_id: p.department_id || "" });
    setPositionDialogOpen(true);
  }

  async function handleSavePosition() {
    if (!positionForm.name.trim()) {
      toast({ title: "Name ist erforderlich", variant: "destructive" });
      return;
    }
    setSavingPosition(true);
    const payload = {
      company_id: companyId,
      name: positionForm.name.trim(),
      description: positionForm.description.trim() || null,
      department_id: positionForm.department_id || null,
    };
    let error;
    if (editingPositionId) {
      ({ error } = await supabase.from("company_positions").update(payload).eq("id", editingPositionId));
    } else {
      ({ error } = await supabase.from("company_positions").insert([payload]));
    }
    if (error) {
      toast({ title: "Fehler beim Speichern", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingPositionId ? "Stelle aktualisiert" : "Stelle hinzugefügt" });
      setPositionDialogOpen(false);
      fetchPositions();
    }
    setSavingPosition(false);
  }

  async function handleDeletePosition() {
    if (!deletePositionId) return;
    const { error } = await supabase.from("company_positions").delete().eq("id", deletePositionId);
    if (error) {
      toast({ title: "Fehler beim Löschen", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Stelle gelöscht" });
      setPositions((prev) => prev.filter((p) => p.id !== deletePositionId));
      setRequirements((prev) => { const next = { ...prev }; delete next[deletePositionId]; return next; });
    }
    setDeletePositionId(null);
  }

  async function handleToggleActive(position: Position) {
    const { error } = await supabase.from("company_positions").update({ is_active: !position.is_active }).eq("id", position.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setPositions((prev) => prev.map((p) => (p.id === position.id ? { ...p, is_active: !p.is_active } : p)));
    }
  }

  // ── Training assignment ───────────────────────────────────────────────────

  function openTrainingDialog(positionId: string) {
    setSelectedPositionId(positionId);
    const existing = (requirements[positionId] || []).map((r) => r.training_type_id);
    setSelectedTrainings(new Set(existing));
    setShowNewTrainingForm(false);
    setNewTrainingForm(emptyNewTraining);
    setTrainingSearch("");
    setTrainingDialogOpen(true);
  }

  async function handleCreateNewTraining() {
    if (!newTrainingForm.name.trim()) {
      toast({ title: "Name ist erforderlich", variant: "destructive" });
      return;
    }
    setCreatingTraining(true);
    const { data, error } = await supabase
      .from("training_types")
      .insert([{
        company_id: companyId,
        name: newTrainingForm.name.trim(),
        description: null,
        duration_hours: newTrainingForm.duration_hours ? Number(newTrainingForm.duration_hours) : null,
        validity_months: newTrainingForm.validity_months ? Number(newTrainingForm.validity_months) : null,
      }])
      .select("id, name, description, duration_hours, validity_months")
      .single();
    if (error) {
      toast({ title: "Fehler beim Erstellen", description: error.message, variant: "destructive" });
    } else {
      setTrainingTypes((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedTrainings((prev) => new Set([...prev, data.id]));
      setNewTrainingForm(emptyNewTraining);
      setShowNewTrainingForm(false);
      toast({ title: `Schulung "${data.name}" erstellt und ausgewählt` });
    }
    setCreatingTraining(false);
  }

  function toggleTraining(trainingId: string) {
    setSelectedTrainings((prev) => {
      const next = new Set(prev);
      if (next.has(trainingId)) next.delete(trainingId);
      else next.add(trainingId);
      return next;
    });
  }

  async function handleSaveTrainings() {
    if (!selectedPositionId) return;
    setSavingTrainings(true);
    const existing = requirements[selectedPositionId] || [];
    const existingIds = new Set(existing.map((r) => r.training_type_id));
    const toAdd = [...selectedTrainings].filter((id) => !existingIds.has(id));
    const toRemove = existing.filter((r) => !selectedTrainings.has(r.training_type_id));
    const ops: Promise<any>[] = [];
    if (toAdd.length > 0) {
      ops.push(supabase.from("position_training_requirements").insert(
        toAdd.map((tid) => ({ position_id: selectedPositionId, training_type_id: tid, is_mandatory: true }))
      ));
    }
    for (const req of toRemove) {
      ops.push(supabase.from("position_training_requirements").delete().eq("id", req.id));
    }
    const results = await Promise.all(ops);
    if (results.some((r) => r.error)) {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    } else {
      toast({ title: "Schulungsanforderungen gespeichert" });
      setTrainingDialogOpen(false);
      await fetchRequirementsForPositions([selectedPositionId]);
    }
    setSavingTrainings(false);
  }

  async function handleRemoveTraining(positionId: string, requirementId: string) {
    const { error } = await supabase.from("position_training_requirements").delete().eq("id", requirementId);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setRequirements((prev) => ({
        ...prev,
        [positionId]: (prev[positionId] || []).filter((r) => r.id !== requirementId),
      }));
      toast({ title: "Schulung entfernt" });
    }
  }

  // ── Catalog helpers ───────────────────────────────────────────────────────

  function isAlreadyAdded(entry: typeof POSITION_CATALOG[0]) {
    return positions.some((p) => p.name.toLowerCase() === entry.name.toLowerCase());
  }

  function getSuggestionsForDept(deptName: string) {
    const q = deptName.toLowerCase();
    return POSITION_CATALOG.filter((entry) =>
      entry.deptKeywords.some((kw) => q.includes(kw) || kw.includes(q.split(" ")[0]))
    );
  }

  function openAddForDept(deptId: string) {
    setAddPosDeptId(deptId);
    setCatalogSearch("");
    setAddPosTab("catalog");
    setAddPosDialogOpen(true);
  }

  async function handleAddFromCatalog(entry: typeof POSITION_CATALOG[0], deptId?: string | null) {
    setAddingKey(entry.key);
    try {
      const { data: posData, error: posErr } = await supabase
        .from("company_positions")
        .insert([{ company_id: companyId, name: entry.name, description: entry.description, is_active: true, department_id: deptId || null }])
        .select("id")
        .single();
      if (posErr) throw posErr;

      for (const t of entry.trainings) {
        const { data: existing } = await supabase
          .from("training_types")
          .select("id")
          .eq("company_id", companyId)
          .eq("name", t.name)
          .maybeSingle();
        let typeId = existing?.id;
        if (!typeId) {
          const { data: newType, error: typeErr } = await supabase
            .from("training_types")
            .insert([{ company_id: companyId, name: t.name, description: "", duration_hours: t.durationHours, validity_months: t.validityMonths }])
            .select("id")
            .single();
          if (typeErr) throw typeErr;
          typeId = newType.id;
        }
        await supabase.from("position_training_requirements").insert([{ position_id: posData.id, training_type_id: typeId, is_mandatory: true }]);
      }

      toast({ title: `"${entry.name}" hinzugefügt`, description: `${entry.trainings.length} Pflicht-Schulungen zugewiesen.` });
      await fetchAll();
    } catch (err: unknown) {
      toast({ title: "Fehler", description: err instanceof Error ? err.message : "Unbekannter Fehler", variant: "destructive" });
    } finally {
      setAddingKey(null);
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderPositionRow(position: Position) {
    const isExpanded = expandedPositions.has(position.id);
    const reqs = requirements[position.id] || [];
    return (
      <div key={position.id} className="rounded-md border bg-card">
        <div className="flex items-center gap-2 px-3 py-2">
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => toggleExpand(position.id)}>
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
          <span className="flex-1 text-sm font-medium">{position.name}</span>
          <Badge variant="outline" className="text-xs shrink-0">
            {reqs.length} Schulung{reqs.length !== 1 ? "en" : ""}
          </Badge>
          <div className="flex items-center gap-1 shrink-0">
            <Switch checked={position.is_active} onCheckedChange={() => handleToggleActive(position)} className="scale-75" />
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditPosition(position)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => setDeletePositionId(position.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t px-3 pb-3">
            <div className="mt-2 space-y-1.5">
              {reqs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">Noch keine Schulungen zugeordnet.</p>
              ) : (
                reqs.map((req) => (
                  <div key={req.id} className="flex items-center justify-between gap-2 rounded bg-muted/50 px-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs truncate">{req.training_type?.name || "Unbekannte Schulung"}</span>
                      {req.is_mandatory && (
                        <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">Pflicht</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {req.training_type?.validity_months && (
                        <span className="text-xs text-muted-foreground">{req.training_type.validity_months} Mon.</span>
                      )}
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveTraining(position.id, req.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 mt-1"
                onClick={() => openTrainingDialog(position.id)}>
                <Plus className="h-3 w-3" />Schulung zuordnen
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const unassignedActive = positions.filter((p) => !p.department_id && p.is_active);
  const unassignedInactive = positions.filter((p) => !p.department_id && !p.is_active);

  const addPosDept = departments.find((d) => d.id === addPosDeptId);
  const catalogSuggestions = addPosDept
    ? getSuggestionsForDept(addPosDept.name).filter((e) =>
        !catalogSearch || e.name.toLowerCase().includes(catalogSearch.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Stellen &amp; Schulungsanforderungen</h3>
          <p className="text-sm text-muted-foreground">
            Organisiert nach Abteilungen — definiere Stellen und ihre Pflicht-Schulungen
          </p>
        </div>
        <Button onClick={() => openCreatePosition()} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Stelle hinzufügen
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Lade Daten...</div>
      ) : departments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Noch keine Abteilungen vorhanden</p>
            <p className="text-xs mt-1">Erstelle zuerst Abteilungen unter Konfiguration.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Department cards */}
          {departments.map((dept) => {
            const isExpanded = expandedDepts.has(dept.id);
            const deptActive = positions.filter((p) => p.department_id === dept.id && p.is_active);
            const deptInactive = positions.filter((p) => p.department_id === dept.id && !p.is_active);
            const coreTrainings = deptTrainingReqs[dept.id] || [];
            const dtrSearch = (deptTrainingSearch[dept.id] || "").toLowerCase();
            const availableForDept = trainingTypes.filter(
              (tt) => !coreTrainings.includes(tt.id) && (!dtrSearch || tt.name.toLowerCase().includes(dtrSearch))
            );

            return (
              <Card key={dept.id} className="overflow-hidden">
                <CardHeader
                  className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleDeptExpand(dept.id)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{dept.name}</span>
                    <Badge variant="outline" className="text-xs">{deptActive.length} Stelle{deptActive.length !== 1 ? "n" : ""}</Badge>
                    {coreTrainings.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{coreTrainings.length} Kernschulung{coreTrainings.length !== 1 ? "en" : ""}</Badge>
                    )}
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 border-t px-4">
                    {/* Dept-level core trainings */}
                    <div className="py-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Kernschulungen (für alle Mitarbeiter dieser Abteilung)
                      </p>
                      {coreTrainings.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {coreTrainings.map((ttId) => {
                            const tt = trainingTypes.find((t) => t.id === ttId);
                            if (!tt) return null;
                            return (
                              <span key={ttId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
                                {tt.name}
                                <button onClick={() => toggleDeptTraining(dept.id, ttId)} className="hover:opacity-70">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 items-center">
                        <input
                          className="h-7 px-2 text-xs border rounded bg-background w-40"
                          placeholder="Schulung suchen..."
                          value={deptTrainingSearch[dept.id] || ""}
                          onChange={(e) => setDeptTrainingSearch((prev) => ({ ...prev, [dept.id]: e.target.value }))}
                        />
                        {availableForDept.slice(0, 5).map((tt) => (
                          <Button key={tt.id} variant="outline" size="sm" className="text-xs h-7"
                            onClick={() => toggleDeptTraining(dept.id, tt.id)}>
                            <Plus className="w-3 h-3 mr-1" />{tt.name}
                          </Button>
                        ))}
                        {trainingTypes.length === 0 && (
                          <p className="text-xs text-muted-foreground">Keine Schulungstypen vorhanden.</p>
                        )}
                      </div>
                    </div>

                    {/* Positions */}
                    <div className="border-t border-dashed pt-4 pb-2">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stellen</p>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                          onClick={() => openAddForDept(dept.id)}>
                          <Plus className="h-3 w-3" />Stelle hinzufügen
                        </Button>
                      </div>

                      {deptActive.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-3">
                          Noch keine Stellen. Füge eine Stelle aus dem Katalog hinzu oder erstelle eine eigene.
                        </p>
                      )}

                      <div className="space-y-2">
                        {deptActive.map(renderPositionRow)}
                      </div>

                      {deptInactive.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1">Deaktiviert</p>
                          <div className="space-y-1 opacity-60">
                            {deptInactive.map((position) => (
                              <div key={position.id} className="flex items-center gap-2 px-3 py-2 rounded border">
                                <span className="flex-1 text-sm">{position.name}</span>
                                <Switch checked={false} onCheckedChange={() => handleToggleActive(position)} className="scale-75" />
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() => setDeletePositionId(position.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Unassigned positions */}
          {(unassignedActive.length > 0 || unassignedInactive.length > 0) && (
            <Card className="border-dashed">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BriefcaseBusiness className="h-4 w-4" />
                  <span className="font-medium text-sm">Stellen ohne Abteilung</span>
                  <Badge variant="outline" className="text-xs">{unassignedActive.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 border-t px-4 pb-4">
                <p className="text-xs text-muted-foreground py-2 mb-2">
                  Diese Stellen sind keiner Abteilung zugeordnet. Bearbeite sie, um eine Abteilung zu setzen.
                </p>
                <div className="space-y-2">
                  {unassignedActive.map(renderPositionRow)}
                </div>
                {unassignedInactive.length > 0 && (
                  <div className="mt-3 space-y-1 opacity-60">
                    {unassignedInactive.map((position) => (
                      <div key={position.id} className="flex items-center gap-2 px-3 py-2 rounded border">
                        <span className="flex-1 text-sm">{position.name}</span>
                        <Switch checked={false} onCheckedChange={() => handleToggleActive(position)} className="scale-75" />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditPosition(position)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => setDeletePositionId(position.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Position Add/Edit Dialog ─────────────────────────────────────── */}
      <Dialog open={positionDialogOpen} onOpenChange={setPositionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPositionId ? "Stelle bearbeiten" : "Neue Stelle"}</DialogTitle>
            <DialogDescription>
              Definiere eine Stelle und weise ihr danach Pflicht-Schulungen zu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pos_name">Name <span className="text-destructive">*</span></Label>
              <Input id="pos_name" placeholder="z.B. Staplerfahrer, Elektriker, Lagerleiter"
                value={positionForm.name}
                onChange={(e) => setPositionForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pos_description">Beschreibung</Label>
              <Textarea id="pos_description" placeholder="Kurze Beschreibung (optional)"
                value={positionForm.description}
                onChange={(e) => setPositionForm((f) => ({ ...f, description: e.target.value }))}
                rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Abteilung</Label>
              <Select
                value={positionForm.department_id || "none"}
                onValueChange={(v) => setPositionForm((f) => ({ ...f, department_id: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Abteilung zuweisen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Abteilung</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Mitarbeiter dieser Abteilung erhalten diese Stelle automatisch zugewiesen.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPositionDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSavePosition} disabled={savingPosition}>
              {savingPosition ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Training Assignment Dialog ───────────────────────────────────── */}
      <Dialog open={trainingDialogOpen} onOpenChange={setTrainingDialogOpen}>
        <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Schulungen zuordnen</DialogTitle>
            <DialogDescription>Wähle bestehende Schulungen aus oder erstelle neue.</DialogDescription>
          </DialogHeader>
          <div className="shrink-0 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Schulung suchen..." value={trainingSearch}
                onChange={(e) => setTrainingSearch(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" size="sm" className="shrink-0 gap-1"
              onClick={() => setShowNewTrainingForm((v) => !v)}>
              <Plus className="h-4 w-4" />Neue Schulung
            </Button>
          </div>
          {showNewTrainingForm && (
            <div className="shrink-0 rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-primary">Neue Schulung erstellen</p>
              <Input placeholder="Name der Schulung *" value={newTrainingForm.name}
                onChange={(e) => setNewTrainingForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
              <div className="flex gap-2">
                <Input placeholder="Dauer (Std.)" type="number" min={0} value={newTrainingForm.duration_hours}
                  onChange={(e) => setNewTrainingForm((f) => ({ ...f, duration_hours: e.target.value }))} />
                <Input placeholder="Gültigkeit (Monate)" type="number" min={0} value={newTrainingForm.validity_months}
                  onChange={(e) => setNewTrainingForm((f) => ({ ...f, validity_months: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateNewTraining} disabled={creatingTraining || !newTrainingForm.name.trim()} className="gap-1">
                  {creatingTraining ? "Erstellen..." : "Erstellen & auswählen"}
                </Button>
                <Button size="sm" variant="ghost"
                  onClick={() => { setShowNewTrainingForm(false); setNewTrainingForm(emptyNewTraining); }}>
                  Abbrechen
                </Button>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto min-h-0">
            {trainingTypes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Noch keine Schulungen vorhanden.</p>
              </div>
            ) : (
              <div className="space-y-1.5 pr-1 py-1">
                {trainingTypes
                  .filter((tt) => !trainingSearch || tt.name.toLowerCase().includes(trainingSearch.toLowerCase()))
                  .map((tt) => {
                    const checked = selectedTrainings.has(tt.id);
                    return (
                      <div key={tt.id}
                        className={`flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${checked ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"}`}
                        onClick={() => toggleTraining(tt.id)}>
                        <Checkbox checked={checked} onCheckedChange={() => toggleTraining(tt.id)} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{tt.name}</span>
                            {checked && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                          </div>
                          <div className="flex gap-3 mt-1">
                            {tt.duration_hours && <span className="text-xs text-muted-foreground">{tt.duration_hours} Std.</span>}
                            {tt.validity_months && <span className="text-xs text-muted-foreground">Gültigkeit: {tt.validity_months} Monate</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setTrainingDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSaveTrainings} disabled={savingTrainings}>
              {savingTrainings ? "Speichern..." : `${selectedTrainings.size} Schulung${selectedTrainings.size !== 1 ? "en" : ""} zuordnen`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Position for Dept Dialog ────────────────────────────────── */}
      <Dialog open={addPosDialogOpen} onOpenChange={setAddPosDialogOpen}>
        <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              Stelle hinzufügen
              {addPosDept && <span className="font-normal text-muted-foreground ml-1">– {addPosDept.name}</span>}
            </DialogTitle>
            <DialogDescription>
              Wähle aus dem Katalog oder erstelle eine eigene Stelle.
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 flex gap-1 p-1 bg-muted rounded-md mb-2">
            <Button size="sm" variant={addPosTab === "catalog" ? "default" : "ghost"} className="flex-1 h-7 text-xs"
              onClick={() => setAddPosTab("catalog")}>Aus Katalog</Button>
            <Button size="sm" variant={addPosTab === "create" ? "default" : "ghost"} className="flex-1 h-7 text-xs"
              onClick={() => setAddPosTab("create")}>Eigene erstellen</Button>
          </div>

          {addPosTab === "catalog" && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="relative shrink-0 mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Katalog durchsuchen..." value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {catalogSuggestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BriefcaseBusiness className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {catalogSearch ? "Keine Treffer." : `Keine Katalog-Vorschläge für „${addPosDept?.name}".`}
                    </p>
                    <Button variant="link" size="sm" className="mt-1 text-xs"
                      onClick={() => setAddPosTab("create")}>
                      Eigene Stelle erstellen
                    </Button>
                  </div>
                ) : (
                  catalogSuggestions.map((entry) => {
                    const added = isAlreadyAdded(entry);
                    return (
                      <div key={entry.key} className="border rounded-md p-3">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl shrink-0">{entry.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="font-medium text-sm">{entry.name}</span>
                              {added && <Badge variant="secondary" className="text-xs">Vorhanden</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{entry.description}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              {entry.trainings.map((t) => (
                                <span key={t.name} className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                                  <CheckCircle className="w-2.5 h-2.5 text-green-500 shrink-0" />{t.name}
                                </span>
                              ))}
                            </div>
                          </div>
                          <Button size="sm" className="shrink-0" disabled={added || addingKey === entry.key}
                            onClick={() => handleAddFromCatalog(entry, addPosDeptId)}>
                            {addingKey === entry.key ? "..." : added ? "Vorhanden" : "Hinzufügen"}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {addPosTab === "create" && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input placeholder="z.B. Staplerfahrer, Elektriker, Lagerleiter"
                  value={positionForm.name}
                  onChange={(e) => setPositionForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Beschreibung</Label>
                <Textarea placeholder="Kurze Beschreibung (optional)"
                  value={positionForm.description}
                  onChange={(e) => setPositionForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Abteilung</Label>
                <Select
                  value={positionForm.department_id || addPosDeptId || "none"}
                  onValueChange={(v) => setPositionForm((f) => ({ ...f, department_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Abteilung zuweisen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine Abteilung</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAddPosDialogOpen(false)}>Abbrechen</Button>
                <Button
                  onClick={async () => {
                    // Pre-fill dept from the dialog context
                    if (!positionForm.department_id && addPosDeptId) {
                      setPositionForm((f) => ({ ...f, department_id: addPosDeptId }));
                    }
                    await handleSavePosition();
                    if (!savingPosition) setAddPosDialogOpen(false);
                  }}
                  disabled={savingPosition || !positionForm.name.trim()}
                >
                  {savingPosition ? "Speichern..." : "Stelle erstellen"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Position Confirmation ─────────────────────────────────── */}
      <AlertDialog open={!!deletePositionId} onOpenChange={(open) => !open && setDeletePositionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stelle löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Stelle und alle zugeordneten Schulungsanforderungen werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePosition}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
