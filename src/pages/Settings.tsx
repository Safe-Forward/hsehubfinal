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
import { OrganisationTab } from "@/components/settings/tabs/OrganisationTab";
import { ConfigurationTab } from "@/components/settings/tabs/ConfigurationTab";
import { ProfileFieldsTab } from "@/components/settings/tabs/ProfileFieldsTab";
import { CatalogsTab } from "@/components/settings/tabs/CatalogsTab";
import { IntervalsTab } from "@/components/settings/tabs/IntervalsTab";
import { InvoicesBillingTab } from "@/components/settings/tabs/InvoicesBillingTab";
import { DangerZoneTab } from "@/components/settings/tabs/DangerZoneTab";
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
  const { user, loading, companyId, userRole, companyName } = useAuth();
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

  // G-Investigations State (used by MedicalCareTab)
  const [selectedGInvestigations, setSelectedGInvestigations] = useState<string[]>([]);




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
      description: "Arbeitssicherheit und Gesundheitsschutz",
    },
    {
      id: "ISO_14001",
      name: "ISO 14001",
      description: "Umweltmanagement",
    },
    { id: "ISO_9001", name: "ISO 9001", description: "Qualitätsmanagement" },
    { id: "ISO_50001", name: "ISO 50001", description: "Energiemanagement" },
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
      fetchTeamMembers();
      fetchCustomRoles();
      fetchGInvestigations();
      fetchMyTickets();
      fetchApiToken();
      fetchExternalSystems();
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
    toast({ title: t("settings.toast.settingsSavedTitle"), description: t("settings.toast.settingsSavedDesc") });
  } catch (err: any) {
    toast({ title: t("settings.toast.errorTitle"), description: err.message, variant: "destructive" });
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
    toast({ title: t("settings.toast.savedTitle"), description: t("settings.toast.orgTypeUpdatedDesc") });
  } catch (err: any) {
    toast({ title: t("settings.toast.errorTitle"), description: err.message, variant: 'destructive' });
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
    toast({ title: t("settings.toast.savedTitle") });
  } catch (err: any) {
    toast({ title: t("settings.toast.errorTitle"), description: err.message, variant: 'destructive' });
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
      toast({ title: t("settings.toast.tokenGeneratedTitle"), description: t("settings.toast.tokenGeneratedDesc") });

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
      toast({ title: t("settings.toast.errorTitle"), description: err.message, variant: "destructive" });
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

      toast({ title: t("settings.toast.systemConnectedTitle"), description: `${newSystemForm.name} ${t("settings.toast.systemConnectedDesc")}` });
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
      toast({ title: t("settings.toast.errorTitle"), description: err.message, variant: "destructive" });
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

      toast({ title: t("settings.toast.systemRemovedTitle"), description: `${systemName} ${t("settings.toast.systemRemovedDesc")}` });
      fetchExternalSystems();
    } catch (err: any) {
      toast({ title: t("settings.toast.errorTitle"), description: err.message, variant: "destructive" });
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
        toast({ title: t("settings.toast.connectionSuccessTitle"), description: `${system.name} ${t("settings.toast.connectionSuccessDesc")} ${response.status}` });
        // Update last sync time
        await supabase.from("external_systems").update({ last_sync_at: new Date().toISOString() }).eq("id", system.id);
        fetchExternalSystems();
      } else {
        toast({ title: t("settings.toast.connectionFailedTitle"), description: `${system.name} ${t("settings.toast.connectionSuccessDesc")} ${response.status}`, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: t("settings.toast.connectionTestFailedTitle"), description: err.message || t("settings.toast.endpointUnreachable"), variant: "destructive" });
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
          title: t("settings.toast.alreadyUpToDateTitle"),
          description: t("settings.toast.hazardCategoriesUpToDateDesc"),
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
        title: t("settings.toast.savedTitle"),
        description: `${missing.length} ${t("settings.toast.hazardCategoriesAddedDesc")}`,
      });
      fetchAllData();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: t("settings.toast.errorTitle"),
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
          title: t("settings.toast.alreadyUpToDateTitle"),
          description: t("settings.toast.measureBlocksUpToDateDesc"),
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
        title: t("settings.toast.savedTitle"),
        description: `${missing.length} ${t("settings.toast.measureBlocksAddedDesc")}`,
      });
      fetchAllData();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: t("settings.toast.errorTitle"),
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
        title: t("settings.toast.loadErrorTitle"),
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
        title: t("settings.toast.savedTitle"),
        description: t("settings.toast.gInvestigationsSavedDesc"),
      });
    } catch (err: any) {
      toast({
        title: t("settings.toast.errorTitle"),
        description: err.message || t("settings.toast.gInvestigationsSaveFailedDesc"),
        variant: "destructive",
      });
    }
  };

  // Submit support ticket
  const submitTicket = async () => {
    if (!companyId) return;

    if (!ticketForm.category || !ticketForm.title || !ticketForm.description) {
      toast({
        title: t("settings.toast.errorTitle"),
        description: t("settings.toast.fillRequiredFieldsDesc"),
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
        title: t("settings.toast.ticketSubmittedTitle"),
        description: t("settings.toast.ticketSubmittedDesc"),
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
        title: t("settings.toast.errorTitle"),
        description: err.message || t("settings.toast.ticketSubmitFailedDesc"),
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
        title: t("settings.tokenCopied"),
        description: t("settings.toast.tokenCopiedDesc"),
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
        title: t("settings.toast.savedTitle"),
        description: t("settings.toast.approvalWorkflowSavedDesc"),
      });

      fetchApprovalWorkflows();
    } catch (err: any) {
      toast({
        title: t("settings.toast.errorTitle"),
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
        title: t("settings.toast.errorTitle"),
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
        title: t("settings.toast.errorTitle"),
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
        title: t("settings.toast.errorTitle"),
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
        title: t("settings.toast.errorTitle"),
        description: t("settings.toast.fillAllFieldsDesc"),
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
        title: t("settings.toast.savedTitle"),
        description: t("settings.toast.teamMemberAddedDesc"),
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
        title: t("settings.toast.errorTitle"),
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
        title: t("settings.toast.savedTitle"),
        description: `${t("settings.toast.roleUpdatedDesc")} ${oldRole} ${language === "de" ? "zu" : "to"} ${newRole}`,
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
        title: t("settings.toast.errorTitle"),
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
        title: t("settings.toast.errorTitle"),
        description: t("settings.toast.missingDataDesc"),
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
        toast({ title: t("settings.toast.savedTitle"), description: t("settings.toast.itemUpdatedDesc") });

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
        toast({ title: t("settings.toast.savedTitle"), description: t("settings.toast.itemCreatedDesc") });

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
        title: t("settings.toast.errorTitle"),
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
          title: t("settings.toast.errorTitle"),
          description: t("settings.toast.tableNameMissingDesc"),
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

      toast({ title: t("settings.toast.savedTitle"), description: t("settings.toast.itemDeletedDesc") });

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
        title: t("settings.toast.errorTitle"),
        description: message,
        variant: "destructive",
      });
    }
  };

  // Import ISO Criteria from JSON files
  const importIsoCriteria = async (isoCode: string) => {
    if (!companyId) {
      toast({
        title: t("settings.toast.errorTitle"),
        description: t("settings.toast.companyIdNotFoundDesc"),
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
              .upsert(
                {
                  subsection_id: subsectionData.id,
                  question_text: subsection.questions[i],
                  question_text_en: subsection.questions[i], // Store English text in question_text_en
                  sort_order: i + 1,
                },
                { onConflict: "subsection_id,sort_order" }
              );

            if (questionError) throw questionError;
          }
        }
      }

      toast({
        title: t("settings.toast.savedTitle"),
        description: `${data.iso_name} ${t("settings.toast.isoCriteriaImportedDesc")} (${data.total_criteria})`,
      });

      // Refresh the criteria data
      await fetchIsoCriteria(isoCode);
    } catch (error: any) {
      console.error("Error importing ISO criteria:", error);
      toast({
        title: t("settings.toast.errorTitle"),
        description: error.message || t("settings.toast.isoCriteriaImportFailedDesc"),
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
        title: t("settings.toast.errorTitle"),
        description: t("settings.toast.enterCriterionIdAndTitleDesc"),
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
          title: t("settings.toast.errorTitle"),
          description: t("settings.toast.sectionNotFoundDesc"),
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
        title: t("settings.toast.savedTitle"),
        description: t("settings.toast.criterionAddedDesc"),
      });

      // Reset inputs
      setNewCriterionId("");
      setNewCriterionText("");

      // Refresh the criteria data
      await fetchIsoCriteria(activeISOForCriteria);
    } catch (error: any) {
      console.error("Error adding custom criterion:", error);
      toast({
        title: t("settings.toast.errorTitle"),
        description: error.message || t("settings.toast.criterionAddFailedDesc"),
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
        title: t("settings.toast.savedTitle"),
        description: t("settings.toast.criterionDeletedDesc"),
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
        title: t("settings.toast.errorTitle"),
        description: error.message || t("settings.toast.criterionDeleteFailedDesc"),
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
        title: t("settings.toast.savedTitle"),
        description: `${subsectionIds.length} ${t("settings.toast.criteriaDeletedDesc")}`,
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
        title: t("settings.toast.errorTitle"),
        description: error.message || t("settings.toast.criteriaDeleteFailedDesc"),
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
          title: t("settings.toast.savedTitle"),
          description: t("settings.toast.criterionDeletedDesc"),
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
        title: t("settings.toast.savedTitle"),
        description: t("settings.toast.sectionDeletedDesc"),
      });

      // Refresh the criteria data
      await fetchIsoCriteria(activeISOForCriteria);
    } catch (error: any) {
      console.error("Error deleting section:", error);
      toast({
        title: t("settings.toast.errorTitle"),
        description: error.message || t("settings.toast.sectionDeleteFailedDesc"),
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
        title: t("settings.toast.updatingTranslationsTitle"),
        description: t("settings.toast.updatingTranslationsDesc"),
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
          title: t("settings.toast.noDataTitle"),
          description: t("settings.toast.noIsoCriteriaFoundDesc"),
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
        title: t("settings.toast.successTitle"),
        description: `${t("settings.toast.isoCriteriaReimportedDesc")} ${uniqueIsoCodes.length}!`,
      });

      // Refresh the data
      await fetchAllIsoCriteria();
    } catch (error: any) {
      console.error("Error updating English translations:", error);
      toast({
        title: t("settings.toast.errorTitle"),
        description: error.message || t("settings.toast.englishTranslationsFailedDesc"),
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
        title: t("settings.toast.addingGermanTranslationsTitle"),
        description: t("settings.toast.addingGermanTranslationsDesc"),
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
        title: t("settings.toast.successTitle"),
        description: `${t("settings.toast.germanTranslationsAddedDesc")} (${updatedCount})`,
      });

      // Refresh the data
      await fetchAllIsoCriteria();
    } catch (error: any) {
      console.error("Error adding German translations:", error);
      toast({
        title: t("settings.toast.errorTitle"),
        description: error.message || t("settings.toast.germanTranslationsFailedDesc"),
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

  const addCustomRole = async () => {
    if (!customRoleName.trim()) {
      toast({
        title: t("settings.toast.errorTitle"),
        description: t("settings.toast.roleNameEmptyDesc"),
        variant: "destructive",
      });
      return;
    }

    if (roles[customRoleName]) {
      toast({
        title: t("settings.toast.errorTitle"),
        description: t("settings.toast.roleExistsDesc"),
        variant: "destructive",
      });
      return;
    }

    if (!companyId) {
      toast({
        title: t("settings.toast.errorTitle"),
        description: t("settings.toast.companyIdNotFoundDesc"),
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
        title: t("settings.toast.savedTitle"),
        description: `"${customRoleName}" ${t("settings.toast.roleCreatedDesc")}`,
      });
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: t("settings.toast.errorTitle"),
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
        title: t("settings.toast.errorTitle"),
        description: t("settings.toast.predefinedRolesProtectedDesc"),
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
        title: t("settings.toast.savedTitle"),
        description: `"${roleName}" ${t("settings.toast.roleDeletedDesc")}`,
      });

      // Refresh roles
      fetchCustomRoles();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: t("settings.toast.errorTitle"),
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
        description: t("settings.permissionUpdated"),
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
        title: t("settings.toast.permissionDeniedTitle"),
        description: t("settings.toast.noRoleManagementPermissionDesc"),
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
        description: `"${name}" ${t("settings.toast.roleCreatedDesc")}`,
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
        title: t("settings.toast.permissionDeniedTitle"),
        description: t("settings.toast.noRoleManagementPermissionDesc"),
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
        description: t("settings.toast.descriptionUpdatedDesc"),
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
        description: t("settings.toast.templateNameRequiredDesc"),
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
          ? t("settings.toast.templateUpdatedDesc")
          : t("settings.toast.templateAddedDesc"),
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
        description: t("settings.toast.templateDeletedDesc"),
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
        description: t("settings.toast.selectTemplateFirstDesc"),
        variant: "destructive",
      });
      return;
    }

    if (!profileFieldForm.fieldName || !profileFieldForm.fieldLabel) {
      toast({
        title: t("settings.error"),
        description: t("settings.toast.fieldNameLabelRequiredDesc"),
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
          description: t("settings.toast.profileFieldUpdatedDesc"),
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
          description: t("settings.toast.profileFieldAddedDesc"),
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
        description: t("settings.toast.profileFieldDeletedDesc"),
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
                      <div>{t("settings.nav.organisationTitle")}</div>
                      <div className="text-xs opacity-80">{t("settings.nav.organisationDesc")}</div>
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
                      <div>{t("settings.nav.invoicesBillingTitle")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.nav.invoicesBillingDesc")}
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
                      <div>{t("settings.nav.supportTitle")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.nav.supportDesc")}
                      </div>
                    </div>
                  </button>

                  {userRole === "company_admin" && (
                    <button
                      onClick={() => setActiveTab("danger-zone")}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "danger-zone"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                        }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <div className="text-left">
                        <div>{t("settings.nav.accountTitle")}</div>
                        <div className="text-xs opacity-80">
                          {t("settings.nav.accountDesc")}
                        </div>
                      </div>
                    </button>
                  )}
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
                  customRoleNames={customRolesData.map((r) => r.role_name)}
                  handleAddTeamMember={handleAddTeamMember}
                  handleChangeTeamMemberRole={handleChangeTeamMemberRole}
                  fetchTeamMembers={fetchTeamMembers}
                />
              </TabsContent>

              {/* Organisation & Führung */}
              <TabsContent value="organisation">
                <OrganisationTab onNavigateToTab={setActiveTab} />
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
                <ConfigurationTab onNavigateToTab={setActiveTab} />
              </TabsContent>

              {/* Tab: Profile Fields */}
              <TabsContent value="profile-fields">
                <ProfileFieldsTab onNavigateToTab={setActiveTab} />
              </TabsContent>

              {/* Tab 4: Catalogs & Content */}
              <TabsContent value="catalogs">
                <CatalogsTab onNavigateToTab={setActiveTab} />
              </TabsContent>

              {/* Tab 5: Intervals and Deadlines */}
              <TabsContent value="intervals">
                <IntervalsTab onNavigateToTab={setActiveTab} />
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
                <InvoicesBillingTab onNavigateToTab={setActiveTab} />
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

              {/* Tab 10: Danger Zone (company_admin only) */}
              {userRole === "company_admin" && (
                <TabsContent value="danger-zone">
                  <DangerZoneTab companyName={companyName || ""} />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}

