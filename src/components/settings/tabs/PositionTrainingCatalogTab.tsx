import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { ScrollArea } from "@/components/ui/scroll-area";

interface Position {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
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

const emptyPositionForm = { name: "", description: "" };

export function PositionTrainingCatalogTab({ companyId }: Props) {
  const { toast } = useToast();

  const [positions, setPositions] = useState<Position[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [requirements, setRequirements] = useState<Record<string, PositionRequirement[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());

  // Position dialog
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [positionForm, setPositionForm] = useState(emptyPositionForm);
  const [savingPosition, setSavingPosition] = useState(false);

  // Training assignment dialog
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [selectedTrainings, setSelectedTrainings] = useState<Set<string>>(new Set());
  const [savingTrainings, setSavingTrainings] = useState(false);

  // Delete
  const [deletePositionId, setDeletePositionId] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      fetchAll();
    }
  }, [companyId]);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchPositions(), fetchTrainingTypes()]);
    setLoading(false);
  }

  async function fetchPositions() {
    const { data, error } = await supabase
      .from("company_positions")
      .select("*")
      .eq("company_id", companyId)
      .order("name");
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    setPositions(data || []);
    // Fetch requirements for all positions
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
    if (error) {
      toast({ title: "Fehler beim Laden der Schulungstypen", description: error.message, variant: "destructive" });
      return;
    }
    setTrainingTypes(data || []);
  }

  async function fetchRequirementsForPositions(positionIds: string[]) {
    if (positionIds.length === 0) return;
    const { data, error } = await supabase
      .from("position_training_requirements")
      .select("*, training_type:training_types(id, name, description, duration_hours, validity_months)")
      .in("position_id", positionIds);
    if (error) {
      toast({ title: "Fehler beim Laden der Schulungsanforderungen", description: error.message, variant: "destructive" });
      return;
    }
    // Group by position_id
    const grouped: Record<string, PositionRequirement[]> = {};
    for (const req of data || []) {
      if (!grouped[req.position_id]) grouped[req.position_id] = [];
      grouped[req.position_id].push(req as PositionRequirement);
    }
    setRequirements(grouped);
  }

  function toggleExpand(positionId: string) {
    setExpandedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(positionId)) next.delete(positionId);
      else next.add(positionId);
      return next;
    });
  }

  // Position CRUD
  function openCreatePosition() {
    setEditingPositionId(null);
    setPositionForm(emptyPositionForm);
    setPositionDialogOpen(true);
  }

  function openEditPosition(p: Position) {
    setEditingPositionId(p.id);
    setPositionForm({ name: p.name, description: p.description || "" });
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
    };
    let error;
    if (editingPositionId) {
      ({ error } = await supabase
        .from("company_positions")
        .update(payload)
        .eq("id", editingPositionId));
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
    const { error } = await supabase
      .from("company_positions")
      .delete()
      .eq("id", deletePositionId);
    if (error) {
      toast({ title: "Fehler beim Löschen", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Stelle gelöscht" });
      setPositions((prev) => prev.filter((p) => p.id !== deletePositionId));
      setRequirements((prev) => {
        const next = { ...prev };
        delete next[deletePositionId];
        return next;
      });
    }
    setDeletePositionId(null);
  }

  async function handleToggleActive(position: Position) {
    const { error } = await supabase
      .from("company_positions")
      .update({ is_active: !position.is_active })
      .eq("id", position.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setPositions((prev) =>
        prev.map((p) => (p.id === position.id ? { ...p, is_active: !p.is_active } : p))
      );
    }
  }

  // Training assignment
  function openTrainingDialog(positionId: string) {
    setSelectedPositionId(positionId);
    const existing = (requirements[positionId] || []).map((r) => r.training_type_id);
    setSelectedTrainings(new Set(existing));
    setTrainingDialogOpen(true);
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
      ops.push(
        supabase.from("position_training_requirements").insert(
          toAdd.map((tid) => ({
            position_id: selectedPositionId,
            training_type_id: tid,
            is_mandatory: true,
          }))
        )
      );
    }
    for (const req of toRemove) {
      ops.push(
        supabase.from("position_training_requirements").delete().eq("id", req.id)
      );
    }

    const results = await Promise.all(ops);
    const hasError = results.some((r) => r.error);
    if (hasError) {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    } else {
      toast({ title: "Schulungsanforderungen gespeichert" });
      setTrainingDialogOpen(false);
      await fetchRequirementsForPositions([selectedPositionId]);
    }
    setSavingTrainings(false);
  }

  async function handleRemoveTraining(positionId: string, requirementId: string) {
    const { error } = await supabase
      .from("position_training_requirements")
      .delete()
      .eq("id", requirementId);
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

  const activePositions = positions.filter((p) => p.is_active);
  const inactivePositions = positions.filter((p) => !p.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Stellen &amp; Schulungsanforderungen</h3>
          <p className="text-sm text-muted-foreground">
            Definiere Stellen und ordne ihnen Pflicht-Schulungen zu
          </p>
        </div>
        <Button onClick={openCreatePosition} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Stelle hinzufügen
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Lade Stellen...</div>
      ) : positions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BriefcaseBusiness className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Noch keine Stellen definiert</p>
            <p className="text-xs mt-1">
              Erstelle Stellen und weise ihnen Pflicht-Schulungen zu.
            </p>
            <Button onClick={openCreatePosition} variant="outline" size="sm" className="mt-4 gap-1">
              <Plus className="h-4 w-4" />
              Erste Stelle erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Active positions */}
          {activePositions.map((position) => {
            const isExpanded = expandedPositions.has(position.id);
            const reqs = requirements[position.id] || [];
            return (
              <Card key={position.id} className="overflow-hidden">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => toggleExpand(position.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{position.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {reqs.length} Schulung{reqs.length !== 1 ? "en" : ""}
                        </Badge>
                      </div>
                      {position.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {position.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={position.is_active}
                          onCheckedChange={() => handleToggleActive(position)}
                          className="scale-75"
                        />
                        <span className="text-xs text-muted-foreground">Aktiv</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditPosition(position)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletePositionId(position.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 pb-4 px-4 border-t">
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Zugeordnete Schulungen
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => openTrainingDialog(position.id)}
                        >
                          <Plus className="h-3 w-3" />
                          Schulung zuordnen
                        </Button>
                      </div>

                      {reqs.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3 text-center">
                          Noch keine Schulungen zugeordnet.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {reqs.map((req) => (
                            <div
                              key={req.id}
                              className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-sm truncate">
                                  {req.training_type?.name || "Unbekannte Schulung"}
                                </span>
                                {req.is_mandatory && (
                                  <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                                    Pflicht
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {req.training_type?.validity_months && (
                                  <span className="text-xs text-muted-foreground">
                                    {req.training_type.validity_months} Mon.
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleRemoveTraining(position.id, req.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Inactive positions */}
          {inactivePositions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-4">
                Deaktivierte Stellen
              </p>
              {inactivePositions.map((position) => (
                <Card key={position.id} className="opacity-60">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium flex-1">{position.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Switch
                          checked={position.is_active}
                          onCheckedChange={() => handleToggleActive(position)}
                          className="scale-75"
                        />
                        <span className="text-xs text-muted-foreground">Aktiv</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletePositionId(position.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Position Add/Edit Dialog */}
      <Dialog open={positionDialogOpen} onOpenChange={setPositionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPositionId ? "Stelle bearbeiten" : "Neue Stelle"}</DialogTitle>
            <DialogDescription>
              Definiere eine Stelle/Position und weise ihr danach Pflicht-Schulungen zu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pos_name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pos_name"
                placeholder="z.B. Staplerfahrer, Elektriker, Lagerleiter"
                value={positionForm.name}
                onChange={(e) => setPositionForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pos_description">Beschreibung</Label>
              <Textarea
                id="pos_description"
                placeholder="Kurze Beschreibung der Stelle (optional)"
                value={positionForm.description}
                onChange={(e) => setPositionForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPositionDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSavePosition} disabled={savingPosition}>
              {savingPosition ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Training Assignment Dialog */}
      <Dialog open={trainingDialogOpen} onOpenChange={setTrainingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schulungen zuordnen</DialogTitle>
            <DialogDescription>
              Wähle die Pflicht-Schulungen für diese Stelle aus.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {trainingTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Keine Schulungstypen vorhanden. Erstelle zuerst Schulungstypen im Schulungskatalog.
              </p>
            ) : (
              <ScrollArea className="max-h-72 pr-2">
                <div className="space-y-2">
                  {trainingTypes.map((tt) => {
                    const checked = selectedTrainings.has(tt.id);
                    return (
                      <div
                        key={tt.id}
                        className={`flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                          checked ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                        }`}
                        onClick={() => toggleTraining(tt.id)}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleTraining(tt.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{tt.name}</span>
                            {checked && (
                              <CheckCircle className="h-3.5 w-3.5 text-primary" />
                            )}
                          </div>
                          {tt.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {tt.description}
                            </p>
                          )}
                          <div className="flex gap-3 mt-1">
                            {tt.duration_hours && (
                              <span className="text-xs text-muted-foreground">
                                {tt.duration_hours} Std.
                              </span>
                            )}
                            {tt.validity_months && (
                              <span className="text-xs text-muted-foreground">
                                Gültigkeit: {tt.validity_months} Monate
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrainingDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSaveTrainings}
              disabled={savingTrainings || trainingTypes.length === 0}
            >
              {savingTrainings ? "Speichern..." : `${selectedTrainings.size} Schulung${selectedTrainings.size !== 1 ? "en" : ""} zuordnen`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Position Confirmation */}
      <AlertDialog
        open={!!deletePositionId}
        onOpenChange={(open) => !open && setDeletePositionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stelle löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Stelle und alle zugeordneten Schulungsanforderungen werden gelöscht. Diese Aktion
              kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePosition}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
