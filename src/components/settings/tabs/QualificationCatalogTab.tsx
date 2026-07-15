import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Loader2,
  Award,
  Globe,
  Building2,
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  companyId: string;
}

interface QualificationType {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  default_renewal_days: number | null;
  is_system_default: boolean;
  is_active: boolean;
}

interface NewTypeForm {
  name: string;
  description: string;
  default_renewal_days: string;
  has_renewal: boolean;
}

const EMPTY_FORM: NewTypeForm = {
  name: "",
  description: "",
  default_renewal_days: "",
  has_renewal: true,
};

export function QualificationCatalogTab({ companyId }: Props) {
  const [types, setTypes] = useState<QualificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NewTypeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function fetchTypes() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("qualification_types")
        .select("*")
        .or(`company_id.eq.${companyId},is_system_default.eq.true`)
        .order("is_system_default", { ascending: false })
        .order("name");
      if (error) throw error;
      setTypes((data as QualificationType[]) || []);
    } catch (err: any) {
      console.warn("Qualifikationstypen konnten nicht geladen werden:", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(type: QualificationType) {
    setTogglingId(type.id);
    try {
      let query = supabase
        .from("qualification_types")
        .update({ is_active: !type.is_active })
        .eq("id", type.id);

      if (!type.is_system_default) {
        query = query.eq("company_id", companyId);
      }

      const { error } = await query;
      if (error) throw error;
      setTypes((prev) =>
        prev.map((t) => (t.id === type.id ? { ...t, is_active: !t.is_active } : t))
      );
      toast.success(type.is_active ? "Qualifikationstyp deaktiviert." : "Qualifikationstyp aktiviert.");
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(type: QualificationType) {
    if (type.is_system_default) {
      toast.error("System-Standards können nicht gelöscht werden.");
      return;
    }
    if (!confirm(`Qualifikationstyp "${type.name}" wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.`)) return;

    setDeletingId(type.id);
    try {
      // Check if any employee has this qualification assigned
      const { count, error: countError } = await supabase
        .from("employee_qualifications")
        .select("id", { count: "exact", head: true })
        .eq("qualification_type_id", type.id);
      if (countError) throw countError;

      if (count && count > 0) {
        toast.error(
          `Dieser Qualifikationstyp ist noch ${count} Mitarbeiter${count !== 1 ? "n" : ""} zugewiesen und kann nicht gelöscht werden.`
        );
        return;
      }

      const { error } = await supabase
        .from("qualification_types")
        .delete()
        .eq("id", type.id)
        .eq("company_id", companyId);
      if (error) throw error;
      setTypes((prev) => prev.filter((t) => t.id !== type.id));
      toast.success("Qualifikationstyp gelöscht.");
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Löschen.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      toast.error("Bitte einen Namen eingeben.");
      return;
    }
    setSaving(true);
    try {
      const renewalDays =
        form.has_renewal && form.default_renewal_days
          ? parseInt(form.default_renewal_days, 10)
          : null;

      const { error } = await supabase.from("qualification_types").insert({
        company_id: companyId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        default_renewal_days: renewalDays,
        is_system_default: false,
        is_active: true,
      });
      if (error) throw error;
      toast.success("Qualifikationstyp hinzugefügt.");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      await fetchTypes();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  const systemTypes = types.filter((t) => t.is_system_default);
  const companyTypes = types.filter((t) => !t.is_system_default);

  function formatRenewal(days: number | null) {
    if (days === null) return "—";
    if (days % 365 === 0) return `${days / 365} Jahr${days / 365 !== 1 ? "e" : ""}`;
    if (days % 30 === 0) return `${days / 30} Monate`;
    return `${days} Tage`;
  }

  return (
    <div className="space-y-6">
      {/* Company-specific qualifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Eigene Qualifikationstypen
              </CardTitle>
              <CardDescription>
                Unternehmensspezifische Qualifikationen, die nicht im System-Katalog enthalten sind
              </CardDescription>
            </div>
            <Button onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Typ hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Lade Katalog...
            </div>
          ) : companyTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Noch keine eigenen Qualifikationstypen angelegt</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true); }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ersten Typ anlegen
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Erneuerungsintervall</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20 text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">
                      {type.description || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatRenewal(type.default_renewal_days)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={type.is_active}
                          onCheckedChange={() => handleToggleActive(type)}
                          disabled={togglingId === type.id}
                        />
                        <span className="text-sm text-muted-foreground">
                          {type.is_active ? "Aktiv" : "Inaktiv"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(type)}
                        disabled={deletingId === type.id}
                      >
                        {deletingId === type.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* System defaults (read-only, informational) */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              System-Standardkatalog
            </CardTitle>
            <CardDescription>
              Vordefinierte Qualifikationstypen aus dem HSE-Standardkatalog — automatisch in allen Unternehmen verfügbar
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Lade Katalog...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Erneuerungsintervall</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systemTypes.map((type) => (
                  <TableRow
                    key={type.id}
                    className={type.is_active ? "text-muted-foreground" : "text-muted-foreground opacity-50"}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${type.is_active ? "text-foreground" : "text-muted-foreground"}`}>
                          {type.name}
                        </span>
                        <Badge variant="secondary" className="text-xs">System</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm max-w-[240px] truncate">
                      {type.description || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatRenewal(type.default_renewal_days)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={type.is_active}
                          onCheckedChange={() => handleToggleActive(type)}
                          disabled={togglingId === type.id}
                        />
                        <span className="text-sm text-muted-foreground">
                          {type.is_active ? "Aktiv" : "Inaktiv"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Neuen Qualifikationstyp anlegen
            </DialogTitle>
            <DialogDescription>
              Unternehmensspezifische Qualifikation zum Katalog hinzufügen
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Hochvoltfahrzeug-Beauftragter"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Beschreibung</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Kurze Beschreibung der Qualifikation..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="has-renewal"
                type="checkbox"
                className="w-4 h-4 cursor-pointer"
                checked={form.has_renewal}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    has_renewal: e.target.checked,
                    default_renewal_days: e.target.checked ? prev.default_renewal_days : "",
                  }))
                }
              />
              <Label htmlFor="has-renewal" className="cursor-pointer font-normal">
                Erneuerungsintervall (Ablaufdatum)
              </Label>
            </div>

            {form.has_renewal && (
              <div className="space-y-1.5">
                <Label>Standardintervall in Tagen</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.default_renewal_days}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, default_renewal_days: e.target.value }))
                  }
                  placeholder="z.B. 730 (= 2 Jahre)"
                />
                <p className="text-xs text-muted-foreground">
                  Wird als Vorschlag beim Erfassen einer Qualifikation verwendet.
                  Übliche Werte: 365 (1 Jahr), 730 (2 Jahre), 1825 (5 Jahre).
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Anlegen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
