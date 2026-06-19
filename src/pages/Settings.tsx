import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuditLog } from "@/hooks/useAuditLog";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  Building2,
  AlertTriangle,
  Clock,
  Shield,
  Users,
  Settings as SettingsIcon,
  BookOpen,
  Bell,
  Stethoscope,
  Plug,
  MapPin,
  GitBranch,
  Target,
  Tag,
  Save,
  Upload,
  Loader2,
  FileText,
  ChevronDown,
  ChevronRight,
  Headphones,
  Receipt,
} from "lucide-react";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TeamTab } from "@/components/settings/tabs/TeamTab";
import { UserRolesTab } from "@/components/settings/tabs/UserRolesTab";
import { MedicalCareTab } from "@/components/settings/tabs/MedicalCareTab";
import { ApiIntegrationTab } from "@/components/settings/tabs/ApiIntegrationTab";
import { SupportTab } from "@/components/settings/tabs/SupportTab";
import OrgChartTab from "@/components/settings/OrgChartTab";
import {
  CustomRole,
  PermissionCategory,
  DEFAULT_DETAILED_PERMISSIONS,
  PREDEFINED_ROLES,
} from "@/types/permissions";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";


const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const PREDEFINED_HAZARD_CATEGORIES = [
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

const PREDEFINED_MEASURE_BUILDING_BLOCKS = [
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

export default function Settings() {
  const { user, loading, companyId, userRole } = useAuth();
  const { t, language } = useLanguage();
  const { hasDetailedPermission } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState("company");
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [currentTableName, setCurrentTableName] = useState("");
  const [forceDialogOpen, setForceDialogOpen] = useState(false);

  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  const [exposureGroups, setExposureGroups] = useState<any[]>([]);
  const [riskCategories, setRiskCategories] = useState<any[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<any[]>([]);
  const [auditCategories, setAuditCategories] = useState<any[]>([]);
  const [measureBuildingBlocks, setMeasureBuildingBlocks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [deptManagers, setDeptManagers] = useState<Record<string, string>>({}); // dept_id → manager_user_id
  const [deptManagerSearch, setDeptManagerSearch] = useState<Record<string, string>>({}); // dept_id → search query
  const [profileFieldTemplates, setProfileFieldTemplates] = useState<any[]>([]);
  const [selectedProfileTemplateId, setSelectedProfileTemplateId] = useState<string | null>(null);
  const [templateFields, setTemplateFields] = useState<any[]>([]);

  // Approval Process State
  const [approvalWorkflows, setApprovalWorkflows] = useState<any[]>([]);

  // ISO Selection State
  const [selectedISOs, setSelectedISOs] = useState<string[]>([]);
  const [customISOs, setCustomISOs] = useState<string[]>([]);
  const [isoCriteria, setIsoCriteria] = useState<any[]>([]);
  const [criteriaView, setCriteriaView] = useState<"compact" | "complete">(
    "compact"
  );
  const [newCustomISO, setNewCustomISO] = useState("");
  const [customCriteria, setCustomCriteria] = useState<
    Record<string, string[]>
  >({});
  const [newCriterionText, setNewCriterionText] = useState("");
  const [newCriterionId, setNewCriterionId] = useState("");
  const [addingCriterionForISO, setAddingCriterionForISO] = useState<
    string | null
  >(null);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);

  // ISO Criteria Import State
  const [isoCriteriaData, setIsoCriteriaData] = useState<any>({});
  const [importingISO, setImportingISO] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [activeISOForCriteria, setActiveISOForCriteria] = useState<string | null>(null);

  // G-Investigations State
  const [selectedGInvestigations, setSelectedGInvestigations] = useState<
    string[]
  >([]);

  // Support Ticket State
  const [ticketForm, setTicketForm] = useState({
    category: "",
    priority: "medium",
    title: "",
    description: "",
  });
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [myTickets, setMyTickets] = useState<any[]>([]);

  // Profile Fields State
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
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
  });
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);

  // API Integration State
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [showApiToken, setShowApiToken] = useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [externalSystems, setExternalSystems] = useState<any[]>([]);
  const [isAddSystemDialogOpen, setIsAddSystemDialogOpen] = useState(false);
  const [newSystemForm, setNewSystemForm] = useState({
    name: "",
    type: "webhook",
    endpoint: "",
  });
  const [isAddingSystem, setIsAddingSystem] = useState(false);

// Recent Invoices State
const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

// Company Settings State (Notifications, Risk Matrix, Intervals)
const [companySettings, setCompanySettings] = useState({
  notification_settings: {
    examinations_days: 60,
    measures_days: 14,
    qualifications_days: 30,
    audits_days: 30,
    gbu_review_days: 60,
  },
  risk_matrix_labels: {
    likelihood: ["Very unlikely", "unlikely", "possible", "probably", "very probably"],
    severity: ["very low", "low", "medium", "high", "very high"],
    result: ["low", "medium", "high", "very high"],
    colors: { low: "#22c55e", medium: "#f97316", high: "#ef4444", very_high: "#991b1b" },
  },
  gbu_intervals: [24] as number[],
  audit_intervals: [12] as number[],
});
const [savingSettings, setSavingSettings] = useState(false);
const [newGbuInterval, setNewGbuInterval] = useState("");
const [newAuditInterval, setNewAuditInterval] = useState("");


  const predefinedISOs = [
    {
      id: "ISO_45001",
      name: "ISO 45001",
      description: "Occupational Health and Safety",
    },
    {
      id: "ISO_14001",
      name: "ISO 14001",
      description: "Environmental Management",
    },
    { id: "ISO_9001", name: "ISO 9001", description: "Quality Management" },
    { id: "ISO_50001", name: "ISO 50001", description: "Energy Management" },
  ];

  // Predefined criteria for each ISO standard - 7 standard sections for all
  const predefinedCriteria: Record<
    string,
    { compact: string[]; complete: string[] }
  > = {
    ISO_45001: {
      compact: [
        "Kontext der Organisation",
        "Führung",
        "Planung",
        "Unterstützung",
      ],
      complete: [
        "1 Kontext der Organisation",
        "2 Führung (Leadership)",
        "3 Planung",
        "4 Unterstützung (Support)",
        "5 Betrieb (Operation)",
        "6 Bewertung der Leistung (Performance Evaluation)",
        "7 Verbesserung (Improvement)",
      ],
    },
    ISO_14001: {
      compact: [
        "Kontext der Organisation",
        "Führung",
        "Planung",
        "Unterstützung",
      ],
      complete: [
        "1 Kontext der Organisation",
        "2 Führung (Leadership)",
        "3 Planung",
        "4 Unterstützung (Support)",
        "5 Betrieb (Operation)",
        "6 Bewertung der Leistung (Performance Evaluation)",
        "7 Verbesserung (Improvement)",
      ],
    },
    ISO_9001: {
      compact: [
        "Kontext der Organisation",
        "Führung",
        "Planung",
        "Unterstützung",
      ],
      complete: [
        "1 Kontext der Organisation",
        "2 Führung (Leadership)",
        "3 Planung",
        "4 Unterstützung (Support)",
        "5 Betrieb (Operation)",
        "6 Bewertung der Leistung (Performance Evaluation)",
        "7 Verbesserung (Improvement)",
      ],
    },
    ISO_50001: {
      compact: [
        "Kontext der Organisation",
        "Führung",
        "Planung",
        "Unterstützung",
      ],
      complete: [
        "1 Kontext der Organisation",
        "2 Führung (Leadership)",
        "3 Planung",
        "4 Unterstützung (Support)",
        "5 Betrieb (Operation)",
        "6 Bewertung der Leistung (Performance Evaluation)",
        "7 Verbesserung (Improvement)",
      ],
    },
  };

  const form = useForm({
    resolver: zodResolver(baseSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId) {
      fetchAllData();
      fetchTeamMembers();
      fetchCustomRoles();
      fetchApprovalWorkflows();
      fetchProfileFieldTemplates();
      fetchISOStandards();
      fetchGInvestigations();
      fetchAllIsoCriteria();
      fetchMyTickets();
fetchApiToken();
fetchExternalSystems();
fetchRecentInvoices();
fetchCompanySettings();
    }
  }, [user, loading, navigate, companyId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    const section = params.get("section");

    if (tab) {
      setActiveTab(tab);
    }

    if (tab === "catalogs" && section) {
      const scrollToSection = () => {
        const target = document.getElementById(`settings-${section}`);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      };

      // Wait for tab content to render before scrolling
      setTimeout(scrollToSection, 120);
    }
  }, [location.search]);
const fetchCompanySettings = async () => {
  if (!companyId) return;
  try {
    const { data, error } = await supabase
      .from("company_settings")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      console.warn("Could not load company settings:", error.message);
      return;
    }

    if (data) {
      setCompanySettings({
        notification_settings: data.notification_settings,
        risk_matrix_labels: data.risk_matrix_labels,
        gbu_intervals: data.gbu_intervals || [24],
        audit_intervals: data.audit_intervals || [12],
      });
      if (data.org_type) setOrgType(data.org_type as 'linie' | 'matrix');
    }
  } catch (err: any) {
    console.warn("Could not load company settings:", err.message);
  }
};

