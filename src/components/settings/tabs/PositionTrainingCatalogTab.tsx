import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Building2,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Department {
  id: string;
  name: string;
}

interface TrainingType {
  id: string;
  name: string;
  duration_hours: number | null;
  validity_months: number | null;
}

interface Props {
  companyId: string;
}

// Flat system catalog — deptKeywords=[] means universal (show for every dept)
const SYSTEM_CATALOG = [
  // ── Universal ──────────────────────────────────────────────────────────────
  { name: "Arbeitssicherheit – Grundunterweisung", durationHours: 1, validityMonths: 12, deptKeywords: [] as string[] },
  { name: "Brandschutzunterweisung", durationHours: 1, validityMonths: 12, deptKeywords: [] },
  { name: "Erste Hilfe", durationHours: 16, validityMonths: 24, deptKeywords: [] },
  { name: "PSA-Unterweisung", durationHours: 1, validityMonths: 12, deptKeywords: [] },
  { name: "Datenschutz (DSGVO)", durationHours: 2, validityMonths: 12, deptKeywords: [] },
  // ── Lager & Logistik ───────────────────────────────────────────────────────
  { name: "Gabelstapler-Fahrerlaubnis (DGUV G 308-001)", durationHours: 16, validityMonths: 36, deptKeywords: ["lager", "logistik"] },
  { name: "Fahrerschulung Flurförderzeuge (DGUV V 68)", durationHours: 8, validityMonths: 36, deptKeywords: ["lager", "logistik"] },
  { name: "Sicherheitsunterweisung Flurförderzeuge", durationHours: 2, validityMonths: 12, deptKeywords: ["lager", "logistik"] },
  { name: "Heben und Tragen / Rückengerechtes Arbeiten", durationHours: 2, validityMonths: 12, deptKeywords: ["lager", "logistik", "pflege"] },
  { name: "Fahrsicherheitstraining für Firmenfahrzeuge", durationHours: 8, validityMonths: 36, deptKeywords: ["logistik", "transport", "fahrer"] },
  { name: "Kranführerschein (DGUV G 309-004)", durationHours: 32, validityMonths: 60, deptKeywords: ["lager", "logistik", "produktion", "schwerlast"] },
  // ── IT & Technik ───────────────────────────────────────────────────────────
  { name: "Elektrische Anlagen / Schaltberechtigung (DGUV V 3)", durationHours: 8, validityMonths: 36, deptKeywords: ["technik", "elektro", "it"] },
  { name: "Hochvolt-Schulung (DGUV I 209-093)", durationHours: 16, validityMonths: 36, deptKeywords: ["technik", "kfz", "fahrzeug"] },
  { name: "Bildschirmarbeitsplatz-Unterweisung", durationHours: 1, validityMonths: 12, deptKeywords: ["it", "verwaltung", "büro", "office"] },
  // ── Baustelle ──────────────────────────────────────────────────────────────
  { name: "Absturzsicherung / PSAgA (DGUV R 112-198)", durationHours: 8, validityMonths: 12, deptKeywords: ["baustelle", "bau", "dach"] },
  { name: "Gefahrstoffunterweisung (§ 14 GefStoffV)", durationHours: 4, validityMonths: 12, deptKeywords: ["baustelle", "chemie", "labor"] },
  { name: "Atemschutzunterweisung (DGUV R 112-190)", durationHours: 4, validityMonths: 12, deptKeywords: ["baustelle", "chemie", "arbeitssicherheit"] },
  { name: "Arbeiten in engen Räumen (DGUV R 113-004)", durationHours: 8, validityMonths: 12, deptKeywords: ["baustelle", "kanal", "tiefbau"] },
  // ── Produktion ─────────────────────────────────────────────────────────────
  { name: "Maschinenführer-Unterweisung", durationHours: 4, validityMonths: 12, deptKeywords: ["produktion", "fertigung", "maschinen"] },
  { name: "Schweißerlaubnis / Qualifikation (DVS)", durationHours: 24, validityMonths: 24, deptKeywords: ["produktion", "metall", "werkstatt"] },
  { name: "Lärm- und Vibrations-Unterweisung (LärmVibrationsArbSchV)", durationHours: 2, validityMonths: 12, deptKeywords: ["produktion", "fertigung", "lager"] },
  { name: "Explosionsschutz-Unterweisung (ATEX)", durationHours: 4, validityMonths: 12, deptKeywords: ["chemie", "produktion"] },
  // ── Chemie & Labor ─────────────────────────────────────────────────────────
  { name: "Biologische Arbeitsstoffe (BioStoffV § 12)", durationHours: 4, validityMonths: 12, deptKeywords: ["labor", "chemie", "pflege"] },
  { name: "Laserschutzunterweisung (OStrV)", durationHours: 4, validityMonths: 12, deptKeywords: ["labor", "forschung"] },
  // ── Arbeitssicherheit ──────────────────────────────────────────────────────
  { name: "SCC-Zertifizierung", durationHours: 8, validityMonths: 36, deptKeywords: ["arbeitssicherheit", "sicherheit"] },
  { name: "Gefährdungsbeurteilung (ArbSchG § 5)", durationHours: 4, validityMonths: 24, deptKeywords: ["arbeitssicherheit", "sicherheit"] },
];

