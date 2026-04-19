import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, FileDown, Calendar as CalendarIcon, Users, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Investigation {
  id: string;
  investigation_id: string;
  related_incident_id: string | null;
  start_date: string;
  assigned_to_id: string | null;
  status: "due" | "planned" | "completed";
  priority: "low" | "medium" | "high" | "critical";
  description: string | null;
  findings: string | null;
  recommendations: string | null;
  g_code: string | null;
  appointment_date: string | null;
  due_date: string | null;
  doctor: string | null;
  assigned_to?: {
    full_name: string;
    employee_number: string;
    departments?: { name: string };
    exposure_groups?: { name: string };
  };
}

interface Employee {
  id: string;
  full_name: string;
  employee_number: string;
  departments?: { id: string; name: string } | null;
  exposure_groups?: { id: string; name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface ExposureGroup {
  id: string;
  name: string;
}

interface HealthCheckup {
  id: string;
  employee_id: string;
  company_id: string;
  investigation_name: string;
  appointment_date: string;
  completion_date?: string | null;
  due_date?: string | null;
  status: string;
  certificate_url?: string | null;
  notes: string | null;
  employee?: {
    full_name: string;
    employee_number: string;
    departments?: { name: string };
    exposure_groups?: { name: string };
  };
}

type ViewMode = "employee" | "date" | "checkup";

export default function Investigations() {
  const { user, loading, companyId } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State variables
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [exposureGroups, setExposureGroups] = useState<ExposureGroup[]>([]);
  const [healthCheckups, setHealthCheckups] = useState<HealthCheckup[]>([]);
  const [gInvestigations, setGInvestigations] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("employee");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterCheckUpType, setFilterCheckUpType] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvestigation, setEditingInvestigation] =
    useState<Investigation | null>(null);

  const [formData, setFormData] = useState({
    investigation_id: "",
    g_code: "",
    start_date: "",
    due_date: "",
    appointment_date: "",
    assigned_to_id: "",
    doctor: "",
    status: "planned" as "due" | "planned" | "completed",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    description: "",
    findings: "",
    recommendations: "",
  });

