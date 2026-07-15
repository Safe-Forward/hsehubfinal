import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Award,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Infinity,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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

interface Props {
  employeeId: string;
  companyId: string;
  canEdit: boolean;
}

interface QualificationType {
  id: string;
  name: string;
  description: string | null;
  default_renewal_days: number | null;
  is_system_default: boolean;
  is_active: boolean;
}

interface EmployeeQualification {
  id: string;
  qualification_type_id: string;
  issued_date: string;
  expiry_date: string | null;
  renewal_interval_days: number | null;
  notes: string | null;
  qualification_types: QualificationType;
}

interface FormData {
  qualification_type_id: string;
  issued_date: string;
  expiry_date: string;
  no_expiry: boolean;
  notes: string;
}

const EMPTY_FORM: FormData = {
  qualification_type_id: "",
  issued_date: new Date().toISOString().split("T")[0],
  expiry_date: "",
  no_expiry: false,
  notes: "",
};

function getExpiryStatus(expiryDate: string | null): "expired" | "warning" | "ok" | "none" {
  if (!expiryDate) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  if (expiry < today) return "expired";
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  if (expiry <= thirtyDays) return "warning";
  return "ok";
}

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Infinity className="w-3 h-3" />
        Kein Ablaufdatum
      </Badge>
    );
  }
  const status = getExpiryStatus(expiryDate);
  const formatted = new Date(expiryDate).toLocaleDateString("de-DE");
  if (status === "expired") {
    return (
      <Badge className="gap-1 text-xs bg-red-100 text-red-800 border-red-300 hover:bg-red-100">
        <AlertTriangle className="w-3 h-3" />
        Abgelaufen: {formatted}
      </Badge>
    );
  }
  if (status === "warning") {
    return (
      <Badge className="gap-1 text-xs bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100">
        <Clock className="w-3 h-3" />
        Läuft ab: {formatted}
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 text-xs bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
      <CheckCircle2 className="w-3 h-3" />
      Gültig bis: {formatted}
    </Badge>
  );
}

