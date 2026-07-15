import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  Circle,
  Users,
  Building2,
  BookOpen,
  FileText,
  ShieldAlert,
  Settings,
  ArrowRight,
  Loader2,
  X,
} from "lucide-react";

const STORAGE_KEY = (id: string) => `sf_onboarding_done_${id}`;
const SETTINGS_VISITED_KEY = "hse_onboarding_settings_visited";
const SESSION_DISMISS_KEY = "hse_onboarding_dismissed";

interface OnboardingStep {
  label: string;
  route: string;
  done: boolean;
  icon: React.ElementType;
}

export function OnboardingWizard() {
  const { companyId, userRole } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    { label: "Ersten Mitarbeiter anlegen", route: "/employees", done: false, icon: Users },
    { label: "Abteilung anlegen", route: "/settings?tab=organisation", done: false, icon: Building2 },
    { label: "Erste Schulung erstellen", route: "/training", done: false, icon: BookOpen },
    { label: "Dokument hochladen", route: "/documents", done: false, icon: FileText },
    { label: "Ersten Vorfall erfassen", route: "/incidents", done: false, icon: ShieldAlert },
    { label: "Einstellungen konfigurieren", route: "/settings", done: false, icon: Settings },
  ]);

  const checkSteps = useCallback(async (cId: string) => {
    setLoading(true);
    try {
      const [
        employeesRes,
        departmentsRes,
        trainingTypesRes,
        coursesRes,
        documentsRes,
        incidentsRes,
      ] = await Promise.all([
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("company_id", cId)
          .eq("is_active", true),
        supabase
          .from("departments")
          .select("id", { count: "exact", head: true })
          .eq("company_id", cId),
        supabase
          .from("training_types")
          .select("id", { count: "exact", head: true })
          .eq("company_id", cId),
        supabase
          .from("courses")
          .select("id", { count: "exact", head: true })
          .eq("company_id", cId),
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("company_id", cId),
        supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("company_id", cId),
      ]);

      const settingsVisited = localStorage.getItem(SETTINGS_VISITED_KEY) === "true";
      const trainingDone =
        (trainingTypesRes.count ?? 0) > 0 || (coursesRes.count ?? 0) > 0;

      setSteps([
        { label: "Ersten Mitarbeiter anlegen", route: "/employees", done: (employeesRes.count ?? 0) > 0, icon: Users },
        { label: "Abteilung anlegen", route: "/settings?tab=organisation", done: (departmentsRes.count ?? 0) > 0, icon: Building2 },
        { label: "Erste Schulung erstellen", route: "/training", done: trainingDone, icon: BookOpen },
        { label: "Dokument hochladen", route: "/documents", done: (documentsRes.count ?? 0) > 0, icon: FileText },
        { label: "Ersten Vorfall erfassen", route: "/incidents", done: (incidentsRes.count ?? 0) > 0, icon: ShieldAlert },
        { label: "Einstellungen konfigurieren", route: "/settings", done: settingsVisited, icon: Settings },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!companyId || userRole !== "company_admin") return;
    // Permanently done — never show again
    if (localStorage.getItem(STORAGE_KEY(companyId))) return;
    // Dismissed for this session
    if (sessionStorage.getItem(SESSION_DISMISS_KEY) === "true") {
      setDismissed(true);
      return;
    }
    setVisible(true);
    checkSteps(companyId);
  }, [companyId, userRole, checkSteps]);

  // Auto-hide when all steps done (sets localStorage permanent flag)
  useEffect(() => {
    if (!visible || loading) return;
    const completedCount = steps.filter((s) => s.done).length;
    if (completedCount >= 6 && companyId) {
      localStorage.setItem(STORAGE_KEY(companyId), "1");
      setVisible(false);
    }
  }, [steps, visible, loading, companyId]);

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "true");
    setDismissed(true);
  };

  const handleGoTo = (route: string) => {
    if (route === "/settings" || route.startsWith("/settings")) {
      localStorage.setItem(SETTINGS_VISITED_KEY, "true");
    }
    navigate(route);
  };

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / 6) * 100);

  if (userRole !== "company_admin") return null;
  if (!visible || dismissed) return null;

  return (
    <Card className="mt-8 border border-border/60 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold">Setup abschließen</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white/90">
              {completedCount}/6 · {progressPercent}%
            </span>
            <button
              onClick={handleDismiss}
              aria-label="Ausblenden"
              className="rounded-md p-1 hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        <Progress
          value={progressPercent}
          className="h-2 bg-white/30 [&>div]:bg-white"
        />
      </div>

      {/* Body */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Lade Fortschritt…</span>
          </div>
        ) : (
          <ul className="space-y-1">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <li key={step.label}>
                  <button
                    onClick={() => handleGoTo(step.route)}
                    className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left hover:bg-muted transition-colors group"
                  >
                    {step.done ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        step.done ? "text-green-600" : "text-muted-foreground"
                      }`}
                    />
                    <span
                      className={`text-sm flex-1 ${
                        step.done
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                    {!step.done && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
