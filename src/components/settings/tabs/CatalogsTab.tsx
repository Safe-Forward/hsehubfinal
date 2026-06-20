import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const PREDEFINED_HAZARD_CATEGORIES = [
  "Mechanical", "Electrical", "Chemical", "Biological", "Ergonomic",
  "Physical", "Psychosocial", "Fire/Explosion", "Environmental", "Other",
];

const PREDEFINED_MEASURE_BUILDING_BLOCKS = [
  "Elimination", "Substitution", "Engineering Controls", "Administrative Controls",
  "Personal Protective Equipment (PPE)", "Training", "Supervision", "Maintenance",
  "Emergency Procedures", "Other",
];

interface Props {
  onNavigateToTab?: (tab: string) => void;
}

export function CatalogsTab({ onNavigateToTab }: Props) {
  const { companyId } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  const [riskCategories, setRiskCategories] = useState<any[]>([]);
  const [measureBuildingBlocks, setMeasureBuildingBlocks] = useState<any[]>([]);

  // Generic CRUD state
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
    const [risk, measures] = await Promise.all([
      supabase.from("risk_categories").select("*").eq("company_id", companyId),
      supabase.from("measure_building_blocks").select("*").eq("company_id", companyId),
    ]);
    setRiskCategories(risk.data || []);
    setMeasureBuildingBlocks(measures.data || []);
  };

  const handleDialogClose = () => {
    setEditingItem(null);
    setCurrentTableName("");
    setForceDialogOpen(false);
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
      const { error } = await supabase
        .from(deleteItem.tableName)
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
      const formData = data as { name: string; description?: string };
      const payload = { name: formData.name, description: formData.description };
      if (editingItem) {
        const { error } = await (supabase as any)
          .from(currentTableName)
          .update(payload)
          .eq("id", editingItem.id)
          .eq("company_id", companyId);
        if (error) throw error;
        toast({ title: "Gespeichert", description: "Element wurde aktualisiert" });
      } else {
        const { error } = await (supabase as any)
          .from(currentTableName)
          .insert([{ ...payload, company_id: companyId }]);
        if (error) throw error;
        toast({ title: "Gespeichert", description: "Element wurde erstellt" });
      }
      handleDialogClose();
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const loadPredefinedHazardCategories = async () => {
    if (!companyId) return;
    try {
      const existingNames = new Set(riskCategories.map((item: any) => String(item.name || "").trim().toLowerCase()));
      const missing = PREDEFINED_HAZARD_CATEGORIES.filter((name) => !existingNames.has(name.toLowerCase()));
      if (missing.length === 0) {
        toast({ title: "Bereits aktuell", description: "Alle vordefinierten Gefahrenkategorien sind bereits vorhanden." });
        return;
      }
      const { error } = await supabase.from("risk_categories").insert(
        missing.map((name) => ({ name, company_id: companyId, is_predefined: true }))
      );
      if (error) throw error;
      toast({ title: "Gespeichert", description: `${missing.length} predefined hazard categories added.` });
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const loadPredefinedMeasureBuildingBlocks = async () => {
    if (!companyId) return;
    try {
      const existingNames = new Set(measureBuildingBlocks.map((item: any) => String(item.name || "").trim().toLowerCase()));
      const missing = PREDEFINED_MEASURE_BUILDING_BLOCKS.filter((name) => !existingNames.has(name.toLowerCase()));
      if (missing.length === 0) {
        toast({ title: "Bereits aktuell", description: "All predefined measure building blocks are already available." });
        return;
      }
      const { error } = await supabase.from("measure_building_blocks").insert(
        missing.map((name) => ({ name, company_id: companyId }))
      );
      if (error) throw error;
      toast({ title: "Gespeichert", description: `${missing.length} predefined measure building blocks added.` });
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Hazard Categories */}
      <Card id="settings-hazard-categories">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{t("settings.hazardCategories")}</CardTitle>
            <Button variant="outline" size="sm" onClick={loadPredefinedHazardCategories}>
              Load Predefined Values
            </Button>
          </div>
          <CardDescription>{t("settings.hazardCategoriesDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add custom category..."
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    const input = e.currentTarget;
                    const value = input.value.trim();
                    if (value && companyId) {
                      const { error } = await supabase
                        .from("risk_categories")
                        .insert([{ name: value, company_id: companyId, is_predefined: false }]);
                      if (error) {
                        toast({ title: "Fehler", description: error.message, variant: "destructive" });
                      } else {
                        toast({ title: "Gespeichert", description: "Category added successfully" });
                        input.value = "";
                        fetchAllData();
                      }
                    }
                  }
                }}
              />
              <Button
                onClick={async (e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  const value = input?.value.trim();
                  if (value && companyId) {
                    const { error } = await supabase
                      .from("risk_categories")
                      .insert([{ name: value, company_id: companyId, is_predefined: false }]);
                    if (error) {
                      toast({ title: "Fehler", description: error.message, variant: "destructive" });
                    } else {
                      toast({ title: "Gespeichert", description: "Kategorie wurde hinzugefügt" });
                      if (input) input.value = "";
                      fetchAllData();
                    }
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                {t("settings.add")}
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riskCategories
                    .filter((c) => !["Low", "Medium", "High", "Very High"].includes(c.name))
                    .map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell>
                          <Badge>{t("settings.custom")}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCurrentTableName("risk_categories");
                                handleEdit(cat);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteItem({ ...cat, tableName: "risk_categories" })}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Measure Building Blocks */}
      <Card id="settings-measure-building-blocks">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {t("settings.measureBuildingBlocks")}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadPredefinedMeasureBuildingBlocks}>
              Load Predefined Values
            </Button>
          </div>
          <CardDescription>{t("settings.measureBuildingBlocksDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter measure building block name..."
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    const input = e.currentTarget;
                    const value = input.value.trim();
                    if (value && companyId) {
                      const { error } = await supabase
                        .from("measure_building_blocks")
                        .insert([{ name: value, company_id: companyId }]);
                      if (error) {
                        toast({ title: "Fehler", description: error.message, variant: "destructive" });
                      } else {
                        toast({ title: "Gespeichert", description: `Measure building block "${value}" added` });
                        input.value = "";
                        fetchAllData();
                      }
                    }
                  }
                }}
              />
              <Button
                onClick={async (e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  const value = input?.value.trim();
                  if (value && companyId) {
                    const { error } = await supabase
                      .from("measure_building_blocks")
                      .insert([{ name: value, company_id: companyId }]);
                    if (error) {
                      toast({ title: "Fehler", description: error.message, variant: "destructive" });
                    } else {
                      toast({ title: "Gespeichert", description: `Measure building block "${value}" added` });
                      if (input) input.value = "";
                      fetchAllData();
                    }
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add reusable measure templates like Elimination, Substitution, Engineering Controls, etc.
            </p>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {measureBuildingBlocks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                        No measure building blocks found. Add your first block above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    measureBuildingBlocks.map((block) => (
                      <TableRow key={block.id}>
                        <TableCell className="font-medium">{block.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                if (!companyId) return;
                                const { error } = await supabase
                                  .from("measure_building_blocks")
                                  .delete()
                                  .eq("id", block.id)
                                  .eq("company_id", companyId);
                                if (error) {
                                  toast({ title: "Fehler", description: error.message, variant: "destructive" });
                                } else {
                                  toast({ title: "Gespeichert", description: "Measure building block deleted" });
                                  fetchAllData();
                                }
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
          if (!open) handleDialogClose();
          else setForceDialogOpen(true);
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
                <Button type="button" variant="outline" onClick={handleDialogClose}>Cancel</Button>
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
