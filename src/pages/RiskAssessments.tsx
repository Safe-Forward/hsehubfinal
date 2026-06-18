import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  Shield,
  AlertTriangle,
  AlertOctagon,
  Info,
  X,
  Upload,
  Check,
  Save,
  Grid3x3,
  FileDown,
  Trash2,
  CalendarIcon,
  Pencil,
} from "lucide-react";
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
  DialogFooter,
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
import { Progress } from "@/components/ui/progress";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


// Types
type Risk = any;
type Location = { id: string; name: string };
type Department = { id: string; name: string };
type ExposureGroup = { id: string; name: string };
type Employee = { id: string; full_name: string };
type Measure = {
  id?: string;
  measure_building_block: string;
  responsible_person: string;
  responsible_person_name?: string;
  due_date: string;
  progress_status: string;
  notes?: string;
};

// Constants
const DEFAULT_HAZARD_CATEGORIES = [
  "Mechanical",
  "Electrical",
  "Chemical",
  "Biological",
  "Ergonomic",
  "Physical",
  "Psychosocial",
  "Fire/Explosion",
  "Environmental",
  "Other",
];

const RISK_MATRIX_LABELS = [
  "Negligible",
  "Minor",
  "Moderate",
  "Major",
  "Catastrophic",
];

const DEFAULT_MEASURE_BUILDING_BLOCKS = [
  "Elimination",
  "Substitution",
  "Engineering Controls",
  "Administrative Controls",
  "Personal Protective Equipment (PPE)",
  "Training",
  "Supervision",
  "Maintenance",
  "Emergency Procedures",
  "Other",
];

const PROBABILITY_LABELS = [
  { value: 1, de: "Sehr unwahrscheinlich", en: "Very Unlikely" },
  { value: 2, de: "Unwahrscheinlich", en: "Unlikely" },
  { value: 3, de: "Möglich", en: "Possible" },
  { value: 4, de: "Wahrscheinlich", en: "Probable" },
  { value: 5, de: "Sehr wahrscheinlich", en: "Very Probable" },
];

const DAMAGE_EXTENT_LABELS = [
  { value: 1, de: "Sehr gering", en: "Very Low" },
  { value: 2, de: "Gering", en: "Low" },
  { value: 3, de: "Mittel", en: "Medium" },
  { value: 4, de: "Hoch", en: "High" },
  { value: 5, de: "Sehr hoch", en: "Very High" },
];


// Print styles for PDF export
const printStyles = `
  @media print {
    /* Force all colors to print */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    /* Hide everything except dialog */
    body > *:not([data-radix-portal]) {
      display: none !important;
    }
    
    /* Show dialog portal */
    [data-radix-portal] {
      display: block !important;
    }
    
    /* Hide overlay */
    [data-radix-dialog-overlay] {
      display: none !important;
    }
    
    /* Position dialog for print */
    [role="dialog"] {
      position: static !important;
      transform: none !important;
      max-width: 100% !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 20px !important;
      box-shadow: none !important;
    }
    
    /* Hide Export PDF button when printing */
    button:has(svg):not(.print-keep) {
      display: none !important;
    }
    
    /* Ensure risk matrix colors are preserved */
    [style*="background"] {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Page setup */
    @page {
      margin: 1.5cm;
      size: A4 landscape;
    }
  }
`;

