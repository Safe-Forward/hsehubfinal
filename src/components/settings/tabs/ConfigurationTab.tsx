import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, MapPin, GitBranch, Loader2 } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

interface Props {
  onNavigateToTab?: (tab: string) => void;
}

export function ConfigurationTab({ onNavigateToTab }: Props) {
  const { companyId } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  const [loadingData, setLoadingData] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [exposureGroups, setExposureGroups] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [deptManagers, setDeptManagers] = useState<Record<string, string>>({});
  const [deptManagerSearch, setDeptManagerSearch] = useState<Record<string, string>>({});
  const [approvalWorkflows, setApprovalWorkflows] = useState<any[]>([]);

  // Dialog state for generic CRUD
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [currentTableName, setCurrentTableName] = useState("");
  const [forceDialogOpen, setForceDialogOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(baseSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (companyId) {
      fetchAllData();
    }
  }, [companyId]);

  const fetchAllData = async () => {
    if (!companyId) return;
    setLoadingData(true);
    try {
      const [locs, depts, exposure, emps] = await Promise.all([
        supabase.from("locations").select("*").eq("company_id", companyId),
        supabase.from("departments").select("*").eq("company_id", companyId),
        supabase.from("exposure_groups").select("*").eq("company_id", companyId),
        supabase.from("employees").select("id, full_name").eq("company_id", companyId).order("full_name"),
      ]);

      setLocations(locs.data || []);
      setDepartments(depts.data || []);
      setExposureGroups(exposure.data || []);
      setEmployees(emps.data || []);

      // Load department managers
      const { data: dmData } = await (supabase as any)
        .from("department_managers")
        .select("department_id, manager_user_id")
        .eq("company_id", companyId)
        .eq("manager_type", "disciplinary");
      if (dmData) {
        const dmMap: Record<string, string> = {};
        dmData.forEach((dm: any) => { if (dm.manager_user_id) dmMap[dm.department_id] = dm.manager_user_id; });
        setDeptManagers(dmMap);
      }

      // Load team members for manager assignment
      const { data: tmData } = await supabase
        .from("team_members")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      setTeamMembers(tmData || []);

      // Load approval workflows
      const { data: wfData } = await supabase
        .from("approval_workflows")
        .select("*, departments(name), employees(full_name)")
        .eq("company_id", companyId);
      const formatted = (wfData || []).map((wf: any) => ({
        id: wf.id,
        department_id: wf.department_id,
        department_name: wf.departments?.name || "",
        approver_id: wf.approver_id,
        approver_name: wf.employees?.full_name || "",
      }));
      setApprovalWorkflows(formatted);
    } catch (err: any) {
      toast({ title: "Ladefehler", description: err.message, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setCurrentTableName("");
    form.reset();
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    form.setValue("name", item.name || item.title || "");
    form.setValue("description", item.description || "");
    setForceDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteItem || !companyId) return;
    try {
      const tableName = deleteItem.tableName;
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", deleteItem.id)
        .eq("company_id", companyId);
      if (error) throw error;
      toast({ title: "Gespeichert", description: "Item deleted successfully" });
      setDeleteItem(null);
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const onSubmit = async (data: unknown) => {
    if (!companyId || !currentTableName) return;
    try {
      const tableName = currentTableName;
      const formData = data as { name: string; description?: string };
      const usesTitleField = tableName === "job_roles";
      const payload = usesTitleField
        ? { title: formData.name, description: formData.description }
        : { name: formData.name, description: formData.description };

      if (editingItem) {
        const { error } = await (supabase as any)
          .from(tableName)
          .update(payload)
          .eq("id", editingItem.id)
          .eq("company_id", companyId);
        if (error) throw error;
        toast({ title: "Gespeichert", description: "Element wurde aktualisiert" });
      } else {
        const { error } = await (supabase as any)
          .from(tableName)
          .insert([{ ...payload, company_id: companyId }]);
        if (error) throw error;
        toast({ title: "Gespeichert", description: "Element wurde erstellt" });
      }
      setIsDialogOpen(false);
      setEditingItem(null);
      setCurrentTableName("");
      setForceDialogOpen(false);
      form.reset();
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const saveApprovalWorkflow = async (departmentId: string, approverId: string) => {
    if (!companyId) return;
    try {
      const { error } = await supabase
        .from("approval_workflows")
        .upsert(
          { company_id: companyId, department_id: departmentId, approver_id: approverId },
          { onConflict: "company_id,department_id" }
        );
      if (error) throw error;
      toast({ title: "Gespeichert", description: "Freigabe-Workflow wurde gespeichert" });
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const deleteApprovalWorkflow = async (id: string) => {
    if (!companyId) return;
    try {
      const { error } = await supabase
        .from("approval_workflows")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);
      if (error) throw error;
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  // Generic inline-add for simple tables
  const quickAdd = async (tableName: string, value: string, auditAction: string, auditType: string) => {
    if (!value || !companyId) return;
    const { data, error } = await supabase
      .from(tableName)
      .insert([{ name: value, company_id: companyId }])
      .select()
      .single();
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Gespeichert", description: "Added successfully" });
      logAction({
        action: auditAction,
        targetType: auditType,
        targetId: data?.id || null,
        targetName: value,
        details: { source: "quick_add" },
      });
      fetchAllData();
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {t("settings.locations")}
          </CardTitle>
          <CardDescription>{t("settings.locationsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter location name..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const input = e.currentTarget;
                    const value = input.value.trim();
                    quickAdd("locations", value, "create_location", "location").then(() => { input.value = ""; });
                  }
                }}
              />
              <Button
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  const value = input?.value.trim();
                  if (value) {
                    quickAdd("locations", value, "create_location", "location").then(() => { if (input) input.value = ""; });
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                        No locations found. Add your first location above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    locations.map((loc) => (
                      <TableRow key={loc.id}>
                        <TableCell className="font-medium">{loc.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCurrentTableName("locations");
                                handleEdit(loc);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCurrentTableName("locations");
                                setDeleteItem({ ...loc, tableName: "locations" });
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
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

      {/* Departments */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.departments")}</CardTitle>
          <CardDescription>Manage departments - Used across the system in dropdown menus</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter department name..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const input = e.currentTarget;
                    const value = input.value.trim();
                    quickAdd("departments", value, "create_department", "department").then(() => { input.value = ""; });
                  }
                }}
              />
              <Button
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  const value = input?.value.trim();
                  if (value) {
                    quickAdd("departments", value, "create_department", "department").then(() => { if (input) input.value = ""; });
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Abteilungsleiter</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No departments found. Add your first department above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    departments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.name}</TableCell>
                        <TableCell>
                          <Select
                            value={deptManagers[dept.id] || "__none__"}
                            onValueChange={async (val) => {
                              const userId = val === "__none__" ? null : val;
                              if (userId) {
                                // manager_employee_id wird von der RLS-Funktion user_can_view_employee
                                // genutzt (Mitarbeitersichtbarkeit) — manager_user_id vom GBU-Freigabe-Flow.
                                // Beide müssen gesetzt sein, sonst sieht der Abteilungsleiter niemanden.
                                const { data: managerEmployee } = await supabase
                                  .from("employees")
                                  .select("id")
                                  .eq("company_id", companyId)
                                  .eq("user_id", userId)
                                  .maybeSingle();

                                const { error: upsertErr } = await (supabase as any)
                                  .from("department_managers")
                                  .upsert(
                                    {
                                      department_id: dept.id,
                                      manager_user_id: userId,
                                      manager_employee_id: managerEmployee?.id || null,
                                      company_id: companyId,
                                      manager_type: "disciplinary",
                                    },
                                    { onConflict: "department_id,company_id,manager_type" }
                                  );
                                if (upsertErr) {
                                  toast({ title: "Fehler beim Speichern", description: upsertErr.message, variant: "destructive" });
                                  return;
                                }
                                setDeptManagers(prev => ({ ...prev, [dept.id]: userId }));
                              } else {
                                const { error: delErr } = await (supabase as any)
                                  .from("department_managers")
                                  .delete()
                                  .eq("department_id", dept.id)
                                  .eq("company_id", companyId)
                                  .eq("manager_type", "disciplinary");
                                if (delErr) {
                                  toast({ title: "Fehler beim Löschen", description: delErr.message, variant: "destructive" });
                                  return;
                                }
                                setDeptManagers(prev => { const n = { ...prev }; delete n[dept.id]; return n; });
                              }
                              setDeptManagerSearch(prev => ({ ...prev, [dept.id]: "" }));
                              toast({ title: "Gespeichert", description: "Abteilungsleiter aktualisiert" });
                            }}
                          >
                            <SelectTrigger className="w-[220px] h-8 text-xs">
                              <SelectValue placeholder="— Kein Leiter —">
                                {deptManagers[dept.id]
                                  ? (() => {
                                      const m = teamMembers.find(tm => tm.user_id === deptManagers[dept.id]);
                                      return m ? `${m.first_name} ${m.last_name}` : "Unbekannt";
                                    })()
                                  : "— Kein Leiter —"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <div className="px-2 pb-1 pt-1">
                                <input
                                  className="w-full h-7 px-2 text-xs border rounded bg-background"
                                  placeholder="Suchen..."
                                  value={deptManagerSearch[dept.id] || ""}
                                  onChange={e => setDeptManagerSearch(prev => ({ ...prev, [dept.id]: e.target.value }))}
                                  onClick={e => e.stopPropagation()}
                                  onKeyDown={e => e.stopPropagation()}
                                />
                              </div>
                              <SelectItem value="__none__">— Kein Leiter —</SelectItem>
                              {teamMembers
                                .filter(tm => {
                                  const q = (deptManagerSearch[dept.id] || "").toLowerCase();
                                  if (!q) return true;
                                  return `${tm.first_name} ${tm.last_name} ${tm.email}`.toLowerCase().includes(q);
                                })
                                .map((tm) => (
                                  <SelectItem key={tm.user_id || tm.id} value={tm.user_id || tm.id}>
                                    {tm.first_name} {tm.last_name}
                                    <span className="text-muted-foreground ml-1 text-xs">· {tm.role}</span>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCurrentTableName("departments");
                                handleEdit(dept);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCurrentTableName("departments");
                                setDeleteItem({ ...dept, tableName: "departments" });
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
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

      {/* Approval Process */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            {t("settings.approvalProcess")}
          </CardTitle>
          <CardDescription>{t("settings.approvalProcessDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium mb-3">{t("settings.addApprovalWorkflow")}</h4>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>{t("settings.department")}</Label>
                  <Select
                    onValueChange={(value) => {
                      const dept = departments.find((d) => d.id === value);
                      if (dept && !approvalWorkflows.find((w) => w.department_id === value)) {
                        setApprovalWorkflows([
                          ...approvalWorkflows,
                          {
                            id: Date.now().toString(),
                            department_id: value,
                            department_name: dept.name,
                            approver_id: "",
                            approver_name: "",
                          },
                        ]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("settings.selectDepartment")} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments
                        .filter((d) => !approvalWorkflows.find((w) => w.department_id === d.id))
                        .map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {approvalWorkflows.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("settings.department")}</TableHead>
                      <TableHead>{t("settings.approver")}</TableHead>
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvalWorkflows.map((workflow) => (
                      <TableRow key={workflow.id}>
                        <TableCell className="font-medium">{workflow.department_name}</TableCell>
                        <TableCell>
                          <Select
                            value={workflow.approver_id}
                            onValueChange={(value) => saveApprovalWorkflow(workflow.department_id, value)}
                          >
                            <SelectTrigger className="w-[250px]">
                              <SelectValue placeholder={t("settings.selectApprover")} />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteApprovalWorkflow(workflow.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                {t("settings.noApprovalWorkflows")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Exposure Groups */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.exposureGroups")}</CardTitle>
          <CardDescription>Manage exposure groups - Used across the system in dropdown menus</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter exposure group name..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const input = e.currentTarget;
                    const value = input.value.trim();
                    quickAdd("exposure_groups", value, "create_exposure_group", "exposure_group").then(() => { input.value = ""; });
                  }
                }}
              />
              <Button
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  const value = input?.value.trim();
                  if (value) {
                    quickAdd("exposure_groups", value, "create_exposure_group", "exposure_group").then(() => { if (input) input.value = ""; });
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exposureGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No exposure groups found. Add your first group above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    exposureGroups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell className="text-muted-foreground">{group.description || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCurrentTableName("exposure_groups");
                                handleEdit(group);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCurrentTableName("exposure_groups");
                                setDeleteItem({ ...group, tableName: "exposure_groups" });
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
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

      {/* Edit Dialog */}
      <Dialog
        open={forceDialogOpen || undefined}
        onOpenChange={(open) => {
          if (!open) {
            handleDialogClose();
            setForceDialogOpen(false);
          } else {
            setForceDialogOpen(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit" : "Add"} Item</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the details below." : "Create a new item."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Add additional details..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button type="submit">{editingItem ? "Update" : "Create"}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteItem?.name || deleteItem?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
