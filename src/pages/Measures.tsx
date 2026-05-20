import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  CheckCircle,
  Clock,
  X,
  Edit,
  Trash2,
  FileDown,
  Calendar as CalendarIcon,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Measure {
  id: string;
  title: string;
  description: string | null;
  measure_type: "preventive" | "corrective" | "improvement";
  status: "planned" | "in_progress" | "completed" | "cancelled";
  responsible_person_id: string | null;
  due_date: string | null;
  completion_date: string | null;
  risk_assessment_id: string | null;
  audit_id: string | null;
  incident_id: string | null;
  verification_method: string | null;
  created_at: string;
  responsible_person?: {
    full_name: string;
  };
}

interface Employee {
  id: string;
  full_name: string;
}

export default function Measures() {
  const { user, companyId, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [measures, setMeasures] = useState<Measure[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeasure, setEditingMeasure] = useState<Measure | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    measure_type: "corrective" as "preventive" | "corrective" | "improvement",
    status: "planned" as "planned" | "in_progress" | "completed" | "cancelled",
    responsible_person_id: "",
    due_date: "",
    completion_date: "",
    verification_method: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (companyId) {
      fetchMeasures();
      fetchEmployees();
    }
  }, [companyId]);

  const fetchMeasures = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("measures" as any)
        .select(
          `
          *,
          responsible_person:employees!responsible_person_id(full_name)
        `
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMeasures((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching measures:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch measures",
        variant: "destructive",
      });
    }
  };

  const fetchEmployees = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      const measureData = {
        company_id: companyId,
        title: formData.title,
        description: formData.description || null,
        measure_type: formData.measure_type,
        status: formData.status,
        responsible_person_id:
          formData.responsible_person_id === "none"
            ? null
            : formData.responsible_person_id || null,
        due_date: formData.due_date || null,
        completion_date: formData.completion_date || null,
        verification_method: formData.verification_method || null,
      };

      if (editingMeasure) {
        const { error } = await (supabase as any)
          .from("measures")
          .update(measureData)
          .eq("id", editingMeasure.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Measure updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("measures" as any)
          .insert(measureData as any);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Measure created successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchMeasures();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save measure",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this measure?")) return;

    try {
      const { error } = await supabase
        .from("measures" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Measure deleted successfully" });
      fetchMeasures();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete measure",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (measure: Measure) => {
    setEditingMeasure(measure);
    setFormData({
      title: measure.title,
      description: measure.description || "",
      measure_type: measure.measure_type,
      status: measure.status,
      responsible_person_id: measure.responsible_person_id || "none",
      due_date: measure.due_date || "",
      completion_date: measure.completion_date || "",
      verification_method: measure.verification_method || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      measure_type: "corrective",
      status: "planned",
      responsible_person_id: "none",
      due_date: "",
      completion_date: "",
      verification_method: "",
    });
    setEditingMeasure(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      planned: { variant: "secondary", label: "Planned" },
      in_progress: { variant: "default", label: "In Progress" },
      completed: { variant: "outline", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const config = variants[status] || variants.planned;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      preventive: "bg-blue-100 text-blue-800",
      corrective: "bg-orange-100 text-orange-800",
      improvement: "bg-green-100 text-green-800",
    };
    return (
      <Badge className={colors[type] || colors.corrective}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const filteredMeasures = measures.filter((measure) => {
    const matchesSearch = measure.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || measure.status === filterStatus;
    const matchesType =
      filterType === "all" || measure.measure_type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text("Measures & Controls Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${format(new Date(), "PPP")}`, 14, 30);

    // Prepare table data
    const tableData = filteredMeasures.map((measure) => [
      measure.title,
      measure.measure_type.charAt(0).toUpperCase() +
      measure.measure_type.slice(1),
      measure.status.charAt(0).toUpperCase() + measure.status.slice(1),
      measure.responsible_person?.full_name || "Unassigned",
      measure.due_date
        ? format(new Date(measure.due_date), "MMM dd, yyyy")
        : "No deadline",
    ]);

    autoTable(doc, {
      head: [["Measure Title", "Type", "Status", "Responsible", "Due Date"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`measures_report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({
      title: "Success",
      description: "PDF exported successfully",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back")}
          </Button>
          <div>
            <h2 className="text-3xl font-bold">{t("measures.title")}</h2>
            <p className="text-muted-foreground">{t("measures.subtitle")}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("measures.title")}</CardTitle>
              <CardDescription>{t("measures.subtitle")}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToPDF}>
                <FileDown className="w-4 h-4 mr-2" />
                {t("measures.exportPDF")}
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("measures.new")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingMeasure ? t("measures.edit") : t("measures.new")}
                    </DialogTitle>
                    <DialogDescription>
                      {t("measures.subtitle")}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="title">
                        {t("measures.measureTitle")} *
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        placeholder="e.g., Install safety guards on machinery"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type">Measure Type *</Label>
                        <Select
                          value={formData.measure_type}
                          onValueChange={(value: any) =>
                            setFormData({ ...formData, measure_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="corrective">
                              Corrective
                            </SelectItem>
                            <SelectItem value="preventive">
                              Preventive
                            </SelectItem>
                            <SelectItem value="improvement">
                              Improvement
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="status">Status *</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value: any) =>
                            setFormData({ ...formData, status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="in_progress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="Detailed description of the measure"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="responsible">Responsible Person</Label>
                      <Select
                        value={formData.responsible_person_id}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            responsible_person_id: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select responsible person" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="due_date">Due Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full justify-start text-left font-normal ${!formData.due_date && "text-muted-foreground"}`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.due_date ? (
                                format(new Date(formData.due_date), "PPP")
                              ) : (
                                <span>{t("common.pickDate")}</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.due_date ? new Date(formData.due_date) : undefined}
                              onSelect={(date) =>
                                setFormData({
                                  ...formData,
                                  due_date: date ? format(date, "yyyy-MM-dd") : "",
                                })
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label htmlFor="completion_date">Completion Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full justify-start text-left font-normal ${!formData.completion_date && "text-muted-foreground"}`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.completion_date ? (
                                format(new Date(formData.completion_date), "PPP")
                              ) : (
                                <span>{t("common.pickDate")}</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.completion_date ? new Date(formData.completion_date) : undefined}
                              onSelect={(date) =>
                                setFormData({
                                  ...formData,
                                  completion_date: date ? format(date, "yyyy-MM-dd") : "",
                                })
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="verification">Verification Method</Label>
                      <Textarea
                        id="verification"
                        value={formData.verification_method}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            verification_method: e.target.value,
                          })
                        }
                        placeholder="How will this measure be verified?"
                        rows={2}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          resetForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingMeasure ? "Update" : "Create"} Measure
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search measures..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="corrective">Corrective</SelectItem>
                <SelectItem value="preventive">Preventive</SelectItem>
                <SelectItem value="improvement">Improvement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Measure Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsible</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeasures.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No measures found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMeasures.map((measure) => (
                    <TableRow key={measure.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{measure.title}</div>
                          {measure.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {measure.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(measure.measure_type)}
                      </TableCell>
                      <TableCell>{getStatusBadge(measure.status)}</TableCell>
                      <TableCell>
                        {measure.responsible_person?.full_name || (
                          <span className="text-muted-foreground">
                            Unassigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {measure.due_date ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(measure.due_date), "MMM dd, yyyy")}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            No deadline
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(measure)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(measure.id)}
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
        </CardContent>
      </Card>
    </div>
  );
}