  // Bulk delete states
  const [selectedInvestigations, setSelectedInvestigations] = useState<Set<string>>(new Set());
  const [selectedCheckups, setSelectedCheckups] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (companyId) {
      fetchInvestigations();
      fetchEmployees();
      fetchDepartments();
      fetchExposureGroups();
      fetchHealthCheckups();
      fetchGInvestigations();
    }
  }, [companyId]);

  const fetchInvestigations = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("investigations" as any)
        .select(
          `
          *,
          assigned_to:employees!assigned_to_id(
            full_name,
            employee_number,
            departments(name),
            exposure_groups(name)
          )
        `
        )
        .eq("company_id", companyId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      setInvestigations((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching investigations:", error);
    }
  };

  const fetchEmployees = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
          id,
          full_name,
          employee_number,
          departments(id, name),
          exposure_groups(id, name)
        `
        )
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      setEmployees((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchDepartments = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchExposureGroups = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("exposure_groups")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      setExposureGroups(data || []);
    } catch (error: any) {
      console.error("Error fetching exposure groups:", error);
    }
  };

  const fetchHealthCheckups = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("health_checkups")
        .select(
          `
          *,
          employee:employees(
            id,
            full_name,
            employee_number,
            departments(name),
            exposure_groups(name)
          )
        `
        )
        .eq("company_id", companyId)
        .order("appointment_date", { ascending: false });

      if (error) throw error;
      setHealthCheckups((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching health checkups:", error);
    }
  };

  const fetchGInvestigations = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("g_investigations")
        .select("*")
        .eq("company_id", companyId)
        .order("name");

      if (error) {
        console.log("G-Investigations table not created yet");
        setGInvestigations([]);
        return;
      }
      setGInvestigations(data || []);
    } catch (error) {
      console.error("Error fetching G-Investigations:", error);
      setGInvestigations([]);
    }
  };

  const generateInvestigationId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `G-${year}${month}-${random}`;
  };

  // Helper function to sync investigation data to health_checkups table
  const syncToHealthCheckups = async (
    investigationData: any,
    investigationId: string
  ) => {
    if (!investigationData.assigned_to_id || !companyId) return;
    try {
      // Find the full G-Investigation name from the g_investigations list
      const gInvestigation = gInvestigations.find(
        (g) => g.name === investigationData.g_code
      );
      const investigationName = gInvestigation
        ? gInvestigation.name
        : investigationData.g_code || investigationData.investigation_id;

      // Prepare health checkup data
      const checkupData: any = {
        employee_id: investigationData.assigned_to_id,
        company_id: companyId,
        investigation_id: investigationId,
        investigation_name: investigationName,
        appointment_date:
          investigationData.appointment_date || investigationData.start_date || new Date().toISOString().split('T')[0],
        status:
          investigationData.status === "completed"
            ? "done"
            : investigationData.status,
        notes:
          [
            investigationData.doctor
              ? `Doctor: ${investigationData.doctor}`
              : null,
            investigationData.description,
            investigationData.findings,
            investigationData.recommendations,
          ]
            .filter(Boolean)
            .join("\n\n") || null,
      };

      // Only add due_date if it exists (for backward compatibility)
      if (investigationData.due_date) {
        checkupData.due_date = investigationData.due_date;
      }

      console.log("Syncing to health_checkups:", checkupData);

      // Check if a health checkup already exists for this investigation
      const { data: existing, error: fetchError } = await supabase
        .from("health_checkups")
        .select("id")
        .eq("investigation_id", investigationId)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error checking existing health checkup:", fetchError);
        return;
      }

      if (existing) {
        // Update existing health checkup
        console.log("Updating existing checkup:", existing.id);
        const { error: updateError } = await supabase
          .from("health_checkups")
          .update(checkupData)
          .eq("id", existing.id);

        if (updateError) {
          console.error("Error updating health checkup:", updateError);
          throw updateError;
        } else {
          console.log("Successfully updated health checkup");
        }
      } else {
        // Create new health checkup
        console.log("Creating new health checkup");
        const { data: newCheckup, error: insertError } = await supabase
          .from("health_checkups")
          .insert(checkupData)
          .select()
          .single();

        if (insertError) {
          console.error("Error creating health checkup:", insertError);
          throw insertError;
        } else {
          console.log("Successfully created health checkup:", newCheckup);
        }
      }
    } catch (error) {
      console.error("Error syncing to health checkups:", error);
      throw error;
    }
  };

  const createHealthCheckupFromInvestigationForm = async (
    investigationData: any
  ) => {
    if (!investigationData.assigned_to_id || !companyId) {
      throw new Error("Please select an employee to create a health checkup.");
    }

    const gInvestigation = gInvestigations.find(
      (g) => g.name === investigationData.g_code
    );

    const investigationName = gInvestigation
      ? gInvestigation.name
      : investigationData.g_code || investigationData.investigation_id;

    const mappedStatus =
      investigationData.status === "completed"
        ? "done"
        : investigationData.status === "planned"
          ? "planned"
          : "open";

    const checkupData: any = {
      employee_id: investigationData.assigned_to_id,
      company_id: companyId,
      investigation_name: investigationName,
      appointment_date:
        investigationData.appointment_date ||
        investigationData.start_date?.toString().split("T")[0] ||
        new Date().toISOString().split("T")[0],
      status: mappedStatus,
      notes:
        [
          investigationData.doctor
            ? `Doctor: ${investigationData.doctor}`
            : null,
          investigationData.description,
          investigationData.findings,
          investigationData.recommendations,
        ]
          .filter(Boolean)
          .join("\n\n") || null,
    };

    if (investigationData.due_date) {
      checkupData.due_date = investigationData.due_date;
    }

    const { error } = await supabase.from("health_checkups").insert(checkupData);
    if (error) throw error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      const investigationData = {
        company_id: companyId,
        investigation_id:
          formData.investigation_id || generateInvestigationId(),
        g_code: formData.g_code || null,
        start_date: formData.start_date || new Date().toISOString(),
        due_date: formData.due_date || null,
        appointment_date: formData.appointment_date || null,
        assigned_to_id:
          formData.assigned_to_id === "none"
            ? null
            : formData.assigned_to_id || null,
        doctor: formData.doctor || null,
        status: formData.status,
        priority: formData.priority,
        description: formData.description || null,
        findings: formData.findings || null,
        recommendations: formData.recommendations || null,
      };

      if (editingInvestigation) {
        const { error } = await (supabase as any)
          .from("investigations")
          .update(investigationData)
          .eq("id", editingInvestigation.id);
        if (error) throw error;

        // Sync with health_checkups if employee is assigned
        if (investigationData.assigned_to_id) {
          try {
            await syncToHealthCheckups(
              investigationData,
              editingInvestigation.id
            );
          } catch (syncError: any) {
            console.error("Failed to sync to health checkups:", syncError);
            toast({
              title: "Warning",
              description: "Investigation updated but failed to sync checkup: " + (syncError.message || "Unknown error"),
              variant: "destructive",
            });
          }
        }
        toast({
          title: t("common.success"),
          description: t("investigations.updated"),
        });
      } else {
        const { data: newInvestigation, error } = await supabase
          .from("investigations" as any)
          .insert(investigationData as any)
          .select()
          .single();

        if (error) {
          // Some roles can create health checkups but are blocked from direct
          // inserts into investigations by current RLS policies.
          if (
            String(error.message || "")
              .toLowerCase()
              .includes("row-level security")
          ) {
            await createHealthCheckupFromInvestigationForm(investigationData);
            toast({
              title: t("common.success"),
              description: t("investigations.created"),
            });

            setIsDialogOpen(false);
            resetForm();
            fetchInvestigations();
            fetchHealthCheckups();
            return;
          }

          throw error;
        }

        // Sync with health_checkups if employee is assigned
        if (investigationData.assigned_to_id && newInvestigation) {
          try {
            await syncToHealthCheckups(investigationData, newInvestigation.id);
          } catch (syncError: any) {
            console.error("Failed to sync to health checkups:", syncError);
            toast({
              title: "Warning",
              description: "Investigation created but failed to sync checkup: " + (syncError.message || "Unknown error"),
              variant: "destructive",
            });
          }
        }
        toast({
          title: t("common.success"),
          description: t("investigations.created"),
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchInvestigations();
      fetchHealthCheckups();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("common.savingError"),
        variant: "destructive",
      });
    }
  };

  const handleEdit = (investigation: Investigation) => {
    setEditingInvestigation(investigation);
    setFormData({
      investigation_id: investigation.investigation_id,
      g_code: investigation.g_code || "",
      start_date: investigation.start_date,
      due_date: investigation.due_date || "",
      appointment_date: investigation.appointment_date || "",
      assigned_to_id: investigation.assigned_to_id || "none",
      doctor: investigation.doctor || "",
      status: investigation.status,
      priority: investigation.priority,
      description: investigation.description || "",
      findings: investigation.findings || "",
      recommendations: investigation.recommendations || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      investigation_id: "",
      g_code: "",
      start_date: "",
      due_date: "",
      appointment_date: "",
      assigned_to_id: "none",
      doctor: "",
      status: "planned",
      priority: "medium",
      description: "",
      findings: "",
      recommendations: "",
    });
    setEditingInvestigation(null);
  };

  // Bulk delete handlers
  const handleSelectAll = () => {
    const allIds = groupedByEmployee.flatMap(item =>
      item.investigations.map(inv => inv.id)
    );
    if (selectedInvestigations.size === allIds.length) {
      setSelectedInvestigations(new Set());
    } else {
      setSelectedInvestigations(new Set(allIds));
    }
  };

  const handleSelectInvestigation = (investigationId: string) => {
    const newSelected = new Set(selectedInvestigations);
    if (newSelected.has(investigationId)) {
      newSelected.delete(investigationId);
    } else {
      newSelected.add(investigationId);
    }
    setSelectedInvestigations(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedInvestigations.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedInvestigations.size} investigation(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("investigations")
        .delete()
        .in("id", Array.from(selectedInvestigations));

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully deleted ${selectedInvestigations.size} investigation(s)`,
      });
      setSelectedInvestigations(new Set());
      fetchInvestigations();
    } catch (error: any) {
      console.error("Error deleting investigations:", error);

      // Show detailed error message
      const errorMessage = error?.message || error?.details || error?.hint || "Failed to delete investigations";
      const errorDetails = error?.code ? ` (Error code: ${error.code})` : "";

      toast({
        title: "Error",
        description: `${errorMessage}${errorDetails}`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete handlers for checkups
  const handleSelectAllCheckups = () => {
    const allIds = healthCheckups.map(c => c.id);
    if (selectedCheckups.size === allIds.length) {
      setSelectedCheckups(new Set());
    } else {
      setSelectedCheckups(new Set(allIds));
    }
  };

  const handleSelectCheckup = (checkupId: string) => {
    const newSelected = new Set(selectedCheckups);
    if (newSelected.has(checkupId)) {
      newSelected.delete(checkupId);
    } else {
      newSelected.add(checkupId);
    }
    setSelectedCheckups(newSelected);
  };

  const handleBulkDeleteCheckups = async () => {
    if (selectedCheckups.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedCheckups.size} checkup(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("health_checkups")
        .delete()
        .in("id", Array.from(selectedCheckups));

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully deleted ${selectedCheckups.size} checkup(s)`,
      });
      setSelectedCheckups(new Set());
      fetchHealthCheckups();
    } catch (error: any) {
      console.error("Error deleting checkups:", error);

      const errorMessage = error?.message || error?.details || error?.hint || "Failed to delete checkups";
      const errorDetails = error?.code ? ` (Error code: ${error.code})` : "";

      toast({
        title: "Error",
        description: `${errorMessage}${errorDetails}`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; labelKey: string }> = {
      due: {
        className: "bg-red-100 text-red-800",
        labelKey: "dashboard.dueStatus",
      },
      planned: {
        className: "bg-blue-100 text-blue-800",
        labelKey: "investigations.planned",
      },
      completed: {
        className: "bg-green-100 text-green-800",
        labelKey: "investigations.completed",
      },
    };
    const config = variants[status] || variants.planned;
    return <Badge className={config.className}>{t(config.labelKey)}</Badge>;
  };

  // Filter investigations for both views
  const filteredInvestigations = investigations.filter((investigation) => {
    const matchesSearch =
      investigation.investigation_id
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      investigation.assigned_to?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      investigation.g_code?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterCheckUpType === "all" || investigation.status === filterCheckUpType;

    const matchesDepartment =
      filterDepartment === "all" ||
      investigation.assigned_to?.departments?.name === filterDepartment;

    const matchesGroup =
      filterGroup === "all" ||
      investigation.assigned_to?.exposure_groups?.name === filterGroup;

    const matchesDateFrom =
      !filterDateFrom ||
      (investigation.due_date && investigation.due_date >= filterDateFrom);

    const matchesDateTo =
      !filterDateTo ||
      (investigation.due_date && investigation.due_date <= filterDateTo);

    return (
      matchesSearch &&
      matchesStatus &&
      matchesDepartment &&
      matchesGroup &&
      matchesDateFrom &&
      matchesDateTo
    );
  });

  // Group investigations by employee for Employee View (using filtered investigations)
  const groupedByEmployee = employees
    .map((employee) => {
      const employeeInvestigations = filteredInvestigations.filter(
        (inv) => inv.assigned_to_id === employee.id
      );
      return {
        employee,
        investigations: employeeInvestigations,
        gCodes: employeeInvestigations
          .map((inv) => inv.g_code || inv.investigation_id)
          .join(", "),
      };
    })
    .filter((item) => item.investigations.length > 0);

  // Group health checkups by employee for consistent Employee View (using healthCheckups data)
  const groupedByEmployeeFromCheckups = Array.from(
    new Map(
      healthCheckups
        .filter((c: any) => c.employee)
        .map((c: any) => [c.employee_id, { ...c.employee, id: c.employee_id }])
    ).values()
  )
    .map((employee: any) => {
      const employeeCheckups = healthCheckups.filter((checkup: any) => {
        const isForEmployee = checkup.employee_id === employee.id;
        if (!isForEmployee) return false;

        if (filterCheckUpType === "all") return true;

        if (filterCheckUpType === "completed") {
          return checkup.status === "done";
        }

        if (filterCheckUpType === "planned") {
          return checkup.status === "planned";
        }

        if (filterCheckUpType === "open") {
          return checkup.status === "open";
        }

        return checkup.status === filterCheckUpType;
      });

      return {
        employee,
        checkups: employeeCheckups,
        investigationNames: [
          ...new Set(
            employeeCheckups
              .map((c: any) => c.investigation_name)
              .filter(Boolean)
          ),
        ].join(", "),
      };
    })
    .filter((item) => {
      // Apply filters similar to checkup view
      const matchesDepartment =
        filterDepartment === "all" ||
        item.employee.departments?.name === filterDepartment;

      const matchesGroup =
        filterGroup === "all" ||
        item.employee.exposure_groups?.name === filterGroup;

      const matchesSearch =
        !searchTerm ||
        item.employee.full_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item.employee.employee_number
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item.investigationNames
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      return (
        item.checkups.length > 0 &&
        matchesDepartment &&
        matchesGroup &&
        matchesSearch
      );
    });

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(t("investigations.overview"), 14, 22);
    doc.setFontSize(11);
    doc.text(
      `${t("common.createdOn")} ${format(new Date(), "dd.MM.yyyy")}`,
      14,
      30
    );

    if (viewMode === "employee") {
      const tableData = groupedByEmployee.map((item) => [
        item.employee.full_name,
        item.employee.employee_number,
        item.employee.departments?.name || "—",
        item.employee.exposure_groups?.name || "—",
        item.gCodes,
      ]);

      autoTable(doc, {
        head: [
          [
            t("common.firstName"),
            t("common.lastName"),
            t("common.department"),
            t("common.group"),
            t("investigations.gCode"),
          ],
        ],
        body: tableData,
        startY: 35,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [37, 99, 235] },
      });
    } else {
      const tableData = filteredInvestigations.map((inv) => [
        inv.assigned_to?.full_name || "—",
        inv.g_code || inv.investigation_id,
        inv.due_date ? format(new Date(inv.due_date), "dd.MM.yyyy") : "—",
        inv.appointment_date
          ? format(new Date(inv.appointment_date), "dd.MM.yyyy")
          : "—",
        inv.doctor || "—",
        inv.status,
      ]);

      autoTable(doc, {
        head: [
          [
            t("common.employee"),
            t("investigations.gCode"),
            t("dueDate"),
            t("appointmentDate"),
            t("investigations.doctor"),
            t("common.status"),
          ],
        ],
        body: tableData,
        startY: 35,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [37, 99, 235] },
      });
    }

    doc.save(
      `untersuchungen_${viewMode}_${format(new Date(), "yyyy-MM-dd")}.pdf`
    );
    toast({
      title: t("common.success"),
      description: t("common.pdfExported"),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t("investigations.title")}</h2>
          <p className="text-muted-foreground">
            {t("investigations.overview")}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>{t("investigations.allInvestigations")}</CardTitle>
              <CardDescription>
                {t("investigations.employeesWithInvestigations")}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToPDF}>
                <FileDown className="w-4 h-4 mr-2" />
                {t("investigations.exportPDF")}
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("investigations.newInvestigation")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingInvestigation
                        ? t("investigations.editInvestigation")
                        : t("investigations.newInvestigation")}
                    </DialogTitle>
                    <DialogDescription>
                      {t("investigations.investigationDetails")}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="g_code">
                          {t("investigations.gCode")} *
                        </Label>
                        {gInvestigations.length === 0 ? (
                          <Input
                            id="g_code"
                            value={formData.g_code}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                g_code: e.target.value,
                              })
                            }
                            placeholder="z.B. G37, G11, G7"
                            required
                          />
                        ) : (
                          <Select
                            value={formData.g_code}
                            onValueChange={(value) =>
                              setFormData({ ...formData, g_code: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select G-Investigation" />
                            </SelectTrigger>
                            <SelectContent>
                              {gInvestigations.map((inv) => (
                                <SelectItem key={inv.id} value={inv.name}>
                                  {inv.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="assigned_to">
                          {t("investigations.employee")} *
                        </Label>
                        <Select
                          value={formData.assigned_to_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, assigned_to_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("investigations.selectEmployee")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              {t("investigations.none")}
                            </SelectItem>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="start_date">
                          {t("investigations.startDate")}
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full justify-start text-left font-normal ${!formData.start_date && "text-muted-foreground"}`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.start_date ? (
                                format(new Date(formData.start_date), "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.start_date ? new Date(formData.start_date) : undefined}
                              onSelect={(date) =>
                                setFormData({
                                  ...formData,
                                  start_date: date ? format(date, "yyyy-MM-dd") : "",
                                })
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label htmlFor="due_date">
                          {t("investigations.dueDate")}
                        </Label>
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
                                <span>Pick a date</span>
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
                        <Label htmlFor="appointment_date">
                          {t("investigations.appointmentDate")} (optional)
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full justify-start text-left font-normal ${!formData.appointment_date && "text-muted-foreground"}`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.appointment_date ? (
                                format(new Date(formData.appointment_date), "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.appointment_date ? new Date(formData.appointment_date) : undefined}
                              onSelect={(date) =>
                                setFormData({
                                  ...formData,
                                  appointment_date: date ? format(date, "yyyy-MM-dd") : "",
                                })
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="doctor">
                          {t("investigations.doctor")}
                        </Label>
                        <Input
                          id="doctor"
                          value={formData.doctor}
                          onChange={(e) =>
                            setFormData({ ...formData, doctor: e.target.value })
                          }
                          placeholder={t("investigations.doctorName")}
                        />
                      </div>
                      <div>
                        <Label htmlFor="status">{t("common.status")} *</Label>
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
                            <SelectItem value="planned">
                              {t("investigations.planned")}
                            </SelectItem>
                            <SelectItem value="due">
                              {t("dashboard.dueStatus")}
                            </SelectItem>
                            <SelectItem value="completed">
                              {t("investigations.completed")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">
                        {t("investigations.description")}
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder={t(
                          "investigations.investigationDescription"
                        )}
                        rows={3}
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
                        {t("investigations.cancel")}
                      </Button>
                      <Button type="submit">
                        {editingInvestigation
                          ? t("investigations.update")
                          : t("investigations.create")}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={viewMode === "employee" ? "default" : "outline"}
              onClick={() => setViewMode("employee")}
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-2" />
              {t("investigations.employeeView")}
            </Button>
            <Button
              variant={viewMode === "date" ? "default" : "outline"}
              onClick={() => setViewMode("date")}
              className="flex-1"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              {t("investigations.dateView")}
            </Button>
            <Button
              variant={viewMode === "checkup" ? "default" : "outline"}
              onClick={() => setViewMode("checkup")}
              className="flex-1"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Checkup View
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t("investigations.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={filterCheckUpType}
              onValueChange={setFilterCheckUpType}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("investigations.filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="planned">
                  {t("investigations.planned")}
                </SelectItem>
                <SelectItem value="open">{t("investigations.open")}</SelectItem>
                <SelectItem value="completed">
                  {t("investigations.completed")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterDepartment}
              onValueChange={setFilterDepartment}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("common.allDepartments")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("common.allDepartments")}
                </SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.allGroups")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allGroups")}</SelectItem>
                {exposureGroups.map((group) => (
                  <SelectItem key={group.id} value={group.name}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-[180px] justify-start text-left font-normal ${!filterDateFrom && "text-muted-foreground"}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDateFrom ? (
                    format(new Date(filterDateFrom), "PPP")
                  ) : (
                    <span>{t("common.fromDate")}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filterDateFrom ? new Date(filterDateFrom) : undefined}
                  onSelect={(date) => setFilterDateFrom(date ? format(date, "yyyy-MM-dd") : "")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-[180px] justify-start text-left font-normal ${!filterDateTo && "text-muted-foreground"}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDateTo ? (
                    format(new Date(filterDateTo), "PPP")
                  ) : (
                    <span>{t("common.toDate")}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filterDateTo ? new Date(filterDateTo) : undefined}
                  onSelect={(date) => setFilterDateTo(date ? format(date, "yyyy-MM-dd") : "")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            {viewMode === "employee" ? (
              // Employee View - Using health checkups data for consistency
              <Table>
                <TableHeader>
                  <TableRow>

                    <TableHead>{t("common.firstName")}</TableHead>
                    <TableHead>{t("common.lastName")}</TableHead>
                    <TableHead>{t("common.department")}</TableHead>
                    <TableHead>{t("investigations.gCode")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="text-right">
                      {t("common.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedByEmployeeFromCheckups.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {t("investigations.noInvestigations")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupedByEmployeeFromCheckups.map((item) => {
                      const nameParts = item.employee.full_name.split(" ");
                      const lastName = nameParts[nameParts.length - 1];
                      const firstName = nameParts.slice(0, -1).join(" ");

                      return (
                        <TableRow key={item.employee.id}>

                          <TableCell className="font-medium">
                            {firstName}
                          </TableCell>
                          <TableCell>{lastName}</TableCell>
                          <TableCell>
                            {item.employee.departments?.name || "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {item.checkups.map((checkup: any) => (
                                <span
                                  key={checkup.id}
                                  className="text-xs"
                                >
                                  {checkup.investigation_name || "—"}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {item.checkups.map((checkup: any) => (
                                <Badge
                                  key={checkup.id}
                                  className={`text-xs ${checkup.status === "done" ? "bg-green-500" :
                                    checkup.status === "planned" ? "bg-blue-500" : ""
                                    }`}
                                  variant={checkup.status === "open" ? "outline" : "default"}
                                >
                                  {checkup.status === "done" ? "Done" :
                                    checkup.status === "planned" ? "Planned" : "Open"}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(`/employees/${item.employee.id}`)
                              }
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              {t("common.edit")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            ) : viewMode === "date" ? (
              // Date View - Using health checkups data for consistency
              <Table>
                <TableHeader>
                  <TableRow>

                    <TableHead>{t("common.employee")}</TableHead>
                    <TableHead>{t("investigations.gCode")}</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Appointment Date</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="text-right">
                      {t("common.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthCheckups.filter((checkup: any) => {
                    const matchesSearch = !searchTerm ||
                      checkup.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      checkup.investigation_name?.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesDepartment = filterDepartment === "all" || checkup.employee?.departments?.name === filterDepartment;
                    const matchesGroup = filterGroup === "all" || checkup.employee?.exposure_groups?.name === filterGroup;
                    const matchesStatus = filterCheckUpType === "all" ||
                      checkup.status === filterCheckUpType ||
                      (filterCheckUpType === "completed" && checkup.status === "done") ||
                      (filterCheckUpType === "planned" && checkup.status === "planned") ||
                      (filterCheckUpType === "open" && checkup.status === "open");
                    return matchesSearch && matchesDepartment && matchesGroup && matchesStatus;
                  }).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {t("investigations.noInvestigations")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    healthCheckups
                      .filter((checkup: any) => {
                        const matchesSearch = !searchTerm ||
                          checkup.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          checkup.investigation_name?.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchesDepartment = filterDepartment === "all" || checkup.employee?.departments?.name === filterDepartment;
                        const matchesGroup = filterGroup === "all" || checkup.employee?.exposure_groups?.name === filterGroup;
                        const matchesStatus = filterCheckUpType === "all" ||
                          checkup.status === filterCheckUpType ||
                          (filterCheckUpType === "completed" && checkup.status === "done") ||
                          (filterCheckUpType === "planned" && checkup.status === "planned") ||
                          (filterCheckUpType === "open" && checkup.status === "open");
                        return matchesSearch && matchesDepartment && matchesGroup && matchesStatus;
                      })
                      .map((checkup: any) => (
                        <TableRow key={checkup.id}>

                          <TableCell className="font-medium">
                            {checkup.employee?.full_name || "—"}
                          </TableCell>
                          <TableCell>
                            {checkup.investigation_name || "—"}
                          </TableCell>
                          <TableCell>
                            {checkup.due_date
                              ? format(
                                new Date(checkup.due_date),
                                "dd.MM.yyyy"
                              )
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {checkup.appointment_date
                              ? format(
                                new Date(checkup.appointment_date),
                                "dd.MM.yyyy"
                              )
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-xs ${checkup.status === "done" ? "bg-green-500" :
                                checkup.status === "planned" ? "bg-blue-500" : ""
                                }`}
                              variant={checkup.status === "open" ? "outline" : "default"}
                            >
                              {checkup.status === "done" ? "Done" :
                                checkup.status === "planned" ? "Planned" : "Open"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/employees/${checkup.employee_id}`)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              View Profile
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            ) : (
              // Checkup View - Shows all health checkups from all employees
              <Table>
                <TableHeader>
                  <TableRow>

                    <TableHead>{t("common.employee")}</TableHead>
                    <TableHead>Employee Number</TableHead>
                    <TableHead>Investigation Name</TableHead>
                    <TableHead>{t("common.department")}</TableHead>
                    <TableHead>Appointment Date</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">
                      {t("common.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthCheckups.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No health checkups found
                      </TableCell>
                    </TableRow>
                  ) : (
                    healthCheckups
                      .filter((checkup: any) => {
                        const matchesSearch =
                          checkup.employee?.full_name
                            ?.toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                          checkup.employee?.employee_number
                            ?.toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                          checkup.investigation_name
                            ?.toLowerCase()
                            .includes(searchTerm.toLowerCase());

                        const matchesDepartment =
                          filterDepartment === "all" ||
                          checkup.employee?.departments?.name ===
                          filterDepartment;

                        const matchesGroup =
                          filterGroup === "all" ||
                          checkup.employee?.exposure_groups?.name ===
                          filterGroup;

                        const matchesStatus =
                          filterCheckUpType === "all" ||
                          checkup.status === filterCheckUpType ||
                          (filterCheckUpType === "completed" &&
                            checkup.status === "done") ||
                          (filterCheckUpType === "planned" &&
                            checkup.status === "planned") ||
                          (filterCheckUpType === "open" &&
                            checkup.status === "open");

                        return (
                          matchesSearch &&
                          matchesDepartment &&
                          matchesGroup &&
                          matchesStatus
                        );
                      })
                      .map((checkup: any) => {
                        const getCheckupStatusBadge = (
                          status: string,
                          completionDate?: string
                        ) => {
                          if (status === "done" || completionDate) {
                            return <Badge className="bg-green-500">Done</Badge>;
                          }
                          if (status === "planned") {
                            return (
                              <Badge className="bg-blue-500">Planned</Badge>
                            );
                          }
                          return <Badge variant="outline">Open</Badge>;
                        };

                        return (
                          <TableRow key={checkup.id}>

                            <TableCell className="font-medium">
                              {checkup.employee?.full_name || "—"}
                            </TableCell>
                            <TableCell>
                              {checkup.employee?.employee_number || "—"}
                            </TableCell>
                            <TableCell>
                              {checkup.investigation_name || "—"}
                            </TableCell>
                            <TableCell>
                              {checkup.employee?.departments?.name || "—"}
                            </TableCell>
                            <TableCell>
                              {checkup.appointment_date
                                ? format(
                                  new Date(checkup.appointment_date),
                                  "dd.MM.yyyy"
                                )
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {getCheckupStatusBadge(
                                checkup.status,
                                checkup.completion_date
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {checkup.notes || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  navigate(`/employees/${checkup.employee_id}`)
                                }
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                View Profile
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
