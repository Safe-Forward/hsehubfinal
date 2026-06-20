import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import OrgChartTab from "@/components/settings/OrgChartTab";

interface Props {
  onNavigateToTab?: (tab: string) => void;
}

export function OrganisationTab({ onNavigateToTab }: Props) {
  const { companyId } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [orgType, setOrgType] = useState<"linie" | "matrix">("linie");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [managerSaving, setManagerSaving] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchOrgType();
      fetchTeamMembers();
    }
  }, [companyId]);

  const fetchOrgType = async () => {
    if (!companyId) return;
    try {
      const { data } = await (supabase as any)
        .from("company_settings")
        .select("org_type")
        .eq("company_id", companyId)
        .maybeSingle();
      if (data?.org_type) setOrgType(data.org_type as "linie" | "matrix");
    } catch (err) {
      // ignore
    }
  };

  const fetchTeamMembers = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTeamMembers(data || []);
    } catch (err) {
      console.error("Error fetching team members:", err);
    }
  };

  const handleUpdateOrgType = async (newType: "linie" | "matrix") => {
    if (!companyId) return;
    setOrgType(newType);
    try {
      const { error } = await (supabase as any)
        .from("company_settings")
        .upsert({ company_id: companyId, org_type: newType }, { onConflict: "company_id" });
      if (error) throw error;
      toast({ title: "Gespeichert", description: "Organisationsform aktualisiert" });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
      setOrgType(newType === "linie" ? "matrix" : "linie");
    }
  };

  const handleUpdateManager = async (
    memberId: string,
    field: "line_manager_id" | "functional_manager_id",
    value: string | null
  ) => {
    setManagerSaving(true);
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ [field]: value || null })
        .eq("id", memberId);
      if (error) throw error;
      setTeamMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, [field]: value || null } : m))
      );
      toast({ title: "Gespeichert" });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setManagerSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Org Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Organisationsstruktur</CardTitle>
          <CardDescription>
            Lege fest, wie Führung und Reporting strukturiert sind.
            Die Rollenverteilung (Admin, HSE Manager, Arzt usw.) bleibt
            davon unabhängig und wird unter{" "}
            <button
              className="underline"
              onClick={() => onNavigateToTab?.("user-roles")}
            >
              Benutzerrollen &amp; Berechtigungen
            </button>{" "}
            konfiguriert.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Linienorganisation */}
            <button
              type="button"
              onClick={() => handleUpdateOrgType("linie")}
              className={`text-left p-5 rounded-xl border-2 transition-all ${
                orgType === "linie"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm">Linienorganisation</span>
                <Badge variant={orgType === "linie" ? "default" : "outline"}>
                  Wasserfall
                </Badge>
              </div>
              <svg viewBox="0 0 120 64" className="w-full h-12 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="42" y="4" width="36" height="14" rx="3" />
                <line x1="60" y1="18" x2="60" y2="30" />
                <line x1="60" y1="30" x2="20" y2="30" />
                <line x1="60" y1="30" x2="100" y2="30" />
                <line x1="20" y1="30" x2="20" y2="42" />
                <line x1="60" y1="30" x2="60" y2="42" />
                <line x1="100" y1="30" x2="100" y2="42" />
                <rect x="4" y="42" width="32" height="14" rx="3" />
                <rect x="44" y="42" width="32" height="14" rx="3" />
                <rect x="84" y="42" width="32" height="14" rx="3" />
              </svg>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  orgType === "linie" ? "border-primary" : "border-muted-foreground/30"
                }`}>
                  {orgType === "linie" && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Jeder Mitarbeiter hat genau einen direkten Vorgesetzten.
                </p>
              </div>
            </button>

            {/* Matrixorganisation */}
            <button
              type="button"
              onClick={() => handleUpdateOrgType("matrix")}
              className={`text-left p-5 rounded-xl border-2 transition-all ${
                orgType === "matrix"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm">Matrixorganisation</span>
                <Badge variant={orgType === "matrix" ? "default" : "outline"}>
                  Matrix
                </Badge>
              </div>
              <svg viewBox="0 0 120 64" className="w-full h-12 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="42" y="4" width="36" height="14" rx="3" />
                <rect x="4" y="26" width="28" height="14" rx="3" />
                <rect x="44" y="26" width="32" height="14" rx="3" />
                <rect x="44" y="46" width="32" height="14" rx="3" />
                <line x1="60" y1="18" x2="60" y2="26" />
                <line x1="60" y1="40" x2="60" y2="46" />
                <line x1="32" y1="33" x2="44" y2="33" strokeDasharray="4 2" />
                <line x1="32" y1="33" x2="32" y2="53" strokeDasharray="4 2" />
                <line x1="32" y1="53" x2="44" y2="53" strokeDasharray="4 2" />
              </svg>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  orgType === "matrix" ? "border-primary" : "border-muted-foreground/30"
                }`}>
                  {orgType === "matrix" && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Zwei Berichtslinien: disziplinarisch + fachlich (&mdash;&nbsp;&mdash;).
                </p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Manager Assignment per team member */}
      <Card>
        <CardHeader>
          <CardTitle>Vorgesetzte zuweisen</CardTitle>
          <CardDescription>
            {orgType === "matrix"
              ? "Weise jedem Teammitglied einen disziplinarischen und optional einen fachlichen Vorgesetzten zu."
              : "Weise jedem Teammitglied seinen direkten Vorgesetzten zu."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Keine Teammitglieder vorhanden. Füge zuerst Mitglieder unter{" "}
              <button className="underline" onClick={() => onNavigateToTab?.("team")}>
                Team
              </button>{" "}
              hinzu.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mitarbeiter</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>
                      {orgType === "matrix" ? "Vorgesetzter (disziplinarisch)" : "Vorgesetzter"}
                    </TableHead>
                    {orgType === "matrix" && (
                      <TableHead>Fachlicher Vorgesetzter</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => {
                    const others = teamMembers.filter((m) => m.id !== member.id);
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          <div>{member.first_name} {member.last_name}</div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{member.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={member.line_manager_id || "__none__"}
                            onValueChange={(val) =>
                              handleUpdateManager(member.id, "line_manager_id", val === "__none__" ? null : val)
                            }
                            disabled={managerSaving}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="— Kein Vorgesetzter —" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— Kein Vorgesetzter —</SelectItem>
                              {others.map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                  {o.first_name} {o.last_name}
                                  {(o.role === "Admin" || o.role === "Line Manager" || o.role === "HSE Manager") ? " ★" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {orgType === "matrix" && (
                          <TableCell>
                            <Select
                              value={member.functional_manager_id || "__none__"}
                              onValueChange={(val) =>
                                handleUpdateManager(member.id, "functional_manager_id", val === "__none__" ? null : val)
                              }
                              disabled={managerSaving}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="— Kein Vorgesetzter —" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— Kein Vorgesetzter —</SelectItem>
                                {others.map((o) => (
                                  <SelectItem key={o.id} value={o.id}>
                                    {o.first_name} {o.last_name}
                                    {(o.role === "Admin" || o.role === "Line Manager" || o.role === "HSE Manager") ? " ★" : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Was bedeutet das?</CardTitle>
        </CardHeader>
        <CardContent>
          {orgType === "linie" ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><span>→</span> Jedes Teammitglied hat genau <strong className="text-foreground">einen direkten Vorgesetzten</strong>.</li>
              <li className="flex items-start gap-2"><span>→</span> Klare Hierarchie von oben nach unten — einfach und eindeutig.</li>
              <li className="flex items-start gap-2"><span>→</span> Rollen wie <strong className="text-foreground">Arzt, HSE Manager</strong> usw. sind davon unabhängig und werden separat vergeben.</li>
            </ul>
          ) : (
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><span>→</span> Jedes Mitglied hat einen <strong className="text-foreground">disziplinarischen Vorgesetzten</strong> (Linie) und optional einen <strong className="text-foreground">fachlichen Vorgesetzten</strong> (Funktion).</li>
              <li className="flex items-start gap-2"><span>→</span> Ermöglicht Projekt- und Funktionsverantwortung parallel zur Linienhierarchie.</li>
              <li className="flex items-start gap-2"><span>→</span> Rollen wie <strong className="text-foreground">Arzt, HSE Manager</strong> usw. sind davon unabhängig und werden separat vergeben.</li>
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Org Chart Visualization */}
      <OrgChartTab />
    </div>
  );
}