function getCatalogForDept(deptName: string) {
  const q = deptName.toLowerCase();
  return SYSTEM_CATALOG.filter(
    (entry) =>
      entry.deptKeywords.length === 0 ||
      entry.deptKeywords.some((kw) => q.includes(kw) || kw.includes(q.split(/\s|&/)[0].trim()))
  );
}

export function PositionTrainingCatalogTab({ companyId }: Props) {
  const { toast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [deptReqs, setDeptReqs] = useState<Record<string, string[]>>({});
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Add-training dialog (per dept)
  const [addDeptId, setAddDeptId] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState("");
  const [addingName, setAddingName] = useState<string | null>(null);

  // Inline create form inside add dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", duration_hours: "", validity_months: "" });
  const [creating, setCreating] = useState(false);

  // Global create dialog (no specific dept)
  const [globalCreateOpen, setGlobalCreateOpen] = useState(false);
  const [globalCreateDeptId, setGlobalCreateDeptId] = useState("");
  const [globalCreateForm, setGlobalCreateForm] = useState({ name: "", duration_hours: "", validity_months: "" });
  const [globalCreating, setGlobalCreating] = useState(false);

  useEffect(() => {
    if (companyId) fetchAll();
  }, [companyId]);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchDepartments(), fetchTrainingTypes(), fetchDeptReqs()]);
    setLoading(false);
  }

  async function fetchDepartments() {
    const { data } = await supabase
      .from("departments")
      .select("id, name")
      .eq("company_id", companyId)
      .order("name");
    setDepartments(data || []);
    setExpandedDepts(new Set((data || []).map((d: Department) => d.id)));
  }

  async function fetchTrainingTypes() {
    const { data } = await supabase
      .from("training_types")
      .select("id, name, duration_hours, validity_months")
      .eq("company_id", companyId)
      .order("name");
    setTrainingTypes(data || []);
  }

  async function fetchDeptReqs() {
    const { data } = await (supabase as any)
      .from("department_training_requirements")
      .select("department_id, training_type_id")
      .eq("company_id", companyId);
    const map: Record<string, string[]> = {};
    (data || []).forEach((r: any) => {
      if (!map[r.department_id]) map[r.department_id] = [];
      map[r.department_id].push(r.training_type_id);
    });
    setDeptReqs(map);
  }

  function toggleDept(deptId: string) {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  }

  async function removeTraining(deptId: string, trainingTypeId: string) {
    await (supabase as any)
      .from("department_training_requirements")
      .delete()
      .eq("department_id", deptId)
      .eq("training_type_id", trainingTypeId)
      .eq("company_id", companyId);
    setDeptReqs((prev) => ({
      ...prev,
      [deptId]: (prev[deptId] || []).filter((id) => id !== trainingTypeId),
    }));
  }

  // Adds a training_type_id to a dept requirement (creates DB record)
  async function assignTrainingToDept(deptId: string, trainingTypeId: string) {
    await (supabase as any)
      .from("department_training_requirements")
      .insert({ department_id: deptId, training_type_id: trainingTypeId, company_id: companyId, is_mandatory: true });
    setDeptReqs((prev) => ({
      ...prev,
      [deptId]: [...(prev[deptId] || []), trainingTypeId],
    }));
  }

  // Find or create training_type by name, then assign to dept
  async function addFromCatalog(deptId: string, entry: typeof SYSTEM_CATALOG[0]) {
    setAddingName(entry.name);
    try {
      let typeId: string;
      const existing = trainingTypes.find((tt) => tt.name.toLowerCase() === entry.name.toLowerCase());
      if (existing) {
        typeId = existing.id;
      } else {
        const { data, error } = await supabase
          .from("training_types")
          .insert([{ company_id: companyId, name: entry.name, duration_hours: entry.durationHours, validity_months: entry.validityMonths }])
          .select("id, name, duration_hours, validity_months")
          .single();
        if (error) throw error;
        typeId = data.id;
        setTrainingTypes((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      }
      const alreadyAssigned = (deptReqs[deptId] || []).includes(typeId);
      if (!alreadyAssigned) await assignTrainingToDept(deptId, typeId);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setAddingName(null);
    }
  }

  // Add an existing training_type to a dept
  async function addExistingToDept(deptId: string, trainingTypeId: string) {
    setAddingName(trainingTypeId);
    try {
      await assignTrainingToDept(deptId, trainingTypeId);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setAddingName(null);
    }
  }

  // Create new training_type inline and assign to current add-dialog dept
  async function handleInlineCreate() {
    if (!createForm.name.trim() || !addDeptId) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("training_types")
        .insert([{
          company_id: companyId,
          name: createForm.name.trim(),
          duration_hours: createForm.duration_hours ? Number(createForm.duration_hours) : null,
          validity_months: createForm.validity_months ? Number(createForm.validity_months) : null,
        }])
        .select("id, name, duration_hours, validity_months")
        .single();
      if (error) throw error;
      setTrainingTypes((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      await assignTrainingToDept(addDeptId, data.id);
      setCreateForm({ name: "", duration_hours: "", validity_months: "" });
      setShowCreate(false);
      toast({ title: `"${data.name}" erstellt und zugeordnet` });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  // Global create (standalone dialog, optional dept)
  async function handleGlobalCreate() {
    if (!globalCreateForm.name.trim()) return;
    setGlobalCreating(true);
    try {
      const { data, error } = await supabase
        .from("training_types")
        .insert([{
          company_id: companyId,
          name: globalCreateForm.name.trim(),
          duration_hours: globalCreateForm.duration_hours ? Number(globalCreateForm.duration_hours) : null,
          validity_months: globalCreateForm.validity_months ? Number(globalCreateForm.validity_months) : null,
        }])
        .select("id, name, duration_hours, validity_months")
        .single();
      if (error) throw error;
      setTrainingTypes((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      if (globalCreateDeptId && globalCreateDeptId !== "none") {
        await assignTrainingToDept(globalCreateDeptId, data.id);
        toast({ title: `"${data.name}" erstellt und der Abteilung zugeordnet` });
      } else {
        toast({ title: `"${data.name}" erstellt` });
      }
      setGlobalCreateForm({ name: "", duration_hours: "", validity_months: "" });
      setGlobalCreateDeptId("");
      setGlobalCreateOpen(false);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setGlobalCreating(false);
    }
  }

  const addDept = departments.find((d) => d.id === addDeptId);
  const catalogForAddDept = addDept ? getCatalogForDept(addDept.name) : [];
  const assignedInAddDept = deptReqs[addDeptId || ""] || [];

  const searchQ = addSearch.toLowerCase();

  const catalogMatches = catalogForAddDept.filter(
    (e) =>
      !assignedInAddDept.some(
        (id) => trainingTypes.find((tt) => tt.id === id)?.name.toLowerCase() === e.name.toLowerCase()
      ) &&
      (!searchQ || e.name.toLowerCase().includes(searchQ))
  );

  const existingMatches = trainingTypes.filter(
    (tt) =>
      !assignedInAddDept.includes(tt.id) &&
      !catalogForAddDept.some((e) => e.name.toLowerCase() === tt.name.toLowerCase()) &&
      (!searchQ || tt.name.toLowerCase().includes(searchQ))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Kernschulungen nach Abteilung</h3>
          <p className="text-sm text-muted-foreground">
            Definiere welche Schulungen für alle Mitarbeiter einer Abteilung Pflicht sind
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => {
            setGlobalCreateForm({ name: "", duration_hours: "", validity_months: "" });
            setGlobalCreateDeptId("");
            setGlobalCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Schulungstyp erstellen
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
          {departments.map((dept) => {
            const isExpanded = expandedDepts.has(dept.id);
            const assignedIds = deptReqs[dept.id] || [];
            const assignedTypes = assignedIds
              .map((id) => trainingTypes.find((tt) => tt.id === id))
              .filter(Boolean) as TrainingType[];

            return (
              <Card key={dept.id} className="overflow-hidden">
                <CardHeader
                  className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleDept(dept.id)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{dept.name}</span>
                    <Badge variant={assignedTypes.length > 0 ? "default" : "outline"} className="text-xs">
                      {assignedTypes.length} Schulung{assignedTypes.length !== 1 ? "en" : ""}
                    </Badge>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 border-t px-4 py-4">
                    {assignedTypes.length === 0 ? (
                      <p className="text-sm text-muted-foreground mb-3">
                        Noch keine Kernschulungen zugeordnet.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {assignedTypes.map((tt) => (
                          <span
                            key={tt.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20"
                          >
                            <BookOpen className="w-3 h-3 shrink-0" />
                            {tt.name}
                            {tt.validity_months && (
                              <span className="text-xs opacity-60 ml-0.5">· {tt.validity_months} Mon.</span>
                            )}
                            <button
                              onClick={() => removeTraining(dept.id, tt.id)}
                              className="ml-0.5 hover:opacity-70 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddDeptId(dept.id);
                        setAddSearch("");
                        setShowCreate(false);
                        setCreateForm({ name: "", duration_hours: "", validity_months: "" });
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Schulung hinzufügen
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Add Training Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!addDeptId} onOpenChange={(open) => { if (!open) setAddDeptId(null); }}>
        <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              Schulung hinzufügen
              {addDept && <span className="font-normal text-muted-foreground ml-1">– {addDept.name}</span>}
            </DialogTitle>
            <DialogDescription>
              Aus dem Systemkatalog wählen, bestehende hinzufügen oder neu erstellen.
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Schulung suchen..."
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
            {/* Catalog suggestions for this dept */}
            {catalogMatches.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Systemkatalog{addDept ? ` · ${addDept.name}` : ""}
                  </span>
                </div>
                <div className="space-y-1">
                  {catalogMatches.map((entry) => {
                    const isAdding = addingName === entry.name;
                    return (
                      <div
                        key={entry.name}
                        className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 hover:bg-muted/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{entry.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.durationHours}h
                            {entry.validityMonths ? ` · ${entry.validityMonths} Mon. Gültigkeit` : ""}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs shrink-0"
                          disabled={isAdding}
                          onClick={() => addFromCatalog(addDeptId!, entry)}
                        >
                          {isAdding ? "..." : "+ Hinzufügen"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Existing company training types not yet in this dept */}
            {existingMatches.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Eigene Schulungen
                  </span>
                </div>
                <div className="space-y-1">
                  {existingMatches.map((tt) => {
                    const isAdding = addingName === tt.id;
                    return (
                      <div
                        key={tt.id}
                        className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 hover:bg-muted/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{tt.name}</p>
                          {tt.validity_months && (
                            <p className="text-xs text-muted-foreground">{tt.validity_months} Mon. Gültigkeit</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs shrink-0"
                          disabled={isAdding}
                          onClick={() => addExistingToDept(addDeptId!, tt.id)}
                        >
                          {isAdding ? "..." : "+ Hinzufügen"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {catalogMatches.length === 0 && existingMatches.length === 0 && !showCreate && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {addSearch ? "Keine Treffer." : "Alle Schulungen bereits zugeordnet."}
              </p>
            )}

            {/* Inline create */}
            {showCreate ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-semibold text-primary">Neue Schulung erstellen</p>
                <Input
                  placeholder="Name der Schulung *"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Dauer (Std.)"
                    type="number"
                    min={0}
                    value={createForm.duration_hours}
                    onChange={(e) => setCreateForm((f) => ({ ...f, duration_hours: e.target.value }))}
                  />
                  <Input
                    placeholder="Gültigkeit (Monate)"
                    type="number"
                    min={0}
                    value={createForm.validity_months}
                    onChange={(e) => setCreateForm((f) => ({ ...f, validity_months: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleInlineCreate}
                    disabled={creating || !createForm.name.trim()}
                    className="gap-1"
                  >
                    {creating ? "Erstellen..." : "Erstellen & zuordnen"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setShowCreate(false); setCreateForm({ name: "", duration_hours: "", validity_months: "" }); }}
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-1 text-muted-foreground"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Neue Schulung erstellen und zuordnen
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Global Create Dialog ────────────────────────────────────────── */}
      <Dialog open={globalCreateOpen} onOpenChange={setGlobalCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schulungstyp erstellen</DialogTitle>
            <DialogDescription>
              Erstelle einen neuen Schulungstyp und weise ihn optional direkt einer Abteilung zu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="z.B. Staplerschein, SCC-Zertifizierung, ..."
                value={globalCreateForm.name}
                onChange={(e) => setGlobalCreateForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dauer (Stunden)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="z.B. 8"
                  value={globalCreateForm.duration_hours}
                  onChange={(e) => setGlobalCreateForm((f) => ({ ...f, duration_hours: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gültigkeit (Monate)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="z.B. 12"
                  value={globalCreateForm.validity_months}
                  onChange={(e) => setGlobalCreateForm((f) => ({ ...f, validity_months: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Abteilung zuordnen (optional)</Label>
              <Select
                value={globalCreateDeptId || "none"}
                onValueChange={(v) => setGlobalCreateDeptId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Abteilung wählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine (nur erstellen)</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGlobalCreateOpen(false)}>Abbrechen</Button>
            <Button onClick={handleGlobalCreate} disabled={globalCreating || !globalCreateForm.name.trim()}>
              {globalCreating ? "Erstellen..." : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
