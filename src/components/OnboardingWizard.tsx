import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { Users, FileText, ShieldAlert, ArrowRight, CheckCircle2, X } from "lucide-react";

const STORAGE_KEY = (id: string) => `sf_onboarding_done_${id}`;

export function OnboardingWizard() {
  const { companyId, userRole } = useAuth();
  const { loading } = useSubscriptionLimits();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || !companyId || userRole !== "company_admin") return;
    if (!localStorage.getItem(STORAGE_KEY(companyId))) {
      setOpen(true);
    }
  }, [companyId, userRole, loading]);

  const dismiss = () => {
    if (companyId) localStorage.setItem(STORAGE_KEY(companyId), "1");
    setOpen(false);
  };

  const goTo = (path: string) => {
    dismiss();
    navigate(path);
  };

  const steps = [
    {
      title: "Willkommen bei Safe Forward!",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Ihr kostenloses 7-Tage-Testkonto ist aktiv. Hier sind die drei ersten
            Schritte, um das Beste aus Safe Forward herauszuholen:
          </p>
          <div className="grid gap-3">
            {[
              { icon: Users, label: "Mitarbeiter anlegen", desc: "Importieren oder manuell hinzufügen" },
              { icon: FileText, label: "Dokumente hochladen", desc: "Unterweisungen, Betriebsanweisungen" },
              { icon: ShieldAlert, label: "Vorfälle erfassen", desc: "Beinahe-Unfälle und Meldungen verwalten" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      actions: (
        <Button className="gap-2" onClick={() => setStep(1)}>
          Weiter <ArrowRight className="w-4 h-4" />
        </Button>
      ),
    },
    {
      title: "Was möchten Sie zuerst tun?",
      content: (
        <div className="grid gap-3">
          {[
            { icon: Users, label: "Ersten Mitarbeiter anlegen", path: "/employees" },
            { icon: FileText, label: "Dokument hochladen", path: "/documents" },
            { icon: ShieldAlert, label: "Vorfall erfassen", path: "/incidents" },
          ].map(({ icon: Icon, label, path }) => (
            <button
              key={path}
              onClick={() => goTo(path)}
              className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted transition-colors text-left w-full"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="font-medium text-sm">{label}</span>
              <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
            </button>
          ))}
        </div>
      ),
      actions: (
        <Button variant="outline" onClick={dismiss} className="gap-2">
          <CheckCircle2 className="w-4 h-4" /> Überspringen
        </Button>
      ),
    },
  ];

  const current = steps[step];

  return (
    <Dialog open={open} onOpenChange={dismiss}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white relative">
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex gap-1 mb-3">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
          <h2 className="text-xl font-semibold">{current.title}</h2>
        </div>

        {/* Body */}
        <div className="p-6">{current.content}</div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Schritt {step + 1} von {steps.length}
          </span>
          {current.actions}
        </div>
      </DialogContent>
    </Dialog>
  );
}
