import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  onNavigateToTab?: (tab: string) => void;
}

export function ProfileFieldsTab({ onNavigateToTab }: Props) {
  const { companyId } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [profileFieldTemplates, setProfileFieldTemplates] = useState<any[]>([]);
  const [selectedProfileTemplateId, setSelectedProfileTemplateId] = useState<string | null>(null);
  const [templateFields, setTemplateFields] = useState<any[]>([]);

  // Profile Field Dialog
  const [isProfileFieldDialogOpen, setIsProfileFieldDialogOpen] = useState(false);
  const [editingProfileField, setEditingProfileField] = useState<any>(null);
  const [profileFieldForm, setProfileFieldForm] = useState({
    fieldName: "",
    fieldLabel: "",
    fieldType: "text",
    isRequired: false,
    extractedFromResume: false,
  });
  const [isSubmittingProfileField, setIsSubmittingProfileField] = useState(false);

  // Template Dialog
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({ name: "" });
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);

  useEffect(() => {
    if (companyId) {
      fetchProfileFieldTemplates();
    }
  }, [companyId]);

  const fetchProfileFieldTemplates = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from("profile_field_templates")
        .select("*")
        .eq("company_id", companyId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      const templates = data || [];
      setProfileFieldTemplates(templates);

      const activeTemplateId =
        templates.find((template) => template.id === selectedProfileTemplateId)?.id ||
        templates[0]?.id ||
        null;
      setSelectedProfileTemplateId(activeTemplateId);

      if (activeTemplateId) {
        await fetchTemplateFields(activeTemplateId);
      } else {
        setTemplateFields([]);
      }
    } catch (err) {
      console.error("Error fetching profile field templates:", err);
    }
  };

  const fetchTemplateFields = async (templateId: string) => {
    if (!companyId || !templateId) return;
    try {
      const { data, error } = await supabase
        .from("profile_fields")
        .select("*")
        .eq("template_id", templateId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      setTemplateFields(data || []);
    } catch (err) {
      console.error("Error fetching template fields:", err);
      setTemplateFields([]);
    }
  };

  const openTemplateDialog = (template?: any) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({ name: template.name || "" });
    } else {
      setEditingTemplate(null);
      setTemplateForm({ name: "" });
    }
    setIsTemplateDialogOpen(true);
  };

  const closeTemplateDialog = () => {
    setIsTemplateDialogOpen(false);
    setEditingTemplate(null);
    setTemplateForm({ name: "" });
  };

  const saveTemplate = async () => {
    if (!companyId) return;
    if (!templateForm.name.trim()) {
      toast({ title: t("settings.error"), description: "Vorlagenname ist erforderlich", variant: "destructive" });
      return;
    }
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from("profile_field_templates")
          .update({ name: templateForm.name.trim(), updated_at: new Date().toISOString() })
          .eq("id", editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profile_field_templates")
          .insert([{ company_id: companyId, name: templateForm.name.trim(), display_order: profileFieldTemplates.length }]);
        if (error) throw error;
      }
      toast({
        title: t("settings.success"),
        description: editingTemplate ? "Template updated successfully" : "Template added successfully",
      });
      await fetchProfileFieldTemplates();
      closeTemplateDialog();
    } catch (err: any) {
      toast({ title: t("settings.error"), description: err.message, variant: "destructive" });
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!companyId) return;
    try {
      const { error } = await supabase
        .from("profile_field_templates")
        .delete()
        .eq("id", templateId);
      if (error) throw error;
      toast({ title: t("settings.success"), description: "Vorlage wurde gelöscht" });
      if (selectedProfileTemplateId === templateId) {
        setSelectedProfileTemplateId(null);
      }
      await fetchProfileFieldTemplates();
    } catch (err: any) {
      toast({ title: t("settings.error"), description: err.message, variant: "destructive" });
    }
  };

  const openProfileFieldDialog = (field?: any) => {
    if (field) {
      setEditingProfileField(field);
      setProfileFieldForm({
        fieldName: field.field_name,
        fieldLabel: field.field_label,
        fieldType: field.field_type,
        isRequired: !!field.is_required,
        extractedFromResume: !!field.extracted_from_resume,
      });
    } else {
      setEditingProfileField(null);
      setProfileFieldForm({ fieldName: "", fieldLabel: "", fieldType: "text", isRequired: false, extractedFromResume: false });
    }
    setIsProfileFieldDialogOpen(true);
  };

  const closeProfileFieldDialog = () => {
    setIsProfileFieldDialogOpen(false);
    setEditingProfileField(null);
    setProfileFieldForm({ fieldName: "", fieldLabel: "", fieldType: "text", isRequired: false, extractedFromResume: false });
  };

  const saveProfileField = async () => {
    if (!companyId) return;
    if (!selectedProfileTemplateId) {
      toast({ title: t("settings.error"), description: "Bitte zuerst eine Vorlage auswählen", variant: "destructive" });
      return;
    }
    if (!profileFieldForm.fieldName || !profileFieldForm.fieldLabel) {
      toast({ title: t("settings.error"), description: "Feldname und Bezeichnung sind erforderlich", variant: "destructive" });
      return;
    }
    setIsSubmittingProfileField(true);
    try {
      if (editingProfileField) {
        const { error } = await supabase
          .from("profile_fields")
          .update({
            field_label: profileFieldForm.fieldLabel,
            field_type: profileFieldForm.fieldType,
            is_required: profileFieldForm.isRequired,
            extracted_from_resume: profileFieldForm.extractedFromResume,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingProfileField.id);
        if (error) throw error;
        toast({ title: t("settings.success"), description: "Profilfeld wurde aktualisiert" });
      } else {
        const { error } = await supabase
          .from("profile_fields")
          .insert([{
            company_id: companyId,
            template_id: selectedProfileTemplateId,
            field_name: profileFieldForm.fieldName,
            field_label: profileFieldForm.fieldLabel,
            field_type: profileFieldForm.fieldType,
            is_required: profileFieldForm.isRequired,
            extracted_from_resume: profileFieldForm.extractedFromResume,
            display_order: templateFields.length,
          }]);
        if (error) throw error;
        toast({ title: t("settings.success"), description: "Profilfeld wurde hinzugefügt" });
      }
      await fetchTemplateFields(selectedProfileTemplateId);
      closeProfileFieldDialog();
    } catch (err: any) {
      toast({ title: t("settings.error"), description: err.message, variant: "destructive" });
    } finally {
      setIsSubmittingProfileField(false);
    }
  };

  const deleteProfileField = async (fieldId: string) => {
    if (!companyId) return;
    try {
      const { error } = await supabase.from("profile_fields").delete().eq("id", fieldId);
      if (error) throw error;
      toast({ title: t("settings.success"), description: "Profilfeld wurde gelöscht" });
      if (selectedProfileTemplateId) {
        await fetchTemplateFields(selectedProfileTemplateId);
      }
    } catch (err: any) {
      toast({ title: t("settings.error"), description: err.message, variant: "destructive" });
    }
  };

  const activeProfileTemplate = profileFieldTemplates.find(
    (template) => template.id === selectedProfileTemplateId
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>{t("settings.profileFieldsTitle")}</CardTitle>
              <CardDescription>{t("settings.profileFieldsSubtitle")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => openTemplateDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Template
              </Button>
              <Button
                size="sm"
                onClick={() => openProfileFieldDialog()}
                disabled={!selectedProfileTemplateId}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("settings.addProfileField")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-6">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-sm font-medium mb-3">Templates</div>
              {profileFieldTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="font-medium mb-2">No templates yet</p>
                  <p className="text-sm">Create a template to start adding fields.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {profileFieldTemplates.map((template) => {
                    const isActive = template.id === selectedProfileTemplateId;
                    return (
                      <div
                        key={template.id}
                        className={`flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                          isActive
                            ? "bg-primary/10 border-primary"
                            : "bg-background hover:bg-muted/40"
                        }`}
                        onClick={() => {
                          setSelectedProfileTemplateId(template.id);
                          fetchTemplateFields(template.id);
                        }}
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{template.name}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation();
                              openTemplateDialog(template);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation();
                              setTemplateToDelete(template);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <div className="font-medium">
                    {activeProfileTemplate?.name || "Template fields"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activeProfileTemplate ? "Fields for the selected template" : "Select a template to begin"}
                  </div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("settings.fieldLabel")}</TableHead>
                    <TableHead>{t("settings.fieldName")}</TableHead>
                    <TableHead>{t("settings.fieldType")}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templateFields.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {selectedProfileTemplateId
                          ? t("settings.noProfileFields")
                          : "Select a template to view its fields"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    templateFields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">
                          {field.field_label}
                          {field.is_required && <span className="text-destructive ml-1">*</span>}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {field.field_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{field.field_type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => openProfileFieldDialog(field)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => deleteProfileField(field.id)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Template Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Add Template"}</DialogTitle>
            <DialogDescription>Create and manage profile field templates.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="template-name">Template name</Label>
              <Input
                id="template-name"
                placeholder="e.g. Driver Template"
                value={templateForm.name}
                onChange={(event) => setTemplateForm({ name: event.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeTemplateDialog}>{t("common.cancel")}</Button>
            <Button onClick={saveTemplate}>{editingTemplate ? t("common.update") : t("common.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Profile Field Dialog */}
      <Dialog open={isProfileFieldDialogOpen} onOpenChange={setIsProfileFieldDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingProfileField ? t("settings.editItem") : t("settings.addProfileField")}
            </DialogTitle>
            <DialogDescription>{t("settings.profileFieldsSubtitle")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="profile-field-name">
                {t("settings.fieldName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="profile-field-name"
                placeholder="e.g. license_type"
                value={profileFieldForm.fieldName}
                onChange={(event) =>
                  setProfileFieldForm((prev) => ({ ...prev, fieldName: event.target.value }))
                }
                disabled={!!editingProfileField}
                className={editingProfileField ? "opacity-50" : ""}
              />
              {editingProfileField && (
                <p className="text-xs text-muted-foreground mt-1">Field name cannot be changed after creation</p>
              )}
            </div>
            <div>
              <Label htmlFor="profile-field-label">
                {t("settings.fieldLabel")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="profile-field-label"
                placeholder="e.g. Driving license"
                value={profileFieldForm.fieldLabel}
                onChange={(event) =>
                  setProfileFieldForm((prev) => ({ ...prev, fieldLabel: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="profile-field-type">{t("settings.fieldType")}</Label>
              <Select
                value={profileFieldForm.fieldType}
                onValueChange={(value) =>
                  setProfileFieldForm((prev) => ({ ...prev, fieldType: value }))
                }
              >
                <SelectTrigger id="profile-field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">{t("settings.fieldTypeText")}</SelectItem>
                  <SelectItem value="number">{t("settings.fieldTypeNumber")}</SelectItem>
                  <SelectItem value="date">{t("settings.fieldTypeDate")}</SelectItem>
                  <SelectItem value="boolean">{t("settings.fieldTypeBoolean")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="profile-field-required"
                checked={profileFieldForm.isRequired}
                onCheckedChange={(checked) =>
                  setProfileFieldForm((prev) => ({ ...prev, isRequired: Boolean(checked) }))
                }
              />
              <Label htmlFor="profile-field-required">Required field</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="profile-field-extracted"
                checked={profileFieldForm.extractedFromResume}
                onCheckedChange={(checked) =>
                  setProfileFieldForm((prev) => ({ ...prev, extractedFromResume: Boolean(checked) }))
                }
              />
              <Label htmlFor="profile-field-extracted">Extract from resume</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeProfileFieldDialog} disabled={isSubmittingProfileField}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveProfileField} disabled={isSubmittingProfileField}>
              {isSubmittingProfileField ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("common.saving")}
                </>
              ) : editingProfileField ? (
                t("common.update")
              ) : (
                t("common.create")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation */}
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the template and all of its fields.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (templateToDelete) {
                  deleteTemplate(templateToDelete.id);
                }
                setTemplateToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
