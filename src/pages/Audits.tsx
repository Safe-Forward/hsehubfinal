import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, FileDown, Eye, Trash2, Filter, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
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

export default function Audits() {
  const { user, loading, companyId } = useAuth();
  const { t } = useLanguage();
  const { hasDetailedPermission } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  const [audits, setAudits] = useState<any[]>([]);
  const [isoStandards, setIsoStandards] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteAudit, setDeleteAudit] = useState<any>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    iso_code: "",
    scheduled_date: "",
    responsible_person_id: "",
    scope: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId) {
      fetchData();
    }
  }, [user, loading, navigate, companyId]);

  const fetchData = async () => {
    if (!companyId) return;

    setLoadingData(true);
    try {
      const [auditsRes, isoRes, employeesRes] = await Promise.all([
        supabase
          .from("audits")
          .select(
            `
            *,
            team_members!audits_responsible_person_id_fkey(first_name, last_name, email)
          `
          )
          .eq("company_id", companyId)
          .order("scheduled_date", { ascending: false }),
        supabase
          .from("company_iso_standards")
          .select("*")
          .eq("company_id", companyId)
          .eq("is_active", true),
        supabase
          .from("team_members")
          .select("id, first_name, last_name, email, role")
          .eq("company_id", companyId)
          .order("first_name"),
      ]);

      if (auditsRes.error) throw auditsRes.error;
      if (isoRes.error) throw isoRes.error;
      if (employeesRes.error) throw employeesRes.error;

      setAudits(auditsRes.data || []);
      setIsoStandards(isoRes.data || []);
      // Map team members to employees format with full_name
      setEmployees((employeesRes.data || []).map((tm: any) => ({
        id: tm.id,
        full_name: `${tm.first_name} ${tm.last_name} (${tm.email})`,
      })));
    } catch (err: any) {
      toast({
        title: "Error loading data",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const createAudit = async () => {
    if (!companyId) return;

    // Check permission before allowing create
    if (!hasDetailedPermission('audits', 'create_edit')) {
      toast({
        title: "Permission Denied",
        description: "You do not have permission to create audits",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title || !formData.iso_code || !formData.scheduled_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create audit
      const { data: auditData, error: auditError } = await supabase
        .from("audits")
        .insert({
          company_id: companyId,
          title: formData.title,
          iso_code: formData.iso_code,
          scheduled_date: formData.scheduled_date,
          responsible_person_id: formData.responsible_person_id || null,
          scope: formData.scope || null,
          // Note: 'description' column does not exist in audits table
          status: "planned",
        })
        .select()
        .single();

      if (auditError) throw auditError;

      // Generate checklist items from ISO criteria
      await generateChecklistItems(auditData.id, formData.iso_code);

      // Log audit action
      console.log("🔵 [AUDIT LOG] Starting audit log creation...");
      console.log("🔵 [AUDIT LOG] Parameters:", {
        audit_id: auditData.id,
        audit_title: formData.title,
        company_id: companyId,
        iso_code: formData.iso_code
      });
      
      try {
        const { data: logResult, error: logError } = await supabase.rpc("create_audit_log", {
          p_action_type: "create_audit",
          p_target_type: "audit",
          p_target_id: auditData.id,
          p_target_name: formData.title,
          p_details: {
            iso_code: formData.iso_code,
            scheduled_date: formData.scheduled_date,
            responsible_person_id: formData.responsible_person_id
          },
          p_company_id: companyId,
        });
        
        if (logError) {
          console.error("❌ [AUDIT LOG] RPC Error:", logError);
        } else {
          console.log("✅ [AUDIT LOG] Created! Log ID:", logResult);
          
          // Verify the log was created
          const { data: verifyLog } = await supabase
            .from("audit_logs")
            .select("*")
            .eq("id", logResult)
            .single();
          console.log("🔍 [AUDIT LOG] Verification:", verifyLog);
        }
      } catch (auditLogErr) {
        console.error("❌ [AUDIT LOG] Exception:", auditLogErr);
      }

      toast({
        title: "Success",
        description: "Audit created successfully!",
      });

      setIsDialogOpen(false);
      setFormData({
        title: "",
        iso_code: "",
        scheduled_date: "",
        responsible_person_id: "",
        scope: "",
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: "Error creating audit",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const generateChecklistItems = async (auditId: string, isoCode: string) => {
    try {
      console.log("Generating checklist for audit:", auditId, "ISO:", isoCode);

      // Read selected criteria from localStorage (same as AuditDetails)
      let selectedSections: string[] = [];
      if (companyId) {
        const storedCriteria = localStorage.getItem(`selectedCriteria_${companyId}`);
        console.log("Raw stored criteria:", storedCriteria);
        if (storedCriteria) {
          const allSelectedCriteria = JSON.parse(storedCriteria);
          console.log("All selected criteria:", allSelectedCriteria);
          // Filter to get only section IDs for this ISO code
          selectedSections = allSelectedCriteria
            .filter((id: string) => id.startsWith(`${isoCode}-section-`))
            .map((id: string) => id.replace(`${isoCode}-section-`, "").trim());

          console.log(`Selected sections for ${isoCode}:`, selectedSections);
        }
      }

      // Fetch all ISO criteria for this standard
      const { data: sections, error } = await supabase
        .from("iso_criteria_sections")
        .select(
          `
          id,
          section_number,
          subsections:iso_criteria_subsections(
            id,
            questions:iso_criteria_questions(id)
          )
        `
        )
        .eq("iso_code", isoCode);

      if (error) throw error;

      console.log("Found sections:", sections?.length || 0);

      if (!sections || sections.length === 0) {
        console.warn("No ISO criteria found for:", isoCode);
        toast({
          title: "Warning",
          description: `No ISO criteria found for ${isoCode}. Please import ISO criteria in Settings first.`,
          variant: "destructive",
        });
        return;
      }

      // Filter sections to only include selected ones
      let filteredSections = sections;
      if (selectedSections.length > 0) {
        filteredSections = sections.filter((section: any) => {
          const normalized = section.section_number?.toString().trim();
          return selectedSections.includes(normalized);
        });
        console.log(`Filtered to ${filteredSections.length} sections from ${sections.length} total`);
      } else {
        // If NO criteria are selected, show NOTHING (not all sections)
        filteredSections = [];
        console.log("No criteria selection found, showing no sections");
      }

      // Create checklist items for each question (only from filtered sections)
      const checklistItems: any[] = [];
      filteredSections?.forEach((section) => {
        section.subsections?.forEach((subsection: any) => {
          subsection.questions?.forEach((question: any) => {
            checklistItems.push({
              audit_id: auditId,
              section_id: section.id,
              subsection_id: subsection.id,
              question_id: question.id,
              status: "pending",
              implemented: false,
              satisfied: false,
            });
          });
        });
      });

      console.log("Creating checklist items:", checklistItems.length);

      if (checklistItems.length > 0) {
        const { error: insertError } = await supabase
          .from("audit_checklist_items")
          .insert(checklistItems);

        if (insertError) throw insertError;
        console.log("Checklist items created successfully");
      } else {
        console.log("No checklist items to create (no criteria selected or no questions found)");
      }
    } catch (err: any) {
      console.error("Error generating checklist:", err);
      toast({
        title: "Error",
        description: `Failed to generate checklist: ${err.message}`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteAudit) return;

    // Check permission before allowing delete
    if (!hasDetailedPermission('audits', 'create_edit')) {
      toast({
        title: "Permission Denied",
        description: "You do not have permission to delete audits",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("audits")
        .delete()
        .eq("id", deleteAudit.id);

      if (error) throw error;

      // Log audit deletion
      logAction({
        action: "delete_audit",
        targetType: "audit",
        targetId: deleteAudit.id,
        targetName: deleteAudit.title,
        details: { iso_code: deleteAudit.iso_code }
      });

      toast({
        title: "Success",
        description: "Audit deleted successfully",
      });

      setDeleteAudit(null);
      fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getStatusFromProgress = (audit: any): "planned" | "in_progress" | "completed" => {
    const progress = Number(audit?.progress_percentage || 0);

    if (progress >= 100) return "completed";
    if (progress > 0) return "in_progress";
    return "planned";
  };

  const getStatusLabel = (status: "planned" | "in_progress" | "completed") => {
    if (status === "planned") return t("audits.planned");
    if (status === "in_progress") return t("audits.inProgress");
    return t("audits.completed");
  };

  // Filter audits
  const filteredAudits = audits.filter((audit) => {
    const derivedStatus = getStatusFromProgress(audit);
    if (statusFilter !== "all" && derivedStatus !== statusFilter) return false;
    if (templateFilter !== "all" && audit.iso_code !== templateFilter)
      return false;
    return true;
  });

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{t("audits.title")}</h1>
              <p className="text-xs text-muted-foreground">
                {t("audits.auditCenter")}
              </p>
            </div>
          </div>
          {hasDetailedPermission('audits', 'create_edit') && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("audits.new")}
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("audits.auditCenter")}</CardTitle>
            <CardDescription>{t("audits.standardizedAudits")}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t("audits.allStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("audits.allStatus")}</SelectItem>
                  <SelectItem value="planned">{t("audits.planned")}</SelectItem>
                  <SelectItem value="in_progress">
                    {t("audits.inProgress")}
                  </SelectItem>
                  <SelectItem value="completed">
                    {t("audits.completed")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t("audits.allTemplates")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("audits.allTemplates")}
                  </SelectItem>
                  {isoStandards.map((iso) => (
                    <SelectItem key={iso.iso_code} value={iso.iso_code}>
                      {iso.iso_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Audit List */}
            <div className="space-y-4">
              {filteredAudits.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>{t("audits.noAudits")}</p>
                  <p className="text-sm">{t("audits.createFirst")}</p>
                </div>
              ) : (
                filteredAudits.map((audit) => (
                  <div
                    key={audit.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    {(() => {
                      const derivedStatus = getStatusFromProgress(audit);
                      return (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {audit.title}
                          </h3>
                          <Badge variant="outline">{getStatusLabel(derivedStatus)}</Badge>
                        </div>

                        <div className="flex gap-4 text-sm text-muted-foreground mb-2">
                          <span>📋 {audit.iso_code} Template</span>
                          <span>📅 {audit.scheduled_date}</span>
                          <span>
                            👤{" "}
                            {audit.team_members
                              ? `${audit.team_members.first_name} ${audit.team_members.last_name}`
                              : t("audits.notAssigned")}
                          </span>
                        </div>

                        <div className="text-sm">
                          <span className="font-medium">
                            {t("audits.progress")}:
                          </span>{" "}
                          <span className="text-primary font-semibold">
                            {audit.progress_percentage || 0}%
                          </span>{" "}
                          ({audit.completed_items || 0}/{audit.total_items || 0}
                          )
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => navigate(`/audits/${audit.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {t("audits.details")}
                        </Button>
                        {hasDetailedPermission('audits', 'create_edit') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteAudit(audit)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                      );
                    })()}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Create Audit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("audits.new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("audits.auditTitle")} *</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder={t("audits.auditTitle")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("audits.isoStandard")} *</Label>
                <Select
                  value={formData.iso_code}
                  onValueChange={(value) =>
                    setFormData({ ...formData, iso_code: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("audits.selectISOStandard")} />
                  </SelectTrigger>
                  <SelectContent>
                    {isoStandards.map((iso) => (
                      <SelectItem key={iso.iso_code} value={iso.iso_code}>
                        {iso.iso_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t("audits.scheduledDate")} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${!formData.scheduled_date && "text-muted-foreground"}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.scheduled_date ? (
                        format(new Date(formData.scheduled_date), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.scheduled_date ? new Date(formData.scheduled_date) : undefined}
                      onSelect={(date) =>
                        setFormData({ ...formData, scheduled_date: date ? format(date, "yyyy-MM-dd") : "" })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label>{t("audits.responsiblePerson")}</Label>
              <Select
                value={formData.responsible_person_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, responsible_person_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("audits.selectPerson")} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("audits.scope")}</Label>
              <Input
                value={formData.scope}
                onChange={(e) =>
                  setFormData({ ...formData, scope: e.target.value })
                }
                placeholder={t("audits.scopePlaceholder")}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={createAudit}>{t("audits.createAudit")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteAudit}
        onOpenChange={() => setDeleteAudit(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("audits.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("audits.deleteMessage").replace(
                "{title}",
                deleteAudit?.title || ""
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive"
            >
              {t("audits.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