export default function RiskAssessments() {
  const { user, loading, companyId, userRole } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [risks, setRisks] = useState<Risk[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [exposureGroups, setExposureGroups] = useState<ExposureGroup[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMatrixDialogOpen, setIsMatrixDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [rejectionComment, setRejectionComment] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentManagers, setDepartmentManagers] = useState<any[]>([]);
  const [teamMembersMap, setTeamMembersMap] = useState<Record<string, string>>({});
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [editingRiskId, setEditingRiskId] = useState<string | null>(null);
  const [editableNotes, setEditableNotes] = useState("");
  const [hazardCategories, setHazardCategories] = useState<string[]>(
    DEFAULT_HAZARD_CATEGORIES
  );
  const [measureBuildingBlocks, setMeasureBuildingBlocks] = useState<string[]>(
    DEFAULT_MEASURE_BUILDING_BLOCKS
  );

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    department_id: "__none__",
    location_id: "__none__",
    exposure_group_id: "__none__",
    line_manager_id: "__none__",
    hazard_category: "",
    probability_before: 3,
    probability_after: 2,
    extent_damage_before: 3,
    extent_damage_after: 2,
    risk_matrix_label: "",
    mitigation_measures: "",
    notes: "",
    assessment_date: new Date().toISOString().split("T")[0],
  });

  const [measures, setMeasures] = useState<Measure[]>([
    {
      measure_building_block: "",
      responsible_person: "__none__",
      due_date: "",
      progress_status: "not_started",
      notes: "",
    },
  ]);

  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);

  // Calculated risk scores
  const riskScoreBefore =
    formData.probability_before * formData.extent_damage_before;
  const riskScoreAfter =
    formData.probability_after * formData.extent_damage_after;

  const getRiskLevel = (score: number) => {
    if (score >= 20) return "critical";
    if (score >= 15) return "high";
    if (score >= 8) return "medium";
    return "low";
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, navigate, companyId]);

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`risk-catalogs-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "risk_categories",
          filter: `company_id=eq.${companyId}`,
        },
        () => fetchData(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "measure_building_blocks",
          filter: `company_id=eq.${companyId}`,
        },
        () => fetchData(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => {
    setEditableNotes(selectedRisk?.notes || "");
  }, [selectedRisk?.id]);

  const fetchData = async (showLoading = true) => {
    if (!companyId) return;

    if (showLoading) setLoadingData(true);
    try {
      const [
        risksRes,
        locationsRes,
        departmentsRes,
        exposureGroupsRes,
        employeesRes,
        riskCategoriesRes,
        measureBuildingBlocksRes,
        deptManagersRes,
      ] = await Promise.all([
        supabase
          .from("risk_assessments")
          .select(
            "*, departments(name), locations(name), exposure_groups(name), team_members!risk_assessments_line_manager_id_fkey(first_name, last_name, role)"
          )
          .eq("company_id", companyId)
          .order("assessment_date", { ascending: false }),
        supabase
          .from("locations")
          .select("id, name")
          .eq("company_id", companyId)
          .order("name"),
        supabase
          .from("departments")
          .select("id, name")
          .eq("company_id", companyId)
          .order("name"),
        supabase
          .from("exposure_groups")
          .select("id, name")
          .eq("company_id", companyId)
          .order("name"),
        supabase
          .from("team_members")
          .select("id, user_id, first_name, last_name, email, role")
          .eq("company_id", companyId)
          .order("first_name"),
        supabase
          .from("risk_categories")
          .select("name")
          .eq("company_id", companyId)
          .order("name"),
        supabase
          .from("measure_building_blocks")
          .select("name")
          .eq("company_id", companyId)
          .order("name"),
        (supabase as any)
          .from("department_managers")
          .select("department_id, manager_user_id")
          .eq("company_id", companyId)
          .eq("manager_type", "disciplinary"),

      ]);

      if (risksRes.error) throw risksRes.error;
      if (locationsRes.error) throw locationsRes.error;
      if (departmentsRes.error) throw departmentsRes.error;
      if (exposureGroupsRes.error) throw exposureGroupsRes.error;
      if (employeesRes.error) throw employeesRes.error;
      if (riskCategoriesRes.error) throw riskCategoriesRes.error;
      if (measureBuildingBlocksRes.error) throw measureBuildingBlocksRes.error;

      // Fetch measures for each risk assessment
      const risksWithMeasures = await Promise.all(
        (risksRes.data || []).map(async (risk) => {
          const { data: measures } = await supabase
            .from("risk_assessment_measures")
            .select("*, team_members(first_name, last_name, role)")
            .eq("risk_assessment_id", risk.id);

          return {
            ...risk,
            measures: measures || [],
          };
        })
      );

      setRisks(risksWithMeasures);
      setLocations(locationsRes.data || []);
      setDepartments(departmentsRes.data || []);
      setExposureGroups(exposureGroupsRes.data || []);
      setDepartmentManagers(deptManagersRes?.data || []);

      // Build user_id → full name map for approver display
      const membersMap: Record<string, string> = {};
      for (const m of (employeesRes.data || [])) {
        if (m.user_id) {
          membersMap[m.user_id] = `${m.first_name} ${m.last_name}`;
        }
      }
      setTeamMembersMap(membersMap);

      const hazardCategoriesFromDb = (riskCategoriesRes.data || [])
        .map((item) => item.name)
        .filter(
          (name): name is string =>
            Boolean(name) && !["Low", "Medium", "High", "Very High"].includes(name)
        );
      const measureBuildingBlocksFromDb = (measureBuildingBlocksRes.data || [])
        .map((item) => item.name)
        .filter((name): name is string => Boolean(name));

      setHazardCategories(
        hazardCategoriesFromDb.length > 0
          ? hazardCategoriesFromDb
          : DEFAULT_HAZARD_CATEGORIES
      );
      setMeasureBuildingBlocks(
        measureBuildingBlocksFromDb.length > 0
          ? measureBuildingBlocksFromDb
          : DEFAULT_MEASURE_BUILDING_BLOCKS
      );
      
      // Map team members to employee format with role
      setEmployees((employeesRes.data || []).map((member: any) => ({
        id: member.id,
        full_name: member.role 
          ? `${member.first_name} ${member.last_name} (${member.role})`
          : `${member.first_name} ${member.last_name}`,
        email: member.email,
      })));
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Error loading data",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();

      // Add Metadata
      const title = "Risikobewertungsbericht";
      const timestamp = new Date().toLocaleString();

      // Title
      doc.setFontSize(18);
      doc.text(title, 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`${t("common.generatedOn") || "Erstellt am"}: ${timestamp}`, 14, 30);

      // Define columns
      const tableColumn = [
        "Title",
        "Department",
        "Location",
        "Hazard",
        "Risk Level",
        "Status",
        "Date"
      ];

      // Define rows
      const tableRows = filteredRisks.map(risk => [
        risk.title,
        risk.departments?.name || "-",
        risk.locations?.name || "-",
        risk.hazard_category || "-",
        risk.risk_level?.toUpperCase() || "-",
        risk.status || "-",
        risk.assessment_date || "-"
      ]);

      // Generate table
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      // Save the PDF
      doc.save("Risk_Assessments.pdf");

      toast({
        title: "Erfolg",
        description: "PDF erfolgreich exportiert",
      });
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast({
        title: "Fehler",
        description: "PDF-Export fehlgeschlagen",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async () => {
    if (!companyId) {
      toast({
        title: "No company found",
        description:
          "You need to set up a company before creating assessments.",
        variant: "destructive",
      });
      navigate("/setup-company");
      return;
    }

    try {
      // Calculate risk levels
      const riskScoreBefore =
        formData.probability_before * formData.extent_damage_before;
      const riskScoreAfter =
        formData.probability_after * formData.extent_damage_after;
      const riskLevelBefore = getRiskLevel(riskScoreBefore);
      const riskLevelAfter = getRiskLevel(riskScoreAfter);

      // Prepare data for insertion
      const insertData = {
        title: formData.title,
        description: formData.description,
        department_id: formData.department_id && formData.department_id.trim() !== "" && formData.department_id !== "__none__" ? formData.department_id : null,
        location_id: formData.location_id && formData.location_id.trim() !== "" && formData.location_id !== "__none__" ? formData.location_id : null,
        exposure_group_id: formData.exposure_group_id && formData.exposure_group_id.trim() !== "" && formData.exposure_group_id !== "__none__" ? formData.exposure_group_id : null,
        line_manager_id: formData.line_manager_id && formData.line_manager_id.trim() !== "" && formData.line_manager_id !== "__none__" ? formData.line_manager_id : null,
        hazard_category: formData.hazard_category || null,
        probability_before: formData.probability_before,
        probability_after: formData.probability_after,
        extent_damage_before: formData.extent_damage_before,
        extent_damage_after: formData.extent_damage_after,
        risk_level: riskLevelAfter,
        risk_matrix_label: formData.risk_matrix_label || null,
        mitigation_measures: formData.mitigation_measures || null,
        notes: formData.notes || null,
        assessment_date: formData.assessment_date,
        document_paths:
          uploadedDocuments.length > 0 ? uploadedDocuments : null,
        approval_status: "pending_approval",
        status: "open",
        company_id: companyId,
      };

      console.log("Inserting risk assessment with data:", insertData);

      if (editingRiskId) {
        // UPDATE mode
        const { error: updateError } = await (supabase as any)
          .from("risk_assessments")
          .update({
            title: insertData.title,
            description: insertData.description,
            department_id: insertData.department_id,
            location_id: insertData.location_id,
            exposure_group_id: insertData.exposure_group_id,
            line_manager_id: insertData.line_manager_id,
            hazard_category: insertData.hazard_category,
            probability_before: insertData.probability_before,
            probability_after: insertData.probability_after,
            extent_damage_before: insertData.extent_damage_before,
            extent_damage_after: insertData.extent_damage_after,
            risk_level: insertData.risk_level,
            risk_matrix_label: insertData.risk_matrix_label,
            mitigation_measures: insertData.mitigation_measures,
            notes: insertData.notes,
            assessment_date: insertData.assessment_date,
          })
          .eq("id", editingRiskId);

        if (updateError) {
          toast({ title: "Fehler", description: updateError.message, variant: "destructive" });
          return;
        }

        // Replace measures: delete old, insert new
        await supabase.from("risk_assessment_measures").delete().eq("risk_assessment_id", editingRiskId);
        const validMeasures = measures.filter((m) => m.measure_building_block);
        if (validMeasures.length > 0) {
          await supabase.from("risk_assessment_measures").insert(
            validMeasures.map((m) => ({
              risk_assessment_id: editingRiskId,
              company_id: companyId,
              measure_building_block: m.measure_building_block,
              responsible_person: m.responsible_person && m.responsible_person !== "__none__" ? m.responsible_person : null,
              due_date: m.due_date || null,
              progress_status: m.progress_status || "not_started",
              notes: m.notes || null,
            }))
          );
        }

        toast({ title: "Gespeichert", description: "GBU wurde aktualisiert." });
        setEditingRiskId(null);
        setIsDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        // INSERT mode
        const { data: createdData, error } = await supabase
          .from("risk_assessments")
          .insert([insertData])
          .select("id");

        if (error) {
          toast({ title: "Fehler beim Erstellen", description: error.message || "Ein Fehler ist aufgetreten", variant: "destructive" });
          return;
        }

        const created = createdData && createdData.length > 0 ? createdData[0] : null;
        if (!created) {
          toast({ title: "Fehler", description: "GBU wurde nicht korrekt erstellt", variant: "destructive" });
          return;
        }

        const validMeasures = measures.filter((m) => m.measure_building_block);
        if (validMeasures.length > 0) {
          const measuresData = validMeasures.map((m) => ({
            risk_assessment_id: created.id,
            company_id: companyId,
            measure_building_block: m.measure_building_block,
            responsible_person: m.responsible_person && m.responsible_person !== "__none__" ? m.responsible_person : null,
            due_date: m.due_date || null,
            progress_status: m.progress_status || "not_started",
            notes: m.notes || null,
          }));
          const { error: measuresError } = await supabase.from("risk_assessment_measures").insert(measuresData);
          if (measuresError) {
            toast({ title: "Hinweis", description: "GBU erstellt, aber einige Maßnahmen konnten nicht gespeichert werden.", variant: "destructive" });
          }
        }

        toast({ title: "Erfolg", description: "GBU erfolgreich erstellt" });
        setIsDialogOpen(false);
        resetForm();
        fetchData();
      }
    } catch (err: unknown) {
      console.error("Unexpected error creating risk assessment:", err);
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const loadRiskForEdit = (risk: any) => {
    setEditingRiskId(risk.id);
    setFormData({
      title: risk.title || "",
      description: risk.description || "",
      department_id: risk.department_id || "__none__",
      location_id: risk.location_id || "__none__",
      exposure_group_id: risk.exposure_group_id || "__none__",
      line_manager_id: risk.line_manager_id || "__none__",
      hazard_category: risk.hazard_category || "",
      probability_before: risk.probability_before || 3,
      probability_after: risk.probability_after || 2,
      extent_damage_before: risk.extent_damage_before || 3,
      extent_damage_after: risk.extent_damage_after || 2,
      risk_matrix_label: risk.risk_matrix_label || "",
      mitigation_measures: risk.mitigation_measures || "",
      notes: risk.notes || "",
      assessment_date: risk.assessment_date || new Date().toISOString().split("T")[0],
    });
    setMeasures(
      risk.measures?.length > 0
        ? risk.measures.map((m: any) => ({
            id: m.id,
            measure_building_block: m.measure_building_block || "",
            responsible_person: m.responsible_person || "__none__",
            due_date: m.due_date || "",
            progress_status: m.progress_status || "not_started",
            notes: m.notes || "",
          }))
        : [{ measure_building_block: "", responsible_person: "__none__", due_date: "", progress_status: "not_started", notes: "" }]
    );
    setFormStep(1);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      department_id: "__none__",
      location_id: "__none__",
      exposure_group_id: "__none__",
      line_manager_id: "__none__",
      hazard_category: "",
      probability_before: 3,
      probability_after: 2,
      extent_damage_before: 3,
      extent_damage_after: 2,
      risk_matrix_label: "",
      mitigation_measures: "",
      notes: "",
      assessment_date: new Date().toISOString().split("T")[0],
    });
    setMeasures([
      {
        measure_building_block: "",
        responsible_person: "__none__",
        due_date: "",
        progress_status: "not_started",
        notes: "",
      },
    ]);
    setUploadedDocuments([]);
  };

  // Calculate progress based on measure statuses
  const calculateProgress = (measures: Measure[]) => {
    if (!measures || measures.length === 0) return 0;

    const completedCount = measures.filter(
      (m) => m.progress_status === "completed" || m.progress_status === "done"
    ).length;

    return Math.round((completedCount / measures.length) * 100);
  };


  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSubmitForReview = async (risk: any) => {
    try {
      const { error } = await (supabase as any)
        .from("risk_assessments")
        .update({
          approval_status: "pending_approval",
          submitted_at: new Date().toISOString(),
          submitted_by: user?.id,
        })
        .eq("id", risk.id);
      if (error) throw error;
      toast({ title: "Eingereicht", description: "GBU wurde zur Prüfung eingereicht." });
      fetchData();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const handleApproveRisk = async () => {
    if (!selectedRisk) return;
    try {
      const updateData: any = {
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
        rejection_comment: null,
      };
      if (approvalComment) {
        const existingNotes = selectedRisk.notes || "";
        updateData.notes = existingNotes + `\n\n[Freigabe ${new Date().toLocaleDateString()}]: ${approvalComment}`;
      }
      const { error } = await (supabase as any)
        .from("risk_assessments")
        .update(updateData)
        .eq("id", selectedRisk.id);
      if (error) throw error;
      toast({ title: "Freigegeben", description: "GBU wurde erfolgreich freigegeben." });
      setIsApprovalDialogOpen(false);
      setApprovalComment("");
      setSelectedRisk(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const handleRejectRisk = async () => {
    if (!selectedRisk || !rejectionComment.trim()) return;
    try {
      const { error } = await (supabase as any)
        .from("risk_assessments")
        .update({
          approval_status: "rejected",
          rejection_comment: rejectionComment,
          rejected_at: new Date().toISOString(),
          rejected_by: user?.id,
        })
        .eq("id", selectedRisk.id);
      if (error) throw error;
      toast({ title: "Abgelehnt", description: "GBU wurde abgelehnt. Ersteller wird informiert." });
      setIsRejectionDialogOpen(false);
      setRejectionComment("");
      setSelectedRisk(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const handleRetractToEdit = async (risk: any) => {
    try {
      const { error } = await (supabase as any)
        .from("risk_assessments")
        .update({ approval_status: "pending_approval", rejection_comment: null })
        .eq("id", risk.id);
      if (error) throw error;
      toast({ title: "Zurückgezogen", description: "GBU ist wieder im Entwurf-Modus." });
      fetchData();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const getApprovalStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return { label: "Freigegeben", variant: "default" as const, className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" };
      case "pending_approval":
        return { label: "In Prüfung", variant: "outline" as const, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" };
      case "rejected":
        return { label: "Abgelehnt", variant: "destructive" as const, className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" };
      default:
        return { label: "Entwurf", variant: "secondary" as const, className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
    }
  };

  const isAdmin = userRole === "company_admin" || userRole === "super_admin";

  const canApproveRisk = (risk: any): boolean => {
    const deptId = risk?.department_id;
    // No department on GBU → only admin
    if (!deptId) return isAdmin;
    const deptManagers = departmentManagers.filter(dm => dm.department_id === deptId);
    // No manager assigned for this department → fallback to admin
    if (deptManagers.length === 0) return isAdmin;
    // Check if current user is the department manager
    return !!user?.id && deptManagers.some(dm => dm.manager_user_id === user?.id);
  };

  const filteredRisks = risks.filter((r) => {
    const matchesSearch = !searchTerm ||
      r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.approval_status === statusFilter ||
      (!r.approval_status && statusFilter === "draft");
    return matchesSearch && matchesStatus;
  });

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

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
              <h1 className="text-xl font-bold">{t("risks.title")}</h1>
              <p className="text-xs text-muted-foreground">
                {t("risks.subtitle")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{t("risks.title")}</CardTitle>
                  <CardDescription className="text-sm">
                    {t("risks.subtitle")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  className="whitespace-nowrap"
                  onClick={handleExportPDF}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  {language === "de" ? "PDF Export" : "Export PDF"}
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingRiskId(null); resetForm(); } }}>
                  <DialogTrigger asChild>
                    <Button className="whitespace-nowrap">
                      <Plus className="w-4 h-4 mr-2" />
                      {language === "de"
                        ? "Neue Bewertung"
                        : "New Risk Assessment"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingRiskId ? "GBU bearbeiten" : t("risks.new")}</DialogTitle>
                      <DialogDescription>
                        {t("risks.subtitle")}
                      </DialogDescription>
                    </DialogHeader>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        onSubmit();
                      }}
                      className="space-y-6"
                    >
                      {/* Step Indicator */}
                      <div className="flex items-center justify-center gap-2 mb-6 pb-4 border-b">
                        <Button
                          type="button"
                          variant={formStep === 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormStep(1)}
                        >
                          {t("risks.step1")}
                        </Button>
                        <Button
                          type="button"
                          variant={formStep === 2 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormStep(2)}
                        >
                          {t("risks.step2")}
                        </Button>
                        <Button
                          type="button"
                          variant={formStep === 3 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormStep(3)}
                        >
                          {t("risks.step3")}
                        </Button>
                      </div>

                      {/* Step 1: Basic Information */}
                      {formStep === 1 && (
                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg">
                            {t("risks.basicInformation")}
                          </h3>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="title">
                                {t("risks.riskTitle")} *
                              </Label>
                              <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    title: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="assessment_date">
                                {t("risks.assessmentDate")} *
                              </Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={`w-full justify-start text-left font-normal ${!formData.assessment_date && "text-muted-foreground"}`}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.assessment_date ? (
                                      format(new Date(formData.assessment_date), "PPP")
                                    ) : (
                                      <span>{t("common.pickDate")}</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={formData.assessment_date ? new Date(formData.assessment_date) : undefined}
                                    onSelect={(date) =>
                                      setFormData({
                                        ...formData,
                                        assessment_date: date ? format(date, "yyyy-MM-dd") : "",
                                      })
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description">
                              {t("risks.description")}
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
                              rows={3}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="department_id">
                                {t("risks.department")}
                              </Label>
                              <Select
                                value={formData.department_id}
                                onValueChange={(val) =>
                                  setFormData({
                                    ...formData,
                                    department_id: val,
                                  })
                                }
                              >
                                <SelectTrigger id="department_id">
                                  <SelectValue
                                    placeholder={t("risks.selectDepartment")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    {t("common.none")} / Optional
                                  </SelectItem>
                                  {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                      {dept.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="location_id">
                                {t("risks.location")}
                              </Label>
                              <Select
                                value={formData.location_id}
                                onValueChange={(val) =>
                                  setFormData({ ...formData, location_id: val })
                                }
                              >
                                <SelectTrigger id="location_id">
                                  <SelectValue
                                    placeholder={t("risks.selectLocation")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    {t("common.none")} / Optional
                                  </SelectItem>
                                  {locations.map((loc) => (
                                    <SelectItem key={loc.id} value={loc.id}>
                                      {loc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="exposure_group_id">
                                {t("risks.exposureGroup")}
                              </Label>
                              <Select
                                value={formData.exposure_group_id}
                                onValueChange={(val) =>
                                  setFormData({
                                    ...formData,
                                    exposure_group_id: val,
                                  })
                                }
                              >
                                <SelectTrigger id="exposure_group_id">
                                  <SelectValue
                                    placeholder={t("risks.selectExposureGroup")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    {t("common.none")} / Optional
                                  </SelectItem>
                                  {exposureGroups.map((group) => (
                                    <SelectItem key={group.id} value={group.id}>
                                      {group.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="line_manager_id">
                                {t("risks.lineManager")}
                              </Label>
                              <Select
                                value={formData.line_manager_id}
                                onValueChange={(val) =>
                                  setFormData({
                                    ...formData,
                                    line_manager_id: val,
                                  })
                                }
                              >
                                <SelectTrigger id="line_manager_id">
                                  <SelectValue
                                    placeholder={t("risks.selectLineManager")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    {t("common.none")} / Optional
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

                          <div className="flex justify-end">
                            <Button
                              type="button"
                              onClick={() => setFormStep(2)}
                            >
                              {t("risks.nextSlide")}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Step 2: Risk Assessment */}
                      {formStep === 2 && (
                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg">
                            {t("risks.hazardAssessment")}
                          </h3>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="hazard_category">
                                {t("risks.hazardCategory")}
                              </Label>
                              <Button
                                type="button"
                                variant="link"
                                className="h-auto p-0 text-xs"
                                onClick={() =>
                                  navigate(
                                    "/settings?tab=catalogs&section=hazard-categories"
                                  )
                                }
                              >
                                Manage in Settings
                              </Button>
                            </div>
                            <Select
                              value={formData.hazard_category}
                              onValueChange={(val) =>
                                setFormData({
                                  ...formData,
                                  hazard_category: val,
                                })
                              }
                            >
                              <SelectTrigger id="hazard_category">
                                <SelectValue
                                  placeholder={t("risks.selectHazardCategory")}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {hazardCategories.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description2">
                              {t("risks.shortDescription")}
                            </Label>
                            <Textarea
                              id="description2"
                              value={formData.description}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  description: e.target.value,
                                })
                              }
                              rows={2}
                              placeholder={t(
                                "risks.shortDescriptionPlaceholder"
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3 p-4 border rounded-lg bg-red-50">
                              <h4 className="font-medium text-sm">
                                {t("risks.primaBefore")}
                              </h4>
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label htmlFor="probability_before">
                                    {t("risks.probabilityBefore")}
                                  </Label>
                                  <Select
                                    value={formData.probability_before.toString()}
                                    onValueChange={(val) =>
                                      setFormData({
                                        ...formData,
                                        probability_before: parseInt(val),
                                      })
                                    }
                                  >
                                    <SelectTrigger id="probability_before">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PROBABILITY_LABELS.map((item) => (
                                        <SelectItem
                                          key={item.value}
                                          value={item.value.toString()}
                                        >
                                          {language === "de"
                                            ? item.de
                                            : item.en}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="extent_damage_before">
                                    {t("risks.damageExtentBefore")}
                                  </Label>
                                  <Select
                                    value={formData.extent_damage_before.toString()}
                                    onValueChange={(val) =>
                                      setFormData({
                                        ...formData,
                                        extent_damage_before: parseInt(val),
                                      })
                                    }
                                  >
                                    <SelectTrigger id="extent_damage_before">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {DAMAGE_EXTENT_LABELS.map((item) => (
                                        <SelectItem
                                          key={item.value}
                                          value={item.value.toString()}
                                        >
                                          {language === "de"
                                            ? item.de
                                            : item.en}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="text-center p-3 bg-white rounded border mt-2">
                                <p className="text-xs text-muted-foreground mb-1">
                                  Risk Score (calculated)
                                </p>
                                <p className="text-3xl font-bold text-red-600">
                                  {riskScoreBefore}
                                </p>
                                <Badge
                                  variant={getRiskLevelColor(
                                    getRiskLevel(riskScoreBefore)
                                  )}
                                  className="mt-2"
                                >
                                  {getRiskLevel(riskScoreBefore)}
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-3 p-4 border rounded-lg bg-green-50">
                              <h4 className="font-medium text-sm">
                                {t("risks.postAfter")}
                              </h4>
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label htmlFor="probability_after">
                                    {t("risks.probabilityAfter")}
                                  </Label>
                                  <Select
                                    value={formData.probability_after.toString()}
                                    onValueChange={(val) =>
                                      setFormData({
                                        ...formData,
                                        probability_after: parseInt(val),
                                      })
                                    }
                                  >
                                    <SelectTrigger id="probability_after">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PROBABILITY_LABELS.map((item) => (
                                        <SelectItem
                                          key={item.value}
                                          value={item.value.toString()}
                                        >
                                          {language === "de"
                                            ? item.de
                                            : item.en}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="extent_damage_after">
                                    {t("risks.damageExtentAfter")}
                                  </Label>
                                  <Select
                                    value={formData.extent_damage_after.toString()}
                                    onValueChange={(val) =>
                                      setFormData({
                                        ...formData,
                                        extent_damage_after: parseInt(val),
                                      })
                                    }
                                  >
                                    <SelectTrigger id="extent_damage_after">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {DAMAGE_EXTENT_LABELS.map((item) => (
                                        <SelectItem
                                          key={item.value}
                                          value={item.value.toString()}
                                        >
                                          {language === "de"
                                            ? item.de
                                            : item.en}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="text-center p-3 bg-white rounded border mt-2">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {t("risks.riskScoreCalculated")}
                                </p>
                                <p className="text-3xl font-bold text-green-600">
                                  {riskScoreAfter}
                                </p>
                                <Badge
                                  variant={getRiskLevelColor(
                                    getRiskLevel(riskScoreAfter)
                                  )}
                                  className="mt-2"
                                >
                                  {getRiskLevel(riskScoreAfter)}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between mt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setFormStep(1)}
                            >
                              {t("risks.back")}
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setFormStep(3)}
                            >
                              {t("risks.nextSlide")}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Step 3: Measures and Documents */}
                      {formStep === 3 && (
                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg">
                            {t("risks.measures")}
                          </h3>

                          {/* Additional Information */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="department_id">
                                {t("risks.department")}
                              </Label>
                              <Select
                                value={formData.department_id}
                                onValueChange={(val) =>
                                  setFormData({
                                    ...formData,
                                    department_id: val,
                                  })
                                }
                              >
                                <SelectTrigger id="department_id">
                                  <SelectValue
                                    placeholder={t("risks.selectDepartment")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                      {dept.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="location_id">
                                {t("risks.location")}
                              </Label>
                              <Select
                                value={formData.location_id}
                                onValueChange={(val) =>
                                  setFormData({ ...formData, location_id: val })
                                }
                              >
                                <SelectTrigger id="location_id">
                                  <SelectValue
                                    placeholder={t("risks.selectLocation")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    {t("common.none")} / Optional
                                  </SelectItem>
                                  {locations.map((loc) => (
                                    <SelectItem key={loc.id} value={loc.id}>
                                      {loc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="line_manager_id">
                                {t("risks.responsiblePerson")}
                              </Label>
                              <Select
                                value={formData.line_manager_id}
                                onValueChange={(val) =>
                                  setFormData({
                                    ...formData,
                                    line_manager_id: val,
                                  })
                                }
                              >
                                <SelectTrigger id="line_manager_id">
                                  <SelectValue
                                    placeholder={t("risks.selectManager")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    {t("common.none")} / Optional
                                  </SelectItem>
                                  {employees.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                      {emp.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="assessment_date">
                                {t("risks.dueDate")}
                              </Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={`w-full justify-start text-left font-normal ${!formData.assessment_date && "text-muted-foreground"}`}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.assessment_date ? (
                                      format(new Date(formData.assessment_date), "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={formData.assessment_date ? new Date(formData.assessment_date) : undefined}
                                    onSelect={(date) =>
                                      setFormData({
                                        ...formData,
                                        assessment_date: date ? format(date, "yyyy-MM-dd") : "",
                                      })
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>

                          {/* Document Upload */}
                          <div className="space-y-2 border-t pt-4">
                            <Label>{t("risks.uploadDocuments")}</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 text-center">
                              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground mb-2">
                                {t("risks.chooseFile")}
                              </p>
                              <Input
                                type="file"
                                multiple
                                className="max-w-xs mx-auto"
                                onChange={(e) => {
                                  if (e.target.files) {
                                    const files = Array.from(
                                      e.target.files
                                    ).map((f) => f.name);
                                    setUploadedDocuments(files);
                                    toast({
                                      title: "Files selected",
                                      description: `${files.length} file(s) selected`,
                                    });
                                  }
                                }}
                              />
                              {uploadedDocuments.length > 0 && (
                                <div className="mt-2 text-sm">
                                  <p className="font-medium">Selected files:</p>
                                  {uploadedDocuments.map((doc, idx) => (
                                    <p
                                      key={idx}
                                      className="text-muted-foreground"
                                    >
                                      {doc}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Measures Section */}
                          <div className="space-y-4 border-t pt-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-lg">
                                {t("risks.addMeasure")}
                              </h3>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setMeasures([
                                    ...measures,
                                    {
                                      measure_building_block: "",
                                      responsible_person: "__none__",
                                      due_date: "",
                                      progress_status: "not_started",
                                      notes: "",
                                    },
                                  ])
                                }
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                {t("risks.addMeasureButton")}
                              </Button>
                            </div>

                            {measures.map((measure, index) => (
                              <div
                                key={index}
                                className="p-4 border rounded-lg space-y-3 bg-muted/20"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    Measure {index + 1}
                                  </span>
                                  {measures.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setMeasures(
                                          measures.filter((_, i) => i !== index)
                                        )
                                      }
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label>Building Block</Label>
                                      <Button
                                        type="button"
                                        variant="link"
                                        className="h-auto p-0 text-xs"
                                        onClick={() =>
                                          navigate(
                                            "/settings?tab=catalogs&section=measure-building-blocks"
                                          )
                                        }
                                      >
                                        Manage in Settings
                                      </Button>
                                    </div>
                                    <Select
                                      value={measure.measure_building_block}
                                      onValueChange={(val) => {
                                        const updated = [...measures];
                                        updated[index].measure_building_block =
                                          val;
                                        setMeasures(updated);
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select building block" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {measureBuildingBlocks.map(
                                          (block) => (
                                            <SelectItem
                                              key={block}
                                              value={block}
                                            >
                                              {block}
                                            </SelectItem>
                                          )
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Responsible Person</Label>
                                    <Select
                                      value={measure.responsible_person || "__none__"}
                                      onValueChange={(val) => {
                                        const updated = [...measures];
                                        updated[index].responsible_person = val;
                                        setMeasures(updated);
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select responsible person" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">
                                          None / Optional
                                        </SelectItem>
                                        {employees.map((emp) => (
                                          <SelectItem
                                            key={emp.id}
                                            value={emp.id}
                                          >
                                            {emp.full_name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Due Date</Label>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className={`w-full justify-start text-left font-normal ${!measure.due_date && "text-muted-foreground"}`}
                                        >
                                          <CalendarIcon className="mr-2 h-4 w-4" />
                                          {measure.due_date ? (
                                            format(new Date(measure.due_date), "PPP")
                                          ) : (
                                            <span>Pick a date</span>
                                          )}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0">
                                        <Calendar
                                          mode="single"
                                          selected={measure.due_date ? new Date(measure.due_date) : undefined}
                                          onSelect={(date) => {
                                            const updated = [...measures];
                                            updated[index].due_date = date ? format(date, "yyyy-MM-dd") : "";
                                            setMeasures(updated);
                                          }}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Progress Status</Label>
                                    <Select
                                      value={measure.progress_status}
                                      onValueChange={(val) => {
                                        const updated = [...measures];
                                        updated[index].progress_status = val;
                                        setMeasures(updated);
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="not_started">
                                          Not Started
                                        </SelectItem>
                                        <SelectItem value="in_progress">
                                          In Progress
                                        </SelectItem>
                                        <SelectItem value="completed">
                                          Completed
                                        </SelectItem>
                                        <SelectItem value="blocked">
                                          Blocked
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>Notes</Label>
                                  <Textarea
                                    value={measure.notes || ""}
                                    onChange={(e) => {
                                      const updated = [...measures];
                                      updated[index].notes = e.target.value;
                                      setMeasures(updated);
                                    }}
                                    rows={2}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between mt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setFormStep(2)}
                            >
                              {t("risks.back")}
                            </Button>
                            <Button type="submit">
                              <Save className="w-4 h-4 mr-2" />
                              {t("common.create")}
                            </Button>
                          </div>
                        </div>
                      )}

                      {formStep !== 3 && (
                        <div className="flex justify-end gap-2 border-t pt-4 opacity-50 pointer-events-none">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsDialogOpen(false);
                              resetForm();
                              setFormStep(1);
                            }}
                          >
                            {t("common.cancel")}
                          </Button>
                          <Button type="submit" disabled>
                            <Save className="w-4 h-4 mr-2" />
                            {t("common.create")}
                          </Button>
                        </div>
                      )}
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-3">
              <div className="flex gap-3 flex-col sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    placeholder={t("risks.search")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 border-2 focus:border-primary transition-colors"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-12 w-full sm:w-48">
                    <SelectValue placeholder="Status filtern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="draft">Entwurf</SelectItem>
                    <SelectItem value="pending_approval">In Prüfung</SelectItem>
                    <SelectItem value="approved">Freigegeben</SelectItem>
                    <SelectItem value="rejected">Abgelehnt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Status summary pills */}
              <div className="flex gap-2 flex-wrap text-xs">
                {["draft","pending_approval","approved","rejected"].map((s) => {
                  const count = risks.filter(r => (r.approval_status || "draft") === s).length;
                  if (count === 0) return null;
                  const cfg = getApprovalStatusBadge(s);
                  return (
                    <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                      className={`px-2 py-1 rounded-full border font-medium transition-all ${cfg.className} ${statusFilter === s ? "ring-2 ring-offset-1 ring-current" : ""}`}>
                      {cfg.label}: {count}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">
                      {language === "de" ? "Risikotitel" : "Risk Title"}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      {language === "de" ? "Abteilung" : "Department"}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      {language === "de" ? "Standort" : "Location"}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      {language === "de" ? "Expo-Gruppe" : "Exposure Group"}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      {language === "de" ? "Gefahr" : "Hazard"}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      {language === "de"
                        ? "Risiko Vorher/Nachher"
                        : "Risk Before/After"}
                    </TableHead>
                    <TableHead>Matrix</TableHead>
                    <TableHead className="whitespace-nowrap">
                      {language === "de" ? "Genehmigung" : "Approval"}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      {language === "de"
                        ? "Bewertungsdatum"
                        : "Assessment Date"}
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center">
                      Aktionen
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRisks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center">
                          <Shield className="w-16 h-16 text-muted-foreground/20 mb-4" />
                          <p className="text-lg font-medium text-muted-foreground mb-1">
                            No risk assessments found
                          </p>
                          <p className="text-sm text-muted-foreground/60">
                            Create your first risk assessment to get started
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRisks.map((risk) => (
                      <TableRow
                        key={risk.id}
                        className="hover:bg-muted/70 transition-all duration-200 border-b border-border/50 hover:shadow-sm group"
                      >
                        <TableCell>
                          {(() => {
                            const cfg = getApprovalStatusBadge(risk.approval_status || "draft");
                            return (
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.className}`}>
                                {cfg.label}
                              </span>
                            );
                          })()}
                          {risk.approval_status === "approved" && risk.approved_by && (
                            <div className="text-xs text-green-700 dark:text-green-400 mt-1">
                              <span className="font-medium">
                                {teamMembersMap[risk.approved_by] || risk.approved_by}
                              </span>
                              {risk.approved_at && (
                                <span className="text-muted-foreground ml-1">
                                  {new Date(risk.approved_at).toLocaleDateString("de-DE")}
                                </span>
                              )}
                            </div>
                          )}
                          {risk.approval_status === "rejected" && risk.rejection_comment && (
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-[150px]" title={risk.rejection_comment}>
                              <span className="truncate block">↳ {risk.rejection_comment}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {risk.title}
                        </TableCell>
                        <TableCell>{risk.departments?.name || "-"}</TableCell>
                        <TableCell>{risk.locations?.name || "-"}</TableCell>
                        <TableCell>
                          {risk.exposure_groups?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs px-2 py-1 rounded bg-muted">
                            {risk.hazard_category || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={getRiskLevelColor(
                                getRiskLevel(risk.risk_score_before || 0)
                              )}
                              className="text-xs"
                            >
                              {risk.risk_score_before || 0}
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge
                              variant={getRiskLevelColor(
                                getRiskLevel(risk.risk_score_after || 0)
                              )}
                              className="text-xs"
                            >
                              {risk.risk_score_after || 0}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRisk(risk);
                              setEditableNotes(risk.notes || "");
                              setIsMatrixDialogOpen(true);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Grid3x3 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          {risk.measures && risk.measures.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {risk.measures.map((measure, idx) => {
                                const statusConfig = {
                                  without_due_date: { label: "no due date", color: "bg-gray-500" },
                                  done: { label: "done", color: "bg-yellow-500" },
                                  open: { label: "open", color: "bg-blue-400" },
                                  in_progress: { label: "in progress", color: "bg-teal-500" },
                                  completed: { label: "completed", color: "bg-green-500" },
                                  not_started: { label: "not started", color: "bg-gray-400" },
                                };
                                const status = measure.progress_status || "not_started";
                                const config = statusConfig[status] || { label: status, color: "bg-gray-500" };
                                return (
                                  <span
                                    key={measure.id || idx}
                                    className={`${config.color} text-white text-xs px-2 py-0.5 rounded`}
                                  >
                                    {config.label}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{risk.assessment_date}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {risk.approval_status === "rejected" && (
                              <Button variant="outline" size="sm" className="text-xs h-7 whitespace-nowrap"
                                onClick={() => handleRetractToEdit(risk)}>
                                Überarbeiten
                              </Button>
                            )}
                            {risk.approval_status !== "approved" && (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => loadRiskForEdit(risk)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={async () => {
                              if (confirm(
                                language === "de"
                                  ? `Möchten Sie die Risikobewertung "${risk.title}" wirklich löschen?`
                                  : `Are you sure you want to delete the risk assessment "${risk.title}"?`
                              )) {
                                try {
                                  // Delete associated measures first
                                  if (risk.measures && risk.measures.length > 0) {
                                    const { error: measuresError } = await supabase
                                      .from("risk_assessment_measures")
                                      .delete()
                                      .eq("risk_assessment_id", risk.id);

                                    if (measuresError) {
                                      console.error("Error deleting measures:", measuresError);
                                    }
                                  }

                                  // Delete the risk assessment
                                  const { error } = await supabase
                                    .from("risk_assessments")
                                    .delete()
                                    .eq("id", risk.id);

                                  if (error) {
                                    toast({
                                      title: "Fehler",
                                      description: "Risikobewertung konnte nicht gelöscht werden",
                                      variant: "destructive",
                                    });
                                  } else {
                                    toast({
                                      title: "Erfolg",
                                      description: "Risikobewertung erfolgreich gelöscht",
                                    });
                                    fetchData();
                                  }
                                } catch (err) {
                                  console.error("Error deleting risk assessment:", err);
                                  toast({
                                    title: "Fehler",
                                    description: "Ein Fehler ist aufgetreten",
                                    variant: "destructive",
                                  });
                                }
                              }
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Risk Matrix Dialog */}
        <Dialog
          open={isMatrixDialogOpen}
          onOpenChange={(open) => {
            setIsMatrixDialogOpen(open);
            if (open && selectedRisk) {
              setEditableNotes(selectedRisk.notes || "");
            }
          }}
        >
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl">
                    Risk Matrix - {selectedRisk?.title}
                  </DialogTitle>
                  <DialogDescription className="text-sm mt-1">
                    {language === "de"
                      ? "Schritt-für-Schritt: Analyse, Bewertung, Maßnahmen, Revision"
                      : "Step-by-step: Analysis, Assessment, Measures, Revision"}
                  </DialogDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    toast({
                      title:
                        language === "de" ? "PDF exportieren" : "Export PDF",
                      description:
                        language === "de"
                          ? "PDF-Bericht wird erstellt..."
                          : "Generating PDF report...",
                    });

                    try {
                      // Find the dialog content element
                      const dialogElement = document.querySelector('[role="dialog"]') as HTMLElement;

                      if (!dialogElement) {
                        throw new Error("Dialog not found");
                      }

                      // Store original styles
                      const originalOverflow = dialogElement.style.overflow;
                      const originalMaxHeight = dialogElement.style.maxHeight;
                      const originalMaxWidth = dialogElement.style.maxWidth;

                      // Temporarily remove overflow restrictions
                      dialogElement.style.overflow = 'visible';
                      dialogElement.style.maxHeight = 'none';
                      dialogElement.style.maxWidth = 'none';

                      // Wait a bit for layout to settle
                      await new Promise(resolve => setTimeout(resolve, 100));

                      // Capture the dialog as canvas
                      const canvas = await html2canvas(dialogElement, {
                        scale: 2,
                        useCORS: true,
                        logging: true,
                        backgroundColor: '#ffffff',
                        width: dialogElement.scrollWidth,
                        height: dialogElement.scrollHeight,
                      });

                      // Restore original styles
                      dialogElement.style.overflow = originalOverflow;
                      dialogElement.style.maxHeight = originalMaxHeight;
                      dialogElement.style.maxWidth = originalMaxWidth;

                      // Create PDF
                      const imgData = canvas.toDataURL('image/png');
                      const pdf = new jsPDF({
                        orientation: 'landscape',
                        unit: 'mm',
                        format: 'a4',
                      });

                      // Calculate dimensions to fit image in PDF
                      const pdfWidth = pdf.internal.pageSize.getWidth();
                      const pdfHeight = pdf.internal.pageSize.getHeight();
                      const imgWidth = canvas.width;
                      const imgHeight = canvas.height;
                      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                      const imgX = (pdfWidth - imgWidth * ratio) / 2;
                      const imgY = 10;

                      pdf.addImage(
                        imgData,
                        'PNG',
                        imgX,
                        imgY,
                        imgWidth * ratio,
                        imgHeight * ratio
                      );

                      // Open PDF in new tab for preview
                      const pdfBlob = pdf.output('blob');
                      const pdfUrl = URL.createObjectURL(pdfBlob);
                      window.open(pdfUrl, '_blank');

                      toast({
                        title: language === "de" ? "Erfolg" : "Success",
                        description:
                          language === "de"
                            ? "PDF erfolgreich erstellt"
                            : "PDF generated successfully",
                      });
                    } catch (error) {
                      console.error('PDF generation error:', error);
                      toast({
                        title: language === "de" ? "Fehler" : "Error",
                        description:
                          language === "de"
                            ? "PDF konnte nicht erstellt werden"
                            : "Failed to generate PDF",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  {language === "de" ? "PDF Export" : "Export PDF"}
                </Button>
              </div>
            </DialogHeader>

            {selectedRisk && (
              <>
                {/* Progress Bar */}
                <div className="mt-4 mb-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium">Implementation</span>
                    <span className="font-medium">
                      {selectedRisk.measures?.filter((m) => m.progress_status === "completed" || m.progress_status === "done").length || 0}/
                      {selectedRisk.measures?.length || 0} ({calculateProgress(selectedRisk.measures || [])}%)
                    </span>
                  </div>
                  <Progress value={calculateProgress(selectedRisk.measures || [])} className="h-2" />
                </div>

                <div className="flex flex-row gap-8 mt-6 overflow-x-auto pb-4">
                  {/* PRIMA (Before Mitigation) */}
                  <div className="space-y-3 min-w-[350px] flex-shrink-0">
                    <div className="bg-background p-3 rounded-lg border-2">
                      <h4 className="font-semibold text-base mb-1">
                        PRIMA (
                        {language === "de"
                          ? "vor Maßnahmen"
                          : "before measures"}
                        )
                      </h4>
                      <div className="text-xs text-muted-foreground">
                        Y ={" "}
                        {language === "de"
                          ? "Schwere des Schadens"
                          : "Severity of Damage"}{" "}
                        X ={" "}
                        {language === "de"
                          ? "Eintrittswahrscheinlichkeit"
                          : "Probability of Occurrence"}
                      </div>
                    </div>

                    {/* Matrix Grid with Axis Labels */}
                    <div className="relative">
                      {/* Y-axis values */}
                      <div className="flex gap-2">
                        <div className="flex flex-col justify-between text-xs font-semibold pr-2 py-1">
                          <div className="h-14 flex items-center justify-center">
                            6
                          </div>
                          <div className="h-14 flex items-center justify-center">
                            5
                          </div>
                          <div className="h-14 flex items-center justify-center">
                            4
                          </div>
                          <div className="h-14 flex items-center justify-center">
                            3
                          </div>
                          <div className="h-14 flex items-center justify-center">
                            2
                          </div>
                          <div className="h-14 flex items-center justify-center">
                            1
                          </div>
                        </div>

                        {/* Matrix */}
                        <div className="flex-1">
                          <div className="grid grid-cols-6 gap-1">
                            {[6, 5, 4, 3, 2, 1].map((prob) => (
                              <div key={`before-${prob}`} className="contents">
                                {[1, 2, 3, 4, 5, 6].map((damage) => {
                                  const score = prob * damage;
                                  const isSelected =
                                    prob === selectedRisk.probability_before &&
                                    damage ===
                                    selectedRisk.extent_damage_before;

                                  let bgColor = "bg-green-500";
                                  if (score >= 20) bgColor = "bg-red-500";
                                  else if (score >= 12)
                                    bgColor = "bg-orange-500";
                                  else if (score >= 6)
                                    bgColor = "bg-yellow-400";

                                  return (
                                    <div
                                      key={`${prob}-${damage}`}
                                      className={`h-14 flex items-center justify-center text-lg font-bold transition-all ${bgColor} ${isSelected
                                        ? "ring-4 ring-cyan-500 z-10"
                                        : ""
                                        }`}
                                    >
                                      {isSelected && (
                                        <div className="w-4 h-4 bg-cyan-500 rounded-full border-2 border-white"></div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>

                          {/* X-axis values */}
                          <div className="grid grid-cols-6 gap-1 mt-2">
                            {[1, 2, 3, 4, 5, 6].map((val) => (
                              <div
                                key={val}
                                className="text-center text-xs font-semibold h-6 flex items-center justify-center"
                              >
                                {val}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* POST (After Mitigation) */}
                  <div className="space-y-3 min-w-[350px] flex-shrink-0">
                    <div className="bg-background p-3 rounded-lg border-2">
                      <h4 className="font-semibold text-base mb-1">
                        POST (
                        {language === "de"
                          ? "nach Maßnahmen"
                          : "after measures"}
                        )
                      </h4>
                      <div className="text-xs text-muted-foreground">
                        Y ={" "}
                        {language === "de"
                          ? "Schwere des Schadens"
                          : "Severity of Damage"}{" "}
                        X ={" "}
                        {language === "de"
                          ? "Eintrittswahrscheinlichkeit"
                          : "Probability of Occurrence"}
                      </div>
                    </div>

                    {/* Matrix Grid with Axis Labels */}
                    <div className="relative">
                      {/* Y-axis values */}
                      <div className="flex gap-2">
                        <div className="flex flex-col justify-between text-xs font-semibold pr-2 py-1">
                          <div className="h-14 flex items-center justify-center">
                            6
                          </div>
                          <div className="h-14 flex items-center justify-center">
                            5
                          </div>
                          <div className="h-14 flex items-center justify-center">
                            4
                          </div>
                          <div className="h-14 flex items-center justify-center">
                            3
                          </div>
                          <div className="h-14 flex items-center justify-center">
                            2
                          </div>
                          <div className="h-14 flex items-center justify-center">
                            1
                          </div>
                        </div>

                        {/* Matrix */}
                        <div className="flex-1">
                          <div className="grid grid-cols-6 gap-1">
                            {[6, 5, 4, 3, 2, 1].map((prob) => (
                              <div key={`after-${prob}`} className="contents">
                                {[1, 2, 3, 4, 5, 6].map((damage) => {
                                  const score = prob * damage;
                                  const isSelected =
                                    prob === selectedRisk.probability_after &&
                                    damage === selectedRisk.extent_damage_after;

                                  let bgColor = "bg-green-500";
                                  if (score >= 20) bgColor = "bg-red-500";
                                  else if (score >= 12)
                                    bgColor = "bg-orange-500";
                                  else if (score >= 6)
                                    bgColor = "bg-yellow-400";

                                  return (
                                    <div
                                      key={`${prob}-${damage}`}
                                      className={`h-14 flex items-center justify-center text-lg font-bold transition-all ${bgColor} ${isSelected
                                        ? "ring-4 ring-cyan-500 z-10"
                                        : ""
                                        }`}
                                    >
                                      {isSelected && (
                                        <div className="w-4 h-4 bg-cyan-500 rounded-full border-2 border-white"></div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>

                          {/* X-axis values */}
                          <div className="grid grid-cols-6 gap-1 mt-2">
                            {[1, 2, 3, 4, 5, 6].map((val) => (
                              <div
                                key={val}
                                className="text-center text-xs font-semibold h-6 flex items-center justify-center"
                              >
                                {val}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Risks Section */}
                  <div className="flex flex-col gap-4 min-w-[350px] flex-1">
                    <div className="bg-background p-4 rounded-lg border-2">
                      <h4 className="font-semibold text-base mb-3">
                        {language === "de" ? "Risiken" : "Risks"}
                      </h4>

                      <div className="space-y-3">
                        {/* Risk Title with PRIMA/POST */}
                        <div className="font-medium text-sm mb-3">
                          {selectedRisk?.title} – <span className="text-blue-600">PRIMA P:{selectedRisk.probability_before || 0}/S:{selectedRisk.extent_damage_before || 0}</span> | <span className="text-green-600">POST P:{selectedRisk.probability_after || 0}/S:{selectedRisk.extent_damage_after || 0}</span>
                        </div>

                        {/* Measure Checkboxes */}
                        <div className="flex flex-wrap gap-3 text-xs mb-3">
                          {selectedRisk?.measures && selectedRisk.measures.length > 0 ? (
                            selectedRisk.measures.map((measure, idx) => (
                              <label key={measure.id || idx} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="rounded"
                                  checked={measure.progress_status === "completed" || measure.progress_status === "done"}
                                  onChange={async (e) => {
                                    e.stopPropagation();
                                    if (!measure.id) return;
                                    const newStatus = e.target.checked ? "completed" : "not_started";

                                    // Optimistic update
                                    if (selectedRisk) {
                                      const updatedMeasures = selectedRisk.measures?.map((m) =>
                                        m.id === measure.id
                                          ? { ...m, progress_status: newStatus }
                                          : m
                                      ) || [];
                                      setSelectedRisk({
                                        ...selectedRisk,
                                        measures: updatedMeasures,
                                      });
                                    }

                                    const { error } = await supabase
                                      .from("risk_assessment_measures")
                                      .update({ progress_status: newStatus })
                                      .eq("id", measure.id);

                                    if (!error) {
                                      fetchData(false);
                                    } else {
                                      toast({
                                        title: language === "de" ? "Fehler" : "Error",
                                        description:
                                          language === "de"
                                            ? "Status konnte nicht aktualisiert werden"
                                            : "Failed to update status",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                />
                                <span>{measure.measure_building_block || "Measure"}</span>
                              </label>
                            ))
                          ) : (
                            <span className="text-muted-foreground">{language === "de" ? "Keine Maßnahmen" : "No measures"}</span>
                          )}
                        </div>

                        {/* Status Buttons */}
                        <div className="flex flex-wrap gap-2 text-xs mb-3">
                          {[
                            { status: "not_started", label: "not started", bgColor: "bg-gray-500", textColor: "text-white", borderColor: "border-gray-600" },
                            { status: "pending", label: "pending", bgColor: "bg-yellow-500", textColor: "text-white", borderColor: "border-yellow-600" },
                            { status: "in_progress", label: "in progress", bgColor: "bg-blue-400", textColor: "text-white", borderColor: "border-blue-500" },
                            { status: "blocked", label: "blocked", bgColor: "bg-orange-500", textColor: "text-white", borderColor: "border-orange-600" },
                            { status: "completed", label: "completed", bgColor: "bg-green-500", textColor: "text-white", borderColor: "border-green-600" },
                          ].map(({ status, label, bgColor, textColor, borderColor }) => {
                            // DB allows: not_started, in_progress, blocked, completed
                            const dbStatus = status === "pending" ? "in_progress" : status;
                            // Check if any measure has this status
                            const isActive = selectedRisk?.measures?.some((m) => {
                              if (status === "pending") {
                                return m.progress_status === "pending" || m.progress_status === "in_progress";
                              }
                              return m.progress_status === status;
                            });
                            const hasMeasures = selectedRisk?.measures && selectedRisk.measures.length > 0;

                            return (
                              <button
                                key={status}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();

                                  if (!hasMeasures) {
                                    toast({
                                      title: language === "de" ? "Info" : "Info",
                                      description: language === "de" ? "Bitte fügen Sie zuerst Maßnahmen hinzu" : "Please add measures first",
                                    });
                                    return;
                                  }

                                  // Update all measures for this risk (or just the first one? The logic updates only the first one)
                                  // The original logic updated the first measure found.
                                  const measureToUpdate = selectedRisk.measures[0];
                                  if (measureToUpdate.id) {

                                    // Optimistic update
                                    if (selectedRisk) {
                                      const updatedMeasures = selectedRisk.measures?.map((m) =>
                                        m.id === measureToUpdate.id
                                          ? { ...m, progress_status: dbStatus }
                                          : m
                                      ) || [];
                                      setSelectedRisk({
                                        ...selectedRisk,
                                        measures: updatedMeasures,
                                      });
                                    }

                                    const { error } = await supabase
                                      .from("risk_assessment_measures")
                                      .update({ progress_status: dbStatus })
                                      .eq("id", measureToUpdate.id);

                                    if (error) {
                                      toast({
                                        title: language === "de" ? "Fehler" : "Error",
                                        description: language === "de" ? "Status konnte nicht aktualisiert werden" : "Failed to update status",
                                        variant: "destructive",
                                      });
                                    } else {
                                      toast({
                                        title: language === "de" ? "Erfolg" : "Success",
                                        description: language === "de" ? `Status auf "${label}" aktualisiert` : `Status updated to "${label}"`,
                                      });
                                      fetchData(false);
                                    }
                                  }
                                }}
                                className={`px-2 py-0.5 ${bgColor} ${textColor} border-2 ${isActive ? 'ring-2 ring-white ring-offset-1' : borderColor} rounded cursor-pointer hover:opacity-90 transition-all`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Note Text Area */}
                        <div>
                          <textarea
                            value={editableNotes}
                            onChange={(e) => setEditableNotes(e.target.value)}
                            className="w-full min-h-[100px] p-2 text-sm border rounded-md resize-vertical"
                            placeholder={language === "de" ? "Notizen hinzufügen..." : "Add notes..."}
                          />
                        </div>

                        {/* Save Note Button */}
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (!selectedRisk) return;

                              // Optimistic update (for internal state consistency)
                              setSelectedRisk({ ...selectedRisk, notes: editableNotes });

                              const { error } = await supabase
                                .from("risk_assessments")
                                .update({ notes: editableNotes })
                                .eq("id", selectedRisk.id);

                              if (error) {
                                toast({
                                  title: language === "de" ? "Fehler" : "Error",
                                  description: language === "de" ? "Notizen konnten nicht gespeichert werden" : "Failed to save notes",
                                  variant: "destructive",
                                });
                              } else {
                                toast({
                                  title: language === "de" ? "Erfolg" : "Success",
                                  description: language === "de" ? "Notizen erfolgreich gespeichert" : "Notes saved successfully",
                                });
                                fetchData(false);
                              }
                            }}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {language === "de" ? "Notiz Speichern" : "Save Note"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 text-xs justify-center items-center p-3 bg-muted/30 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-green-500 rounded"></div>
                        <span className="font-medium">Low</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-yellow-400 rounded"></div>
                        <span className="font-medium">Medium</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-orange-500 rounded"></div>
                        <span className="font-medium">High</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-red-500 rounded"></div>
                        <span className="font-medium">Critical</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <DialogFooter>
              <div className="flex justify-between w-full">
                <Button
                  variant="outline"
                  onClick={() => setIsMatrixDialogOpen(false)}
                >
                  Schließen
                </Button>
                {selectedRisk?.approval_status === "pending_approval" && canApproveRisk(selectedRisk) && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="text-red-700 border-red-300 hover:bg-red-50"
                      onClick={() => {
                        setIsMatrixDialogOpen(false);
                        setIsRejectionDialogOpen(true);
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Ablehnen
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setIsMatrixDialogOpen(false);
                        setIsApprovalDialogOpen(true);
                      }}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Genehmigen
                    </Button>
                  </div>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>GBU ablehnen</DialogTitle>
              <DialogDescription>
                Gib einen Ablehnungsgrund an — dieser wird dem Ersteller angezeigt.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection-comment">Ablehnungsgrund *</Label>
                <Textarea
                  id="rejection-comment"
                  placeholder="z.B. Gefährdungen sind unvollständig beschrieben..."
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsRejectionDialogOpen(false); setRejectionComment(""); }}>
                Abbrechen
              </Button>
              <Button variant="destructive" disabled={!rejectionComment.trim()} onClick={handleRejectRisk}>
                <X className="w-4 h-4 mr-2" />
                Ablehnen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approval Dialog — full GBU details */}
        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">GBU freigeben</DialogTitle>
              <DialogDescription>
                Prüfe alle Details und gib die Gefährdungsbeurteilung frei oder lehne sie ab.
              </DialogDescription>
            </DialogHeader>

            {selectedRisk && (
              <div className="space-y-5">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/40 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Titel</p>
                    <p className="font-semibold">{selectedRisk.title || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Bewertungsdatum</p>
                    <p className="font-medium">{selectedRisk.assessment_date || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Abteilung</p>
                    <p className="font-medium">{selectedRisk.departments?.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Standort</p>
                    <p className="font-medium">{selectedRisk.locations?.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Expo-Gruppe</p>
                    <p className="font-medium">{selectedRisk.exposure_groups?.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Gefährdungskategorie</p>
                    <p className="font-medium">{selectedRisk.hazard_category || "—"}</p>
                  </div>
                </div>

                {/* Risk Scores */}
                <div>
                  <p className="text-sm font-semibold mb-2">Risikobewertung</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/40 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Risiko vorher</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{selectedRisk.risk_score_before ?? "—"}</span>
                        <Badge variant={getRiskLevelColor(getRiskLevel(selectedRisk.risk_score_before || 0))}>
                          {getRiskLevel(selectedRisk.risk_score_before || 0)}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Risiko nachher</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{selectedRisk.risk_score_after ?? "—"}</span>
                        <Badge variant={getRiskLevelColor(getRiskLevel(selectedRisk.risk_score_after || 0))}>
                          {getRiskLevel(selectedRisk.risk_score_after || 0)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedRisk.description && (
                  <div>
                    <p className="text-sm font-semibold mb-1">Beschreibung</p>
                    <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">{selectedRisk.description}</p>
                  </div>
                )}

                {/* Mitigation */}
                {selectedRisk.mitigation_measures && (
                  <div>
                    <p className="text-sm font-semibold mb-1">Schutzmaßnahmen</p>
                    <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">{selectedRisk.mitigation_measures}</p>
                  </div>
                )}

                {/* Measures */}
                {selectedRisk.measures && selectedRisk.measures.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Maßnahmen ({selectedRisk.measures.length})</p>
                    <div className="space-y-2">
                      {selectedRisk.measures.map((m: any, i: number) => (
                        <div key={i} className="flex items-start justify-between gap-3 p-3 bg-muted/40 rounded-lg text-sm">
                          <div className="flex-1">
                            <p className="font-medium">{m.measure_building_block || "—"}</p>
                            {m.responsible_person_name && (
                              <p className="text-xs text-muted-foreground mt-0.5">Verantwortlich: {m.responsible_person_name}</p>
                            )}
                            {m.due_date && (
                              <p className="text-xs text-muted-foreground">Fällig: {m.due_date}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                            m.progress_status === "completed" || m.progress_status === "done"
                              ? "bg-green-100 text-green-800"
                              : m.progress_status === "in_progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {m.progress_status === "completed" || m.progress_status === "done" ? "Erledigt"
                              : m.progress_status === "in_progress" ? "In Bearbeitung"
                              : "Offen"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedRisk.notes && (
                  <div>
                    <p className="text-sm font-semibold mb-1">Notizen</p>
                    <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3 whitespace-pre-wrap">{selectedRisk.notes}</p>
                  </div>
                )}

                {/* Approval Comment */}
                <div className="border-t pt-4">
                  <Label htmlFor="approval-comment">Kommentar zur Freigabe (optional)</Label>
                  <Textarea
                    id="approval-comment"
                    placeholder="z.B. GBU vollständig und plausibel — freigegeben."
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    rows={3}
                    className="mt-2"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => { setIsApprovalDialogOpen(false); setApprovalComment(""); }}>
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={() => {
                setIsApprovalDialogOpen(false);
                setApprovalComment("");
                setIsRejectionDialogOpen(true);
              }}>
                <X className="w-4 h-4 mr-2" />
                Ablehnen
              </Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApproveRisk}>
                <Check className="w-4 h-4 mr-2" />
                Freigeben
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