const saveCompanySettings = async (updates: Partial<typeof companySettings>) => {
  if (!companyId) return;
  setSavingSettings(true);
  try {
    const newSettings = { ...companySettings, ...updates };
    const { error } = await supabase
      .from("company_settings")
      .upsert(
        {
          company_id: companyId,
          notification_settings: newSettings.notification_settings,
          risk_matrix_labels: newSettings.risk_matrix_labels,
          gbu_intervals: newSettings.gbu_intervals,
          audit_intervals: newSettings.audit_intervals,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id" }
      );

    if (error) throw error;

    setCompanySettings(newSettings);
    toast({ title: "Erfolgreich", description: "Einstellungen wurden gespeichert" });
  } catch (err: any) {
    toast({ title: "Fehler", description: err.message, variant: "destructive" });
  } finally {
    setSavingSettings(false);
  }
};

const handleUpdateOrgType = async (newType: 'linie' | 'matrix') => {
  if (!companyId) return;
  setOrgType(newType);
  try {
    const { error } = await (supabase as any)
      .from('company_settings')
      .upsert({ company_id: companyId, org_type: newType }, { onConflict: 'company_id' });
    if (error) throw error;
    toast({ title: 'Gespeichert', description: 'Organisationsform aktualisiert' });
  } catch (err: any) {
    toast({ title: 'Fehler', description: err.message, variant: 'destructive' });
    setOrgType(newType === 'linie' ? 'matrix' : 'linie');
  }
};

const handleUpdateManager = async (
  memberId: string,
  field: 'line_manager_id' | 'functional_manager_id',
  value: string | null
) => {
  setManagerSaving(true);
  try {
    const { error } = await supabase
      .from('team_members')
      .update({ [field]: value || null })
      .eq('id', memberId);
    if (error) throw error;
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, [field]: value || null } : m))
    );
    toast({ title: 'Gespeichert' });
  } catch (err: any) {
    toast({ title: 'Fehler', description: err.message, variant: 'destructive' });
  } finally {
    setManagerSaving(false);
  }
};

  const fetchRecentInvoices = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("invoice_number, created_at, total, status, currency")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(4);

      if (error) {
        console.error("Error fetching recent invoices:", error);
        return;
      }
      setRecentInvoices(data || []);
    } catch (err) {
      console.error("Error fetching recent invoices:", err);
    }
  };

  // ── API Token ──────────────────────────────────────────────────────────────
  const fetchApiToken = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from("company_api_tokens")
        .select("token, created_at, last_used_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // Table might not exist yet — silently skip
        console.warn("API token table may not exist:", error.message);
        return;
      }
      if (data?.token) {
        setApiToken(data.token);
      }
    } catch (err) {
      console.warn("Could not load API token:", err);
    }
  };

  const generateApiToken = async () => {
    if (!companyId) return;
    setIsGeneratingToken(true);
    try {
      // Generate a secure random token
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const token = Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
      const newToken = `hse_${token}`;

      // Upsert token
      const { error } = await supabase
        .from("company_api_tokens")
        .upsert(
          {
            company_id: companyId,
            token: newToken,
            created_at: new Date().toISOString(),
            last_used_at: null,
          },
          { onConflict: "company_id" }
        );

      if (error) throw error;

      setApiToken(newToken);
      setShowApiToken(true);
      toast({ title: "API token generated", description: "Copy and save your new token — it won't be shown again." });

      // Log action
      await supabase.rpc("create_audit_log", {
        p_action_type: "generate_api_token",
        p_target_type: "company",
        p_target_id: companyId,
        p_target_name: "API Token",
        p_details: { generated_at: new Date().toISOString() },
        p_company_id: companyId,
      });
    } catch (err: any) {
      toast({ title: "Error generating token", description: err.message, variant: "destructive" });
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // ── External Systems ────────────────────────────────────────────────────────
  const fetchExternalSystems = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from("external_systems")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("External systems table may not exist:", error.message);
        return;
      }
      setExternalSystems(data || []);
    } catch (err) {
      console.warn("Could not load external systems:", err);
    }
  };

  const addExternalSystem = async () => {
    if (!companyId || !newSystemForm.name || !newSystemForm.endpoint) return;
    setIsAddingSystem(true);
    try {
      const { error } = await supabase.from("external_systems").insert({
        company_id: companyId,
        name: newSystemForm.name,
        system_type: newSystemForm.type,
        endpoint_url: newSystemForm.endpoint,
        status: "active",
        last_sync_at: null,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({ title: "System connected", description: `${newSystemForm.name} has been added.` });
      setNewSystemForm({ name: "", type: "webhook", endpoint: "" });
      setIsAddSystemDialogOpen(false);
      fetchExternalSystems();

      // Log action
      await supabase.rpc("create_audit_log", {
        p_action_type: "connect_external_system",
        p_target_type: "system",
        p_target_id: companyId,
        p_target_name: newSystemForm.name,
        p_details: { system_type: newSystemForm.type, endpoint: newSystemForm.endpoint },
        p_company_id: companyId,
      });
    } catch (err: any) {
      toast({ title: "Error adding system", description: err.message, variant: "destructive" });
    } finally {
      setIsAddingSystem(false);
    }
  };

  const deleteExternalSystem = async (systemId: string, systemName: string) => {
    if (!companyId) return;
    try {
      const { error } = await supabase
        .from("external_systems")
        .delete()
        .eq("id", systemId)
        .eq("company_id", companyId);

      if (error) throw error;

      toast({ title: "System removed", description: `${systemName} has been disconnected.` });
      fetchExternalSystems();
    } catch (err: any) {
      toast({ title: "Error removing system", description: err.message, variant: "destructive" });
    }
  };

  const testExternalSystem = async (system: any) => {
    try {
      const response = await fetch(system.endpoint, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        toast({ title: "Connection successful", description: `${system.name} responded with status ${response.status}` });
        // Update last sync time
        await supabase.from("external_systems").update({ last_sync_at: new Date().toISOString() }).eq("id", system.id);
        fetchExternalSystems();
      } else {
        toast({ title: "Connection failed", description: `${system.name} returned status ${response.status}`, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Connection test failed", description: err.message || "Could not reach the endpoint", variant: "destructive" });
    }
  };

  const loadPredefinedHazardCategories = async () => {
    if (!companyId) return;

    try {
      const existingNames = new Set(
        (riskCategories || []).map((item: any) =>
          String(item.name || "").trim().toLowerCase()
        )
      );

      const missing = PREDEFINED_HAZARD_CATEGORIES.filter(
        (name) => !existingNames.has(name.toLowerCase())
      );

      if (missing.length === 0) {
        toast({
          title: "Already up to date",
          description: "All predefined hazard categories are already available.",
        });
        return;
      }

      const { error } = await supabase.from("risk_categories").insert(
        missing.map((name) => ({
          name,
          company_id: companyId,
          is_predefined: true,
        }))
      );

      if (error) throw error;

      toast({
        title: "Gespeichert",
        description: `${missing.length} predefined hazard categories added.`,
      });
      fetchAllData();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Fehler",
        description: message,
        variant: "destructive",
      });
    }
  };

  const loadPredefinedMeasureBuildingBlocks = async () => {
    if (!companyId) return;

    try {
      const existingNames = new Set(
        (measureBuildingBlocks || []).map((item: any) =>
          String(item.name || "").trim().toLowerCase()
        )
      );

      const missing = PREDEFINED_MEASURE_BUILDING_BLOCKS.filter(
        (name) => !existingNames.has(name.toLowerCase())
      );

      if (missing.length === 0) {
        toast({
          title: "Already up to date",
          description:
            "All predefined measure building blocks are already available.",
        });
        return;
      }

      const { error } = await supabase.from("measure_building_blocks").insert(
        missing.map((name) => ({
          name,
          company_id: companyId,
        }))
      );

      if (error) throw error;

      toast({
        title: "Gespeichert",
        description: `${missing.length} predefined measure building blocks added.`,
      });
      fetchAllData();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Fehler",
        description: message,
        variant: "destructive",
      });
    }
  };

  const fetchAllData = async () => {
    if (!companyId) return;

    setLoadingData(true);
    try {
      const [
        depts,
        locs,
        roles,
        exposure,
        risk,
        training,
        audit,
        measures,
        emps,
      ] = await Promise.all([
        supabase.from("departments").select("*").eq("company_id", companyId),
        supabase.from("locations").select("*").eq("company_id", companyId),
        supabase.from("job_roles").select("*").eq("company_id", companyId),
        supabase
          .from("exposure_groups")
          .select("*")
          .eq("company_id", companyId),
        supabase
          .from("risk_categories")
          .select("*")
          .eq("company_id", companyId),
        supabase.from("training_types").select("*").eq("company_id", companyId),
        supabase
          .from("audit_categories")
          .select("*")
          .eq("company_id", companyId),
        supabase
          .from("measure_building_blocks")
          .select("*")
          .eq("company_id", companyId),
        supabase
          .from("employees")
          .select("id, full_name")
          .eq("company_id", companyId)
          .order("full_name"),
      ]);

      setDepartments(depts.data || []);
      setLocations(locs.data || []);
      setJobRoles(roles.data || []);
      setExposureGroups(exposure.data || []);
      setRiskCategories(risk.data || []);
      setTrainingTypes(training.data || []);
      setAuditCategories(audit.data || []);
      setMeasureBuildingBlocks(measures.data || []);
      setEmployees(emps.data || []);

      // Load department managers
      if (companyId) {
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
      }
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
    } catch (err: unknown) {
      console.error("Error fetching team members:", err);
    }
  };

  const fetchCustomRoles = async () => {
    if (!companyId) return;
    setIsRolesLoading(true);

    try {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*")
        .eq("company_id", companyId)
        .order("display_order", { ascending: true });

      if (error) throw error;

      // Store full custom roles data for enhanced RBAC
      if (data && data.length > 0) {
        // Map to CustomRole type with defaults for missing fields
        const mappedRoles: CustomRole[] = data.map((role: any) => ({
          id: role.id,
          company_id: role.company_id,
          role_name: role.role_name,
          permissions: role.permissions || {},
          detailed_permissions: role.detailed_permissions || DEFAULT_DETAILED_PERMISSIONS,
          description: role.description || "",
          display_order: role.display_order || 100,
          is_predefined: role.is_predefined || PREDEFINED_ROLES.includes(role.role_name),
          created_at: role.created_at,
          updated_at: role.updated_at,
        }));
        setCustomRolesData(mappedRoles);

        // Also maintain legacy roles state for backward compatibility
        const customRolesObj: RolePermissions = {};
        data.forEach((role: any) => {
          customRolesObj[role.role_name] = role.permissions;
        });
        setRoles((prev) => ({ ...prev, ...customRolesObj }));

        // Auto-select first role if none selected
        if (!selectedRoleForEdit && mappedRoles.length > 0) {
          setSelectedRoleForEdit(mappedRoles[0]);
        }
      }
    } catch (err: unknown) {
      console.error("Error fetching custom roles:", err);
    } finally {
      setIsRolesLoading(false);
    }
  };

  const fetchApprovalWorkflows = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("approval_workflows")
        .select(
          `
          *,
          departments(name),
          employees(full_name)
        `
        )
        .eq("company_id", companyId);

      if (error) throw error;

      const formatted = (data || []).map((wf: any) => ({
        id: wf.id,
        department_id: wf.department_id,
        department_name: wf.departments?.name || "",
        approver_id: wf.approver_id,
        approver_name: wf.employees?.full_name || "",
      }));

      setApprovalWorkflows(formatted);
    } catch (err: unknown) {
      console.error("Error fetching approval workflows:", err);
    }
  };

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
        templates.find((template) => template.id === selectedProfileTemplateId)
          ?.id ||
        templates[0]?.id ||
        null;

      setSelectedProfileTemplateId(activeTemplateId);

      if (activeTemplateId) {
        await fetchTemplateFields(activeTemplateId);
      } else {
        setTemplateFields([]);
      }
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      console.error("Error fetching template fields:", err);
      setTemplateFields([]);
    }
  };

  const fetchISOStandards = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("company_iso_standards")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (error) throw error;

      console.log("Fetched ISO standards from DB:", data);

      const selected: string[] = [];
      const custom: string[] = [];

      (data || []).forEach((iso: any) => {
        selected.push(iso.iso_code);
        if (iso.is_custom) {
          custom.push(iso.iso_code);
        }
      });

      console.log("Selected ISOs:", selected);
      setSelectedISOs(selected);
      setCustomISOs(custom);

      // Set the first ISO as active for criteria display
      if (selected.length > 0 && !activeISOForCriteria) {
        setActiveISOForCriteria(selected[0]);
      }

      // Load selected criteria from localStorage
      const savedCriteria = localStorage.getItem(
        `selectedCriteria_${companyId}`
      );
      if (savedCriteria) {
        try {
          const parsedCriteria = JSON.parse(savedCriteria);
          setSelectedCriteria(parsedCriteria);
          console.log(
            "Loaded selected criteria from localStorage:",
            parsedCriteria.length,
            "items"
          );
        } catch (e) {
          console.error("Error parsing saved criteria:", e);
        }
      }

      // Fetch criteria for each selected ISO
      for (const isoCode of selected) {
        console.log("Fetching criteria for:", isoCode);
        await fetchIsoCriteria(isoCode);
      }
    } catch (err: unknown) {
      console.error("Error fetching ISO standards:", err);
    }
  };

  const fetchGInvestigations = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("g_investigations")
        .select("*")
        .eq("company_id", companyId);

      if (error) {
        console.log("G-Investigations not found, table may not exist yet");
        setSelectedGInvestigations([]);
        return;
      }

      // Extract just the code part from "code - description" format
      const selected = (data || []).map((item: any) => {
        const name = item.name;
        // If name contains " - ", extract the code part before it
        if (name && name.includes(" - ")) {
          return name.split(" - ")[0];
        }
        return name;
      });
      setSelectedGInvestigations(selected);
    } catch (err: unknown) {
      console.error("Error fetching G-Investigations:", err);
      setSelectedGInvestigations([]);
    }
  };

  const saveGInvestigations = async () => {
    if (!companyId) return;

    try {
      // First, delete all existing G-Investigations for this company
      await supabase
        .from("g_investigations")
        .delete()
        .eq("company_id", companyId);

      // Then insert the selected ones with full descriptions
      if (selectedGInvestigations.length > 0) {
        // Map of G-codes to their descriptions
        const gCodeDescriptions: Record<string, string> = {
          "G 1.1": "General medical examination",
          "G 1.2": "Ophthalmological examination",
          "G 1.3": "Audiological examination",
          "G 1.4": "Examination for tropical service",
          "G 2": "Blood (e.g. lead, solvents)",
          "G 3": "Allergizing substances",
          "G 4": "Skin diseases",
          "G 5": "Tropical service",
          "G 6": "Compressed air",
          "G 7": "Hazardous substances",
          "G 8": "Benzene",
          "G 9": "Mercury",
          "G 10": "Methyl alcohol",
          "G 11": "Carbon disulfide",
          "G 12": "Phosphorus",
          "G 13": "Hydrocarbons",
          "G 14": "Chromium compounds",
          "G 15": "Carcinogenic substances",
          "G 16": "Arsenic",
          "G 17": "Vinyl chloride",
          "G 18": "Pesticides",
          "G 19": "Nitro compounds",
          "G 20": "Noise",
          "G 21": "Cold",
          "G 22": "Heat",
          "G 23": "Ionizing radiation",
          "G 24": "Skin cancer",
          "G 25": "Driving activities",
          "G 26": "Non-ionizing radiation",
          "G 27": "Isocyanates",
          "G 28": "Latex",
          "G 29": "Benzol homologues",
          "G 30": "Biological agents",
          "G 31": "Overpressure",
          "G 32": "Cadmium",
          "G 33": "Asbestos",
          "G 34": "Fluorine",
          "G 35": "Work abroad under special climatic and health stresses",
          "G 36": "Bitumen",
          "G 37": "Display screen work",
          "G 38": "Nickel dusts",
          "G 39": "Welding fumes",
          "G 40": "Carcinogenic and mutagenic substances",
          "G 41": "Risk of falling",
          "G 42": "Infectious hazards",
          "G 43": "Biotechnology",
          "G 44": "Hardwood dusts",
          "G 45": "Styrene",
          "G 46": "Musculoskeletal stress including vibrations",
        };

        const investigations = selectedGInvestigations.map((code) => ({
          company_id: companyId,
          name: `${code} - ${gCodeDescriptions[code] || code}`, // Save code with description
        }));

        const { error } = await supabase
          .from("g_investigations")
          .insert(investigations);

        if (error) throw error;
      }

      toast({
        title: "Gespeichert",
        description: "G-Investigations saved successfully",
      });
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err.message || "G-Untersuchungen konnten nicht gespeichert werden",
        variant: "destructive",
      });
    }
  };

  // Submit support ticket
  const submitTicket = async () => {
    if (!companyId) return;

    if (!ticketForm.category || !ticketForm.title || !ticketForm.description) {
      toast({
        title: "Fehler",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingTicket(true);
    try {
      const { error } = await supabase.from("support_tickets").insert([
        {
          company_id: companyId,
          category: ticketForm.category,
          priority: ticketForm.priority,
          title: ticketForm.title,
          description: ticketForm.description,
          status: "open",
        },
      ]);

      if (error) throw error;

      toast({
        title: "Ticket Submitted",
        description: "Your support ticket has been submitted successfully. We'll get back to you soon!",
      });

      // Reset form
      setTicketForm({
        category: "",
        priority: "medium",
        title: "",
        description: "",
      });

      // Refresh tickets list
      fetchMyTickets();
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err.message || "Support-Ticket konnte nicht gesendet werden",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Fetch tickets for this company
  const fetchMyTickets = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setMyTickets(data || []);
    } catch (err: any) {
      console.error("Error fetching tickets:", err);
    }
  };

  const copyApiToken = () => {
    if (apiToken) {
      navigator.clipboard.writeText(apiToken);
      toast({
        title: t("settings.tokenCopied") || "Copied!",
        description: "API token copied to clipboard",
      });
    }
  };

  const toggleGInvestigation = (code: string) => {
    setSelectedGInvestigations((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleSelectAll = () => {
    const allCodes = [
      "G 1.1",
      "G 1.2",
      "G 1.3",
      "G 1.4",
      "G 2",
      "G 3",
      "G 4",
      "G 5",
      "G 6",
      "G 7",
      "G 8",
      "G 9",
      "G 10",
      "G 11",
      "G 12",
      "G 13",
      "G 14",
      "G 15",
      "G 16",
      "G 17",
      "G 18",
      "G 19",
      "G 20",
      "G 21",
      "G 22",
      "G 23",
      "G 24",
      "G 25",
      "G 26",
      "G 27",
      "G 28",
      "G 29",
      "G 30",
      "G 31",
      "G 32",
      "G 33",
      "G 34",
      "G 35",
      "G 36",
      "G 37",
      "G 38",
      "G 39",
      "G 40",
      "G 41",
      "G 42",
      "G 43",
      "G 44",
      "G 45",
      "G 46",
    ];

    if (selectedGInvestigations.length === allCodes.length) {
      setSelectedGInvestigations([]);
    } else {
      setSelectedGInvestigations(allCodes);
    }
  };

  const isAllSelected = () => {
    return selectedGInvestigations.length === 46;
  };

  const saveApprovalWorkflow = async (
    departmentId: string,
    approverId: string
  ) => {
    if (!companyId) return;

    try {
      const { error } = await supabase.from("approval_workflows").upsert(
        {
          company_id: companyId,
          department_id: departmentId,
          approver_id: approverId,
        },
        {
          onConflict: "company_id,department_id",
        }
      );

      if (error) throw error;

      toast({
        title: "Gespeichert",
        description: "Approval workflow saved successfully",
      });

      fetchApprovalWorkflows();
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err.message,
        variant: "destructive",
      });
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

      fetchApprovalWorkflows();
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const saveISOStandard = async (
    isoCode: string,
    isoName: string,
    isCustom: boolean
  ) => {
    if (!companyId) return;

    try {
      const { error } = await supabase.from("company_iso_standards").upsert(
        {
          company_id: companyId,
          iso_code: isoCode,
          iso_name: isoName,
          is_custom: isCustom,
          is_active: true,
        },
        {
          onConflict: "company_id,iso_code",
        }
      );

      if (error) throw error;

      // Create audit log
      logAction({
        action: isCustom ? "update_custom_iso" : "activate_iso_standard",
        targetType: "iso_standard",
        targetId: isoCode,
        targetName: isoName,
        details: { iso_code: isoCode, is_active: true }
      });
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const deleteISOStandard = async (isoCode: string) => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from("company_iso_standards")
        .delete()
        .eq("company_id", companyId)
        .eq("iso_code", isoCode);

      if (error) throw error;

      // Create audit log
      logAction({
        action: "deactivate_iso_standard",
        targetType: "iso_standard",
        targetId: isoCode,
        targetName: isoCode,
        details: { iso_code: isoCode }
      });

    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleAddTeamMember = async () => {
    if (!companyId) return;

    if (
      !teamMemberForm.firstName ||
      !teamMemberForm.lastName ||
      !teamMemberForm.email ||
      !teamMemberForm.role
    ) {
      toast({
        title: "Fehler",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsAddingTeamMember(true);
    try {
      const { data, error } = await (supabase as any)
        .from("team_members")
        .insert([
          {
            company_id: companyId,
            first_name: teamMemberForm.firstName,
            last_name: teamMemberForm.lastName,
            email: teamMemberForm.email,
            role: teamMemberForm.role,
            status: "pending",
          },
        ])
        .select();

      if (error) throw error;

      toast({
        title: "Gespeichert",
        description: "Team member added successfully",
      });

      // Create audit log
      const newMember = (data as any)?.[0];
      logAction({
        action: "invite_team_member",
        targetType: "team_member",
        targetId: newMember?.id || "unknown",
        targetName: `${teamMemberForm.firstName} ${teamMemberForm.lastName}`,
        details: { email: teamMemberForm.email, role: teamMemberForm.role }
      });

      // Reset form
      setTeamMemberForm({
        firstName: "",
        lastName: "",
        email: "",
        role: "",
      });

      // Refresh team members list
      fetchTeamMembers();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Fehler",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsAddingTeamMember(false);
    }
  };

  const handleChangeTeamMemberRole = async (memberId: string, memberName: string, oldRole: string, newRole: string) => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from("team_members")
        .update({ role: newRole })
        .eq("id", memberId)
        .eq("company_id", companyId);

      if (error) throw error;

      toast({
        title: "Gespeichert",
        description: `Role updated from ${oldRole} to ${newRole}`,
      });

      // Create audit log
      logAction({
        action: "update_team_member_role",
        targetType: "team_member",
        targetId: memberId,
        targetName: memberName,
        details: { old_role: oldRole, new_role: newRole }
      });

      // Refresh team members list
      fetchTeamMembers();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Fehler",
        description: message,
        variant: "destructive",
      });
    }
  };

  const getTableName = (title: string) => {
    const mapping: Record<string, string> = {
      Departments: "departments",
      "Job Roles": "job_roles",
      "Exposure Groups": "exposure_groups",
      "Hazard Categories": "risk_categories",
      "Training Types": "training_types",
      "Audit Categories": "audit_categories",
    };
    return mapping[title];
  };

  const onSubmit = async (data: unknown) => {
    console.log(
      "onSubmit called with data:",
      data,
      "currentTableName:",
      currentTableName
    );

    if (!companyId || !currentTableName) {
      toast({
        title: "Fehler",
        description: "Missing required data. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const tableName = currentTableName;
      const formData = data as { name: string; description?: string };

      // job_roles table uses 'title' field instead of 'name'
      const usesTitleField = tableName === "job_roles";
      const payload = usesTitleField
        ? { title: formData.name, description: formData.description }
        : { name: formData.name, description: formData.description };

      if (editingItem) {
        // Update existing item
        const { error } = await (supabase as any)
          .from(tableName)
          .update(payload)
          .eq("id", editingItem.id)
          .eq("company_id", companyId);

        if (error) throw error;
        toast({ title: "Gespeichert", description: "Element wurde aktualisiert" });

        // Create audit log
        const itemType = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
        logAction({
          action: `update_${itemType}`,
          targetType: itemType,
          targetId: editingItem.id,
          targetName: formData.name || (formData as any).title || "Unknown Item",
          details: { table: tableName, changes: payload }
        });
      } else {
        // Create new item
        const { data: newItemData, error } = await (supabase as any).from(tableName).insert([
          {
            ...payload,
            company_id: companyId,
          },
        ]).select(); // Added select to get ID

        if (error) throw error;
        toast({ title: "Gespeichert", description: "Element wurde erstellt" });

        // Create audit log
        const itemType = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
        const createdItem = (newItemData as any)?.[0];
        logAction({
          action: `create_${itemType}`,
          targetType: itemType,
          targetId: createdItem?.id || "unknown",
          targetName: formData.name || (formData as any).title || "Unknown Item",
          details: { table: tableName, item: createdItem }
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      setCurrentTableName("");
      form.reset();
      fetchAllData();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Fehler",
        description: message,
        variant: "destructive",
      });
    }
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
      if (!tableName) {
        toast({
          title: "Fehler",
          description: "Table name is missing. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", deleteItem.id)
        .eq("company_id", companyId);

      if (error) throw error;

      toast({ title: "Gespeichert", description: "Item deleted successfully" });

      // Create audit log
      const itemType = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
      logAction({
        action: `delete_${itemType}`,
        targetType: itemType,
        targetId: deleteItem.id,
        targetName: deleteItem.name || deleteItem.title || "Unknown Item",
        details: {
          table: tableName,
          deleted_item: deleteItem
        }
      });

      setDeleteItem(null);
      fetchAllData();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Fehler",
        description: message,
        variant: "destructive",
      });
    }
  };

  // Import ISO Criteria from JSON files
  const importIsoCriteria = async (isoCode: string) => {
    if (!companyId) {
      toast({
        title: "Fehler",
        description: "Company ID not found",
        variant: "destructive",
      });
      return;
    }

    setImportingISO(isoCode);

    try {
      // Load the appropriate JSON file
      let jsonData;
      if (isoCode === "ISO_9001") {
        jsonData = await import("../data/iso_9001_2015_complete.json");
      } else if (isoCode === "ISO_14001") {
        jsonData = await import("../data/iso_14001_2015_complete.json");
      } else if (isoCode === "ISO_45001") {
        jsonData = await import("../data/iso_45001_2015_complete.json");
      } else {
        throw new Error("Unknown ISO code");
      }

      const data = jsonData.default || jsonData;

      // Insert sections
      for (const section of data.sections) {
        const { data: sectionData, error: sectionError } = await supabase
          .from("iso_criteria_sections")
          .upsert(
            {
              iso_code: data.iso_code,
              section_number: section.section_number,
              title: section.title,
              title_en: section.title, // Store English text in title_en
              sort_order: section.sort_order,
            },
            { onConflict: "iso_code,section_number" }
          )
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Insert subsections
        for (const subsection of section.subsections) {
          const { data: subsectionData, error: subsectionError } =
            await supabase
              .from("iso_criteria_subsections")
              .upsert(
                {
                  section_id: sectionData.id,
                  subsection_number: subsection.subsection_number,
                  title: subsection.title,
                  title_en: subsection.title, // Store English text in title_en
                  sort_order: subsection.sort_order,
                },
                { onConflict: "section_id,subsection_number" }
              )
              .select()
              .single();

          if (subsectionError) throw subsectionError;

          // Insert questions
          for (let i = 0; i < subsection.questions.length; i++) {
            const { error: questionError } = await supabase
              .from("iso_criteria_questions")
              .upsert({
                subsection_id: subsectionData.id,
                question_text: subsection.questions[i],
                question_text_en: subsection.questions[i], // Store English text in question_text_en
                sort_order: i + 1,
              });

            if (questionError) throw questionError;
          }
        }
      }

      toast({
        title: "Gespeichert",
        description: `${data.iso_name} criteria imported successfully! (${data.total_criteria} criteria)`,
      });

      // Refresh the criteria data
      await fetchIsoCriteria(isoCode);
    } catch (error: any) {
      console.error("Error importing ISO criteria:", error);
      toast({
        title: "Fehler",
        description: error.message || "Failed to import ISO criteria",
        variant: "destructive",
      });
    } finally {
      setImportingISO(null);
    }
  };

  // Fetch ISO Criteria from database
  const fetchIsoCriteria = async (isoCode: string) => {
    try {
      const { data: sections, error } = await supabase
        .from("iso_criteria_sections")
        .select(
          `
          *,
          subsections:iso_criteria_subsections(
            *,
            questions:iso_criteria_questions(*)
          )
        `
        )
        .eq("iso_code", isoCode)
        .order("sort_order");

      if (error) throw error;

      setIsoCriteriaData((prev: any) => ({
        ...prev,
        [isoCode]: sections,
      }));
    } catch (error: any) {
      console.error("Error fetching ISO criteria:", error);
    }
  };

  // Add custom criterion to the selected ISO
  const handleAddCustomCriterion = async () => {
    if (!activeISOForCriteria || !newCriterionId.trim() || !newCriterionText.trim()) {
      toast({
        title: "Fehler",
        description: "Please enter both Criterion ID and Title",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find the section number from the criterion ID (e.g., "1.2.3" -> section "1")
      // If not a valid number, default to section 7 (Verbesserung/Custom)
      const firstPart = newCriterionId.split(".")[0];
      const sectionNumber = /^[1-7]$/.test(firstPart) ? firstPart : "7";

      // Get the section ID for this ISO and section number
      const { data: sectionData, error: sectionError } = await supabase
        .from("iso_criteria_sections")
        .select("id")
        .eq("iso_code", activeISOForCriteria)
        .eq("section_number", sectionNumber)
        .single();

      if (sectionError || !sectionData) {
        toast({
          title: "Fehler",
          description: `Could not find section for this ISO. Please try again.`,
          variant: "destructive",
        });
        return;
      }

      // Get the max sort_order for this section
      const { data: existingSubsections } = await supabase
        .from("iso_criteria_subsections")
        .select("sort_order")
        .eq("section_id", sectionData.id)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextSortOrder = (existingSubsections?.[0]?.sort_order || 0) + 1;

      // Insert the new subsection
      const { error: insertError } = await supabase
        .from("iso_criteria_subsections")
        .insert({
          section_id: sectionData.id,
          subsection_number: newCriterionId,
          title: newCriterionText,
          title_en: newCriterionText,
          company_id: companyId,  // Mark as custom criteria for this company
          sort_order: nextSortOrder,
        });

      if (insertError) throw insertError;

      toast({
        title: "Gespeichert",
        description: "Custom criterion added successfully",
      });

      // Reset inputs
      setNewCriterionId("");
      setNewCriterionText("");

      // Refresh the criteria data
      await fetchIsoCriteria(activeISOForCriteria);
    } catch (error: any) {
      console.error("Error adding custom criterion:", error);
      toast({
        title: "Fehler",
        description: error.message || "Failed to add custom criterion",
        variant: "destructive",
      });
    }
  };


  // Delete a criterion by ID
  const handleDeleteCriterion = async (subsectionId: string) => {
    if (!activeISOForCriteria) return;

    try {
      const { data, error, count } = await supabase
        .from("iso_criteria_subsections")
        .delete()
        .eq("id", subsectionId)
        .select();

      console.log("Delete result:", { data, error, count, subsectionId });

      if (error) throw error;

      toast({
        title: "Gespeichert",
        description: "Criterion deleted successfully",
      });

      // Manually remove from state for instant UI update
      const isoCodeMap: { [key: string]: string } = {
        ISO_45001: "ISO_45001",
        ISO_14001: "ISO_14001",
        ISO_9001: "ISO_9001",
        ISO_50001: "ISO_50001",
      };
      const isoCode = isoCodeMap[activeISOForCriteria];

      if (isoCode && isoCriteriaData[isoCode]) {
        const updatedSections = isoCriteriaData[isoCode].map((section: any) => ({
          ...section,
          subsections: section.subsections?.filter((sub: any) => sub.id !== subsectionId) || []
        }));

        setIsoCriteriaData((prev: any) => ({
          ...prev,
          [isoCode]: updatedSections
        }));
      }
    } catch (error: any) {
      console.error("Error deleting criterion:", error);
      toast({
        title: "Fehler",
        description: error.message || "Failed to delete criterion",
        variant: "destructive",
      });
    }
  };

  // Delete multiple criteria by IDs (for batch delete)
  const handleDeleteCriteriaBatch = async (subsectionIds: string[]) => {
    if (!activeISOForCriteria || subsectionIds.length === 0) return;

    try {
      const { error } = await supabase
        .from("iso_criteria_subsections")
        .delete()
        .in("id", subsectionIds);

      if (error) throw error;

      toast({
        title: "Gespeichert",
        description: `${subsectionIds.length} criterion(s) deleted successfully`,
      });

      // Manually remove from state for instant UI update
      const isoCodeMap: { [key: string]: string } = {
        ISO_45001: "ISO_45001",
        ISO_14001: "ISO_14001",
        ISO_9001: "ISO_9001",
        ISO_50001: "ISO_50001",
      };
      const isoCode = isoCodeMap[activeISOForCriteria];

      if (isoCode && isoCriteriaData[isoCode]) {
        const updatedSections = isoCriteriaData[isoCode].map((section: any) => ({
          ...section,
          subsections: section.subsections?.filter((sub: any) => !subsectionIds.includes(sub.id)) || []
        }));

        setIsoCriteriaData((prev: any) => ({
          ...prev,
          [isoCode]: updatedSections
        }));
      }
    } catch (error: any) {
      console.error("Error deleting criteria:", error);
      toast({
        title: "Fehler",
        description: error.message || "Failed to delete criteria",
        variant: "destructive",
      });
    }
  };

  // Delete a section/group and all its subsections by section number
  const handleDeleteSection = async (sectionNumber: string) => {
    if (!activeISOForCriteria) return;

    try {
      // For custom items (non-numeric), delete subsections by their subsection_number pattern
      if (!/^[1-7]$/.test(sectionNumber)) {
        // Get all section IDs for this ISO
        const { data: sectionsData } = await supabase
          .from("iso_criteria_sections")
          .select("id")
          .eq("iso_code", activeISOForCriteria);

        if (sectionsData && sectionsData.length > 0) {
          const sectionIds = sectionsData.map(s => s.id);

          // Delete subsections where subsection_number starts with this prefix
          const { error } = await supabase
            .from("iso_criteria_subsections")
            .delete()
            .in("section_id", sectionIds)
            .ilike("subsection_number", `${sectionNumber}%`);

          if (error) throw error;
        }

        toast({
          title: "Gespeichert",
          description: "Custom criterion deleted successfully",
        });

        // Refresh the criteria data
        await fetchIsoCriteria(activeISOForCriteria);
        return;
      }

      // For standard sections (1-7), get the section ID
      const { data: sectionData, error: sectionError } = await supabase
        .from("iso_criteria_sections")
        .select("id")
        .eq("iso_code", activeISOForCriteria)
        .eq("section_number", sectionNumber)
        .single();

      if (sectionError || !sectionData) {
        throw new Error("Section not found");
      }

      // Delete all subsections first
      await supabase
        .from("iso_criteria_subsections")
        .delete()
        .eq("section_id", sectionData.id);

      // Delete the section
      const { error } = await supabase
        .from("iso_criteria_sections")
        .delete()
        .eq("id", sectionData.id);

      if (error) throw error;

      toast({
        title: "Gespeichert",
        description: "Section deleted successfully",
      });

      // Refresh the criteria data
      await fetchIsoCriteria(activeISOForCriteria);
    } catch (error: any) {
      console.error("Error deleting section:", error);
      toast({
        title: "Fehler",
        description: error.message || "Failed to delete section",
        variant: "destructive",
      });
    }
  };

  // Fetch all imported ISO criteria on page load
  const fetchAllIsoCriteria = async () => {
    try {
      // Check which ISO standards have been imported
      const { data: sections, error } = await supabase
        .from("iso_criteria_sections")
        .select("iso_code")
        .limit(1);

      if (error) throw error;

      if (sections && sections.length > 0) {
        // Get unique ISO codes
        const { data: allSections } = await supabase
          .from("iso_criteria_sections")
          .select("iso_code");

        const uniqueIsoCodes = [
          ...new Set(allSections?.map((s) => s.iso_code) || []),
        ];

        // Fetch criteria for each imported ISO
        for (const isoCode of uniqueIsoCodes) {
          await fetchIsoCriteria(isoCode as string);
        }
      }
    } catch (error: any) {
      console.error("Error fetching all ISO criteria:", error);
    }
  };

  // Update English translations for existing ISO criteria data
  const updateEnglishTranslations = async () => {
    try {
      setLoadingData(true);

      toast({
        title: "Updating translations...",
        description:
          "Deleting old data and re-importing with English translations",
      });

      // Get list of imported ISO codes
      const { data: existingISOs } = await supabase
        .from("iso_criteria_sections")
        .select("iso_code");

      const uniqueIsoCodes = [
        ...new Set(existingISOs?.map((s) => s.iso_code) || []),
      ];

      if (uniqueIsoCodes.length === 0) {
        toast({
          title: "No data found",
          description:
            "No ISO criteria found in database. Please import ISO standards first.",
          variant: "destructive",
        });
        setLoadingData(false);
        return;
      }

      // Delete existing data and re-import for each ISO standard
      for (const isoCode of uniqueIsoCodes) {
        // Delete existing sections (cascade will delete subsections and questions)
        await supabase
          .from("iso_criteria_sections")
          .delete()
          .eq("iso_code", isoCode);

        // Re-import with updated function that includes English translations
        await importIsoCriteria(isoCode as string);
      }

      toast({
        title: "Success!",
        description: `ISO criteria re-imported successfully with English translations for ${uniqueIsoCodes.length} standard(s)!`,
      });

      // Refresh the data
      await fetchAllIsoCriteria();
    } catch (error: any) {
      console.error("Error updating English translations:", error);
      toast({
        title: "Fehler",
        description: error.message || "Failed to update English translations",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  // Add German translations to ISO criteria
  const addGermanTranslations = async () => {
    try {
      setLoadingData(true);

      toast({
        title: "Adding German translations...",
        description: "Updating ISO criteria with German text",
      });

      // German translations for ISO 45001 sections
      const germanSections: Record<string, string> = {
        "1": "Kontext der Organisation",
        "2": "Führung (Leadership)",
        "3": "Planung",
        "4": "Unterstützung",
        "5": "Betrieb",
        "6": "Bewertung der Leistung",
        "7": "Verbesserung",
        "8": "Glossar",
      };

      // German translations for ISO 45001 subsections
      const germanSubsections: Record<string, string> = {
        "1.1": "Externe und interne Themen identifizieren",
        "1.2": "Interessierte Parteien und deren Anforderungen",
        "1.3": "Anwendungsbereich des Arbeitsschutzmanagementsystems",
        "1.4": "Managementsystem und Schnittstellen",
        "2.1": "Verantwortung und Verpflichtung der obersten Leitung",
        "2.2": "Arbeitsschutzpolitik",
        "2.3": "Rollen, Verantwortlichkeiten und Befugnisse",
        "2.4": "Beteiligung und Konsultation der Beschäftigten",
        "2.5": "Besondere Beauftragte und Fachfunktionen",
        "3.1": "Maßnahmen zum Umgang mit Risiken und Chancen",
        "3.2": "Rechtliche und andere Anforderungen",
        "3.3": "Arbeitsschutzziele",
        "3.4": "Notfall- und Krisenplanung",
        "3.6": "Detaillierte Zielplanung",
        "4.1": "Ressourcenmanagement & Budget",
        "4.2": "Kompetenz und Qualifikation",
        "4.3": "Bewusstsein und Kommunikation",
        "4.4": "Dokumentierte Information",
        "4.5": "Wissensmanagement",
        "4.6": "Kommunikation & Dokumentation",
        "5.1": "Betriebliche Planung und Steuerung",
        "5.2": "Gefährdungsbeurteilung & Schutzmaßnahmen",
        "5.3": "Management of Change",
        "5.4": "Beschaffung & Lieferantenmanagement",
        "5.5": "Notfallvorsorge und Gefahrenabwehr",
        "5.6": "Instandhaltungsmanagement",
        "5.7": "Betriebliche Steuerung und Prozessorganisation",
        "5.9": "Sicherheits- und Gesundheitsmanagement",
        "5.10": "Nachhaltigkeit und Umweltschutz",
        "6.1": "Überwachung, Messung, Analyse",
        "6.2": "Interne Audits",
        "6.3": "Managementbewertung",
        "6.4": "Feedback & Lernen",
        "7.1": "Kontinuierliche Verbesserung",
        "7.2": "Nichtkonformitäten & Korrekturmaßnahmen",
        "7.3": "Management psychosozialer Risiken",
        "7.4": "Lessons Learned",
        "7.5": "Compliance & Ethik",
        "7.6": "Innovation und Gesundheitsprogramme",
        "8.1": "Zusätzliche Informationen",
      };

      let updatedCount = 0;

      // Update sections
      const { data: sections } = await supabase
        .from("iso_criteria_sections")
        .select("id, section_number")
        .eq("iso_code", "ISO_45001");

      for (const section of sections || []) {
        const germanTitle = germanSections[section.section_number];
        if (germanTitle) {
          await supabase
            .from("iso_criteria_sections")
            .update({ title: germanTitle })
            .eq("id", section.id);
          updatedCount++;
        }
      }

      // Update subsections
      const { data: subsections } = await supabase
        .from("iso_criteria_subsections")
        .select(
          `
          id,
          subsection_number,
          section_id,
          iso_criteria_sections!inner(iso_code)
        `
        )
        .eq("iso_criteria_sections.iso_code", "ISO_45001");

      for (const subsection of subsections || []) {
        const germanTitle = germanSubsections[subsection.subsection_number];
        if (germanTitle) {
          await supabase
            .from("iso_criteria_subsections")
            .update({ title: germanTitle })
            .eq("id", subsection.id);
          updatedCount++;
        }
      }

      toast({
        title: "Success!",
        description: `German translations added successfully! (${updatedCount} items updated)`,
      });

      // Refresh the data
      await fetchAllIsoCriteria();
    } catch (error: any) {
      console.error("Error adding German translations:", error);
      toast({
        title: "Fehler",
        description: error.message || "Failed to add German translations",
        variant: "destructive",
      });
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

  // User Roles State
  interface RolePermissions {
    [key: string]: {
      dashboard: boolean;
      employees: boolean;
      healthCheckups: boolean;
      documents: boolean;
      reports: boolean;
      audits: boolean;
      settings: boolean;
    };
  }

  // Team Members State
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamMemberForm, setTeamMemberForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
  });
  const [isAddingTeamMember, setIsAddingTeamMember] = useState(false);
  const [orgType, setOrgType] = useState<'linie' | 'matrix'>('linie');
  const [managerSaving, setManagerSaving] = useState(false);

  const [roles, setRoles] = useState<RolePermissions>({
    Admin: {
      dashboard: true,
      employees: true,
      healthCheckups: true,
      documents: true,
      reports: true,
      audits: true,
      settings: true,
    },
    "Line Manager": {
      dashboard: true,
      employees: true,
      healthCheckups: true,
      documents: true,
      reports: true,
      audits: false,
      settings: false,
    },
    "HSE Manager": {
      dashboard: true,
      employees: true,
      healthCheckups: true,
      documents: true,
      reports: true,
      audits: true,
      settings: false,
    },
    Doctor: {
      dashboard: true,
      employees: false,
      healthCheckups: true,
      documents: true,
      reports: false,
      audits: false,
      settings: false,
    },
    Employee: {
      dashboard: true,
      employees: false,
      healthCheckups: false,
      documents: true,
      reports: false,
      audits: false,
      settings: false,
    },
    User: {
      dashboard: false,
      employees: false,
      healthCheckups: false,
      documents: true,
      reports: false,
      audits: false,
      settings: false,
    },
  });

  const [isAddingCustomRole, setIsAddingCustomRole] = useState(false);
  const [customRoleName, setCustomRoleName] = useState("");

  // Enhanced RBAC State
  const [customRolesData, setCustomRolesData] = useState<CustomRole[]>([]);
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<CustomRole | null>(null);
  const [isRolesLoading, setIsRolesLoading] = useState(false);

  const permissions = [
    "dashboard",
    "employees",
    "healthCheckups",
    "documents",
    "reports",
    "audits",
    "settings",
  ] as const;

  const togglePermission = async (roleName: string, permission: string) => {
    const newPermissions = {
      ...roles[roleName],
      [permission]:
        !roles[roleName][permission as keyof (typeof roles)[typeof roleName]],
    };

    setRoles((prev) => ({
      ...prev,
      [roleName]: newPermissions,
    }));

    // Auto-save to database
    try {
      if (!companyId) return;

      const { error } = await (supabase as any).from("custom_roles").upsert(
        {
          company_id: companyId,
          role_name: roleName,
          permissions: newPermissions,
          is_predefined: [
            "Admin",
            "Line Manager",
            "HSE Manager",
            "Doctor",
            "Employee",
            "User",
          ].includes(roleName),
        },
        { onConflict: "company_id,role_name" }
      );

      if (error) throw error;

      toast({
        title: "Gespeichert",
        description: "Permission updated successfully",
      });
    } catch (error) {
      console.error("Error updating permission:", error);
      toast({
        title: "Fehler",
        description: "Failed to update permission",
        variant: "destructive",
      });
    }
  };

  const addCustomRole = async () => {
    if (!customRoleName.trim()) {
      toast({
        title: "Fehler",
        description: "Role name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (roles[customRoleName]) {
      toast({
        title: "Fehler",
        description: "Role already exists",
        variant: "destructive",
      });
      return;
    }

    if (!companyId) {
      toast({
        title: "Fehler",
        description: "Company ID not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const newPermissions = {
        dashboard: false,
        employees: false,
        healthCheckups: false,
        documents: false,
        reports: false,
        audits: false,
        settings: false,
      };

      const { error } = await (supabase as any).from("custom_roles").insert([
        {
          company_id: companyId,
          role_name: customRoleName,
          permissions: newPermissions,
          is_predefined: false,
        },
      ]);

      if (error) throw error;

      setRoles((prev) => ({
        ...prev,
        [customRoleName]: newPermissions,
      }));

      setCustomRoleName("");
      setIsAddingCustomRole(false);
      toast({
        title: "Gespeichert",
        description: `Role "${customRoleName}" created successfully`,
      });
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Fehler",
        description: message,
        variant: "destructive",
      });
    }
  };

  const deleteCustomRole = async (roleName: string) => {
    const predefinedRoles = [
      "Admin",
      "Line Manager",
      "HSE Manager",
      "Doctor",
      "Employee",
      "User",
    ];

    if (predefinedRoles.includes(roleName)) {
      toast({
        title: "Fehler",
        description: "Cannot delete predefined roles",
        variant: "destructive",
      });
      return;
    }

    if (!companyId) return;

    try {
      const { error } = await supabase
        .from("custom_roles")
        .delete()
        .eq("company_id", companyId)
        .eq("role_name", roleName);

      if (error) throw error;

      setRoles((prev) => {
        const newRoles = { ...prev };
        delete newRoles[roleName];
        return newRoles;
      });

      // Also update customRolesData
      setCustomRolesData((prev) => prev.filter((r) => r.role_name !== roleName));
      if (selectedRoleForEdit?.role_name === roleName) {
        setSelectedRoleForEdit(null);
      }

      toast({
        title: "Gespeichert",
        description: `Role "${roleName}" deleted successfully`,
      });

      // Refresh roles
      fetchCustomRoles();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Fehler",
        description: message,
        variant: "destructive",
      });
    }
  };

  // Enhanced RBAC Handler Functions

  // Helper function to compute legacy permissions from detailed permissions
  const computeLegacyPermissions = (detailed: typeof DEFAULT_DETAILED_PERMISSIONS) => {
    return {
      dashboard: detailed.standard.collaborate_on_cases || detailed.standard.assign_to_teams,
      employees: detailed.employees.view_all || detailed.employees.view_own_department || detailed.employees.manage,
      healthCheckups: detailed.health_examinations.view_all || detailed.health_examinations.view_team || detailed.health_examinations.view_own || detailed.health_examinations.create_edit,
      documents: detailed.documents.view || detailed.documents.upload || detailed.documents.edit,
      reports: detailed.reports.view || detailed.reports.create_dashboards || detailed.reports.export_data,
      audits: detailed.audits.view || detailed.audits.create_edit || detailed.audits.assign_corrective_actions,
      settings: detailed.settings.company_location || detailed.settings.user_role_management || detailed.settings.gdpr_data_protection || detailed.settings.templates_custom_fields || detailed.settings.subscription_billing,
    };
  };

  const handleUpdateDetailedPermission = async (
    roleName: string,
    category: PermissionCategory,
    permission: string,
    value: boolean
  ) => {
    if (!companyId) return;

    // Find the role
    const role = customRolesData.find((r) => r.role_name === roleName);
    if (!role) return;

    // Create updated detailed permissions
    const updatedDetailedPermissions = {
      ...role.detailed_permissions,
      [category]: {
        ...role.detailed_permissions[category],
        [permission]: value,
      },
    };

    // Compute legacy permissions from detailed permissions
    const updatedLegacyPermissions = computeLegacyPermissions(updatedDetailedPermissions);

    // Optimistically update UI
    setCustomRolesData((prev) =>
      prev.map((r) =>
        r.role_name === roleName
          ? { ...r, detailed_permissions: updatedDetailedPermissions, permissions: updatedLegacyPermissions }
          : r
      )
    );

    if (selectedRoleForEdit?.role_name === roleName) {
      setSelectedRoleForEdit((prev) =>
        prev ? { ...prev, detailed_permissions: updatedDetailedPermissions } : null
      );
    }

    // Also update the legacy roles state
    setRoles((prev) => ({
      ...prev,
      [roleName]: updatedLegacyPermissions,
    }));

    try {
      const { error } = await supabase
        .from("custom_roles")
        .update({
          detailed_permissions: updatedDetailedPermissions,
          permissions: updatedLegacyPermissions
        })
        .eq("company_id", companyId)
        .eq("role_name", roleName);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("settings.permissionUpdated") || "Permission updated successfully",
      });
    } catch (err: unknown) {
      // Revert on error
      fetchCustomRoles();
      const e = err as { message?: string } | Error | null;
      const message = e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: t("common.error"),
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleCreateNewRole = async (name: string, description: string) => {
    if (!companyId) return;

    // Check permission before allowing role creation
    if (!hasDetailedPermission('settings', 'user_role_management')) {
      toast({
        title: "Permission Denied",
        description: "You do not have permission to manage roles",
        variant: "destructive",
      });
      return;
    }

    const defaultPermissions = {
      dashboard: false,
      employees: false,
      healthCheckups: false,
      documents: false,
      reports: false,
      audits: false,
      settings: false,
    };

    try {
      const { data, error } = await supabase
        .from("custom_roles")
        .insert([
          {
            company_id: companyId,
            role_name: name,
            permissions: defaultPermissions,
            detailed_permissions: DEFAULT_DETAILED_PERMISSIONS,
            description: description,
            is_predefined: false,
            display_order: 100,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: `Role "${name}" created successfully`,
      });

      // Refresh roles
      fetchCustomRoles();

      // Select the new role
      if (data) {
        setSelectedRoleForEdit({
          ...data,
          detailed_permissions: data.detailed_permissions || DEFAULT_DETAILED_PERMISSIONS,
        });
      }
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message = e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: t("common.error"),
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteRoleEnhanced = async (roleName: string) => {
    // Check permission before allowing role deletion
    if (!hasDetailedPermission('settings', 'user_role_management')) {
      toast({
        title: "Permission Denied",
        description: "You do not have permission to manage roles",
        variant: "destructive",
      });
      return;
    }
    await deleteCustomRole(roleName);
  };

  const handleUpdateRoleDescription = async (roleName: string, description: string) => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from("custom_roles")
        .update({ description })
        .eq("company_id", companyId)
        .eq("role_name", roleName);

      if (error) throw error;

      // Update local state
      setCustomRolesData((prev) =>
        prev.map((r) => (r.role_name === roleName ? { ...r, description } : r))
      );

      if (selectedRoleForEdit?.role_name === roleName) {
        setSelectedRoleForEdit((prev) => (prev ? { ...prev, description } : null));
      }

      toast({
        title: t("common.success"),
        description: "Description updated successfully",
      });
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message = e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: t("common.error"),
        description: message,
        variant: "destructive",
      });
    }
  };


  // Profile Fields Management Functions
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
      toast({
        title: t("settings.error"),
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from("profile_field_templates")
          .update({
            name: templateForm.name.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profile_field_templates")
          .insert([
            {
              company_id: companyId,
              name: templateForm.name.trim(),
              display_order: profileFieldTemplates.length,
            },
          ]);

        if (error) throw error;
      }

      toast({
        title: t("settings.success"),
        description: editingTemplate
          ? "Template updated successfully"
          : "Template added successfully",
      });

      await fetchProfileFieldTemplates();
      closeTemplateDialog();
    } catch (err: any) {
      toast({
        title: t("settings.error"),
        description: err.message,
        variant: "destructive",
      });
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

      toast({
        title: t("settings.success"),
        description: "Template deleted successfully",
      });

      if (selectedProfileTemplateId === templateId) {
        setSelectedProfileTemplateId(null);
      }

      await fetchProfileFieldTemplates();
    } catch (err: any) {
      toast({
        title: t("settings.error"),
        description: err.message,
        variant: "destructive",
      });
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
      setProfileFieldForm({
        fieldName: "",
        fieldLabel: "",
        fieldType: "text",
        isRequired: false,
        extractedFromResume: false,
      });
    }
    setIsProfileFieldDialogOpen(true);
  };

  const closeProfileFieldDialog = () => {
    setIsProfileFieldDialogOpen(false);
    setEditingProfileField(null);
    setProfileFieldForm({
      fieldName: "",
      fieldLabel: "",
      fieldType: "text",
      isRequired: false,
      extractedFromResume: false,
    });
  };

  const saveProfileField = async () => {
    if (!companyId) return;

    if (!selectedProfileTemplateId) {
      toast({
        title: t("settings.error"),
        description: "Please select a template first",
        variant: "destructive",
      });
      return;
    }

    if (!profileFieldForm.fieldName || !profileFieldForm.fieldLabel) {
      toast({
        title: t("settings.error"),
        description: "Field name and label are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingProfileField(true);

    try {
      if (editingProfileField) {
        // Update existing field
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

        toast({
          title: t("settings.success"),
          description: "Profile field updated successfully",
        });
      } else {
        // Create new field
        const { error } = await supabase
          .from("profile_fields")
          .insert([
            {
              company_id: companyId,
              template_id: selectedProfileTemplateId,
              field_name: profileFieldForm.fieldName,
              field_label: profileFieldForm.fieldLabel,
              field_type: profileFieldForm.fieldType,
              is_required: profileFieldForm.isRequired,
              extracted_from_resume: profileFieldForm.extractedFromResume,
              display_order: templateFields.length,
            },
          ]);

        if (error) throw error;

        toast({
          title: t("settings.success"),
          description: "Profile field added successfully",
        });
      }

      await fetchTemplateFields(selectedProfileTemplateId);
      closeProfileFieldDialog();
    } catch (err: any) {
      toast({
        title: t("settings.error"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingProfileField(false);
    }
  };

  const deleteProfileField = async (fieldId: string) => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from("profile_fields")
        .delete()
        .eq("id", fieldId);

      if (error) throw error;

      toast({
        title: t("settings.success"),
        description: "Profile field deleted successfully",
      });

      if (selectedProfileTemplateId) {
        await fetchTemplateFields(selectedProfileTemplateId);
      }
    } catch (err: any) {
      toast({
        title: t("settings.error"),
        description: err.message,
        variant: "destructive",
      });
    }
  };



  const renderTable = (data: any[], title: string) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Manage {title.toLowerCase()} - Used across the system in dropdown
              menus
            </CardDescription>
          </div>
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
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  const tableName = getTableName(title);
                  console.log(
                    "Opening dialog for table:",
                    tableName,
                    "with title:",
                    title
                  );
                  setCurrentTableName(tableName);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add {title.slice(0, -1)}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Edit" : "Add"} {title.slice(0, -1)}
                </DialogTitle>
                <DialogDescription>
                  {editingItem
                    ? "Update the details below to modify this item."
                    : "Create a new item that will be available in dropdown menus throughout the system."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={`Enter ${title
                              .slice(0, -1)
                              .toLowerCase()} name`}
                          />
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
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder="Add additional details or notes..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDialogClose}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingItem ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No items found. Click "Add {title.slice(0, -1)}" to create
                    your first entry.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.name || item.title}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCurrentTableName(getTableName(title));
                                handleEdit(item);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setDeleteItem({
                                  ...item,
                                  tableName: getTableName(title),
                                })
                              }
                            >
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
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "
              {deleteItem?.name || deleteItem?.title}". This action cannot be
              undone. Items assigned to employees or other records will be
              unlinked.
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
    </Card>
  );

  const activeProfileTemplate = profileFieldTemplates.find(
    (template) => template.id === selectedProfileTemplateId
  );

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
              <h1 className="text-xl font-bold">{t("settings.title")}</h1>
              <p className="text-xs text-muted-foreground">
                {t("settings.subtitle")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px]">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Vertical Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <CardContent className="p-4">
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab("team")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "team"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                      }`}
                  >
                    <Users className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.team")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.teamDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("organisation")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "organisation"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                      }`}
                  >
                    <GitBranch className="w-4 h-4" />
                    <div className="text-left">
                      <div>Organisation & Führung</div>
                      <div className="text-xs opacity-80">Org-Typ & Vorgesetzte</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("user-roles")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "user-roles"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                      }`}
                  >
                    <Shield className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.userRoles")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.rolesDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("configuration")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "configuration"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                      }`}
                  >
                    <SettingsIcon className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.configuration")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.configDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("profile-fields")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "profile-fields"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                      }`}
                  >
                    <FileText className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.profileFields")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.profileFieldsDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("catalogs")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "catalogs"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                      }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.catalogs")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.catalogsDesc")}</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("intervals")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "intervals"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                      }`}
                  >
                    <Clock className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.intervals")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.intervalsDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("medical-care")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "medical-care"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                      }`}
                  >
                    <Stethoscope className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.medicalCare")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.medicalDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("api-integration")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "api-integration"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                      }`}
                  >
                    <Plug className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.apiIntegration")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.apiIntegrationNav")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("invoices-billing")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "invoices-billing"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                      }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <div className="text-left">
                      <div>Invoices & Billing</div>
                      <div className="text-xs opacity-80">
                        Manage subscriptions
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("support")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "support"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                      }`}
                  >
                    <Headphones className="w-4 h-4" />
                    <div className="text-left">
                      <div>Support</div>
                      <div className="text-xs opacity-80">
                        Submit a ticket
                      </div>
                    </div>
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* Tab 1: Team Management */}
              <TabsContent value="team">
                <TeamTab
                  teamMembers={teamMembers}
                  teamMemberForm={teamMemberForm}
                  setTeamMemberForm={setTeamMemberForm}
                  isAddingTeamMember={isAddingTeamMember}
                  roles={roles}
                  handleAddTeamMember={handleAddTeamMember}
                  handleChangeTeamMemberRole={handleChangeTeamMemberRole}
                  fetchTeamMembers={fetchTeamMembers}
                />
              </TabsContent>

              {/* Organisation & Führung */}
              <TabsContent value="organisation">
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
                          onClick={() => setActiveTab("user-roles")}
                        >
                          Benutzerrollen & Berechtigungen
                        </button>{" "}
                        konfiguriert.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Linienorganisation */}
                        <button
                          type="button"
                          onClick={() => handleUpdateOrgType('linie')}
                          className={`text-left p-5 rounded-xl border-2 transition-all ${
                            orgType === 'linie'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-semibold text-sm">Linienorganisation</span>
                            <Badge variant={orgType === 'linie' ? 'default' : 'outline'}>
                              Wasserfall
                            </Badge>
                          </div>
                          {/* Visual diagram */}
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
                              orgType === 'linie' ? 'border-primary' : 'border-muted-foreground/30'
                            }`}>
                              {orgType === 'linie' && (
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
                          onClick={() => handleUpdateOrgType('matrix')}
                          className={`text-left p-5 rounded-xl border-2 transition-all ${
                            orgType === 'matrix'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-semibold text-sm">Matrixorganisation</span>
                            <Badge variant={orgType === 'matrix' ? 'default' : 'outline'}>
                              Matrix
                            </Badge>
                          </div>
                          {/* Visual diagram */}
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
                              orgType === 'matrix' ? 'border-primary' : 'border-muted-foreground/30'
                            }`}>
                              {orgType === 'matrix' && (
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Zwei Berichtslinien: disziplinarisch + fachlich (—&nbsp;—).
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
                        {orgType === 'matrix'
                          ? 'Weise jedem Teammitglied einen disziplinarischen und optional einen fachlichen Vorgesetzten zu.'
                          : 'Weise jedem Teammitglied seinen direkten Vorgesetzten zu.'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {teamMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          Keine Teammitglieder vorhanden. Füge zuerst Mitglieder unter{' '}
                          <button className="underline" onClick={() => setActiveTab('team')}>Team</button> hinzu.
                        </p>
                      ) : (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Mitarbeiter</TableHead>
                                <TableHead>Rolle</TableHead>
                                <TableHead>
                                  {orgType === 'matrix' ? 'Vorgesetzter (disziplinarisch)' : 'Vorgesetzter'}
                                </TableHead>
                                {orgType === 'matrix' && (
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
                                        value={member.line_manager_id || '__none__'}
                                        onValueChange={(val) =>
                                          handleUpdateManager(member.id, 'line_manager_id', val === '__none__' ? null : val)
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
                                              {(o.role === 'Admin' || o.role === 'Line Manager' || o.role === 'HSE Manager') ? ' ★' : ''}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    {orgType === 'matrix' && (
                                      <TableCell>
                                        <Select
                                          value={member.functional_manager_id || '__none__'}
                                          onValueChange={(val) =>
                                            handleUpdateManager(member.id, 'functional_manager_id', val === '__none__' ? null : val)
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
                                                {(o.role === 'Admin' || o.role === 'Line Manager' || o.role === 'HSE Manager') ? ' ★' : ''}
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
                      {orgType === 'linie' ? (
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
              </TabsContent>

              {/* Tab 2: User Roles (RBAC) */}
              <TabsContent value="user-roles">
                <UserRolesTab
                  customRolesData={customRolesData}
                  selectedRoleForEdit={selectedRoleForEdit}
                  setSelectedRoleForEdit={setSelectedRoleForEdit}
                  handleUpdateDetailedPermission={handleUpdateDetailedPermission}
                  handleCreateNewRole={handleCreateNewRole}
                  handleDeleteRoleEnhanced={handleDeleteRoleEnhanced}
                  handleUpdateRoleDescription={handleUpdateRoleDescription}
                  isRolesLoading={isRolesLoading}
                />
              </TabsContent>

              {/* Tab 3: Configuration */}
              <TabsContent value="configuration">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        {t("settings.locations")}
                      </CardTitle>
                      <CardDescription>
                        {t("settings.locationsDesc")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Quick Add Location */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter location name..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const input = e.currentTarget;
                                const value = input.value.trim();
                                if (value && companyId) {
                                  supabase
                                    .from("locations")
                                    .insert([
                                      { name: value, company_id: companyId },
                                    ])
                                    .select()
                                    .single()
                                    .then(({ data, error }) => {
                                      if (error) {
                                        toast({
                                          title: "Fehler",
                                          description: error.message,
                                          variant: "destructive",
                                        });
                                      } else {
                                        toast({
                                          title: "Gespeichert",
                                          description:
                                            "Location added successfully",
                                        });
                                        logAction({
                                          action: "create_location",
                                          targetType: "location",
                                          targetId: data?.id || null,
                                          targetName: value,
                                          details: { source: "quick_add" },
                                        });
                                        input.value = "";
                                        fetchAllData();
                                      }
                                    });
                                }
                              }
                            }}
                          />
                          <Button
                            onClick={(e) => {
                              const input = e.currentTarget
                                .previousElementSibling as HTMLInputElement;
                              const value = input?.value.trim();
                              if (value && companyId) {
                                supabase
                                  .from("locations")
                                  .insert([
                                    { name: value, company_id: companyId },
                                  ])
                                  .select()
                                  .single()
                                  .then(({ data, error }) => {
                                    if (error) {
                                      toast({
                                        title: "Fehler",
                                        description: error.message,
                                        variant: "destructive",
                                      });
                                    } else {
                                      toast({
                                        title: "Gespeichert",
                                        description:
                                          "Location added successfully",
                                      });
                                      logAction({
                                        action: "create_location",
                                        targetType: "location",
                                        targetId: data?.id || null,
                                        targetName: value,
                                        details: { source: "quick_add" },
                                      });
                                      if (input) input.value = "";
                                      fetchAllData();
                                    }
                                  });
                              }
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>

                        {/* Locations List */}
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Abteilungsleiter</TableHead>
                                <TableHead className="text-right">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {locations.length === 0 ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={2}
                                    className="text-center py-8 text-muted-foreground"
                                  >
                                    No locations found. Add your first location
                                    above.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                locations.map((loc) => (
                                  <TableRow key={loc.id}>
                                    <TableCell className="font-medium">
                                      {loc.name}
                                    </TableCell>
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
                                            setDeleteItem({
                                              ...loc,
                                              tableName: "locations",
                                            });
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

                  {/* Departments - Inline Add */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("settings.departments")}</CardTitle>
                      <CardDescription>
                        Manage departments - Used across the system in dropdown
                        menus
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Quick Add Department */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter department name..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const input = e.currentTarget;
                                const value = input.value.trim();
                                if (value && companyId) {
                                  supabase
                                    .from("departments")
                                    .insert([
                                      { name: value, company_id: companyId },
                                    ])
                                    .select()
                                    .single()
                                    .then(({ data, error }) => {
                                      if (error) {
                                        toast({
                                          title: "Fehler",
                                          description: error.message,
                                          variant: "destructive",
                                        });
                                      } else {
                                        toast({
                                          title: "Gespeichert",
                                          description:
                                            "Department added successfully",
                                        });
                                        logAction({
                                          action: "create_department",
                                          targetType: "department",
                                          targetId: data?.id || null,
                                          targetName: value,
                                          details: { source: "quick_add" },
                                        });
                                        input.value = "";
                                        fetchAllData();
                                      }
                                    });
                                }
                              }
                            }}
                          />
                          <Button
                            onClick={(e) => {
                              const input = e.currentTarget
                                .previousElementSibling as HTMLInputElement;
                              const value = input?.value.trim();
                              if (value && companyId) {
                                supabase
                                  .from("departments")
                                  .insert([
                                    { name: value, company_id: companyId },
                                  ])
                                  .select()
                                  .single()
                                  .then(({ data, error }) => {
                                    if (error) {
                                      toast({
                                        title: "Fehler",
                                        description: error.message,
                                        variant: "destructive",
                                      });
                                    } else {
                                      toast({
                                        title: "Gespeichert",
                                        description:
                                          "Department added successfully",
                                      });
                                      logAction({
                                        action: "create_department",
                                        targetType: "department",
                                        targetId: data?.id || null,
                                        targetName: value,
                                        details: { source: "quick_add" },
                                      });
                                      if (input) input.value = "";
                                      fetchAllData();
                                    }
                                  });
                              }
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>

                        {/* Departments List */}
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {departments.length === 0 ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={2}
                                    className="text-center py-8 text-muted-foreground"
                                  >
                                    No departments found. Add your first
                                    department above.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                departments.map((dept) => (
                                  <TableRow key={dept.id}>
                                    <TableCell className="font-medium">
                                      {dept.name}
                                    </TableCell>
                                    <TableCell>
                                      <Select
                                        value={deptManagers[dept.id] || "__none__"}
                                        onValueChange={async (val) => {
                                          const userId = val === "__none__" ? null : val;
                                          if (userId) {
                                            const { error: upsertErr } = await (supabase as any)
                                              .from("department_managers")
                                              .upsert(
                                                { department_id: dept.id, manager_user_id: userId, company_id: companyId, manager_type: "disciplinary" },
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
                                            setDeleteItem({
                                              ...dept,
                                              tableName: "departments",
                                            });
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

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GitBranch className="w-5 h-5" />
                        {t("settings.approvalProcess")}
                      </CardTitle>
                      <CardDescription>
                        {t("settings.approvalProcessDesc")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Add New Approval Workflow */}
                        <div className="p-4 border rounded-lg bg-muted/30">
                          <h4 className="font-medium mb-3">
                            {t("settings.addApprovalWorkflow")}
                          </h4>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <Label>{t("settings.department")}</Label>
                              <Select
                                onValueChange={(value) => {
                                  const dept = departments.find(
                                    (d) => d.id === value
                                  );
                                  if (
                                    dept &&
                                    !approvalWorkflows.find(
                                      (w) => w.department_id === value
                                    )
                                  ) {
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
                                  <SelectValue
                                    placeholder={t("settings.selectDepartment")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {departments
                                    .filter(
                                      (d) =>
                                        !approvalWorkflows.find(
                                          (w) => w.department_id === d.id
                                        )
                                    )
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

                        {/* Approval Workflows List */}
                        {approvalWorkflows.length > 0 ? (
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>
                                    {t("settings.department")}
                                  </TableHead>
                                  <TableHead>
                                    {t("settings.approver")}
                                  </TableHead>
                                  <TableHead className="text-right">
                                    {t("common.actions")}
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {approvalWorkflows.map((workflow) => (
                                  <TableRow key={workflow.id}>
                                    <TableCell className="font-medium">
                                      {workflow.department_name}
                                    </TableCell>
                                    <TableCell>
                                      <Select
                                        value={workflow.approver_id}
                                        onValueChange={(value) => {
                                          saveApprovalWorkflow(
                                            workflow.department_id,
                                            value
                                          );
                                        }}
                                      >
                                        <SelectTrigger className="w-[250px]">
                                          <SelectValue
                                            placeholder={t(
                                              "settings.selectApprover"
                                            )}
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
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
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          deleteApprovalWorkflow(workflow.id);
                                        }}
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

                  {/* Exposure Groups - Inline Add */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("settings.exposureGroups")}</CardTitle>
                      <CardDescription>
                        Manage exposure groups - Used across the system in
                        dropdown menus
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Quick Add Exposure Group */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter exposure group name..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const input = e.currentTarget;
                                const value = input.value.trim();
                                if (value && companyId) {
                                  supabase
                                    .from("exposure_groups")
                                    .insert([
                                      { name: value, company_id: companyId },
                                    ])
                                    .select()
                                    .single()
                                    .then(({ data, error }) => {
                                      if (error) {
                                        toast({
                                          title: "Fehler",
                                          description: error.message,
                                          variant: "destructive",
                                        });
                                      } else {
                                        toast({
                                          title: "Gespeichert",
                                          description:
                                            "Exposure group added successfully",
                                        });
                                        logAction({
                                          action: "create_exposure_group",
                                          targetType: "exposure_group",
                                          targetId: data?.id || null,
                                          targetName: value,
                                          details: { source: "quick_add" },
                                        });
                                        input.value = "";
                                        fetchAllData();
                                      }
                                    });
                                }
                              }
                            }}
                          />
                          <Button
                            onClick={(e) => {
                              const input = e.currentTarget
                                .previousElementSibling as HTMLInputElement;
                              const value = input?.value.trim();
                              if (value && companyId) {
                                supabase
                                  .from("exposure_groups")
                                  .insert([
                                    { name: value, company_id: companyId },
                                  ])
                                  .select()
                                  .single()
                                  .then(({ data, error }) => {
                                    if (error) {
                                      toast({
                                        title: "Fehler",
                                        description: error.message,
                                        variant: "destructive",
                                      });
                                    } else {
                                      toast({
                                        title: "Gespeichert",
                                        description:
                                          "Exposure group added successfully",
                                      });
                                      logAction({
                                        action: "create_exposure_group",
                                        targetType: "exposure_group",
                                        targetId: data?.id || null,
                                        targetName: value,
                                        details: { source: "quick_add" },
                                      });
                                      if (input) input.value = "";
                                      fetchAllData();
                                    }
                                  });
                              }
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>

                        {/* Exposure Groups List */}
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {exposureGroups.length === 0 ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={3}
                                    className="text-center py-8 text-muted-foreground"
                                  >
                                    No exposure groups found. Add your first
                                    group above.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                exposureGroups.map((group) => (
                                  <TableRow key={group.id}>
                                    <TableCell className="font-medium">
                                      {group.name}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {group.description || "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setCurrentTableName(
                                              "exposure_groups"
                                            );
                                            handleEdit(group);
                                          }}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setCurrentTableName(
                                              "exposure_groups"
                                            );
                                            setDeleteItem({
                                              ...group,
                                              tableName: "exposure_groups",
                                            });
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
                </div>
              </TabsContent>

              {/* Tab: Profile Fields */}
              <TabsContent value="profile-fields">
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <CardTitle>{t("settings.profileFieldsTitle")}</CardTitle>
                        <CardDescription>
                          {t("settings.profileFieldsSubtitle")}
                        </CardDescription>
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
                              {activeProfileTemplate
                                ? "Fields for the selected template"
                                : "Select a template to begin"}
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
                                <TableCell
                                  colSpan={4}
                                  className="text-center py-8 text-muted-foreground"
                                >
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
                                    {field.is_required && (
                                      <span className="text-destructive ml-1">*</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm text-muted-foreground">
                                    {field.field_name}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">
                                      {field.field_type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openProfileFieldDialog(field)}
                                          >
                                            <Pencil className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Edit</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteProfileField(field.id)}
                                          >
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
                      <DialogTitle>
                        {editingTemplate ? "Edit Template" : "Add Template"}
                      </DialogTitle>
                      <DialogDescription>
                        Create and manage profile field templates.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="template-name">Template name</Label>
                        <Input
                          id="template-name"
                          placeholder="e.g. Driver Template"
                          value={templateForm.name}
                          onChange={(event) =>
                            setTemplateForm({ name: event.target.value })
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={closeTemplateDialog}>
                        {t("common.cancel")}
                      </Button>
                      <Button onClick={saveTemplate}>
                        {editingTemplate ? t("common.update") : t("common.create")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Add/Edit Profile Field Dialog */}
                <Dialog open={isProfileFieldDialogOpen} onOpenChange={setIsProfileFieldDialogOpen}>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingProfileField
                          ? t("settings.editItem")
                          : t("settings.addProfileField")}
                      </DialogTitle>
                      <DialogDescription>
                        {t("settings.profileFieldsSubtitle")}
                      </DialogDescription>
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
                            setProfileFieldForm((prev) => ({
                              ...prev,
                              fieldName: event.target.value,
                            }))
                          }
                          disabled={!!editingProfileField}
                          className={editingProfileField ? "opacity-50" : ""}
                        />
                        {editingProfileField && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Field name cannot be changed after creation
                          </p>
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
                            setProfileFieldForm((prev) => ({
                              ...prev,
                              fieldLabel: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="profile-field-type">{t("settings.fieldType")}</Label>
                        <Select
                          value={profileFieldForm.fieldType}
                          onValueChange={(value) =>
                            setProfileFieldForm((prev) => ({
                              ...prev,
                              fieldType: value,
                            }))
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
                            setProfileFieldForm((prev) => ({
                              ...prev,
                              isRequired: Boolean(checked),
                            }))
                          }
                        />
                        <Label htmlFor="profile-field-required">Required field</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="profile-field-extracted"
                          checked={profileFieldForm.extractedFromResume}
                          onCheckedChange={(checked) =>
                            setProfileFieldForm((prev) => ({
                              ...prev,
                              extractedFromResume: Boolean(checked),
                            }))
                          }
                        />
                        <Label htmlFor="profile-field-extracted">Extract from resume</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={closeProfileFieldDialog}
                        disabled={isSubmittingProfileField}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        onClick={saveProfileField}
                        disabled={isSubmittingProfileField}
                      >
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
                      <AlertDialogDescription>
                        This will remove the template and all of its fields.
                      </AlertDialogDescription>
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
              </TabsContent>

              {/* Tab 4: Catalogs & Content */}
              <TabsContent value="catalogs">
                <div className="space-y-6">
                  <Card id="settings-hazard-categories">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle>{t("settings.hazardCategories")}</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadPredefinedHazardCategories}
                        >
                          Load Predefined Values
                        </Button>
                      </div>
                      <CardDescription>
                        {t("settings.hazardCategoriesDesc")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Quick Add Custom Category */}
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
                                    .insert([
                                      {
                                        name: value,
                                        company_id: companyId,
                                        is_predefined: false,
                                      },
                                    ]);
                                  if (error) {
                                    toast({
                                      title: "Fehler",
                                      description: error.message,
                                      variant: "destructive",
                                    });
                                  } else {
                                    toast({
                                      title: "Gespeichert",
                                      description:
                                        "Category added successfully",
                                    });
                                    input.value = "";
                                    fetchAllData();
                                  }
                                }
                              }
                            }}
                          />
                          <Button
                            onClick={async (e) => {
                              const input = e.currentTarget
                                .previousElementSibling as HTMLInputElement;
                              const value = input?.value.trim();
                              if (value && companyId) {
                                const { error } = await supabase
                                  .from("risk_categories")
                                  .insert([
                                    {
                                      name: value,
                                      company_id: companyId,
                                      is_predefined: false,
                                    },
                                  ]);
                                if (error) {
                                  toast({
                                    title: "Fehler",
                                    description: error.message,
                                    variant: "destructive",
                                  });
                                } else {
                                  toast({
                                    title: "Gespeichert",
                                    description: "Category added successfully",
                                  });
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
                                <TableHead className="text-right">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {/* Custom Categories */}
                              {riskCategories
                                .filter(
                                  (c) =>
                                    ![
                                      "Low",
                                      "Medium",
                                      "High",
                                      "Very High",
                                    ].includes(c.name)
                                )
                                .map((cat) => (
                                  <TableRow key={cat.id}>
                                    <TableCell className="font-medium">
                                      {cat.name}
                                    </TableCell>
                                    <TableCell>
                                      <Badge>{t("settings.custom")}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setCurrentTableName(
                                              "risk_categories"
                                            );
                                            handleEdit(cat);
                                          }}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            setDeleteItem({
                                              ...cat,
                                              tableName: "risk_categories",
                                            })
                                          }
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

                  {/* Measure Building Blocks - Inline Add */}
                  <Card id="settings-measure-building-blocks">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="w-5 h-5" />
                          {t("settings.measureBuildingBlocks")}
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadPredefinedMeasureBuildingBlocks}
                        >
                          Load Predefined Values
                        </Button>
                      </div>
                      <CardDescription>
                        {t("settings.measureBuildingBlocksDesc")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Quick Add Measure Building Block */}
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
                                    .insert([
                                      {
                                        name: value,
                                        company_id: companyId,
                                      },
                                    ]);
                                  if (error) {
                                    toast({
                                      title: "Fehler",
                                      description: error.message,
                                      variant: "destructive",
                                    });
                                  } else {
                                    toast({
                                      title: "Gespeichert",
                                      description: `Measure building block "${value}" added`,
                                    });
                                    input.value = "";
                                    fetchAllData();
                                  }
                                }
                              }
                            }}
                          />
                          <Button
                            onClick={async (e) => {
                              const input = e.currentTarget
                                .previousElementSibling as HTMLInputElement;
                              const value = input?.value.trim();
                              if (value && companyId) {
                                const { error } = await supabase
                                  .from("measure_building_blocks")
                                  .insert([
                                    {
                                      name: value,
                                      company_id: companyId,
                                    },
                                  ]);
                                if (error) {
                                  toast({
                                    title: "Fehler",
                                    description: error.message,
                                    variant: "destructive",
                                  });
                                } else {
                                  toast({
                                    title: "Gespeichert",
                                    description: `Measure building block "${value}" added`,
                                  });
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
                          Add reusable measure templates like Elimination,
                          Substitution, Engineering Controls, etc.
                        </p>

                        {/* Measure Building Blocks List */}
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {measureBuildingBlocks.length === 0 ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={2}
                                    className="text-center py-8 text-muted-foreground"
                                  >
                                    No measure building blocks found. Add your
                                    first block above.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                measureBuildingBlocks.map((block) => (
                                  <TableRow key={block.id}>
                                    <TableCell className="font-medium">
                                      {block.name}
                                    </TableCell>
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
                                              toast({
                                                title: "Fehler",
                                                description: error.message,
                                                variant: "destructive",
                                              });
                                            } else {
                                              toast({
                                                title: "Gespeichert",
                                                description:
                                                  "Measure building block deleted",
                                              });
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

                  {/* Risk Matrix Label - Moved from Intervals tab */}

                  {/* ISO Selection moved to Intervals tab */}
                </div>
              </TabsContent>

              {/* Tab 5: Intervals and Deadlines */}
              <TabsContent value="intervals">
                <div className="space-y-6">
                  {/* ISO Selection & Criteria - Moved from Catalogs */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl font-bold">
                            Audits & checklists
                          </CardTitle>
                        </div>
                        <Badge className="bg-green-600 text-white hover:bg-green-700 px-4 py-1 text-sm">
                          Active
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* ISO Selection */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-base">
                              ISO Selection
                            </h4>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  // Select all predefined ISOs
                                  const allISOIds = predefinedISOs.map(
                                    (iso) => iso.id
                                  );

                                  // Save all to database
                                  for (const iso of predefinedISOs) {
                                    if (!selectedISOs.includes(iso.id)) {
                                      await saveISOStandard(
                                        iso.id,
                                        iso.name,
                                        false
                                      );
                                      await fetchIsoCriteria(iso.id);
                                    }
                                  }

                                  setSelectedISOs(allISOIds);

                                  toast({
                                    title: "Gespeichert",
                                    description: "All ISOs selected and saved",
                                  });
                                }}
                              >
                                Select All
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={async () => {
                                  toast({
                                    title: "Saved",
                                    description:
                                      "ISO selection saved successfully",
                                  });
                                  await fetchISOStandards();
                                }}
                              >
                                <Save className="w-4 h-4 mr-2" />
                                Save
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {predefinedISOs.map((iso) => (
                              <div
                                key={iso.id}
                                className={`flex items-center gap-2 px-4 py-2 rounded border-2 cursor-pointer transition-colors ${selectedISOs.includes(iso.id)
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-white border-gray-300 hover:border-blue-400"
                                  }`}
                                onClick={async () => {
                                  const isSelected = selectedISOs.includes(
                                    iso.id
                                  );
                                  if (!isSelected) {
                                    await saveISOStandard(
                                      iso.id,
                                      iso.name,
                                      false
                                    );
                                    setSelectedISOs([...selectedISOs, iso.id]);
                                    setActiveISOForCriteria(iso.id); // Set as active ISO
                                    await fetchIsoCriteria(iso.id);
                                    toast({
                                      title: "ISO Selected",
                                      description: `${iso.name} has been activated`,
                                    });
                                  } else {
                                    await deleteISOStandard(iso.id);
                                    const newSelectedISOs = selectedISOs.filter((id) => id !== iso.id);
                                    setSelectedISOs(newSelectedISOs);
                                    // If we're deselecting the active ISO, set the first remaining ISO as active
                                    if (activeISOForCriteria === iso.id) {
                                      setActiveISOForCriteria(newSelectedISOs.length > 0 ? newSelectedISOs[0] : null);
                                    }
                                    toast({
                                      title: "ISO Deselected",
                                      description: `${iso.name} has been deactivated`,
                                    });
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  id={iso.id}
                                  checked={selectedISOs.includes(iso.id)}
                                  onChange={() => { }}
                                  className="w-4 h-4 cursor-pointer"
                                />
                                <label
                                  htmlFor={iso.id}
                                  className="cursor-pointer font-medium"
                                >
                                  {iso.name.replace("ISO ", "ISO ")}
                                </label>
                                <span className="text-sm">
                                  {selectedISOs.includes(iso.id)
                                    ? "active"
                                    : "active"}
                                </span>
                              </div>
                            ))}

                            {/* Custom ISOs Display */}
                            {customISOs.map((iso, index) => (
                              <div
                                key={index}
                                className={`flex items-center gap-2 px-4 py-2 rounded border-2 cursor-pointer transition-colors ${selectedISOs.includes(iso)
                                  ? "bg-white text-black border-gray-400"
                                  : "bg-white border-gray-300"
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedISOs.includes(iso)}
                                  onChange={async (e) => {
                                    if (e.target.checked) {
                                      await saveISOStandard(iso, iso, true);
                                      setSelectedISOs([...selectedISOs, iso]);
                                    } else {
                                      await deleteISOStandard(iso);
                                      setSelectedISOs(
                                        selectedISOs.filter((id) => id !== iso)
                                      );
                                    }
                                  }}
                                  className="w-4 h-4 cursor-pointer"
                                />
                                <span className="font-medium">{iso}</span>
                                <span className="text-sm">active</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto h-6 w-6 p-0"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await deleteISOStandard(iso);
                                    setCustomISOs(
                                      customISOs.filter((_, i) => i !== index)
                                    );
                                    setSelectedISOs(
                                      selectedISOs.filter((id) => id !== iso)
                                    );
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Add Custom ISO */}
                        <div className="flex gap-2 max-w-xl">
                          <Input
                            placeholder="Add custom ISO"
                            value={newCustomISO}
                            onChange={(e) => setNewCustomISO(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === "Enter" && newCustomISO.trim()) {
                                await saveISOStandard(
                                  newCustomISO.trim(),
                                  newCustomISO.trim(),
                                  true
                                );
                                setCustomISOs([
                                  ...customISOs,
                                  newCustomISO.trim(),
                                ]);
                                setSelectedISOs([
                                  ...selectedISOs,
                                  newCustomISO.trim(),
                                ]);
                                setNewCustomISO("");
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            onClick={async () => {
                              if (newCustomISO.trim()) {
                                await saveISOStandard(
                                  newCustomISO.trim(),
                                  newCustomISO.trim(),
                                  true
                                );
                                setCustomISOs([
                                  ...customISOs,
                                  newCustomISO.trim(),
                                ]);
                                setSelectedISOs([
                                  ...selectedISOs,
                                  newCustomISO.trim(),
                                ]);
                                setNewCustomISO("");
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ISO Criteria Management */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-6">
                        {/* Criteria For Tabs and View Toggle */}
                        {selectedISOs.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No ISO selected</p>
                            <p className="text-sm">
                              Please select an ISO above
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Criteria For: Tabs and Select All/Save Buttons */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="font-semibold">
                                  Criteria for:
                                </span>
                                <div className="flex gap-2">
                                  {selectedISOs.map((isoId) => {
                                    const isoCodeMap: {
                                      [key: string]: string;
                                    } = {
                                      ISO_45001: "ISO 45001",
                                      ISO_14001: "ISO 14001",
                                      ISO_9001: "ISO 9001",
                                    };
                                    const displayName =
                                      isoCodeMap[isoId] || isoId;
                                    const isActive = activeISOForCriteria === isoId;
                                    return (
                                      <Button
                                        key={isoId}
                                        variant="outline"
                                        size="sm"
                                        className={`${isActive
                                          ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                                          : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
                                          }`}
                                        onClick={() => setActiveISOForCriteria(isoId)}
                                      >
                                        {displayName}
                                      </Button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Only select all for the active ISO
                                    if (!activeISOForCriteria) return;

                                    const allSectionKeys: string[] = [];
                                    const allCriteriaIds: string[] = [];

                                    const isoCodeMap: {
                                      [key: string]: string;
                                    } = {
                                      ISO_45001: "ISO_45001",
                                      ISO_14001: "ISO_14001",
                                      ISO_9001: "ISO_9001",
                                    };
                                    const isoCode = isoCodeMap[activeISOForCriteria];
                                    if (!isoCode) return;

                                    const sections = isoCriteriaData[isoCode];
                                    if (!sections) return;

                                    const groupedSections: {
                                      [key: string]: any[];
                                    } = {};
                                    sections?.forEach((section: any) => {
                                      section.subsections?.forEach(
                                        (subsection: any) => {
                                          const mainNumber =
                                            subsection.subsection_number?.split(
                                              "."
                                            )[0] || section.section_number;
                                          if (!groupedSections[mainNumber]) {
                                            groupedSections[mainNumber] = [];
                                          }
                                          groupedSections[mainNumber].push(
                                            subsection
                                          );
                                          // Add subsection ID to selected criteria
                                          allCriteriaIds.push(
                                            `${isoCode}-${subsection.id}`
                                          );
                                        }
                                      );
                                      // Add main section ID
                                      allCriteriaIds.push(
                                        `${isoCode}-section-${section.section_number}`
                                      );
                                    });

                                    Object.keys(groupedSections).forEach(
                                      (sectionNum) => {
                                        allSectionKeys.push(
                                          `${isoCode}-${sectionNum}`
                                        );
                                      }
                                    );

                                    // Expand all sections and add to selected criteria
                                    setExpandedSections((prev) => {
                                      const filtered = prev.filter(k => !k.startsWith(`${isoCode}-`));
                                      return [...filtered, ...allSectionKeys];
                                    });
                                    setSelectedCriteria((prev) => {
                                      const filtered = prev.filter(id => !id.startsWith(`${isoCode}-`));
                                      return [...filtered, ...allCriteriaIds];
                                    });

                                    // Save to localStorage
                                    if (companyId) {
                                      const newCriteria = selectedCriteria.filter(id => !id.startsWith(`${isoCode}-`)).concat(allCriteriaIds);
                                      localStorage.setItem(
                                        `selectedCriteria_${companyId}`,
                                        JSON.stringify(newCriteria)
                                      );
                                      console.log(
                                        "Saved",
                                        allCriteriaIds.length,
                                        "criteria to localStorage"
                                      );
                                    }

                                    toast({
                                      title: "All Selected",
                                      description: `All criteria for ${isoCodeMap[activeISOForCriteria] || activeISOForCriteria} selected (${allCriteriaIds.length} items)`,
                                    });
                                  }}
                                >
                                  Select All
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => {
                                    // Save to localStorage
                                    if (companyId) {
                                      localStorage.setItem(
                                        `selectedCriteria_${companyId}`,
                                        JSON.stringify(selectedCriteria)
                                      );
                                      console.log(
                                        "Saved",
                                        selectedCriteria.length,
                                        "criteria to localStorage"
                                      );
                                    }

                                    toast({
                                      title: "Saved",
                                      description: `Criteria selection saved (${selectedCriteria.length} items)`,
                                    });
                                  }}
                                >
                                  <Save className="w-4 h-4 mr-2" />
                                  Save
                                </Button>
                              </div>
                            </div>

                            {/* Criteria List */}
                            <div className="space-y-1">
                              {activeISOForCriteria ? (() => {
                                const isoCodeMap: { [key: string]: string } = {
                                  ISO_45001: "ISO_45001",
                                  ISO_14001: "ISO_14001",
                                  ISO_9001: "ISO_9001",
                                };

                                const isoCode = isoCodeMap[activeISOForCriteria];
                                if (!isoCode) return null;

                                const sections = isoCriteriaData[isoCode];
                                if (!sections || sections.length === 0)
                                  return (
                                    <div className="text-center py-8 text-muted-foreground">
                                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                      <p>No criteria available for this ISO</p>
                                    </div>
                                  );

                                // Group subsections by their main section number
                                const groupedSections: {
                                  [key: string]: any[];
                                } = {};

                                sections?.forEach((section: any) => {
                                  section.subsections?.forEach(
                                    (subsection: any) => {
                                      const mainNumber =
                                        subsection.subsection_number?.split(
                                          "."
                                        )[0] || section.section_number;
                                      if (!groupedSections[mainNumber]) {
                                        groupedSections[mainNumber] = [];
                                      }
                                      groupedSections[mainNumber].push(
                                        subsection
                                      );
                                    }
                                  );
                                });

                                return Object.keys(groupedSections)
                                  .sort((a, b) => parseFloat(a) - parseFloat(b))
                                  .map((sectionNum) => {
                                    const subsections =
                                      groupedSections[sectionNum];
                                    const isExpanded =
                                      expandedSections.includes(
                                        `${isoCode}-${sectionNum}`
                                      );

                                    return (
                                      <div key={`${isoCode}-${sectionNum}`}>
                                        {/* Main Section */}
                                        <div
                                          className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 border-b cursor-pointer"
                                          onClick={() => {
                                            setExpandedSections((prev) =>
                                              isExpanded
                                                ? prev.filter(
                                                  (k) =>
                                                    k !==
                                                    `${isoCode}-${sectionNum}`
                                                )
                                                : [
                                                  ...prev,
                                                  `${isoCode}-${sectionNum}`,
                                                ]
                                            );
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            className="w-4 h-4 mt-1 cursor-pointer"
                                            checked={selectedCriteria.includes(
                                              `${isoCode}-section-${sectionNum}`
                                            )}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              const criteriaId = `${isoCode}-section-${sectionNum}`;
                                              const newCriteria = e.target
                                                .checked
                                                ? [
                                                  ...selectedCriteria,
                                                  criteriaId,
                                                ]
                                                : selectedCriteria.filter(
                                                  (id) => id !== criteriaId
                                                );
                                              setSelectedCriteria(newCriteria);

                                              // Auto-save to localStorage
                                              if (companyId) {
                                                localStorage.setItem(
                                                  `selectedCriteria_${companyId}`,
                                                  JSON.stringify(newCriteria)
                                                );
                                              }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                          <div className="flex-1">
                                            <div className="font-medium text-sm">
                                              {sectionNum}{" "}
                                              {sections.find(
                                                (s: any) =>
                                                  s.section_number ===
                                                  sectionNum
                                              )?.title || subsections[0]?.title}
                                            </div>
                                          </div>
                                          {/* Delete button for custom sections (not standard 1-7) */}
                                          {!/^[1-7]$/.test(sectionNum) && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                // Delete all subsections in this group by their IDs
                                                const subsectionIds = subsections.map((s: any) => s.id);
                                                handleDeleteCriteriaBatch(subsectionIds);
                                              }}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          )}
                                        </div>

                                        {/* Subsections */}
                                        {isExpanded &&
                                          subsections.map((subsection: any) => {
                                            const questionsExpanded = expandedQuestions.has(subsection.id);
                                            return (
                                              <div key={subsection.id}>
                                                <div
                                                  className="flex items-start gap-3 px-3 py-2 pl-10 hover:bg-gray-50 border-b bg-gray-50/50 cursor-pointer"
                                                  onClick={() => {
                                                    const newExpanded = new Set(expandedQuestions);
                                                    if (questionsExpanded) {
                                                      newExpanded.delete(subsection.id);
                                                    } else {
                                                      newExpanded.add(subsection.id);
                                                    }
                                                    setExpandedQuestions(newExpanded);
                                                  }}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    className="w-4 h-4 mt-1 cursor-pointer"
                                                    checked={selectedCriteria.includes(
                                                      `${isoCode}-${subsection.id}`
                                                    )}
                                                    onChange={(e) => {
                                                      const criteriaId = `${isoCode}-${subsection.id}`;
                                                      const newCriteria = e.target
                                                        .checked
                                                        ? [
                                                          ...selectedCriteria,
                                                          criteriaId,
                                                        ]
                                                        : selectedCriteria.filter(
                                                          (id) =>
                                                            id !== criteriaId
                                                        );
                                                      setSelectedCriteria(
                                                        newCriteria
                                                      );

                                                      // Auto-save to localStorage
                                                      if (companyId) {
                                                        localStorage.setItem(
                                                          `selectedCriteria_${companyId}`,
                                                          JSON.stringify(
                                                            newCriteria
                                                          )
                                                        );
                                                      }
                                                    }}
                                                  />
                                                  {subsection.questions && subsection.questions.length > 0 && (
                                                    <div className="text-gray-400">
                                                      {questionsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </div>
                                                  )}
                                                  <div className="flex-1">
                                                    <div className="font-medium text-sm">
                                                      {subsection.subsection_number}{" "}
                                                      {language === "en"
                                                        ? subsection.title_en ||
                                                        subsection.title
                                                        : subsection.title}
                                                    </div>
                                                  </div>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteCriterion(subsection.id);
                                                    }}
                                                  >
                                                    <Trash2 className="w-4 h-4" />
                                                  </Button>
                                                </div>

                                                {/* Questions under this subsection */}
                                                {questionsExpanded && subsection.questions && subsection.questions.length > 0 && (
                                                  <div className="ml-16 border-l-2 border-gray-200 pl-4">
                                                    {subsection.questions.map((question: any) => (
                                                      <div
                                                        key={question.id}
                                                        className="py-2 text-sm text-gray-600"
                                                      >
                                                        <span className="font-medium text-gray-400 mr-2">
                                                          •
                                                        </span>
                                                        {language === "en"
                                                          ? question.question_text_en || question.question_text
                                                          : question.question_text}
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                      </div>
                                    );
                                  });
                              })() : (
                                <div className="text-center py-8 text-muted-foreground">
                                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                  <p>Please select an ISO above to view its criteria</p>
                                </div>
                              )}
                            </div>

                            {/* Add Criterion Inputs */}
                            <div className="flex gap-2 pt-4">
                              <Input
                                placeholder="Section.Subsection (e.g. 1.8, 3.5)"
                                className="w-64"
                                value={newCriterionId}
                                onChange={(e) => setNewCriterionId(e.target.value)}
                              />
                              <Input
                                placeholder="Enter criterion title"
                                className="flex-1"
                                value={newCriterionText}
                                onChange={(e) => setNewCriterionText(e.target.value)}
                              />
                              <Button
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={handleAddCustomCriterion}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add
                              </Button>
                            </div>

                            {/* Note */}
                            <div className="pt-4 text-sm text-muted-foreground">
                              <span className="font-semibold">Note:</span>{" "}
                              Sub-points of the selected criteria are
                              automatically generated as individual checklist
                              items in the audit and can be checked off
                              individually.
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Risikomatrix-Labels
        </CardTitle>
        <CardDescription>
          Passe Achsen- und Ergebnisbeschriftungen an eure Nomenklatur an.
        </CardDescription>
      </div>
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={() => saveCompanySettings({ risk_matrix_labels: companySettings.risk_matrix_labels })}
        disabled={savingSettings}
      >
        {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Speichern
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-6 p-6 bg-white rounded-lg border">
      <div className="grid grid-cols-3 gap-6">
        {/* Likelihood Column */}
        <div>
          <h4 className="font-medium mb-3">Likelihood</h4>
          <div className="space-y-2">
            {companySettings.risk_matrix_labels.likelihood.map((label, idx) => (
              <Input
                key={`likelihood-${idx}`}
                value={label}
                onChange={(e) => {
                  const updated = [...companySettings.risk_matrix_labels.likelihood];
                  updated[idx] = e.target.value;
                  setCompanySettings((prev) => ({
                    ...prev,
                    risk_matrix_labels: { ...prev.risk_matrix_labels, likelihood: updated },
                  }));
                }}
                className="bg-white border-gray-300"
              />
            ))}
          </div>
        </div>

        {/* Severity Column */}
        <div>
          <h4 className="font-medium mb-3">Severity</h4>
          <div className="space-y-2">
            {companySettings.risk_matrix_labels.severity.map((label, idx) => (
              <Input
                key={`severity-${idx}`}
                value={label}
                onChange={(e) => {
                  const updated = [...companySettings.risk_matrix_labels.severity];
                  updated[idx] = e.target.value;
                  setCompanySettings((prev) => ({
                    ...prev,
                    risk_matrix_labels: { ...prev.risk_matrix_labels, severity: updated },
                  }));
                }}
                className="bg-white border-gray-300"
              />
            ))}
          </div>
        </div>

        {/* Result Column */}
        <div>
          <h4 className="font-medium mb-3">Result</h4>
          <div className="space-y-2">
            {companySettings.risk_matrix_labels.result.map((label, idx) => (
              <Input
                key={`result-${idx}`}
                value={label}
                onChange={(e) => {
                  const updated = [...companySettings.risk_matrix_labels.result];
                  updated[idx] = e.target.value;
                  setCompanySettings((prev) => ({
                    ...prev,
                    risk_matrix_labels: { ...prev.risk_matrix_labels, result: updated },
                  }));
                }}
                className="bg-white border-gray-300"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Color Configuration */}
      <div className="grid grid-cols-4 gap-4 pt-4 border-t">
        {[
          { key: "low", label: "Farbe: Niedrig", tag: "low" },
          { key: "medium", label: "Farbe: Mittel", tag: "medium" },
          { key: "high", label: "Farbe: Hoch", tag: "high" },
          { key: "very_high", label: "Farbe: Sehr hoch", tag: "very high" },
        ].map((c) => (
          <div key={c.key}>
            <label className="text-sm mb-2 block">
              {c.label} <span className="text-red-600">{c.tag}</span>
            </label>
            <div className="relative h-12 rounded border-2 border-gray-300 overflow-hidden">
              <input
                type="color"
                value={(companySettings.risk_matrix_labels.colors as any)[c.key] || "#22c55e"}
                onChange={(e) => {
                  const updatedColors = { ...companySettings.risk_matrix_labels.colors, [c.key]: e.target.value };
                  setCompanySettings((prev) => ({
                    ...prev,
                    risk_matrix_labels: { ...prev.risk_matrix_labels, colors: updatedColors },
                  }));
                }}
                className="absolute inset-0 w-full h-full cursor-pointer border-0"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Risk Assessment Intervals
        </CardTitle>
        <CardDescription>
          Set up recurring risk assessment schedules
        </CardDescription>
      </div>
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={() => saveCompanySettings({ gbu_intervals: companySettings.gbu_intervals, audit_intervals: companySettings.audit_intervals })}
        disabled={savingSettings}
      >
        {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Speichern
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-3">
          Prüfintervalle & Fälligkeiten
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Define one or more interval options for GBU and Audits.
        </p>

        {/* GBU Intervals */}
        <div className="mb-4">
          <Label className="mb-2 block">
            GBU intervals (months)
          </Label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {companySettings.gbu_intervals.map((interval, idx) => (
              <div key={`gbu-${idx}`} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
                <span className="text-sm">{interval} mo</span>
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    const updated = companySettings.gbu_intervals.filter((_, i) => i !== idx);
                    setCompanySettings((prev) => ({ ...prev, gbu_intervals: updated }));
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 12"
              type="number"
              className="max-w-[200px]"
              value={newGbuInterval}
              onChange={(e) => setNewGbuInterval(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newGbuInterval.trim()) {
                  const val = parseInt(newGbuInterval, 10);
                  if (!isNaN(val) && !companySettings.gbu_intervals.includes(val)) {
                    setCompanySettings((prev) => ({ ...prev, gbu_intervals: [...prev.gbu_intervals, val].sort((a, b) => a - b) }));
                  }
                  setNewGbuInterval("");
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => {
                const val = parseInt(newGbuInterval, 10);
                if (!isNaN(val) && !companySettings.gbu_intervals.includes(val)) {
                  setCompanySettings((prev) => ({ ...prev, gbu_intervals: [...prev.gbu_intervals, val].sort((a, b) => a - b) }));
                }
                setNewGbuInterval("");
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Audit Intervals */}
        <div>
          <Label className="mb-2 block">
            Audit intervals (months)
          </Label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {companySettings.audit_intervals.map((interval, idx) => (
              <div key={`audit-${idx}`} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
                <span className="text-sm">{interval} mo</span>
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    const updated = companySettings.audit_intervals.filter((_, i) => i !== idx);
                    setCompanySettings((prev) => ({ ...prev, audit_intervals: updated }));
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 12"
              type="number"
              className="max-w-[200px]"
              value={newAuditInterval}
              onChange={(e) => setNewAuditInterval(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newAuditInterval.trim()) {
                  const val = parseInt(newAuditInterval, 10);
                  if (!isNaN(val) && !companySettings.audit_intervals.includes(val)) {
                    setCompanySettings((prev) => ({ ...prev, audit_intervals: [...prev.audit_intervals, val].sort((a, b) => a - b) }));
                  }
                  setNewAuditInterval("");
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => {
                const val = parseInt(newAuditInterval, 10);
                if (!isNaN(val) && !companySettings.audit_intervals.includes(val)) {
                  setCompanySettings((prev) => ({ ...prev, audit_intervals: [...prev.audit_intervals, val].sort((a, b) => a - b) }));
                }
                setNewAuditInterval("");
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Logic
        </CardTitle>
        <CardDescription>
          Set up automated notifications and reminders
        </CardDescription>
      </div>
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={() => saveCompanySettings({ notification_settings: companySettings.notification_settings })}
        disabled={savingSettings}
      >
        {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Speichern
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-3">
          Benachrichtigungslogik
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Define reminders in days before due dates
        </p>

        <div className="grid grid-cols-2 gap-6">
          {/* Examinations */}
          <div>
            <Label className="mb-2 block">
              Examinations (days before)
            </Label>
            <Input
              type="number"
              value={companySettings.notification_settings.examinations_days}
              onChange={(e) => setCompanySettings((prev) => ({
                ...prev,
                notification_settings: { ...prev.notification_settings, examinations_days: Number(e.target.value) },
              }))}
            />
          </div>

          {/* Measures */}
          <div>
            <Label className="mb-2 block">
              Measures (days before)
            </Label>
            <Input
              type="number"
              value={companySettings.notification_settings.measures_days}
              onChange={(e) => setCompanySettings((prev) => ({
                ...prev,
                notification_settings: { ...prev.notification_settings, measures_days: Number(e.target.value) },
              }))}
            />
          </div>

          {/* Qualifications */}
          <div>
            <Label className="mb-2 block">
              Qualifications (days before)
            </Label>
            <Input
              type="number"
              value={companySettings.notification_settings.qualifications_days}
              onChange={(e) => setCompanySettings((prev) => ({
                ...prev,
                notification_settings: { ...prev.notification_settings, qualifications_days: Number(e.target.value) },
              }))}
            />
          </div>

          {/* Audits */}
          <div>
            <Label className="mb-2 block">
              Audits (days before)
            </Label>
            <Input
              type="number"
              value={companySettings.notification_settings.audits_days}
              onChange={(e) => setCompanySettings((prev) => ({
                ...prev,
                notification_settings: { ...prev.notification_settings, audits_days: Number(e.target.value) },
              }))}
            />
          </div>

          {/* GBU review */}
          <div>
            <Label className="mb-2 block">
              GBU review (days before)
            </Label>
            <Input
              type="number"
              value={companySettings.notification_settings.gbu_review_days}
              onChange={(e) => setCompanySettings((prev) => ({
                ...prev,
                notification_settings: { ...prev.notification_settings, gbu_review_days: Number(e.target.value) },
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
                </div>
              </TabsContent>

              {/* Tab 6: Occupational Medical Care */}
              <TabsContent value="medical-care">
                <MedicalCareTab
                  selectedGInvestigations={selectedGInvestigations}
                  toggleGInvestigation={toggleGInvestigation}
                  toggleSelectAll={toggleSelectAll}
                  isAllSelected={isAllSelected}
                  saveGInvestigations={saveGInvestigations}
                />
              </TabsContent>

              {/* Tab 7: API Integration */}
              <TabsContent value="api-integration">
                <ApiIntegrationTab
                  apiToken={apiToken}
                  showApiToken={showApiToken}
                  setShowApiToken={setShowApiToken}
                  isGeneratingToken={isGeneratingToken}
                  externalSystems={externalSystems}
                  isAddSystemDialogOpen={isAddSystemDialogOpen}
                  setIsAddSystemDialogOpen={setIsAddSystemDialogOpen}
                  newSystemForm={newSystemForm}
                  setNewSystemForm={setNewSystemForm}
                  isAddingSystem={isAddingSystem}
                  generateApiToken={generateApiToken}
                  copyApiToken={copyApiToken}
                  addExternalSystem={addExternalSystem}
                  deleteExternalSystem={deleteExternalSystem}
                  testExternalSystem={testExternalSystem}
                />
              </TabsContent>


              {/* Tab 8: Invoices & Billing */}
              <TabsContent value="invoices-billing">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Receipt className="w-5 h-5" />
                          Invoices & Billing
                        </CardTitle>
                        <CardDescription>
                          View your recent invoices and billing information
                        </CardDescription>
                      </div>
                      <Button onClick={() => navigate("/invoices")} variant="outline">
                        <Receipt className="w-4 h-4 mr-2" />
                        View All Invoices
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentInvoices.length > 0 ? (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {recentInvoices.map((invoice: any) => (
                                <TableRow key={invoice.invoice_number}>
                                  <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                                  <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {invoice.currency === "USD" ? "$" : invoice.currency === "EUR" ? "€" : ""}
                                    {invoice.total.toFixed(2)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={invoice.status === "paid" ? "default" : invoice.status === "pending" ? "secondary" : "destructive"}>
                                      {invoice.status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="p-6 border rounded-lg bg-muted/30 text-center">
                          <Receipt className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="text-muted-foreground">No recent invoices available.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 9: Support */}
              <TabsContent value="support">
                <SupportTab
                  ticketForm={ticketForm}
                  setTicketForm={setTicketForm}
                  isSubmittingTicket={isSubmittingTicket}
                  myTickets={myTickets}
                  submitTicket={submitTicket}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}

