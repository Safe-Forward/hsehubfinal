import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { Checkbox } from "@/components/ui/checkbox";

interface WorkplaceBriefing {
  id: string;
  employee_id: string;
  company_id: string;
  workplace_name: string;
  briefing_date: string;
  valid_until: string | null;
  briefing_by: string | null;
  notes: string | null;
  is_confirmed: boolean;
  created_at: string;
}

interface Props {
  employeeId: string;
  companyId: string;
  canEdit: boolean;
}

type ValidityStatus = "expired" | "expiring_soon" | "valid" | "no_expiry";

function getValidityStatus(validUntil: string | null): ValidityStatus {
  if (!validUntil) return "no_expiry";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(validUntil);
  if (expiry < today) return "expired";
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  if (expiry <= thirtyDaysFromNow) return "expiring_soon";
  return "valid";
}

function ValidityBadge({ validUntil }: { validUntil: string | null }) {
  const status = getValidityStatus(validUntil);
  if (status === "no_expiry") {
    return <Badge variant="outline">Kein Ablaufdatum</Badge>;
  }
  const label = validUntil
    ? new Date(validUntil).toLocaleDateString("de-DE")
    : "";
  if (status === "expired") {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
        <XCircle className="h-3 w-3" />
        Abgelaufen: {label}
      </Badge>
    );
  }
  if (status === "expiring_soon") {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 gap-1">
        <AlertTriangle className="h-3 w-3" />
        Läuft ab: {label}
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
      <CheckCircle className="h-3 w-3" />
      Gültig bis: {label}
    </Badge>
  );
}

const emptyForm = {
  workplace_name: "",
  briefing_date: new Date().toISOString().split("T")[0],
  valid_until: "",
  briefing_by: "",
  notes: "",
  is_confirmed: false,
};

export function WorkplaceBriefingsTab({ employeeId, companyId, canEdit }: Props) {
  const { toast } = useToast();
  const [briefings, setBriefings] = useState<WorkplaceBriefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchBriefings();
  }, [employeeId]);

  async function fetchBriefings() {
    setLoading(true);
    const { data, error } = await supabase
      .from("workplace_briefings")
      .select("*")
      .eq("employee_id", employeeId)
      .order("briefing_date", { ascending: false });
    if (error) {
      toast({ title: "Fehler beim Laden", description: error.message, variant: "destructive" });
    } else {
      setBriefings(data || []);
    }
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(b: WorkplaceBriefing) {
    setEditingId(b.id);
    setForm({
      workplace_name: b.workplace_name,
      briefing_date: b.briefing_date,
      valid_until: b.valid_until || "",
      briefing_by: b.briefing_by || "",
      notes: b.notes || "",
      is_confirmed: b.is_confirmed,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.workplace_name.trim() || !form.briefing_date) {
      toast({ title: "Pflichtfelder fehlen", description: "Arbeitsplatz-Name und Datum sind erforderlich.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      employee_id: employeeId,
      company_id: companyId,
      workplace_name: form.workplace_name.trim(),
      briefing_date: form.briefing_date,
      valid_until: form.valid_until || null,
      briefing_by: form.briefing_by.trim() || null,
      notes: form.notes.trim() || null,
      is_confirmed: form.is_confirmed,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase
        .from("workplace_briefings")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingId));
    } else {
      ({ error } = await supabase.from("workplace_briefings").insert([payload]));
    }
    if (error) {
      toast({ title: "Fehler beim Speichern", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Unterweisung aktualisiert" : "Unterweisung hinzugefügt" });
      setDialogOpen(false);
      fetchBriefings();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase
      .from("workplace_briefings")
      .delete()
      .eq("id", deleteId);
    if (error) {
      toast({ title: "Fehler beim Löschen", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Unterweisung gelöscht" });
      fetchBriefings();
    }
    setDeleteId(null);
  }

  const cardBorderClass = (b: WorkplaceBriefing) => {
    const status = getValidityStatus(b.valid_until);
    if (status === "expired") return "border-red-200 bg-red-50/30";
    if (status === "expiring_soon") return "border-yellow-200 bg-yellow-50/30";
    return "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Arbeitsplatzspezifische Unterweisungen</h3>
          <p className="text-sm text-muted-foreground">
            Sicherheitsunterweisungen für spezifische Arbeitsplätze
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Unterweisung hinzufügen
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">Lade Unterweisungen...</div>
      ) : briefings.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Noch keine Unterweisungen vorhanden.</p>
            {canEdit && (
              <Button onClick={openCreate} variant="outline" size="sm" className="mt-3 gap-1">
                <Plus className="h-4 w-4" />
                Erste Unterweisung hinzufügen
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {briefings.map((b) => (
            <Card key={b.id} className={`transition-colors ${cardBorderClass(b)}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{b.workplace_name}</span>
                      {b.is_confirmed ? (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1 text-xs">
                          <CheckCircle className="h-3 w-3" />
                          Bestätigt
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Clock className="h-3 w-3" />
                          Nicht bestätigt
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Datum:{" "}
                        <span className="text-foreground font-medium">
                          {new Date(b.briefing_date).toLocaleDateString("de-DE")}
                        </span>
                      </span>
                      {b.briefing_by && (
                        <span>
                          Unterwiesen von:{" "}
                          <span className="text-foreground font-medium">{b.briefing_by}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <ValidityBadge validUntil={b.valid_until} />
                    </div>
                    {b.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.notes}</p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(b)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(b.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Unterweisung bearbeiten" : "Unterweisung hinzufügen"}
            </DialogTitle>
            <DialogDescription>
              Arbeitsplatzspezifische Sicherheitsunterweisung erfassen
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="workplace_name">
                Arbeitsplatz-Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="workplace_name"
                placeholder="z.B. Lagerhalle A, Produktionslinie 3"
                value={form.workplace_name}
                onChange={(e) => setForm((f) => ({ ...f, workplace_name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="briefing_date">
                  Unterweisungsdatum <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="briefing_date"
                  type="date"
                  value={form.briefing_date}
                  onChange={(e) => setForm((f) => ({ ...f, briefing_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valid_until">Gültig bis (optional)</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="briefing_by">Unterwiesen von</Label>
              <Input
                id="briefing_by"
                placeholder="Name des Unterweisenden"
                value={form.briefing_by}
                onChange={(e) => setForm((f) => ({ ...f, briefing_by: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                placeholder="Weitere Angaben zur Unterweisung..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="is_confirmed"
                checked={form.is_confirmed}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, is_confirmed: checked === true }))
                }
              />
              <Label htmlFor="is_confirmed" className="cursor-pointer">
                Mitarbeiter hat Unterweisung bestätigt / unterschrieben
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unterweisung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