export function QualificationsTab({ employeeId, companyId, canEdit }: Props) {
  const { language } = useLanguage();

  const [qualifications, setQualifications] = useState<EmployeeQualification[]>([]);
  const [qualificationTypes, setQualificationTypes] = useState<QualificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  useEffect(() => {
    fetchQualificationTypes();
    fetchEmployeeQualifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, companyId]);

  async function fetchQualificationTypes() {
    try {
      const { data, error } = await supabase
        .from("qualification_types")
        .select("*")
        .or(`company_id.eq.${companyId},is_system_default.eq.true`)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      setQualificationTypes((data as QualificationType[]) || []);
    } catch (err: any) {
      console.warn("Qualifikationstypen konnten nicht geladen werden:", err.message);
    }
  }

  async function fetchEmployeeQualifications() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employee_qualifications")
        .select("*, qualification_types(*)")
        .eq("employee_id", employeeId)
        .order("issued_date", { ascending: false });
      if (error) throw error;
      setQualifications((data as EmployeeQualification[]) || []);
    } catch (err: any) {
      console.warn("Qualifikationen konnten nicht geladen werden:", err.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddDialog() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(q: EmployeeQualification) {
    setEditingId(q.id);
    setFormData({
      qualification_type_id: q.qualification_type_id,
      issued_date: q.issued_date,
      expiry_date: q.expiry_date || "",
      no_expiry: q.expiry_date === null,
      notes: q.notes || "",
    });
    setDialogOpen(true);
  }

  function handleTypeChange(typeId: string) {
    const selectedType = qualificationTypes.find((t) => t.id === typeId);
    let newExpiryDate = formData.expiry_date;
    let newNoExpiry = formData.no_expiry;

    if (selectedType) {
      if (selectedType.default_renewal_days === null) {
        newNoExpiry = true;
        newExpiryDate = "";
      } else if (formData.issued_date) {
        const issued = new Date(formData.issued_date);
        issued.setDate(issued.getDate() + selectedType.default_renewal_days);
        newExpiryDate = issued.toISOString().split("T")[0];
        newNoExpiry = false;
      }
    }

    setFormData((prev) => ({
      ...prev,
      qualification_type_id: typeId,
      expiry_date: newExpiryDate,
      no_expiry: newNoExpiry,
    }));
  }

  function handleIssuedDateChange(date: string) {
    const selectedType = qualificationTypes.find((t) => t.id === formData.qualification_type_id);
    let newExpiryDate = formData.expiry_date;

    if (selectedType?.default_renewal_days && date && !formData.no_expiry) {
      const issued = new Date(date);
      issued.setDate(issued.getDate() + selectedType.default_renewal_days);
      newExpiryDate = issued.toISOString().split("T")[0];
    }

    setFormData((prev) => ({ ...prev, issued_date: date, expiry_date: newExpiryDate }));
  }

  async function handleSave() {
    if (!formData.qualification_type_id || !formData.issued_date) {
      toast.error("Bitte Qualifikationstyp und Ausstellungsdatum ausfüllen.");
      return;
    }

    setSaving(true);
    try {
      const selectedType = qualificationTypes.find((t) => t.id === formData.qualification_type_id);
      const payload = {
        company_id: companyId,
        employee_id: employeeId,
        qualification_type_id: formData.qualification_type_id,
        issued_date: formData.issued_date,
        expiry_date: formData.no_expiry ? null : formData.expiry_date || null,
        renewal_interval_days: selectedType?.default_renewal_days ?? null,
        notes: formData.notes || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("employee_qualifications")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Qualifikation aktualisiert.");
      } else {
        const { error } = await supabase
          .from("employee_qualifications")
          .insert(payload);
        if (error) {
          if (error.code === "23505") {
            toast.error("Diese Qualifikation ist dem Mitarbeiter bereits zugewiesen.");
          } else {
            throw error;
          }
          return;
        }
        toast.success("Qualifikation hinzugefügt.");
      }

      setDialogOpen(false);
      await fetchEmployeeQualifications();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Qualifikation wirklich entfernen?")) return;
    setDeleting(id);
    try {
      const { error } = await supabase
        .from("employee_qualifications")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Qualifikation entfernt.");
      setQualifications((prev) => prev.filter((q) => q.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Löschen.");
    } finally {
      setDeleting(null);
    }
  }

  const expiredCount = qualifications.filter(
    (q) => getExpiryStatus(q.expiry_date) === "expired"
  ).length;
  const warningCount = qualifications.filter(
    (q) => getExpiryStatus(q.expiry_date) === "warning"
  ).length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Qualifikationen &amp; Beauftragungen
              </CardTitle>
              <CardDescription>
                Innerbetriebliche Qualifikationen, Bestellungen und Berechtigungen des Mitarbeiters
              </CardDescription>
            </div>
            {canEdit && (
              <Button onClick={openAddDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Qualifikation hinzufügen
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(expiredCount > 0 || warningCount > 0) && (
            <div className="flex gap-3 mb-4">
              {expiredCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                  <AlertTriangle className="w-4 h-4" />
                  {expiredCount} abgelaufene Qualifikation{expiredCount !== 1 ? "en" : ""}
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                  <Clock className="w-4 h-4" />
                  {warningCount} läuft in &lt;30 Tagen ab
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Lade Qualifikationen...
            </div>
          ) : qualifications.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Noch keine Qualifikationen erfasst</p>
              {canEdit && (
                <Button variant="outline" className="mt-3" onClick={openAddDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Erste Qualifikation hinzufügen
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Qualifikation</TableHead>
                  <TableHead>Ausgestellt</TableHead>
                  <TableHead>Status / Ablauf</TableHead>
                  <TableHead>Notizen</TableHead>
                  {canEdit && <TableHead className="w-24 text-right">Aktionen</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {qualifications.map((q) => (
                  <TableRow
                    key={q.id}
                    className={
                      getExpiryStatus(q.expiry_date) === "expired"
                        ? "bg-red-50"
                        : getExpiryStatus(q.expiry_date) === "warning"
                        ? "bg-yellow-50"
                        : ""
                    }
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{q.qualification_types?.name}</p>
                        {q.qualification_types?.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {q.qualification_types.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(q.issued_date).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell>
                      <ExpiryBadge expiryDate={q.expiry_date} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {q.notes || "—"}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openEditDialog(q)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(q.id)}
                            disabled={deleting === q.id}
                          >
                            {deleting === q.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Qualifikation bearbeiten" : "Qualifikation hinzufügen"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Daten der Qualifikation aktualisieren"
                : "Neue innerbetriebliche Qualifikation oder Beauftragung erfassen"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Qualification Type */}
            <div className="space-y-1.5">
              <Label>Qualifikationstyp *</Label>
              <Select
                value={formData.qualification_type_id}
                onValueChange={handleTypeChange}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Typ auswählen..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {qualificationTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div>
                        <span>{t.name}</span>
                        {t.is_system_default && (
                          <span className="ml-2 text-xs text-muted-foreground">(Standard)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.qualification_type_id && (() => {
                const t = qualificationTypes.find((x) => x.id === formData.qualification_type_id);
                return t?.description ? (
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                ) : null;
              })()}
            </div>

            {/* Issued Date */}
            <div className="space-y-1.5">
              <Label>Ausstellungsdatum *</Label>
              <Input
                type="date"
                value={formData.issued_date}
                onChange={(e) => handleIssuedDateChange(e.target.value)}
              />
            </div>

            {/* No Expiry Checkbox */}
            <div className="flex items-center gap-2">
              <input
                id="no-expiry"
                type="checkbox"
                className="w-4 h-4 cursor-pointer"
                checked={formData.no_expiry}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    no_expiry: e.target.checked,
                    expiry_date: e.target.checked ? "" : prev.expiry_date,
                  }))
                }
              />
              <Label htmlFor="no-expiry" className="cursor-pointer font-normal">
                Kein Ablaufdatum (unbefristet)
              </Label>
            </div>

            {/* Expiry Date */}
            {!formData.no_expiry && (
              <div className="space-y-1.5">
                <Label>Ablaufdatum</Label>
                <Input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, expiry_date: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Wird automatisch berechnet wenn der Qualifikationstyp ein Standardintervall hat.
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notizen</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Optionale Anmerkungen, z.B. Zertifikatsnummer, Schulungsträger..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
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
                  {editingId ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {editingId ? "Aktualisieren" : "Hinzufügen"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
