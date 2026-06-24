import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DangerZoneTabProps {
  companyName: string;
}

export function DangerZoneTab({ companyName }: DangerZoneTabProps) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.rpc("delete_own_company", {
        p_confirmation_name: confirmText,
      });

      if (error) throw error;
      if (!data?.success) {
        toast.error(data?.error || "Löschung fehlgeschlagen.");
        return;
      }

      toast.success("Ihre Firma und alle zugehörigen Daten wurden gelöscht.");
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Löschung fehlgeschlagen.");
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          Gefahrenzone
        </CardTitle>
        <CardDescription>
          Diese Aktion löscht Ihre Firma und sämtliche damit verbundenen Daten
          (Mitarbeiter, Dokumente, Schulungen, Gesundheitschecks, Vorfälle,
          Audits, Rechnungen) unwiderruflich. Es gibt kein Zurück.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="w-4 h-4 mr-2" />
          Firma endgültig löschen
        </Button>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Firma "{companyName}" wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                Diese Aktion kann nicht rückgängig gemacht werden. Alle Daten
                Ihrer Firma werden dauerhaft entfernt, inklusive aller
                Mitarbeiterkonten.
              </span>
              <span className="block">
                Geben Sie zur Bestätigung den exakten Firmennamen ein:{" "}
                <strong>{companyName}</strong>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-company-name">Firmenname</Label>
            <Input
              id="confirm-company-name"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={companyName}
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isDeleting}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== companyName || isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird gelöscht...
                </>
              ) : (
                "Endgültig löschen"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
