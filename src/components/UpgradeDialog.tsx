import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  hint?: string;
}

export function UpgradeDialog({ open, onClose, title, description, hint }: UpgradeDialogProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate("/invoices");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-left">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left">{description}</DialogDescription>
        </DialogHeader>

        {hint && (
          <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground mt-2">
            {hint}
          </div>
        )}

        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose}>Schließen</Button>
          <Button onClick={handleUpgrade} className="gap-2">
            Tarif upgraden
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
