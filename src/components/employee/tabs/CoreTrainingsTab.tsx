import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Infinity,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  employeeId: string;
  employeeNumber?: string;
  companyId: string;
  canEdit: boolean;
  canUploadDocuments?: boolean;
  refreshKey?: number;
}

interface TrainingType {
  id: string;
  name: string;
  validityMonths: number;
  isMandatory: boolean;
}

interface TrainingRecord {
  id: string;
  training_type_id: string;
  status: string;
  completion_date: string | null;
  expiry_date: string | null;
}

interface TrainingRow {
  trainingType: TrainingType;
  record: TrainingRecord | null;
}

type FilterType = "all" | "pending" | "completed";

interface FormData {
  trainingTypeId: string;   // set when opened from a row; empty when opened globally
  trainingName: string;     // free-text name used for global "Status eintragen"
  completionDate: string;
  expiryDate: string;
  noExpiry: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const today = new Date().toISOString().split("T")[0];

const EMPTY_FORM: FormData = {
  trainingTypeId: "",
  trainingName: "",
  completionDate: today,
  expiryDate: "",
  noExpiry: false,
};

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function isCompleted(row: TrainingRow): boolean {
  return row.record?.status === "completed";
}

function StatusBadge({ row }: { row: TrainingRow }) {
  if (isCompleted(row)) {
    const date = row.record?.completion_date
      ? new Date(row.record.completion_date).toLocaleDateString("de-DE")
      : "";
    return (
      <Badge className="gap-1 text-xs bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100">
        <CheckCircle2 className="w-3 h-3" />
        Manuell eingetragen{date ? ` (${date})` : ""}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
      <Clock className="w-3 h-3" />
      Ausstehend
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CoreTrainingsTab({
  employeeId,
  companyId,
  canEdit,
  refreshKey = 0,
}: Props) {
  const [rows, setRows] = useState<TrainingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [noPosition, setNoPosition] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [preselectedTypeId, setPreselectedTypeId] = useState<string | null>(null);

  const [positionPickerOpen, setPositionPickerOpen] = useState(false);
  const [availablePositions, setAvailablePositions] = useState<{ id: string; name: string }[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [assigningPosition, setAssigningPosition] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, companyId, refreshKey]);

  // -------------------------------------------------------------------------
  // Shared: build rows from a typeId→mandatory map and set state
  // -------------------------------------------------------------------------

  async function buildRowsFromTypeMap(typeMap: Map<string, boolean>) {
    const trainingTypeIds = Array.from(typeMap.keys());
    if (trainingTypeIds.length === 0) { setRows([]); return; }

    const { data: typesData } = await supabase
      .from("training_types")
      .select("id, name, validity_months")
      .in("id", trainingTypeIds)
      .order("name");

    const trainingTypes: TrainingType[] = ((typesData as any[]) || []).map((t) => ({
      id: t.id,
      name: t.name,
      validityMonths: t.validity_months ?? 12,
      isMandatory: typeMap.get(t.id) ?? true,
    }));

    const { data: recordsData } = await supabase
      .from("training_records")
      .select("id, training_type_id, status, completion_date, expiry_date")
      .eq("employee_id", employeeId)
      .eq("company_id", companyId);

    const recordsByTypeId: Record<string, TrainingRecord> = {};
    ((recordsData as TrainingRecord[]) || []).forEach((r) => {
      const prev = recordsByTypeId[r.training_type_id];
      if (!prev || (r.completion_date && (!prev.completion_date || r.completion_date > prev.completion_date))) {
        recordsByTypeId[r.training_type_id] = r;
      }
    });

    const combined: TrainingRow[] = trainingTypes.map((tt) => ({
      trainingType: tt,
      record: recordsByTypeId[tt.id] ?? null,
    }));

    const reqTypeIdSet = new Set(trainingTypeIds);
    const manualTypeIds = Object.keys(recordsByTypeId).filter((id) => !reqTypeIdSet.has(id));
    if (manualTypeIds.length > 0) {
      const { data: manualTypesData } = await supabase
        .from("training_types")
        .select("id, name, validity_months")
        .in("id", manualTypeIds)
        .order("name");
      ((manualTypesData as any[]) || []).forEach((t) => {
        combined.push({
          trainingType: { id: t.id, name: t.name, validityMonths: t.validity_months ?? 12, isMandatory: false },
          record: recordsByTypeId[t.id] ?? null,
        });
      });
    }

    setRows(combined);
  }

  // -------------------------------------------------------------------------
  // Data fetching — driven by position_training_requirements
  // -------------------------------------------------------------------------

  async function fetchData() {
    setLoading(true);
    setNoPosition(false);
    try {
      // 1. Employee's assigned positions
      const { data: empPositions } = await supabase
        .from("employee_positions")
        .select("position_id")
        .eq("employee_id", employeeId);

      const positionIds: string[] = ((empPositions as any[]) || []).map((p) => p.position_id);

      if (positionIds.length === 0) {
        // Try to auto-assign positions from the employee's department
        const { data: empData } = await supabase
          .from("employees")
          .select("department_id")
          .eq("id", employeeId)
          .single();

        const deptId = (empData as any)?.department_id;
        if (deptId) {
          const { data: deptPositions } = await supabase
            .from("company_positions")
            .select("id")
            .eq("department_id", deptId)
            .eq("is_active", true);

          if (deptPositions && deptPositions.length > 0) {
            await supabase.from("employee_positions").upsert(
              deptPositions.map((p: any) => ({
                employee_id: employeeId,
                position_id: p.id,
                is_primary: false,
              })),
              { onConflict: "employee_id,position_id" }
            );
            // Re-fetch with the newly assigned positions
            const { data: newEmpPos } = await supabase
              .from("employee_positions")
              .select("position_id")
              .eq("employee_id", employeeId);
            positionIds.push(...((newEmpPos as any[]) || []).map((p) => p.position_id));
          }
        }

        if (positionIds.length === 0) {
          // Fallback: check department_training_requirements directly
          const { data: dtrData } = await (supabase as any)
            .from("department_training_requirements")
            .select("training_type_id, is_mandatory")
            .eq("department_id", deptId || "")
            .eq("company_id", companyId);

          if (dtrData && dtrData.length > 0) {
            await buildRowsFromTypeMap(
              new Map((dtrData as any[]).map((r) => [r.training_type_id, r.is_mandatory ?? true]))
            );
          } else {
            setNoPosition(true);
            setRows([]);
          }
          return;
        }
      }

      // 2. Training requirements for those positions
      const { data: reqData } = await supabase
        .from("position_training_requirements")
        .select("training_type_id, is_mandatory")
        .in("position_id", positionIds);

      if (!reqData || reqData.length === 0) {
        setRows([]);
        return;
      }

      // Deduplicate: if same training_type in multiple positions, mandatory wins
      const typeMap = new Map<string, boolean>();
      ((reqData as any[]) || []).forEach((r) => {
        const prev = typeMap.get(r.training_type_id) ?? false;
        typeMap.set(r.training_type_id, prev || r.is_mandatory);
      });

      await buildRowsFromTypeMap(typeMap);
    } catch (err: any) {
      console.warn("Kernschulungen konnten nicht geladen werden:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Position picker
  // -------------------------------------------------------------------------

  async function openPositionPicker() {
    setPositionPickerOpen(true);
    setLoadingPositions(true);
    try {
      const { data } = await supabase
        .from("company_positions")
        .select("id, name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      setAvailablePositions((data as any[]) || []);
    } finally {
      setLoadingPositions(false);
    }
  }

  async function assignPosition(positionId: string) {
    setAssigningPosition(true);
    try {
      await supabase.from("employee_positions").upsert(
        { employee_id: employeeId, position_id: positionId, is_primary: false },
        { onConflict: "employee_id,position_id" }
      );
      setPositionPickerOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error("Fehler beim Zuweisen der Stelle: " + err.message);
    } finally {
      setAssigningPosition(false);
    }
  }

  // -------------------------------------------------------------------------
  // Dialog
  // -------------------------------------------------------------------------

  function openAddDialog(typeId?: string) {
    const row = rows.find((r) => r.trainingType.id === typeId);
    const existingRecord = row?.record;
    const completionDate = existingRecord?.completion_date ?? today;
    const existingExpiry = existingRecord?.expiry_date ?? null;
    const noExpiry = existingRecord ? !existingExpiry : false;
    const autoExpiry =
      row && completionDate && !noExpiry
        ? addMonths(completionDate, row.trainingType.validityMonths)
        : "";
    setFormData({
      trainingTypeId: typeId || "",
      trainingName: row?.trainingType.name ?? "",
      completionDate,
      expiryDate: existingExpiry ?? autoExpiry,
      noExpiry,
    });
    setPreselectedTypeId(typeId || null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setPreselectedTypeId(null);
    setFormData(EMPTY_FORM);
  }

  function findTrainingType(typeId: string): TrainingType | undefined {
    return rows.find((r) => r.trainingType.id === typeId)?.trainingType;
  }

  function handleTypeChange(typeId: string) {
    const type = findTrainingType(typeId);
    const expiry =
      type && formData.completionDate
        ? addMonths(formData.completionDate, type.validityMonths)
        : "";
    setFormData((prev) => ({ ...prev, trainingTypeId: typeId, expiryDate: expiry }));
  }

  function handleDateChange(date: string) {
    const type = findTrainingType(formData.trainingTypeId);
    const expiry =
      !formData.noExpiry && type && date ? addMonths(date, type.validityMonths) : "";
    setFormData((prev) => ({ ...prev, completionDate: date, expiryDate: expiry }));
  }

  // -------------------------------------------------------------------------
  // Save — writes to training_records
  // -------------------------------------------------------------------------

  async function handleSave() {
    const nameToUse = formData.trainingTypeId
      ? formData.trainingName
      : formData.trainingName.trim();

    if (!nameToUse || !formData.completionDate) {
      toast.error("Bitte Schulungsbezeichnung und Abschlussdatum ausfüllen.");
      return;
    }

    setSaving(true);
    try {
      // Resolve training_type_id: use pre-set id (row-level) or find/create by name (global)
      let typeId = formData.trainingTypeId;
      if (!typeId) {
        const { data: existing } = await supabase
          .from("training_types")
          .select("id")
          .eq("company_id", companyId)
          .ilike("name", nameToUse)
          .maybeSingle();

        if (existing) {
          typeId = existing.id;
        } else {
          const { data: created, error: createErr } = await supabase
            .from("training_types")
            .insert({ company_id: companyId, name: nameToUse, validity_months: 12 })
            .select("id")
            .single();
          if (createErr) throw createErr;
          typeId = created.id;
        }
      }

      const payload = {
        company_id: companyId,
        employee_id: employeeId,
        training_type_id: typeId,
        status: "completed",
        completion_date: formData.completionDate,
        expiry_date: formData.noExpiry ? null : (formData.expiryDate || null),
        assigned_date: formData.completionDate,
      };

      const { error } = await supabase
        .from("training_records")
        .upsert(payload, { onConflict: "employee_id,training_type_id,company_id" });

      if (error) throw error;

      toast.success("Schulungsabschluss eingetragen.");
      closeDialog();
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  async function handleDelete(recordId: string) {
    if (!confirm("Eintrag wirklich entfernen?")) return;
    setDeleting(recordId);
    try {
      const { error } = await supabase
        .from("training_records")
        .delete()
        .eq("id", recordId);
      if (error) throw error;
      toast.success("Eintrag entfernt.");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Löschen.");
    } finally {
      setDeleting(null);
    }
  }

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const pendingRows = rows.filter((r) => !isCompleted(r));
  const completedCount = rows.filter(isCompleted).length;
  const totalCount = rows.length;

  const filteredRows = rows.filter((row) => {
    if (filter === "pending") return !isCompleted(row);
    if (filter === "completed") return isCompleted(row);
    return true;
  });

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <Card data-testid="core-trainings-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Kernschulungen
              </CardTitle>
              <CardDescription>
                {noPosition
                  ? "Keine Stelle zugewiesen — bitte in Einstellungen → Stellen & Schulungen konfigurieren."
                  : `Pflichtschulungen gemäß zugewiesener Stelle — ${completedCount} von ${totalCount} abgeschlossen`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={filter}
                onValueChange={(v) => setFilter(v as FilterType)}
              >
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="completed">Abgeschlossen</SelectItem>
                </SelectContent>
              </Select>
              {canEdit && !noPosition && (
                <Button size="sm" onClick={() => openAddDialog()} data-testid="btn-status-eintragen">
                  <Plus className="w-4 h-4 mr-1" />
                  Status eintragen
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Lade Kernschulungen...
            </div>
          ) : noPosition ? (
            <div className="text-center py-10 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Keine Stelle zugewiesen</p>
              <p className="text-sm mt-1 mb-4">
                Weisen Sie eine Stelle zu, damit die Kernschulungen automatisch erscheinen.
                <br />
                <span className="text-xs opacity-70">
                  Tipp: In <em>Einstellungen → Stellen & Schulungen</em> können Stellen einer Abteilung zugeordnet werden.
                </span>
              </p>
              {canEdit && (
                <Button size="sm" onClick={openPositionPicker}>
                  <Plus className="w-4 h-4 mr-2" />
                  Stelle manuell zuweisen
                </Button>
              )}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Keine Schulungen für diese Stelle definiert</p>
              <p className="text-sm mt-1">
                Konfigurieren Sie unter <em>Einstellungen → Stellen & Schulungen</em> die Anforderungen.
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Keine Schulungen in dieser Kategorie.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Schulung</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gültig bis</TableHead>
                  {canEdit && (
                    <TableHead className="w-28 text-right">Aktionen</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map(({ trainingType, record }) => {
                  const row: TrainingRow = { trainingType, record };
                  const completed = isCompleted(row);
                  return (
                    <TableRow
                      key={trainingType.id}
                      className={completed ? "" : "bg-amber-50/50"}
                      data-testid={`core-training-row-${trainingType.id}`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{trainingType.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {trainingType.isMandatory ? "Pflicht" : "Empfohlen"} ·{" "}
                            {trainingType.validityMonths} Mon.
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge row={row} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record?.expiry_date
                          ? new Date(record.expiry_date).toLocaleDateString("de-DE")
                          : "—"}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => openAddDialog(trainingType.id)}
                              data-testid={`btn-eintragen-${trainingType.id}`}
                            >
                              {completed ? (
                                <>
                                  <Pencil className="w-3 h-3 mr-1" />
                                  Bearbeiten
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3 mr-1" />
                                  Eintragen
                                </>
                              )}
                            </Button>
                            {record && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(record.id)}
                                disabled={deleting === record.id}
                                title="Eintrag entfernen"
                              >
                                {deleting === record.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Dialog: manuellen Abschluss eintragen                             */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md" data-testid="dialog-status-eintragen">
          <DialogHeader>
            <DialogTitle>Schulungsabschluss eintragen</DialogTitle>
            <DialogDescription>
              Manuellen Abschluss einer Kernschulung erfassen
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Schulung *</Label>
              {preselectedTypeId ? (
                <div className="px-3 py-2 rounded-md bg-muted/50 border text-sm font-medium">
                  {formData.trainingName || "—"}
                </div>
              ) : (
                <Input
                  data-testid="input-training-name"
                  placeholder="z.B. Brandschutzunterweisung, Ersthelfer-Kurs …"
                  value={formData.trainingName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, trainingName: e.target.value }))
                  }
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Abschlussdatum *</Label>
              <Input
                type="date"
                data-testid="input-completion-date"
                value={formData.completionDate}
                onChange={(e) => handleDateChange(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="no-expiry"
                data-testid="checkbox-no-expiry"
                checked={formData.noExpiry}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    noExpiry: !!checked,
                    expiryDate: checked ? "" : (prev.completionDate ? addMonths(prev.completionDate, findTrainingType(prev.trainingTypeId)?.validityMonths ?? 12) : ""),
                  }))
                }
              />
              <Label htmlFor="no-expiry" className="cursor-pointer flex items-center gap-1.5">
                <Infinity className="w-3.5 h-3.5" />
                Kein Ablaufdatum (einmalig gültig)
              </Label>
            </div>
            {!formData.noExpiry && (
              <div className="space-y-1.5">
                <Label>Gültig bis (automatisch berechnet)</Label>
                <Input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Eintragen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Position picker dialog */}
      <Dialog open={positionPickerOpen} onOpenChange={setPositionPickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Stelle zuweisen</DialogTitle>
            <DialogDescription>
              Wählen Sie eine Stelle aus. Die zugehörigen Kernschulungen werden automatisch übernommen.
            </DialogDescription>
          </DialogHeader>
          {loadingPositions ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Lade Stellen...
            </div>
          ) : availablePositions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Keine aktiven Stellen gefunden. Bitte zuerst unter <em>Einstellungen → Stellen & Schulungen</em> Stellen anlegen.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availablePositions.map((pos) => (
                <Button
                  key={pos.id}
                  variant="outline"
                  className="w-full justify-start text-left"
                  disabled={assigningPosition}
                  onClick={() => assignPosition(pos.id)}
                >
                  {assigningPosition ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {pos.name}
                </Button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPositionPickerOpen(false)}>Abbrechen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
