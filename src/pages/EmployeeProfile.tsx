import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuditLog } from "@/hooks/useAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import { Progress } from "@/components/ui/progress";
import jsPDF from "jspdf";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { sendNoteNotification } from "@/services/emailService";
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Upload,
  FileText,
  Download,
  Trash2,
  Heart,
  GraduationCap,
  ClipboardList,
  Plus,
  CalendarCheck,
  StickyNote,
  Tag,
  Users,
  Activity,
  Bold,
  Italic,
  Underline,
  List,
  Link,
  Paperclip,
  AtSign,
  Smile,
  ThumbsUp,
  RefreshCw,
  Reply,
  Eye,
  ChevronDown,
  Pencil,
  FileImage,
  File,
  FileSpreadsheet,
  FileCode,
  Calendar as CalendarIcon,
  Hash,
CheckCircle,
  Bell,
  Award,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

interface EmployeeData {
  id: string;
  employee_number: string;
  full_name: string;
  email: string;
  hire_date: string | null;
  department_id: string | null;
  job_role_id: string | null;
  exposure_group_id: string | null;
  is_active: boolean;
  departments?: { id: string; name: string } | null;
  job_roles?: { id: string; title: string } | null;
  exposure_groups?: { id: string; name: string } | null;
  notes?: string | null;
  tags?: string[] | null;
  languages?: string | null;
  skills?: string | null;
  salary?: string | null;
}

interface HealthCheckup {
  id: string;
  employee_id: string;
  company_id: string;
  investigation_id?: string;
  investigation_name?: string;
  appointment_date: string;
  completion_date?: string | null;
  due_date?: string | null;
  status: string;
  certificate_url?: string | null;
  notes: string | null;
}

interface EmployeeDocument {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  category: string;
  created_at: string;
  uploaded_by: string | null;
}

interface ActivityLog {
  id: string;
  employee_id: string;
  company_id: string;
  action: string;
  action_type: string;
  details: string | null;
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
  metadata?: Record<string, any>;
}

interface Training {
  id: string;
  training_type: string;
  status: string;
  assigned_date: string;
  completion_date: string | null;
  expiry_date: string | null;
}

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companyId, user } = useAuth();
  const { hasPermission, hasDetailedPermission } = usePermissions();
  const { logAction } = useAuditLog();

  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});
  const [formData, setFormData] = useState<Partial<EmployeeData>>({});
  const [loading, setLoading] = useState(true);

  // Derived state for first/last name from full_name
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Data for dropdowns
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);

  // Tab data
  const [healthCheckups, setHealthCheckups] = useState<HealthCheckup[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [notesList, setNotesList] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedNoteVisibility, setSelectedNoteVisibility] = useState<string>("");
  const [notifPrefs, setNotifPrefs] = useState<Record<string, {in_app_enabled: boolean; email_enabled: boolean}>>({});
  const [userProfile, setUserProfile] = useState<any>(null); // Store logged-in user's profile
  const [linkedTeamMember, setLinkedTeamMember] = useState<any>(null); // Team member linked via user_id

  // Task enhancement states
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(
    undefined
  );
  const [newTaskPriority, setNewTaskPriority] = useState<
    "low" | "medium" | "high"
  >("medium");
  const [hideCompletedTasks, setHideCompletedTasks] = useState(false);

  // Persist hideCompletedTasks preference per user in localStorage.
  // Runs whenever user?.id becomes available (handles async auth loading).
  useEffect(() => {
    if (!user?.id) return;
    const key = `hideCompletedTasks_${user.id}`;
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      setHideCompletedTasks(stored === 'true');
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleHideCompleted = (value: boolean) => {
    setHideCompletedTasks(value);
    if (user?.id) {
      localStorage.setItem(`hideCompletedTasks_${user.id}`, String(value));
    }
  };

  // Separate mention dropdown states for Tasks and Notes
  const [showTaskMentionDropdown, setShowTaskMentionDropdown] = useState(false);
  const [taskMentionSearch, setTaskMentionSearch] = useState("");
  const [showNotesMentionDropdown, setShowNotesMentionDropdown] =
    useState(false);
  const [notesMentionSearch, setNotesMentionSearch] = useState("");
  const [teamMembersForMention, setTeamMembersForMention] = useState<any[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Enhanced note visibility state
  const [noteVisibilityMode, setNoteVisibilityMode] = useState<'everyone' | 'specific'>('everyone');
  const [selectedVisibilityUsers, setSelectedVisibilityUsers] = useState<string[]>([]);

  // Ref for notes contentEditable div to handle formatting
  const notesTextareaRef = useRef<HTMLDivElement>(null);
  // Ref for hidden file input used for note attachments
  const noteAttachmentInputRef = useRef<HTMLInputElement>(null);
  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // Link popover state
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  // Active formatting state
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  // Note reply state
  const [replyingToNoteId, setReplyingToNoteId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Document preview and rename states
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(
    null
  );
  const [editingDocumentTitle, setEditingDocumentTitle] = useState("");

// Custom input states
  const [exposureGroups, setExposureGroups] = useState<any[]>([]);

  // Training / Certificates state
  const [courseProgressList, setCourseProgressList] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Profile fields states
  const [profileFields, setProfileFields] = useState<any[]>([]);
  const [showProfileFieldMenu, setShowProfileFieldMenu] = useState(false);
  const [showAllProfileFields, setShowAllProfileFields] = useState(false);

  // Profile field templates from settings
  const [profileFieldTemplates, setProfileFieldTemplates] = useState<any[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedProfileTemplateId, setSelectedProfileTemplateId] = useState<string | null>(null);
  const [templatePreviewFields, setTemplatePreviewFields] = useState<any[]>([]);

  // Debounce timer ref for profile field updates
  const debounceTimerRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Special profile fields (languages, skills, salary)
  const [languages, setLanguages] = useState("");
  const [skills, setSkills] = useState("");
  const [salary, setSalary] = useState("");
  const [editingSpecialField, setEditingSpecialField] = useState<string | null>(
    null
  );

  // Editable labels for special fields
  const [languagesLabel, setLanguagesLabel] = useState("Languages Known");
  const [skillsLabel, setSkillsLabel] = useState("Skills");
  const [salaryLabel, setSalaryLabel] = useState("Salary");
  const [editingSpecialFieldLabel, setEditingSpecialFieldLabel] = useState<string | null>(null);

  // State for editing custom profile fields
  const [editingCustomField, setEditingCustomField] = useState<string | null>(null);
  const [customFieldEditValue, setCustomFieldEditValue] = useState<any>("");
  const [editingCustomFieldLabel, setEditingCustomFieldLabel] = useState<string | null>(null);
  const [customFieldLabelEditValue, setCustomFieldLabelEditValue] = useState<string>("");


  // Check-ups states
  const [isCheckupDialogOpen, setIsCheckupDialogOpen] = useState(false);
  const [gInvestigations, setGInvestigations] = useState<any[]>([]);
  const [checkupFormData, setCheckupFormData] = useState({
    investigation_id: "",
    appointment_date: "",
    due_date: "",
    status: "open" as "done" | "open" | "planned",
    completion_date: "",
    certificate_url: "",
    notes: "",
  });
  const [editingCheckup, setEditingCheckup] = useState<any>(null);

  // Appointment dialog states
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [selectedCheckupForAppointment, setSelectedCheckupForAppointment] = useState<any>(null);
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined);

  // Document upload states
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null);
  const [checkupDocuments, setCheckupDocuments] = useState<Record<string, any[]>>({});

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  const { t } = useLanguage();

  useEffect(() => {
    if (id && companyId) {
      fetchEmployeeData();
      fetchDropdownData();
      fetchHealthCheckups();
      fetchDocuments();
      fetchActivityLogs();
      fetchTasks();
      fetchEmployees();
      fetchTeamMembersForMention();
      fetchGInvestigations();
fetchProfileFields();
      fetchProfileFieldTemplates();
      fetchTeamMembers();
      fetchLinkedTeamMember();
      fetchUserProfile(); // Fetch logged-in user's profile for note authorship
      fetchNotifPrefs();
      fetchEmployeeCourses();
    }
  }, [id, companyId]);

  const fetchEmployeeData = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
          *,
          departments (id, name),
          job_roles (id, title),
          exposure_groups (id, name)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      setEmployee(data as any);
      setFormData(data as any);
      // Don't load raw notes into textarea, leave it empty for new notes
      setNotes("");
      setTags((data as any)?.tags || []);

      // Load special profile fields
      setLanguages((data as any)?.languages || "");
      setSkills((data as any)?.skills || "");
      setSalary((data as any)?.salary || "");
      setSelectedProfileTemplateId(
        (data as any)?.selected_profile_template_id || null
      );

      // Split full_name into first and last name
      if ((data as any)?.full_name) {
        const nameParts = (data as any).full_name.trim().split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }
    } catch (error) {
      console.error("Error fetching employee:", error);
      toast.error("Failed to load employee data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    if (!companyId) return;

    try {
      const [depts, roles, groups] = await Promise.all([
        supabase
          .from("departments")
          .select("id, name")
          .eq("company_id", companyId),
        supabase
          .from("job_roles")
          .select("id, title")
          .eq("company_id", companyId),
        supabase
          .from("exposure_groups")
          .select("id, name")
          .eq("company_id", companyId),
      ]);

      setDepartments(depts.data || []);
      setJobRoles(roles.data || []);
      setExposureGroups(groups.data || []);
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    }
  };

  const fetchHealthCheckups = async () => {
    try {
      const { data, error } = await supabase
        .from("health_checkups")
        .select("*")
        .eq("employee_id", id)
        .order("appointment_date", { ascending: false });

      if (error) {
        // If table doesn't exist yet, just set empty array
        console.log("Health checkups table not created yet");
        setHealthCheckups([]);
        return;
      }
      setHealthCheckups((data as any) || []);

      // Fetch documents for all checkups
      if (data && data.length > 0) {
        fetchAllCheckupDocuments(data.map(c => c.id));
      }
    } catch (error) {
      console.error("Error fetching health checkups:", error);
      setHealthCheckups([]);
    }
  };

  // Fetch documents for checkups
  const fetchAllCheckupDocuments = async (checkupIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("checkup_documents")
        .select("*")
        .in("checkup_id", checkupIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.log("Checkup documents table not created yet");
        return;
      }

      // Group documents by checkup_id
      const grouped: Record<string, any[]> = {};
      data?.forEach((doc) => {
        if (!grouped[doc.checkup_id]) {
          grouped[doc.checkup_id] = [];
        }
        grouped[doc.checkup_id].push(doc);
      });
      setCheckupDocuments(grouped);
    } catch (error) {
      console.error("Error fetching checkup documents:", error);
    }
  };

  const fetchDocuments = async () => {
    if (!companyId || !id) return;

    try {
      // Fetch documents tagged with employee ID or name
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter documents that have employee ID in tags or description
      const employeeDocuments = (data || []).filter(
        (doc: any) =>
          doc.tags?.includes(id) ||
          doc.tags?.includes(employee?.employee_number) ||
          doc.description?.includes(id)
      );

      setDocuments(employeeDocuments as EmployeeDocument[]);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setDocuments([]);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      console.log("=== Fetching Activity Logs ===");
      console.log("Employee ID:", id);
      console.log("Company ID:", companyId);
      console.log("User ID:", user?.id);

      const { data, error } = await supabase
        .from("employee_activity_logs")
        .select("*")
        .eq("employee_id", id)
        .order("changed_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("❌ Error fetching activity logs:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);

        // Check if table doesn't exist
        if (
          error.message?.includes("does not exist") ||
          error.code === "42P01"
        ) {
          toast.error(
            "Activity log table not set up. Please run the SQL setup script."
          );
          console.error(
            "🔴 TABLE DOES NOT EXIST - Run SETUP_EMPLOYEE_PROFILE_FEATURES.sql"
          );
        }

        throw error;
      }

      console.log("✅ Activity logs fetched successfully");
      console.log("Records found:", data?.length || 0);
      if (data && data.length > 0) {
        console.log("Sample log:", data[0]);
      }
      setActivityLogs((data as any) || []);
    } catch (error: any) {
      console.error("❌ Failed to fetch activity logs:", error);
      setActivityLogs([]);
    }
  };

  // Helper function to log activity
  const logActivity = async (
    action: string,
    actionType: string,
    details?: string,
    metadata?: Record<string, any>
  ) => {
    if (!companyId || !user || !id) {
      console.warn("⚠️ Cannot log activity - missing required data:");
      console.warn("  - Company ID:", companyId);
      console.warn("  - User:", user ? "✓" : "✗");
      console.warn("  - Employee ID:", id);
      return false;
    }

    try {
      console.log("=== Logging Activity ===");
      console.log("Action:", action);
      console.log("Type:", actionType);
      console.log("Details:", details);
      console.log("Employee ID:", id);
      console.log("Company ID:", companyId);
      console.log("User:", user.email);

      const { data, error } = await supabase
        .from("employee_activity_logs")
        .insert({
          employee_id: id,
          company_id: companyId,
          action,
          action_type: actionType,
          details: details || null,
          changed_by: user.id,
          changed_by_name: user.email || "Unknown User",
          metadata: metadata || null,
        })
        .select();

      if (error) {
        console.error("❌ Error logging activity:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);

        // Check if table doesn't exist
        if (
          error.message?.includes("does not exist") ||
          error.code === "42P01"
        ) {
          console.error("🔴 TABLE DOES NOT EXIST");
          console.error("👉 Run this SQL in Supabase: RUN_THIS_NOW.sql");
          toast.error("Activity log not set up. Check console for SQL script.");
        } else if (error.code === "42501") {
          console.error("🔴 PERMISSION DENIED - RLS policy issue");
          toast.error("Permission denied. Check RLS policies.");
        }

        return false;
      } else {
        console.log("✅ Activity logged successfully!");
        console.log("Log data:", data);
        // Refresh activity logs after logging
        setTimeout(() => {
          console.log("🔄 Refreshing activity logs...");
          fetchActivityLogs();
        }, 500);
        return true;
      }
    } catch (error: any) {
      console.error("❌ Exception while logging activity:", error);
      toast.error("Failed to log activity: " + error.message);
      return false;
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`*, assigned_employee:employees!tasks_assigned_to_fkey(id, full_name)`)
        .eq("employee_profile_id", id)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setTasks((data as any) || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchEmployees = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, email, employee_number")
        .eq("company_id", companyId);

      if (error) throw error;

      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchTeamMembersForMention = async () => {
    if (!companyId) return;
    try {
      const { data } = await supabase
        .from("team_members")
        .select("id, first_name, last_name, email, user_id, role")
        .eq("company_id", companyId)
        .order("first_name");
      setTeamMembersForMention((data || []).map(m => ({
        ...m,
        full_name: `${m.first_name} ${m.last_name}`.trim(),
      })));
    } catch (err) {
      console.error("Error fetching team members for mention:", err);
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

  // ── Training & Certificates ─────────────────────────────────────────────
  const fetchEmployeeCourses = async () => {
    if (!id || !companyId) return;
    setLoadingCourses(true);
    try {
      // Which courses does this employee have access to?
      const { data: accessData, error: accessError } = await (supabase as any)
        .from("course_employee_access")
        .select("course_id")
        .eq("employee_id", id);

      if (accessError) throw accessError;

      const courseIds = (accessData || []).map((a: any) => a.course_id);
      if (courseIds.length === 0) {
        setCourseProgressList([]);
        return;
      }

      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("id, name")
        .in("id", courseIds);

      if (coursesError) throw coursesError;

      const { data: lessonsData, error: lessonsError } = await supabase
        .from("course_lessons")
        .select("id, course_id")
        .in("course_id", courseIds)
        .eq("status", "published");

      if (lessonsError) throw lessonsError;

      const { data: progressData, error: progressError } = await (supabase as any)
        .from("course_lesson_progress")
        .select("course_id, lesson_id")
        .eq("employee_id", id)
        .in("course_id", courseIds);

      if (progressError) throw progressError;

      const { data: certData, error: certError } = await (supabase as any)
        .from("course_certificates")
        .select("course_id, certificate_number, issued_at")
        .eq("employee_id", id)
        .in("course_id", courseIds);

      if (certError) throw certError;

      const lessonsByCourse: Record<string, number> = {};
      (lessonsData || []).forEach((l: any) => {
        lessonsByCourse[l.course_id] = (lessonsByCourse[l.course_id] || 0) + 1;
      });

      const progressByCourse: Record<string, Set<string>> = {};
      (progressData || []).forEach((p: any) => {
        if (!progressByCourse[p.course_id]) progressByCourse[p.course_id] = new Set();
        progressByCourse[p.course_id].add(p.lesson_id);
      });

      const certByCourse: Record<string, any> = {};
      (certData || []).forEach((c: any) => {
        certByCourse[c.course_id] = c;
      });

      const result = (coursesData || []).map((course: any) => {
        const total = lessonsByCourse[course.id] || 0;
        const completed = Math.min(progressByCourse[course.id]?.size || 0, total);
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          course_id: course.id,
          course_name: course.name,
          total_lessons: total,
          completed_lessons: completed,
          percent,
          certificate: certByCourse[course.id] || null,
        };
      });

      setCourseProgressList(result);
    } catch (error) {
      console.error("Error fetching employee courses:", error);
      setCourseProgressList([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const generatePDF = (userName: string, courseName: string, cert: any) => {
    const issuedDate = new Date(cert.issued_at).toLocaleDateString("de-DE", {
      year: "numeric", month: "long", day: "numeric",
    });
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    doc.setFillColor(248, 250, 252); doc.rect(0, 0, width, height, "F");
    doc.setDrawColor(30, 78, 137); doc.setLineWidth(3); doc.rect(8, 8, width - 16, height - 16);
    doc.setDrawColor(34, 197, 94); doc.setLineWidth(1); doc.rect(12, 12, width - 24, height - 24);
    doc.setFillColor(15, 41, 66); doc.rect(8, 8, width - 16, 40, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont("helvetica", "bold");
    doc.text("HSE HUB", width / 2, 24, { align: "center" });
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text("Health, Safety & Environment Management", width / 2, 34, { align: "center" });
    doc.setTextColor(30, 78, 137); doc.setFontSize(32); doc.setFont("helvetica", "bold");
    doc.text("ZERTIFIKAT", width / 2, 72, { align: "center" });
    doc.setFontSize(14); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
    doc.text("Hiermit wird bestätigt, dass", width / 2, 88, { align: "center" });
    doc.setFontSize(28); doc.setFont("helvetica", "bold"); doc.setTextColor(15, 41, 66);
    doc.text(userName, width / 2, 108, { align: "center" });
    doc.setDrawColor(34, 197, 94); doc.setLineWidth(1.5);
    const nameWidth = doc.getTextWidth(userName);
    doc.line(width / 2 - nameWidth / 2, 112, width / 2 + nameWidth / 2, 112);
    doc.setFontSize(13); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
    doc.text("den folgenden Kurs erfolgreich abgeschlossen hat:", width / 2, 124, { align: "center" });
    doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 78, 137);
    doc.text(courseName, width / 2, 140, { align: "center" });
    doc.setFillColor(34, 197, 94); doc.rect(width / 2 - 40, 145, 80, 3, "F");
    doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
    doc.text(`Ausgestellt am: ${issuedDate}`, width / 2, 162, { align: "center" });
    doc.setFontSize(9); doc.setTextColor(150, 150, 150);
    doc.text(`Zertifikatsnummer: ${cert.certificate_number}`, width / 2, 172, { align: "center" });
    doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.5);
    doc.line(40, 188, 110, 188); doc.setFontSize(10); doc.setTextColor(100, 100, 100);
    doc.text("Safe-Forward GmbH", 75, 194, { align: "center" });
    doc.setFontSize(9); doc.text("Geschaeftsfuehrung", 75, 200, { align: "center" });
    doc.line(width - 110, 188, width - 40, 188); doc.setFontSize(10);
    doc.text("HSE Hub", width - 75, 194, { align: "center" });
    doc.setFontSize(9); doc.text("Schulungsplattform", width - 75, 200, { align: "center" });
    doc.setFillColor(15, 41, 66); doc.rect(8, height - 20, width - 16, 12, "F");
    doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text("www.safe-forward.de  |  info@tech-forward.de  |  HSE Hub", width / 2, height - 12, { align: "center" });
    doc.save(`Zertifikat_${courseName}_${userName}.pdf`);
  };

  const downloadCertificateForEmployee = (employeeName: string, courseName: string, cert: any) => {
    generatePDF(employeeName, courseName, cert);
  };

  const fetchTeamMembers = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("company_id", companyId)
        .order("first_name", { ascending: true });

      if (error) {
        console.error("Error fetching team members:", error);
        setTeamMembers([]);
        return;
      }

      setTeamMembers(data || []);
    } catch (error) {
      console.error("Error fetching team members:", error);
      setTeamMembers([]);
    }
  };

  const fetchLinkedTeamMember = async () => {
    if (!companyId || !id) return;
    try {
      // Get the employee's user_id first
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("user_id")
        .eq("id", id)
        .single();

      if (empError || !empData?.user_id) {
        setLinkedTeamMember(null);
        return;
      }

      // Find team member with the same user_id
      const { data: tmData, error: tmError } = await supabase
        .from("team_members")
        .select("*")
        .eq("company_id", companyId)
        .eq("user_id", empData.user_id)
        .maybeSingle();

      if (tmError || !tmData) {
        setLinkedTeamMember(null);
        return;
      }

      // If there's a line_manager_id, fetch the manager's name
      if (tmData.line_manager_id) {
        const { data: managerData } = await supabase
          .from("team_members")
          .select("first_name, last_name, role")
          .eq("id", tmData.line_manager_id)
          .single();

        setLinkedTeamMember({ ...tmData, line_manager: managerData || null });
      } else {
        setLinkedTeamMember({ ...tmData, line_manager: null });
      }
    } catch (error) {
      console.error("Error fetching linked team member:", error);
      setLinkedTeamMember(null);
    }
  };

  const fetchNotifPrefs = async () => {
    if (!id || !user?.id) return;
    // Only fetch for own profile
    const { data: emp } = await supabase.from("employees").select("user_id").eq("id", id).single();
    if (emp?.user_id !== user.id) return;

    const { data } = await supabase
      .from("notification_preferences")
      .select("category, in_app_enabled, email_enabled")
      .eq("employee_id", id);

    if (data) {
      const map: Record<string, {in_app_enabled: boolean; email_enabled: boolean}> = {};
      data.forEach((r: any) => { map[r.category] = { in_app_enabled: r.in_app_enabled, email_enabled: r.email_enabled }; });
      setNotifPrefs(map);
    }
  };

  const saveNotifPref = async (category: string, field: "in_app_enabled" | "email_enabled", value: boolean) => {
    if (!id || !companyId) return;
    setNotifPrefs(prev => ({ ...prev, [category]: { ...( prev[category] ?? { in_app_enabled: true, email_enabled: true }), [field]: value } }));
    await supabase.from("notification_preferences").upsert(
      { employee_id: id, company_id: companyId, category, [field]: value },
      { onConflict: "employee_id,category" }
    );
  };

  const fetchUserProfile = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, full_name, email")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchProfileFields = async () => {
    if (!id) return;

    try {
      const { data: empData, error } = await supabase
        .from("employees")
        .select("profile_fields")
        .eq("id", id)
        .single();

      if (error) {
        console.log("No profile fields found");
        setProfileFields([]);
        return;
      }

      setProfileFields(empData?.profile_fields || []);
    } catch (error) {
      console.error("Error fetching profile fields:", error);
      setProfileFields([]);
    }
  };

  const fetchProfileFieldTemplates = async () => {
    if (!companyId) return;

    try {
      // Fetch templates for company
      const { data: templates, error: templatesError } = await supabase
        .from("profile_field_templates")
        .select("*")
        .eq("company_id", companyId);

      // Fetch fields for company and group them by template
      const { data: fields, error: fieldsError } = await supabase
        .from("profile_fields")
        .select("*")
        .eq("company_id", companyId)
        .order("display_order", { ascending: true });

      if (templatesError || fieldsError) {
        console.log("Error fetching profile field templates");
        setProfileFieldTemplates([]);
        return;
      }

      // Group fields by template
      const formattedTemplates = (templates || []).map((t: any) => ({
        ...t,
        fields: (fields || []).filter((f: any) => f.template_id === t.id),
      }));

      setProfileFieldTemplates(formattedTemplates);
    } catch (error) {
      console.error("Error fetching profile field templates:", error);
      setProfileFieldTemplates([]);
    }
  };

  const fetchTemplatePreviewFields = async (templateId: string) => {
    if (!companyId || !templateId) return;

    try {
      const { data, error } = await supabase
        .from("profile_fields")
        .select("*")
        .eq("template_id", templateId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setTemplatePreviewFields(data || []);
    } catch (error) {
      console.error("Error fetching template fields:", error);
      setTemplatePreviewFields([]);
    }
  };

  const applyTemplate = async () => {
    if (!selectedTemplateId) {
      toast.error("Please select a template to apply");
      return;
    }

    try {
      const { data: templateFields, error: templateError } = await supabase
        .from("profile_fields")
        .select("*")
        .eq("template_id", selectedTemplateId)
        .order("display_order", { ascending: true });

      if (templateError) throw templateError;

      if (!templateFields || templateFields.length === 0) {
        toast.error("Selected template has no fields");
        return;
      }

      const newFields = templateFields.map((templateField, index) => ({
        id: `${templateField.field_name}_${Date.now()}_${index}`,
        label: templateField.field_label,
        type:
          templateField.field_type === "text"
            ? "Single-line text"
            : templateField.field_type === "number"
            ? "Number"
            : templateField.field_type === "date"
            ? "Date"
            : templateField.field_type === "boolean"
            ? "Yes/No"
            : "Single-line text",
        value: templateField.field_type === "boolean" ? false : "",
        is_required: templateField.is_required,
        extracted_from_resume: templateField.extracted_from_resume,
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("employees")
        .update({
          profile_fields: newFields,
          selected_profile_template_id: selectedTemplateId,
        })
        .eq("id", id);

      if (error) throw error;

      setProfileFields(newFields);
      setSelectedProfileTemplateId(selectedTemplateId);
      setShowTemplateDialog(false);
      setSelectedTemplateId(null);
      setTemplatePreviewFields([]);

      toast.success(
        `Applied ${newFields.length} profile field${newFields.length !== 1 ? "s" : ""} from template`
      );

      const selectedTemplate = profileFieldTemplates.find(
        (template) => template.id === selectedTemplateId
      );

      await logActivity(
        "Applied profile field template",
        "create",
        `Replaced fields with template: ${selectedTemplate?.name || "Template"}`,
        { fieldsAdded: newFields.length, templateId: selectedTemplateId }
      );
      await fetchActivityLogs();
    } catch (error) {
      console.error("Error applying template:", error);
      toast.error("Failed to apply template");
    }
  };

  const handleAddProfileField = async (fieldType: string) => {
    const fieldName = `${fieldType
      .replace(/\s+/g, "_")
      .toLowerCase()}_${Date.now()}`;
    const newField = {
      id: fieldName,
      label: `New ${fieldType}`,
      type: fieldType,
      value: fieldType === "Yes/No" ? false : "",
      created_at: new Date().toISOString(),
    };

    try {
      const updatedFields = [...profileFields, newField];

      const { error } = await supabase
        .from("employees")
        .update({ profile_fields: updatedFields })
        .eq("id", id);

      if (error) throw error;

      setProfileFields(updatedFields);
      setShowProfileFieldMenu(false);
      toast.success("Profile field added");

      await logActivity(
        `Added profile field: ${newField.label}`,
        "create",
        `Added custom field of type ${fieldType}`,
        { field: newField }
      );
      await fetchActivityLogs();
    } catch (error) {
      console.error("Error adding profile field:", error);
      toast.error("Failed to add profile field");
    }
  };

  const handleUpdateProfileField = async (fieldId: string, updates: any) => {
    try {
      const updatedFields = profileFields.map((f) =>
        f.id === fieldId ? { ...f, ...updates } : f
      );

      const { error } = await supabase
        .from("employees")
        .update({ profile_fields: updatedFields })
        .eq("id", id);

      if (error) throw error;

      const field = profileFields.find((f) => f.id === fieldId);
      setProfileFields(updatedFields);
      toast.success("Field updated");

      await logActivity(
        `Updated profile field: ${field?.label || fieldId}`,
        "update",
        `Changed ${field?.label} value`,
        { fieldId, updates }
      );
      await fetchActivityLogs();
    } catch (error) {
      console.error("Error updating profile field:", error);
      toast.error("Failed to update field");
    }
  };

  // Debounced version for text input fields to avoid updating on every keystroke
  const handleDebouncedProfileFieldUpdate = (fieldId: string, updates: any) => {
    // Update local state immediately for responsive UI
    const updatedFields = profileFields.map((f) =>
      f.id === fieldId ? { ...f, ...updates } : f
    );
    setProfileFields(updatedFields);

    // Clear existing timer for this field
    if (debounceTimerRef.current[fieldId]) {
      clearTimeout(debounceTimerRef.current[fieldId]);
    }

    // Set new timer to update database after 1 second of no typing
    debounceTimerRef.current[fieldId] = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from("employees")
          .update({ profile_fields: updatedFields })
          .eq("id", id);

        if (error) throw error;

        const field = profileFields.find((f) => f.id === fieldId);
        toast.success("Field updated");

        await logActivity(
          `Updated profile field: ${field?.label || fieldId}`,
          "update",
          `Changed ${field?.label} value`,
          { fieldId, updates }
        );
        await fetchActivityLogs();
      } catch (error) {
        console.error("Error updating profile field:", error);
        toast.error("Failed to update field");
      }
    }, 1000); // 1 second delay
  };

  const handleDeleteProfileField = async (fieldId: string) => {
    try {
      const field = profileFields.find((f) => f.id === fieldId);
      const updatedFields = profileFields.filter((f) => f.id !== fieldId);

      const { error } = await supabase
        .from("employees")
        .update({ profile_fields: updatedFields })
        .eq("id", id);

      if (error) throw error;

      setProfileFields(updatedFields);
      toast.success("Field deleted");

      await logActivity(
        `Deleted profile field: ${field?.label || fieldId}`,
        "delete",
        `Removed custom field`,
        { field }
      );
      await fetchActivityLogs();
    } catch (error) {
      console.error("Error deleting profile field:", error);
      toast.error("Failed to delete field");
    }
  };

  const handleFieldEdit = (field: string) => {
    setEditMode({ ...editMode, [field]: true });
  };

  const handleFieldSave = async (field: string) => {
    try {
      let updateData: any = {};

      // Handle name fields - combine into full_name
      if (field === "first_name" || field === "last_name") {
        const newFullName = `${field === "first_name"
          ? firstName
          : employee?.full_name.split(" ")[0] || ""
          } ${field === "last_name"
            ? lastName
            : employee?.full_name.split(" ").slice(1).join(" ") || ""
          }`;
        updateData.full_name = newFullName.trim();
      } else {
        updateData[field] = formData[field as keyof EmployeeData];
      }

      const { error } = await (supabase as any)
        .from("employees")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      await logActivity(
        `Updated ${field}`,
        "update",
        `Changed ${field} from "${employee?.[field as keyof EmployeeData] || "empty"
        }" to "${updateData[field]}"`,
        {
          field,
          oldValue: employee?.[field as keyof EmployeeData],
          newValue: updateData[field],
        }
      );

      const isNameField = field === "first_name" || field === "last_name";
      const oldValue = isNameField
        ? employee?.full_name
        : employee?.[field as keyof EmployeeData];
      const newValue = isNameField ? updateData.full_name : updateData[field];

      logAction({
        action: "update_employee",
        targetType: "employee",
        targetId: id,
        targetName: updateData.full_name || employee?.full_name || "Employee",
        details: { field, old_value: oldValue, new_value: newValue },
      });

      toast.success("Updated successfully");
      setEditMode({ ...editMode, [field]: false });
      fetchEmployeeData();
      fetchDropdownData();
      fetchActivityLogs();
    } catch (error) {
      console.error("Error updating field:", error);
      toast.error("Failed to update");
    }
  };

  const handleFieldCancel = (field: string) => {
    setEditMode({ ...editMode, [field]: false });
    setFormData({
      ...formData,
      [field]: employee?.[field as keyof EmployeeData],
    });
  };

  const handleSpecialFieldSave = async (
    field: "languages" | "skills" | "salary"
  ) => {
    try {
      let value = "";
      if (field === "languages") value = languages;
      else if (field === "skills") value = skills;
      else if (field === "salary") value = salary;

      const { error } = await supabase
        .from("employees")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;

      await logActivity(
        `Updated ${field}`,
        "update",
        `Changed ${field} value`,
        { field, newValue: value }
      );

      logAction({
        action: "update_employee",
        targetType: "employee",
        targetId: id,
        targetName: employee?.full_name || "Employee",
        details: { field, new_value: value },
      });

      toast.success("Updated successfully");
      setEditingSpecialField(null);
      fetchEmployeeData();
      fetchActivityLogs();
    } catch (error) {
      console.error("Error updating field:", error);
      toast.error("Failed to update");
    }
  };

  const handleSpecialFieldCancel = (
    field: "languages" | "skills" | "salary"
  ) => {
    if (field === "languages") setLanguages(employee?.languages || "");
    else if (field === "skills") setSkills(employee?.skills || "");
    else if (field === "salary") setSalary(employee?.salary || "");
    setEditingSpecialField(null);
  };

  const handleSaveNotes = async () => {
    // Check text content (not HTML) to determine if note is empty
    const textContent = notesTextareaRef.current?.textContent?.trim() || '';
    if (!textContent) return;

    try {
      // Get existing notes
      let existingNotes: any[] = [];
      try {
        if (
          employee?.notes &&
          (employee.notes.startsWith("[") || employee.notes.startsWith("{"))
        ) {
          existingNotes = JSON.parse(employee.notes);
          if (!Array.isArray(existingNotes)) existingNotes = [];
        }
      } catch (e) {
        // If parsing fails, treat as empty
      }

      // Use logged-in user as author (updated logic)
      let authorName = "Anonymous";
      let authorRole = "";
      let authorId = user?.id || null;
      if (userProfile) {
        if (userProfile.first_name && userProfile.last_name) {
          authorName = `${userProfile.first_name} ${userProfile.last_name}`;
        } else if (userProfile.full_name) {
          authorName = userProfile.full_name;
        } else if (userProfile.email) {
          authorName = userProfile.email;
        }
        authorRole = userProfile.role || "";
      }

      // Determine visibility based on the new mode
      const visibleTo = noteVisibilityMode === 'everyone'
        ? 'everyone'
        : selectedVisibilityUsers;

      const newNoteObj = {
        id: Date.now().toString(),
        content: notes,
        author: authorName,
        author_role: authorRole,
        author_id: authorId,
        date: new Date().toISOString(),
        visibleTo: visibleTo, // 'everyone' or array of user IDs
        replies: [],
      };

      const updatedNotes = [...existingNotes, newNoteObj];
      const updatedNotesString = JSON.stringify(updatedNotes);

      const { error } = await (supabase as any)
        .from("employees")
        .update({ notes: updatedNotesString })
        .eq("id", id);

      if (error) throw error;

      await logActivity(
        "Added note",
        "create",
        notes.substring(0, 100) + (notes.length > 100 ? "..." : "")
      );

      logAction({
        action: "add_employee_note",
        targetType: "employee",
        targetId: id,
        targetName: employee?.full_name || "Employee",
        details: {
          note_preview: textContent.substring(0, 100),
          visibility: visibleTo,
        },
      });


      toast.success("Note added successfully");
      setNotes("");
      // Clear the contentEditable editor
      if (notesTextareaRef.current) {
        notesTextareaRef.current.innerHTML = "";
      }
      setShowNotesMentionDropdown(false);
      // Reset visibility to 'everyone' after saving
      setNoteVisibilityMode('everyone');
      setSelectedVisibilityUsers([]);
      fetchEmployeeData();
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      let existingNotes: any[] = [];

      // Parse existing notes
      if (
        employee?.notes &&
        (employee.notes.startsWith("[") || employee.notes.startsWith("{"))
      ) {
        try {
          existingNotes = JSON.parse(employee.notes);
          if (!Array.isArray(existingNotes)) existingNotes = [];
        } catch (e) {
          console.error("Error parsing notes:", e);
          toast.error("Error parsing notes data");
          return;
        }
      }

      // Find and filter the note
      const noteToDelete = existingNotes.find((note) => note.id === noteId);

      if (!noteToDelete) {
        toast.error("Note not found");
        return;
      }

      const updatedNotes = existingNotes.filter((note) => note.id !== noteId);
      const updatedNotesString = JSON.stringify(updatedNotes);

      // Update in database
      const { error } = await supabase
        .from("employees")
        .update({ notes: updatedNotesString })
        .eq("id", id);

      if (error) throw error;

      // Log activity with correct property (content instead of text)
      const noteContent = noteToDelete.content || noteToDelete.text || "";
      await logActivity(
        "Deleted note",
        "delete",
        noteContent.substring(0, 100) + (noteContent.length > 100 ? "..." : "")
      );

      logAction({
        action: "delete_employee_note",
        targetType: "employee",
        targetId: id,
        targetName: employee?.full_name || "Employee",
        details: { note_id: noteId, note_preview: noteContent.substring(0, 100) },
      });

      toast.success("Note deleted successfully");
      fetchEmployeeData();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  const handleLikeNote = async (noteId: string) => {
    if (!employee?.notes || !user?.id) return;

    try {
      // Parse existing notes
      let existingNotes: any[] = [];
      try {
        if (
          employee.notes.startsWith("[") ||
          employee.notes.startsWith("{")
        ) {
          existingNotes = JSON.parse(employee.notes);
          if (!Array.isArray(existingNotes)) existingNotes = [];
        }
      } catch (e) {
        console.error("Error parsing notes:", e);
        return;
      }

      // Find the note and toggle like
      const updatedNotes = existingNotes.map((note) => {
        if (note.id === noteId) {
          const likes = note.likes || [];
          const userIndex = likes.indexOf(user.id);

          if (userIndex > -1) {
            // Unlike: remove user from likes
            likes.splice(userIndex, 1);
          } else {
            // Like: add user to likes
            likes.push(user.id);
          }

          return { ...note, likes };
        }
        return note;
      });

      const updatedNotesString = JSON.stringify(updatedNotes);

      // Update in database
      const { error } = await (supabase as any)
        .from("employees")
        .update({ notes: updatedNotesString })
        .eq("id", id);

      if (error) throw error;

      // Refresh employee data to update UI
      fetchEmployeeData();
    } catch (error) {
      console.error("Error liking note:", error);
      toast.error("Failed to update like");
    }
  };

  const handleSaveReply = async (noteId: string) => {
    if (!replyText.trim() || !employee?.notes || !user?.id) return;

    try {
      // Parse existing notes
      let existingNotes: any[] = [];
      try {
        if (
          employee.notes.startsWith("[") ||
          employee.notes.startsWith("{")
        ) {
          existingNotes = JSON.parse(employee.notes);
          if (!Array.isArray(existingNotes)) existingNotes = [];
        }
      } catch (e) {
        console.error("Error parsing notes:", e);
        return;
      }

      // Get author name from user profile
      let authorName = "Anonymous";
      if (userProfile) {
        if (userProfile.first_name && userProfile.last_name) {
          authorName = `${userProfile.first_name} ${userProfile.last_name}`;
        } else if (userProfile.full_name) {
          authorName = userProfile.full_name;
        } else if (userProfile.email) {
          authorName = userProfile.email;
        }
      }

      // Create reply object
      const newReply = {
        id: Date.now().toString(),
        content: replyText,
        author: authorName,
        author_id: user.id,
        date: new Date().toISOString(),
      };

      // Find the note and add reply
      const updatedNotes = existingNotes.map((note) => {
        if (note.id === noteId) {
          const replies = note.replies || [];
          replies.push(newReply);
          return { ...note, replies };
        }
        return note;
      });

      const updatedNotesString = JSON.stringify(updatedNotes);

      // Update in database
      const { error } = await (supabase as any)
        .from("employees")
        .update({ notes: updatedNotesString })
        .eq("id", id);

      if (error) throw error;

      await logActivity(
        "Added reply to note",
        "create",
        replyText.substring(0, 100) + (replyText.length > 100 ? "..." : "")
      );

      toast.success("Reply added successfully");
      setReplyingToNoteId(null);
      setReplyText("");
      fetchEmployeeData();

      // Send notification to the note author
      try {
        const originalNote = existingNotes.find((n) => n.id === noteId);
        if (originalNote && originalNote.author_id && originalNote.author_id !== user.id) {
          // Find the author in team members
          const noteAuthor = teamMembers.find((m) => m.id === originalNote.author_id);
          if (noteAuthor?.email) {
            await sendNoteNotification(
              noteAuthor.email,
              `${noteAuthor.first_name} ${noteAuthor.last_name}`,
              `${authorName} replied: ${replyText}`,
              authorName
            );
          }
        }
      } catch (notifError) {
        console.error("Error sending reply notification:", notifError);
        // Don't fail the whole operation if notification fails
      }
    } catch (error) {
      console.error("Error saving reply:", error);
      toast.error("Failed to save reply");
    }
  };

  const handleNotesChange = () => {
    const editorDiv = notesTextareaRef.current;
    if (!editorDiv) return;

    const value = editorDiv.innerHTML || '';
    setNotes(value);

    // Check for @ mention using text content
    const textContent = editorDiv.textContent || '';
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;
      const text = textNode.textContent || '';
      const cursorPos = range.startOffset;
      const textBeforeCursor = text.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        if (!textAfterAt.includes(" ") && textAfterAt.length >= 0) {
          setNotesMentionSearch(textAfterAt);
          setShowNotesMentionDropdown(true);
        } else {
          setShowNotesMentionDropdown(false);
        }
      } else {
        setShowNotesMentionDropdown(false);
      }
    }
  };

  // Update active formatting state based on cursor position
  const updateActiveFormats = () => {
    const editorDiv = notesTextareaRef.current;
    if (!editorDiv) return;

    const newFormats = new Set<string>();

    // Check for bold, italic, underline at current selection
    if (document.queryCommandState('bold')) newFormats.add('bold');
    if (document.queryCommandState('italic')) newFormats.add('italic');
    if (document.queryCommandState('underline')) newFormats.add('underline');

    setActiveFormats(newFormats);
  };

  const handleMentionSelect = (employeeName: string) => {
    const editorDiv = notesTextareaRef.current;
    if (!editorDiv) return;

    // Find and delete the @ search text, then insert styled mention
    editorDiv.focus();

    // Remove the @ and any text after it that was typed
    const text = editorDiv.textContent || '';
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      // Clear from @ to end
      const beforeAt = text.substring(0, lastAtIndex);
      editorDiv.textContent = beforeAt;
    }

    // Insert the formatted mention
    document.execCommand('insertText', false, `@${employeeName} `);
    setNotes(editorDiv.innerHTML);
    setShowNotesMentionDropdown(false);
  };

  // Separate filtered employee lists for Tasks and Notes
  const filteredTaskEmployees = teamMembersForMention.filter((emp) =>
    emp.full_name.toLowerCase().includes(taskMentionSearch.toLowerCase())
  );

  const filteredNotesEmployees = teamMembersForMention.filter((emp) =>
    emp.full_name.toLowerCase().includes(notesMentionSearch.toLowerCase())
  );

  // Rich text formatting functions using execCommand for contentEditable
  const applyFormatting = (formatType: 'bold' | 'italic' | 'underline' | 'list') => {
    const editorDiv = notesTextareaRef.current;
    if (!editorDiv) return;

    editorDiv.focus();

    switch (formatType) {
      case 'bold':
        document.execCommand('bold', false);
        break;
      case 'italic':
        document.execCommand('italic', false);
        break;
      case 'underline':
        document.execCommand('underline', false);
        break;
      case 'list': {
        // Insert a bullet list - check if we're already in a list first
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) break;

        // Check if cursor is inside a list
        let node = selection.anchorNode;
        let inList = false;
        while (node && node !== editorDiv) {
          if (node.nodeName === 'UL' || node.nodeName === 'OL') {
            inList = true;
            break;
          }
          node = node.parentNode;
        }

        if (inList) {
          // Already in a list, just add a new empty item
          document.execCommand('insertHTML', false, '<li><br></li>');
          // Move cursor into the new list item
          setTimeout(() => {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              range.collapse(false);
            }
          }, 0);
        } else {
          // Not in a list, create a new one
          const selectedText = selection.toString() || '';
          if (selectedText) {
            const items = selectedText.split('\n').filter(l => l.trim()).map(l => `<li>${l.trim()}</li>`).join('');
            document.execCommand('insertHTML', false, `<ul style="list-style-type:disc;margin:4px 0;padding-left:1.5rem">${items}</ul>`);
          } else {
            document.execCommand('insertHTML', false, '<ul style="list-style-type:disc;margin:4px 0;padding-left:1.5rem"><li><br></li></ul>');
            // Move cursor into the new list item
            setTimeout(() => {
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                range.collapse(false);
              }
            }, 0);
          }
        }
        break;
      }
    }

    // Update notes state with the new HTML
    setNotes(editorDiv.innerHTML);
  };

  // Insert link into the notes editor via inline popover
  const handleInsertLink = () => {
    const editorDiv = notesTextareaRef.current;
    if (!editorDiv || !linkUrl.trim()) return;

    const label = linkLabel.trim() || linkUrl.trim();
    const url = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;

    editorDiv.focus();
    document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" style="color:#3b82f6;text-decoration:underline">${label}</a>&nbsp;`);
    setNotes(editorDiv.innerHTML);
    setLinkUrl('');
    setLinkLabel('');
    setShowLinkPopover(false);
  };

  // Insert emoji into the notes contentEditable div
  const handleInsertEmoji = (emoji: string) => {
    const editorDiv = notesTextareaRef.current;
    if (!editorDiv) return;

    editorDiv.focus();
    document.execCommand('insertText', false, emoji);
    setNotes(editorDiv.innerHTML);
    setShowEmojiPicker(false);
  };

  // Handle note attachment via Paperclip button - upload to storage and insert clickable link
  const handleNoteAttachment = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !companyId || !user) return;

    const editorDiv = notesTextareaRef.current;
    if (!editorDiv) return;

    try {
      // Show uploading indicator
      const uploadingHtml = `<span style="background:#e0e7ff;padding:2px 6px;border-radius:4px;font-size:13px;color:#3730a3">📎 Uploading ${file.name}...</span>&nbsp;`;
      editorDiv.innerHTML += uploadingHtml;
      setNotes(editorDiv.innerHTML);

      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${companyId}/note-attachments/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get signed URL instead of public URL to avoid "bucket not found" error
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from("documents")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

      if (urlError || !signedUrlData) {
        throw new Error("Failed to get download URL");
      }

      const downloadUrl = signedUrlData.signedUrl;

      // Remove uploading indicator and insert clickable link
      const currentHtml = editorDiv.innerHTML.replace(uploadingHtml, '');
      const attachmentHtml = `<a href="${downloadUrl}" target="_blank" download="${file.name}" style="display:inline-flex;align-items:center;background:#f1f5f9;padding:4px 8px;border-radius:6px;font-size:13px;color:#0f172a;text-decoration:none;border:1px solid #e2e8f0;transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0';this.style.borderColor='#cbd5e1'" onmouseout="this.style.background='#f1f5f9';this.style.borderColor='#e2e8f0'">📎 ${file.name}</a>&nbsp;`;
      editorDiv.innerHTML = currentHtml + attachmentHtml;
      setNotes(editorDiv.innerHTML);

      toast.success(`${file.name} attached successfully`);
    } catch (error: any) {
      console.error("Error uploading attachment:", error);
      toast.error("Failed to upload attachment");
      // Remove uploading indicator if there was an error
      const currentHtml = editorDiv.innerHTML;
      editorDiv.innerHTML = currentHtml.replace(/📎 Uploading .*?<\/span>&nbsp;/g, '');
      setNotes(editorDiv.innerHTML);
    }

    // Reset file input
    if (event.target) event.target.value = '';
  };

  // Common emoji list
  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😊', '🙂', '😉', '😍',
    '🤔', '😐', '😑', '😶', '🙄', '😏', '😣', '😥',
    '👍', '👎', '👏', '🙌', '🤝', '💪', '✌️', '🤞',
    '❤️', '🔥', '⭐', '✅', '❌', '⚠️', '📌', '📎',
    '🎯', '💡', '📝', '🔔', '📊', '📈', '🏆', '🎉',
  ];

  const handleAddTag = async () => {
    if (!newTag.trim()) return;

    const updatedTags = [...tags, newTag.trim()];

    try {
      const { error } = await (supabase as any)
        .from("employees")
        .update({ tags: updatedTags })
        .eq("id", id);

      if (error) throw error;

      await logActivity("Added tag", "update", `Added tag: ${newTag}`, {
        tag: newTag,
      });

      setTags(updatedTags);
      setNewTag("");
      toast.success("Tag added");
      fetchEmployeeData();
    } catch (error) {
      console.error("Error adding tag:", error);
      toast.error("Failed to add tag");
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove);

    try {
      const { error } = await (supabase as any)
        .from("employees")
        .update({ tags: updatedTags })
        .eq("id", id);

      if (error) throw error;

      await logActivity(
        "Removed tag",
        "update",
        `Removed tag: ${tagToRemove}`,
        {
          tag: tagToRemove,
        }
      );

      setTags(updatedTags);
      toast.success("Tag removed");
      fetchEmployeeData();
    } catch (error) {
      console.error("Error removing tag:", error);
      toast.error("Failed to remove tag");
    }
  };

  // Document preview and rename functions
  const handlePreviewDocument = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setPreviewUrl(url);
      setPreviewDocument(doc);
      setShowPreviewDialog(true);
    } catch (error: any) {
      console.error("Error loading preview:", error);
      toast.error("Failed to load document preview");
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
    setShowPreviewDialog(false);
    setPreviewDocument(null);
  };

  const handleStartRename = (doc: any) => {
    setEditingDocumentId(doc.id);
    setEditingDocumentTitle(doc.title);
  };

  const handleSaveRename = async (docId: string) => {
    if (!editingDocumentTitle.trim()) {
      toast.error("Document title cannot be empty");
      return;
    }

    try {
      const oldDocument = documents.find((d) => d.id === docId);

      const { error } = await (supabase as any)
        .from("documents")
        .update({ title: editingDocumentTitle })
        .eq("id", docId);

      if (error) throw error;

      await logActivity(
        "Renamed document",
        "update",
        `Renamed document from "${oldDocument?.title}" to "${editingDocumentTitle}"`,
        {
          documentId: docId,
          oldTitle: oldDocument?.title,
          newTitle: editingDocumentTitle,
        }
      );

      toast.success("Document renamed successfully");
      setEditingDocumentId(null);
      setEditingDocumentTitle("");
      fetchDocuments();
    } catch (error) {
      console.error("Error renaming document:", error);
      toast.error("Failed to rename document");
    }
  };

  const handleCancelRename = () => {
    setEditingDocumentId(null);
    setEditingDocumentTitle("");
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();

    switch (ext) {
      case "pdf":
        return <FileText className="w-8 h-8 text-red-500" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "webp":
        return <FileImage className="w-8 h-8 text-blue-500" />;
      case "xls":
      case "xlsx":
      case "csv":
        return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
      case "doc":
      case "docx":
        return <FileText className="w-8 h-8 text-blue-600" />;
      case "txt":
      case "md":
        return <FileCode className="w-8 h-8 text-gray-500" />;
      default:
        return <File className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const handleToggleActive = async (isActive: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from("employees")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;

      await logActivity(
        `${isActive ? "Activated" : "Deactivated"} employee`,
        "status_change",
        `Employee status changed to ${isActive ? "Active" : "Inactive"}`,
        { status: isActive ? "active" : "inactive" }
      );

      logAction({
        action: "update_employee",
        targetType: "employee",
        targetId: id,
        targetName: employee?.full_name || "Employee",
        details: { field: "is_active", new_value: isActive },
      });

      toast.success(`Employee ${isActive ? "activated" : "deactivated"}`);
      fetchEmployeeData();
      fetchActivityLogs();
    } catch (error) {
      console.error("Error toggling active status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    if (!file || !companyId || !user) return;

    try {
      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
      const filePath = `${companyId}/other/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Save document record
      const { data: createdDoc, error: dbError } = await supabase
        .from("documents")
        .insert({
        company_id: companyId,
        title: file.name.replace(/\.[^/.]+$/, ""),
        description: `Document for employee ${employee?.full_name || ""} (${employee?.employee_number || ""
          })`,
        category: "other",
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        is_public: false,
        uploaded_by: user.id,
        tags: [id, employee?.employee_number || ""].filter(Boolean),
      } as any)
        .select()
        .single();

      if (dbError) throw dbError;

      await logActivity(
        "Uploaded document",
        "upload",
        `Uploaded file: ${file.name}`,
        { fileName: file.name, fileSize: file.size, mimeType: file.type }
      );

      logAction({
        action: "upload_document",
        targetType: "document",
        targetId: createdDoc?.id || null,
        targetName: file.name,
        details: {
          file_name: file.name,
          file_size: file.size,
          employee_id: id,
          employee_name: employee?.full_name,
        },
      });

      toast.success("Document uploaded successfully");
      fetchDocuments();
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error(error.message || "Failed to upload document");
    }
  };

  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadFile(file);
      // Reset file input
      if (event.target) {
        event.target.value = "";
      }
    }
  };

const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      // Check if the task title @mentions a specific employee.
      // If so, assign the task to THAT employee instead of the profile owner.
      // Only a single mention is supported; titles can't contain commas/multiple @s in practice.
let finalAssignedTo = id;
let finalTaskTitle = newTaskTitle;

// Extract full text after @ (up to next @ or end), then prefix-match against
// all employee names so multi-word names like "Will Baker" are found correctly.
const mentionMatch = newTaskTitle.match(/@(.+?)(?=\s*@|$)/);
if (mentionMatch && companyId) {
  const rawAfterMention = mentionMatch[1].trim();

  const { data: allEmployees } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("company_id", companyId);

  // Longest prefix match wins (handles "Will" vs "Will Baker" ambiguity)
  const matchedEmployee = (allEmployees || [])
    .filter(emp =>
      rawAfterMention.toLowerCase().startsWith(emp.full_name.toLowerCase())
    )
    .sort((a, b) => b.full_name.length - a.full_name.length)[0];

  if (matchedEmployee) {
    finalAssignedTo = matchedEmployee.id;
    finalTaskTitle = newTaskTitle
      .replace(new RegExp(`@${matchedEmployee.full_name}\\s*`, "i"), "")
      .trim();
  }
}

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: finalTaskTitle,
          assigned_to: finalAssignedTo,
          employee_profile_id: id,
          company_id: companyId,
          status: "pending",
          priority: newTaskPriority,
          due_date: newTaskDueDate
            ? newTaskDueDate.toISOString().split("T")[0]
            : null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Log to employee_activity_logs
      await logActivity(
        "Created task",
        "create",
        `Task created: ${newTaskTitle}`,
        { taskId: data.id, taskTitle: newTaskTitle }
      );

      // ── Send mention notifications via SECURITY DEFINER RPC ────────────────
      try {
        let senderName = user?.email || "Someone";
        if (user?.email && companyId) {
          const { data: senderEmp } = await supabase
            .from("employees")
            .select("full_name")
            .ilike("email", user.email)
            .eq("company_id", companyId)
            .maybeSingle();
          if (senderEmp?.full_name) {
            senderName = senderEmp.full_name;
          } else {
            const { data: senderMember } = await supabase
              .from("team_members")
              .select("first_name, last_name")
              .ilike("email", user.email)
              .eq("company_id", companyId)
              .maybeSingle();
            if (senderMember) {
              senderName = `${senderMember.first_name} ${senderMember.last_name}`.trim();
            }
          }
        }

        const combinedText = `${data.title || ""} ${data.description || ""}`;
        const { data: notifCount, error: notifErr } = await supabase.rpc(
          "notify_task_mentions",
          {
            p_company_id: companyId,
            p_task_id: data.id,
            p_task_title: data.title,
            p_task_text: combinedText,
p_sender_name: senderName,
            p_assigned_to: finalAssignedTo ?? null,
          }
        );
        if (notifErr) {
          console.error("❌ Task notification RPC error:", notifErr);
        } else {
          console.log(`✅ Task notifications sent: ${notifCount}`);
        }
      } catch (notifErr) {
        console.error("❌ Exception sending task notifications:", notifErr);
      }
      // ─────────────────────────────────────────────────────────────────────

      // ALSO log to audit_logs for Super Admin Activity tab
      console.log("🔵 [EMPLOYEE PROFILE TASK] Creating audit log...");
      try {
        const { data: logResult, error: logError } = await supabase.rpc("create_audit_log", {
          p_action_type: "assign_task",
          p_target_type: "task",
          p_target_id: data.id,
          p_target_name: newTaskTitle,
          p_details: {
            assignee_id: id,
            assigned_to: employee?.full_name || "Unknown Employee",
            priority: newTaskPriority,
            due_date: newTaskDueDate?.toISOString().split("T")[0] || null,
            created_from: "employee_profile"
          },
          p_company_id: companyId,
        });
        
        if (logError) {
          console.error("❌ [EMPLOYEE PROFILE TASK] Audit log error:", logError);
        } else {
          console.log("✅ [EMPLOYEE PROFILE TASK] Audit log created! ID:", logResult);
        }
      } catch (auditErr) {
        console.error("❌ [EMPLOYEE PROFILE TASK] Exception:", auditErr);
      }

      setTasks([data, ...tasks]);
      setNewTaskTitle("");
      setNewTaskDueDate(undefined);
      setNewTaskPriority("medium");
      toast.success("Task created");
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  const handleToggleTaskStatus = async (task: any) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", task.id);

      if (error) throw error;

      await logActivity(
        "Updated task status",
        "update",
        `Task "${task.title}" marked as ${newStatus}`,
        {
          taskId: task.id,
          taskTitle: task.title,
          oldStatus: task.status,
          newStatus,
        }
      );

      // ALSO log to audit_logs for Super Admin Activity tab
      const actionType = newStatus === "completed" ? "complete_task" : "reopen_task";
      console.log(`🔵 [EMPLOYEE PROFILE TASK STATUS] Logging ${actionType}...`);
      try {
        const { data: logResult, error: logError } = await supabase.rpc("create_audit_log", {
          p_action_type: actionType,
          p_target_type: "task",
          p_target_id: task.id,
          p_target_name: task.title,
          p_details: {
            old_status: task.status,
            new_status: newStatus,
            updated_from: "employee_profile"
          },
          p_company_id: companyId,
        });
        
        if (logError) {
          console.error(`❌ [EMPLOYEE PROFILE TASK STATUS] Audit log error:`, logError);
        } else {
          console.log(`✅ [EMPLOYEE PROFILE TASK STATUS] Audit log created! ID:`, logResult);
        }
      } catch (auditErr) {
        console.error(`❌ [EMPLOYEE PROFILE TASK STATUS] Exception:`, auditErr);
      }

      setTasks(
        tasks.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
      toast.success(`Task marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleCreateCheckup = async () => {
    // Check permission before allowing health examination creation
    if (!hasDetailedPermission('health_examinations', 'create_edit')) {
      toast.error("You do not have permission to create health examinations");
      return;
    }

    // Only G-Investigation is required, appointment date is optional
    if (!checkupFormData.investigation_id) {
      toast.error("Please select a G-Investigation");
      return;
    }

    try {
      // Look up the full G-Investigation name
      // The dropdown might store either ID or name, so check both
      let gInvestigation = gInvestigations.find(
        (g) => g.id === checkupFormData.investigation_id
      );

      // If not found by ID, try finding by name
      if (!gInvestigation) {
        gInvestigation = gInvestigations.find(
          (g) => g.name === checkupFormData.investigation_id
        );
      }

      const investigationName = gInvestigation?.name || checkupFormData.investigation_id;

      // Note: investigation_id is a foreign key to the investigations table
      // When creating checkups directly (not from an investigation), we don't set it
      const checkupData: any = {
        employee_id: id,
        company_id: companyId,
        investigation_name: investigationName, // Store full G-investigation name
        appointment_date: checkupFormData.appointment_date || null,
        status: checkupFormData.status,
        notes: checkupFormData.notes,
      };

      if (checkupFormData.completion_date) {
        checkupData.completion_date = checkupFormData.completion_date;
      }

      if (checkupFormData.certificate_url) {
        checkupData.certificate_url = checkupFormData.certificate_url;
      }

      // Only include due_date if it has a value (for backward compatibility)
      if (checkupFormData.due_date) {
        checkupData.due_date = checkupFormData.due_date;
      }

      const { data, error } = await supabase
        .from("health_checkups")
        .insert(checkupData)
        .select()
        .single();

      if (error) throw error;

      // If status is "done" and completion date is provided, schedule next checkup
      if (
        checkupFormData.status === "done" &&
        checkupFormData.completion_date
      ) {
        // Check if an auto-scheduled check-up already exists for this investigation
        const existingAutoScheduled = healthCheckups.find(
          (c) =>
            (c.investigation_name === investigationName || c.investigation_id === checkupFormData.investigation_id) &&
            c.status !== "done" &&
            c.notes?.includes("Auto-scheduled")
        );

        // Only create new auto-scheduled check-up if one doesn't exist
        if (!existingAutoScheduled) {
          const completionDate = new Date(checkupFormData.completion_date);
          const nextCheckupDate = new Date(completionDate);
          nextCheckupDate.setFullYear(nextCheckupDate.getFullYear() + 3);

          await supabase.from("health_checkups").insert({
            employee_id: id,
            company_id: companyId,
            investigation_name: investigationName,
            due_date: nextCheckupDate.toISOString().split("T")[0],
            status: "open",
            notes: "Auto-scheduled 3 years after previous checkup",
          });

          toast.success("Check-up created and next checkup scheduled in 3 years");
        } else {
          toast.success("Check-up created successfully");
        }
      } else {
        toast.success("Check-up created successfully");
      }

      setIsCheckupDialogOpen(false);
      setCheckupFormData({
        investigation_id: "",
        appointment_date: "",
        due_date: "",
        status: "open",
        completion_date: "",
        certificate_url: "",
        notes: "",
      });

      await logActivity(
        "Created health check-up",
        "create",
        `Scheduled check-up: ${investigationName} on ${checkupFormData.appointment_date}`,
        {
          investigationId: checkupFormData.investigation_id,
          appointmentDate: checkupFormData.appointment_date,
          status: checkupFormData.status,
        }
      );

      fetchHealthCheckups();
    } catch (error) {
      console.error("Error creating checkup:", error);
      toast.error("Failed to create checkup");
    }
  };

  const handleUpdateCheckup = async (checkupId: string, updates: any) => {
    try {
      // If updating to "done" status with completion date, schedule next checkup
      if (updates.status === "done" && updates.completion_date) {
        const checkup = healthCheckups.find((c) => c.id === checkupId);
        const investigationName = checkup?.investigation_name || checkup?.investigation_id;

        // Check if an auto-scheduled check-up already exists for this investigation
        const existingAutoScheduled = healthCheckups.find(
          (c) =>
            c.id !== checkupId &&
            (c.investigation_name === investigationName || c.investigation_id === checkup?.investigation_id) &&
            c.status !== "done" &&
            c.notes?.includes("Auto-scheduled")
        );

        // Only create new auto-scheduled check-up if one doesn't exist
        if (!existingAutoScheduled) {
          const completionDate = new Date(updates.completion_date);
          const nextCheckupDate = new Date(completionDate);
          nextCheckupDate.setFullYear(nextCheckupDate.getFullYear() + 3);

          await supabase.from("health_checkups").insert({
            employee_id: id,
            company_id: companyId,
            investigation_name: investigationName,
            due_date: nextCheckupDate.toISOString().split("T")[0],
            status: "open",
            notes: "Auto-scheduled 3 years after previous checkup",
          });
        }
      }

      const { error } = await supabase
        .from("health_checkups")
        .update(updates)
        .eq("id", checkupId);

      if (error) throw error;

      await logActivity(
        "Updated health check-up",
        "update",
        `Updated check-up status to ${updates.status}${updates.completion_date ? " and marked as completed" : ""
        }`,
        { checkupId, updates }
      );

      toast.success("Check-up updated successfully");
      fetchHealthCheckups();
    } catch (error) {
      console.error("Error updating checkup:", error);
      toast.error("Failed to update checkup");
    }
  };

  const handleDeleteCheckup = async (checkupId: string) => {
    // Check permission before allowing health examination deletion
    if (!hasDetailedPermission('health_examinations', 'delete')) {
      toast.error("You do not have permission to delete health examinations");
      return;
    }

    if (!confirm("Are you sure you want to delete this check-up?")) return;

    try {
      const { error } = await supabase
        .from("health_checkups")
        .delete()
        .eq("id", checkupId);

      if (error) throw error;

      await logActivity(
        "Deleted health check-up",
        "delete",
        `Deleted check-up appointment`,
        { checkupId }
      );

      toast.success("Check-up deleted successfully");
      fetchHealthCheckups();
    } catch (error) {
      console.error("Error deleting checkup:", error);
      toast.error("Failed to delete checkup");
    }
  };

  const handleCertificateUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    checkupId: string
  ) => {
    const file = event.target.files?.[0];
    if (!file || !companyId) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-cert-${checkupId}.${fileExt}`;
      const filePath = `${companyId}/certificate/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(filePath);

      await handleUpdateCheckup(checkupId, { certificate_url: publicUrl });

      toast.success("Certificate uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading certificate:", error);
      toast.error(error.message || "Failed to upload certificate");
    }
  };

  // Document upload handler for checkups
  const handleCheckupDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    checkupId: string
  ) => {
    const file = event.target.files?.[0];
    if (!file || !companyId || !user) return;

    setUploadingDocument(checkupId);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${companyId}/checkup-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Insert into checkup_documents table (file_url will be generated on demand)
      const { error: insertError } = await supabase
        .from("checkup_documents")
        .insert({
          checkup_id: checkupId,
          company_id: companyId,
          file_name: file.name,
          file_path: filePath,
          file_url: filePath, // Store path, will generate signed URL when needed
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
        });

      if (insertError) throw insertError;

      toast.success("Document uploaded successfully");
      fetchHealthCheckups();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploadingDocument(null);
    }
  };

  // Delete checkup document
  const handleDeleteCheckupDocument = async (documentId: string, filePath: string) => {
    if (!confirm("Delete this document?")) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([filePath]);

      if (storageError) console.error("Storage delete error:", storageError);

      // Delete from database
      const { error: deleteError } = await supabase
        .from("checkup_documents")
        .delete()
        .eq("id", documentId);

      if (deleteError) throw deleteError;

      toast.success("Document deleted successfully");
      fetchHealthCheckups();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  // Generate signed URL for document preview
  const getDocumentSignedUrl = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Error generating signed URL:", error);
      toast.error("Failed to generate preview link");
      return null;
    }
  };

  // Handle document preview
  const handlePreviewCheckupDocument = async (filePath: string) => {
    const signedUrl = await getDocumentSignedUrl(filePath);
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p>Employee not found</p>
            <Button onClick={() => navigate("/employees")} className="mt-4">
              Back to Employees
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderEditableField = (
    field: string,
    label: string,
    value: any,
    type: "text" | "select" | "date" = "text",
    options?: any[]
  ) => {
    const isEditing = editMode[field];

    // Get the actual value for first/last name
    const displayValue =
      field === "first_name"
        ? firstName
        : field === "last_name"
          ? lastName
          : value;
    const inputValue =
      field === "first_name"
        ? firstName
        : field === "last_name"
          ? lastName
          : (formData[field as keyof EmployeeData] as string) || "";

    return (
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">{label}</Label>

        {!isEditing ? (
          <div
            onClick={() => handleFieldEdit(field)}
            className="font-medium cursor-pointer hover:bg-muted/50 p-2 rounded border border-transparent hover:border-muted-foreground/20 transition-colors"
          >
            {displayValue || "-"}
          </div>
        ) : type === "select" && options ? (
          <div className="space-y-2">
            <Combobox
              options={options.map((opt) => ({
                value: opt.id || opt,
                label: opt.name || opt.title || opt.full_name || opt,
              }))}
              value={formData[field as keyof EmployeeData] as string}
              onValueChange={async (val) => {
                setFormData({ ...formData, [field]: val });
                try {
                  const { error } = await (supabase as any)
                    .from("employees")
                    .update({ [field]: val })
                    .eq("id", id);
                  if (error) throw error;
                  toast.success("Updated successfully");
                  setEditMode({ ...editMode, [field]: false });
                  fetchEmployeeData();
                } catch (e) {
                  console.error(e);
                  toast.error("Failed to update");
                }
              }}
              placeholder={`Select ${label}`}
              searchPlaceholder="Search or type to create..."
              emptyText={`No ${label.toLowerCase()} found.`}
              allowCustom={field === "department_id" || field === "job_role_id"}
              onCreateCustom={async (newValue) => {
                if (!companyId) return;
                try {
                  let table = "";
                  let dataField = "";

                  if (field === "department_id") {
                    table = "departments";
                    dataField = "name";
                  } else if (field === "job_role_id") {
                    table = "job_roles";
                    dataField = "title";
                  }

                  if (table) {
                    const { data, error } = await (supabase as any)
                      .from(table)
                      .insert({ [dataField]: newValue, company_id: companyId })
                      .select()
                      .single();

                    if (error) throw error;

                    if (data) {
                      const { error: updateError } = await (supabase as any)
                        .from("employees")
                        .update({ [field]: data.id })
                        .eq("id", id);

                      if (updateError) throw updateError;

                      toast.success(
                        `${label} "${newValue}" created and assigned`
                      );
                      setEditMode({ ...editMode, [field]: false });
                      fetchEmployeeData();
                      fetchDropdownData();
                    }
                  }
                } catch (e) {
                  console.error(e);
                  toast.error(`Failed to create ${label}`);
                }
              }}
            />
          </div>
        ) : (
          <Input
            type={type}
            value={inputValue}
            onChange={(e) => {
              if (field === "first_name") {
                setFirstName(e.target.value);
              } else if (field === "last_name") {
                setLastName(e.target.value);
              } else {
                setFormData({ ...formData, [field]: e.target.value });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleFieldSave(field);
              } else if (e.key === "Escape") {
                handleFieldCancel(field);
              }
            }}
            onBlur={() => handleFieldCancel(field)}
            autoFocus
          />
        )}
      </div>
    );
  };

  // Helper function to render note content with colored @mentions
  const renderNoteContent = (content: string) => {
    if (!content) return null;

    // Check if content contains HTML tags (rich text)
    const containsHtml = /<[a-z][\s\S]*>/i.test(content);

    if (containsHtml) {
      // Render HTML content with @mention highlighting
      const processedHtml = content.replace(
        /(@\w+(?:\s+\w+)*)/g,
        '<span class="bg-primary/20 text-primary px-1 rounded">$1</span>'
      );
      return <span dangerouslySetInnerHTML={{ __html: processedHtml }} />;
    }

    // Plain text fallback - split content by @mentions
    const parts = content.split(/(@\w+(?:\s+\w+)*)/g);

    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span key={index} className="bg-primary/20 text-primary px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Get automatic checkup status based on dates
  const getCheckupStatus = (checkup: HealthCheckup) => {
    if (checkup.completion_date) {
      return { label: 'Done', variant: 'default' as const };
    }
    if (checkup.appointment_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const apptDate = new Date(checkup.appointment_date);
      apptDate.setHours(0, 0, 0, 0);

      if (apptDate <= today) {
        return { label: 'Due', variant: 'destructive' as const };
      }
      return { label: 'Planned', variant: 'secondary' as const };
    }
    return { label: 'Open', variant: 'outline' as const };
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-[1400px]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/employees")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("common.back")}
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{employee.full_name || "Employee Profile"}</h1>
              <p className="text-muted-foreground">
                {t("employees.employeeNumber")} #{employee.employee_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="active-toggle" className="text-sm font-medium">
                {employee.is_active
                  ? t("employees.active")
                  : t("employees.inactive")}
              </Label>
              <Switch
                id="active-toggle"
                checked={employee.is_active}
                onCheckedChange={handleToggleActive}
              />
            </div>
            <Badge variant={employee.is_active ? "default" : "secondary"}>
              {employee.is_active
                ? t("employees.active")
                : t("employees.inactive")}
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 overflow-x-auto flex-nowrap no-scrollbar">
            <TabsTrigger value="overview" className="px-4 py-2">
              Overview
            </TabsTrigger>
            {hasPermission("healthCheckups") && (
              <TabsTrigger value="checkups" className="px-4 py-2">
                Check-Ups
              </TabsTrigger>
            )}
            {hasPermission("documents") && (
              <TabsTrigger value="documents" className="px-4 py-2">
                Documents
              </TabsTrigger>
            )}
            <TabsTrigger value="activity" className="px-4 py-2">
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Employee Details, Tags, Contact & Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* 1. Employee Details & Records Card - FIRST */}
                <Card>
                  <CardHeader>
                    <CardTitle>Employee Details & Records</CardTitle>
                    <CardDescription>
                      Click on any field to edit. Press Enter to save.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {renderEditableField(
                        "employee_number",
                        t("employees.employeeNumber"),
                        employee.employee_number
                      )}
                      {renderEditableField(
                        "email",
                        t("employees.email"),
                        employee.email
                      )}
                      {renderEditableField(
                        "first_name",
                        t("employees.firstName"),
                        firstName
                      )}
                      {renderEditableField(
                        "last_name",
                        t("employees.lastName"),
                        lastName
                      )}
                      {renderEditableField(
                        "hire_date",
                        t("employees.hireDate"),
                        employee.hire_date,
                        "date"
                      )}
                      {renderEditableField(
                        "department_id",
                        t("employees.department"),
                        employee.departments?.name || "No Department",
                        "select",
                        departments
                      )}
                      {renderEditableField(
                        "job_role_id",
                        t("employees.jobRole"),
                        employee.job_roles?.title || "No Job Role",
                        "select",
                        jobRoles
                      )}
                      {renderEditableField(
                        "exposure_group_id",
                        "Exposure Group",
                        employee.exposure_groups?.name || "No Exposure Group",
                        "select",
                        exposureGroups
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Tags Section - SECOND */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Tags
                  </span>
                  {employee.tags && employee.tags.length > 0
                    ? employee.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1.5 hover:text-destructive focus:outline-none"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))
                    : null}
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="Add tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                      className="text-xs h-7 w-32"
                    />
                    <Button
                      onClick={handleAddTag}
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

{/* 3. Contact Card - THIRD */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-medium">{employee.email}</span>
                      </div>
                      <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                        <span className="text-muted-foreground">
                          Employee #
                        </span>
                        <span className="font-medium">
                          {employee.employee_number}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 3.4. Trainings & Zertifikate Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <GraduationCap className="w-4 h-4" />
                      Schulungen & Zertifikate
                    </CardTitle>
                    <CardDescription>
                      Zugewiesene Kurse, Fortschritt und ausgestellte Zertifikate
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingCourses ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : courseProgressList.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-4">
                        Keine Kurse zugewiesen
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {courseProgressList.map((course) => (
                          <div key={course.course_id} className="p-3 border rounded-lg space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm">{course.course_name}</p>
                              {course.certificate ? (
                                <Badge
                                  className="bg-amber-100 text-amber-700 border-amber-200 text-xs cursor-pointer hover:bg-amber-200 transition-colors flex-shrink-0"
                                  onClick={() =>
                                    downloadCertificateForEmployee(
                                      employee?.full_name || "Teilnehmer",
                                      course.course_name,
                                      course.certificate
                                    )
                                  }
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Zertifikat
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  {course.completed_lessons}/{course.total_lessons} Lektionen
                                </span>
                              )}
                            </div>
                            <Progress
                              value={course.percent}
                              className={`h-2 ${course.percent === 100 ? "[&>div]:bg-green-500" : ""}`}
                            />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{course.percent}% abgeschlossen</span>
                              {course.certificate?.issued_at && (
                                <span>
                                  Ausgestellt am {new Date(course.certificate.issued_at).toLocaleDateString("de-DE")}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 3.5. Unified Profile Fields Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Profile Fields</CardTitle>

                      {/* Action buttons on the right */}
                      <div className="flex items-center gap-2">
                        {/* Use Template Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => setShowTemplateDialog(true)}
                          disabled={profileFieldTemplates.length === 0}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Use Template
                        </Button>

                        {/* Add profile field button */}
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-8 text-muted-foreground"
                            onClick={() =>
                              setShowProfileFieldMenu(!showProfileFieldMenu)
                            }
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add profile field
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>

                          {showProfileFieldMenu && (
                            <Card className="absolute top-full right-0 mt-1 w-48 z-50 shadow-lg">
                              <CardContent className="p-2">
                                <div className="space-y-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs"
                                    onClick={() =>
                                      handleAddProfileField("Single-line text")
                                    }
                                  >
                                    <FileText className="w-3 h-3 mr-2" />
                                    Single-line text
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs"
                                    onClick={() =>
                                      handleAddProfileField("Multi-line text")
                                    }
                                  >
                                    <List className="w-3 h-3 mr-2" />
                                    Multi-line text
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs"
                                    onClick={() =>
                                      handleAddProfileField("Yes/No")
                                    }
                                  >
                                    <CheckCircle className="w-3 h-3 mr-2" />
                                    Yes / No
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs"
                                    onClick={() => handleAddProfileField("Date")}
                                  >
                                    <CalendarIcon className="w-3 h-3 mr-2" />
                                    Date
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs"
                                    onClick={() =>
                                      handleAddProfileField("Number")
                                    }
                                  >
                                    <Hash className="w-3 h-3 mr-2" />
                                    Number
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {!selectedProfileTemplateId && (
                        <>
                          {/* Special Fields: Languages, Skills, Salary */}
                          {/* Languages */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              {editingSpecialFieldLabel === "languages" ? (
                                <Input
                                  value={languagesLabel}
                                  onChange={(e) => setLanguagesLabel(e.target.value)}
                                  onBlur={() => setEditingSpecialFieldLabel(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") setEditingSpecialFieldLabel(null);
                                  }}
                                  className="text-sm font-medium h-7 w-48"
                                  autoFocus
                                />
                              ) : (
                                <Label
                                  className="text-sm font-medium cursor-pointer hover:text-primary"
                                  onClick={() => setEditingSpecialFieldLabel("languages")}
                                >
                                  {languagesLabel}
                                </Label>
                              )}
                              <Pencil
                                className="w-3 h-3 text-muted-foreground cursor-pointer hover:text-primary"
                                onClick={() => setEditingSpecialFieldLabel("languages")}
                              />
                            </div>
                            {editingSpecialField === "languages" ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={languages}
                                  onChange={(e) => setLanguages(e.target.value)}
                                  placeholder="Enter languages (e.g., English, German, Spanish)"
                                  className="text-sm min-h-[80px]"
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleSpecialFieldSave("languages")
                                    }
                                  >
                                    <Save className="w-3 h-3 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleSpecialFieldCancel("languages")
                                    }
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p
                                className="text-sm text-muted-foreground whitespace-pre-wrap cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                                onClick={() => setEditingSpecialField("languages")}
                              >
                                {languages || "No languages specified"}
                              </p>
                            )}
                          </div>

                          {/* Skills */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              {editingSpecialFieldLabel === "skills" ? (
                                <Input
                                  value={skillsLabel}
                                  onChange={(e) => setSkillsLabel(e.target.value)}
                                  onBlur={() => setEditingSpecialFieldLabel(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") setEditingSpecialFieldLabel(null);
                                  }}
                                  className="text-sm font-medium h-7 w-48"
                                  autoFocus
                                />
                              ) : (
                                <Label
                                  className="text-sm font-medium cursor-pointer hover:text-primary"
                                  onClick={() => setEditingSpecialFieldLabel("skills")}
                                >
                                  {skillsLabel}
                                </Label>
                              )}
                              <Pencil
                                className="w-3 h-3 text-muted-foreground cursor-pointer hover:text-primary"
                                onClick={() => setEditingSpecialFieldLabel("skills")}
                              />
                            </div>
                            {editingSpecialField === "skills" ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={skills}
                                  onChange={(e) => setSkills(e.target.value)}
                                  placeholder="Enter skills (e.g., Project Management, Safety Training)"
                                  className="text-sm min-h-[80px]"
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSpecialFieldSave("skills")}
                                  >
                                    <Save className="w-3 h-3 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleSpecialFieldCancel("skills")
                                    }
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p
                                className="text-sm text-muted-foreground whitespace-pre-wrap cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                                onClick={() => setEditingSpecialField("skills")}
                              >
                                {skills || "No skills specified"}
                              </p>
                            )}
                          </div>

                          {/* Salary */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              {editingSpecialFieldLabel === "salary" ? (
                                <Input
                                  value={salaryLabel}
                                  onChange={(e) => setSalaryLabel(e.target.value)}
                                  onBlur={() => setEditingSpecialFieldLabel(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") setEditingSpecialFieldLabel(null);
                                  }}
                                  className="text-sm font-medium h-7 w-48"
                                  autoFocus
                                />
                              ) : (
                                <Label
                                  className="text-sm font-medium cursor-pointer hover:text-primary"
                                  onClick={() => setEditingSpecialFieldLabel("salary")}
                                >
                                  {salaryLabel}
                                </Label>
                              )}
                              <Pencil
                                className="w-3 h-3 text-muted-foreground cursor-pointer hover:text-primary"
                                onClick={() => setEditingSpecialFieldLabel("salary")}
                              />
                            </div>
                            {editingSpecialField === "salary" ? (
                              <div className="space-y-2">
                                <Input
                                  type="text"
                                  value={salary}
                                  onChange={(e) => setSalary(e.target.value)}
                                  placeholder="Enter salary (e.g., EUR 50,000 per year)"
                                  className="text-sm"
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSpecialFieldSave("salary")}
                                  >
                                    <Save className="w-3 h-3 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleSpecialFieldCancel("salary")
                                    }
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p
                                className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                                onClick={() => setEditingSpecialField("salary")}
                              >
                                {salary || "No salary specified"}
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      {/* Custom Profile Fields - Same style as special fields */}
                      {profileFields.map((field) => (
                        <div key={field.id}>
                          <div className="flex items-center gap-2 mb-2">
                            {editingCustomFieldLabel === field.id ? (
                              <Input
                                value={customFieldLabelEditValue}
                                onChange={(e) => setCustomFieldLabelEditValue(e.target.value)}
                                onBlur={() => {
                                  handleUpdateProfileField(field.id, {
                                    label: customFieldLabelEditValue,
                                  });
                                  setEditingCustomFieldLabel(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdateProfileField(field.id, {
                                      label: customFieldLabelEditValue,
                                    });
                                    setEditingCustomFieldLabel(null);
                                  }
                                }}
                                className="text-sm font-medium h-7 w-48"
                                autoFocus
                              />
                            ) : (
                              <Label
                                className="text-sm font-medium cursor-pointer hover:text-primary"
                                onClick={() => {
                                  setEditingCustomFieldLabel(field.id);
                                  setCustomFieldLabelEditValue(field.label);
                                }}
                              >
                                {field.label}
                              </Label>
                            )}
                            <Pencil
                              className="w-3 h-3 text-muted-foreground cursor-pointer hover:text-primary"
                              onClick={() => {
                                setEditingCustomFieldLabel(field.id);
                                setCustomFieldLabelEditValue(field.label);
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 ml-auto"
                              onClick={() => handleDeleteProfileField(field.id)}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>

                          {/* Editable value section */}
                          {editingCustomField === field.id ? (
                            <div className="space-y-2">
                              {field.type === "Yes/No" ? (
                                <div className="flex items-center gap-2 p-2">
                                  <Switch
                                    checked={customFieldEditValue}
                                    onCheckedChange={(checked) =>
                                      setCustomFieldEditValue(checked)
                                    }
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {customFieldEditValue ? "Yes" : "No"}
                                  </span>
                                </div>
                              ) : field.type === "Date" ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={`w-full justify-start text-left font-normal text-sm h-10 ${!customFieldEditValue && "text-muted-foreground"
                                        }`}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {customFieldEditValue ? (
                                        format(new Date(customFieldEditValue), "PPP")
                                      ) : (
                                        <span>{t("common.pickDate")}</span>
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={
                                        customFieldEditValue
                                          ? new Date(customFieldEditValue)
                                          : undefined
                                      }
                                      onSelect={(date) =>
                                        setCustomFieldEditValue(
                                          date ? format(date, "yyyy-MM-dd") : ""
                                        )
                                      }
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              ) : field.type === "Number" ? (
                                <Input
                                  type="number"
                                  value={customFieldEditValue || ""}
                                  onChange={(e) =>
                                    setCustomFieldEditValue(e.target.value)
                                  }
                                  placeholder="Enter number"
                                  className="text-sm"
                                  autoFocus
                                />
                              ) : field.type === "Multi-line text" ? (
                                <Textarea
                                  value={customFieldEditValue || ""}
                                  onChange={(e) =>
                                    setCustomFieldEditValue(e.target.value)
                                  }
                                  placeholder="Enter text"
                                  className="text-sm min-h-[80px]"
                                  autoFocus
                                />
                              ) : (
                                <Input
                                  type="text"
                                  value={customFieldEditValue || ""}
                                  onChange={(e) =>
                                    setCustomFieldEditValue(e.target.value)
                                  }
                                  placeholder="Enter text"
                                  className="text-sm"
                                  autoFocus
                                />
                              )}

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    handleUpdateProfileField(field.id, {
                                      value: customFieldEditValue,
                                    });
                                    setEditingCustomField(null);
                                  }}
                                >
                                  <Save className="w-3 h-3 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCustomField(null);
                                    setCustomFieldEditValue("");
                                  }}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p
                              className="text-sm text-muted-foreground whitespace-pre-wrap cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                              onClick={() => {
                                setEditingCustomField(field.id);
                                setCustomFieldEditValue(field.value || "");
                              }}
                            >
                              {field.type === "Yes/No"
                                ? (field.value ? "Yes" : "No")
                                : (field.value || `No ${field.label.toLowerCase()} specified`)
                              }
                            </p>
                          )}
                        </div>
                      ))}

                      {/* Empty state */}
                      {profileFields.length === 0 && (
                        <div className="border-t pt-4">
                          <div className="text-center py-4 text-muted-foreground text-xs border border-dashed rounded-lg">
                            No custom fields yet. Click "Add profile field" to create one.
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Use Template Dialog */}
                <Dialog open={showTemplateDialog} onOpenChange={(open) => {
                  setShowTemplateDialog(open);
                  if (open && selectedProfileTemplateId) {
                    setSelectedTemplateId(selectedProfileTemplateId);
                    fetchTemplatePreviewFields(selectedProfileTemplateId);
                  }
                  if (!open) {
                    setSelectedTemplateId(null);
                    setTemplatePreviewFields([]);
                  }
                }}>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Use Profile Field Template</DialogTitle>
                      <DialogDescription>
                        Select which profile fields from Settings to apply to this employee.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      {profileFieldTemplates.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="font-medium mb-2">No templates available</p>
                          <p className="text-sm">Go to Settings → Profile Fields to create templates</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
                          <div className="space-y-2">
                            {profileFieldTemplates.map((template) => {
                              const isSelected = selectedTemplateId === template.id;
                              return (
                                <div
                                  key={template.id}
                                  className={`flex items-center gap-3 p-2 border rounded text-sm cursor-pointer transition-colors ${isSelected
                                    ? "bg-primary/10 border-primary"
                                    : "bg-background hover:bg-muted/50"
                                    }`}
                                  onClick={() => {
                                    setSelectedTemplateId(template.id);
                                    fetchTemplatePreviewFields(template.id);
                                  }}
                                >
                                  <div className="flex-1">
                                    <div className="font-medium">{template.name}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                      <span>{template.fields?.length || 0} fields</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/20">
                            {selectedTemplateId ? (
                              templatePreviewFields.length > 0 ? (
                                templatePreviewFields.map((field) => (
                                  <div
                                    key={field.id}
                                    className="flex items-center justify-between text-sm border-b border-muted pb-2 last:border-b-0"
                                  >
                                    <div className="font-medium">{field.field_label}</div>
                                    <div className="text-xs text-muted-foreground capitalize">
                                      {field.field_type}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  No fields in this template yet.
                                </div>
                              )
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                Select a template to preview its fields.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowTemplateDialog(false);
                          setSelectedTemplateId(null);
                          setTemplatePreviewFields([]);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={applyTemplate}
                        disabled={!selectedTemplateId}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Apply Template
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Right Column - Tasks & Notes */}
              <div className="lg:col-span-1 space-y-6">
                {/* Team Member Info Panel */}
                {linkedTeamMember && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="w-4 h-4" />
                        Team-Rolle
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                          {(linkedTeamMember.first_name?.[0] ?? "")}
                          {(linkedTeamMember.last_name?.[0] ?? "")}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {linkedTeamMember.first_name} {linkedTeamMember.last_name}
                          </p>
                          <Badge variant="outline" className="text-xs mt-0.5">
                            {linkedTeamMember.role}
                          </Badge>
                        </div>
                      </div>
                      {linkedTeamMember.line_manager && (
                        <div className="border-t pt-3 text-sm">
                          <span className="text-muted-foreground text-xs uppercase tracking-wide font-medium">
                            Vorgesetzter
                          </span>
                          <p className="mt-0.5 font-medium">
                            {linkedTeamMember.line_manager.first_name}{" "}
                            {linkedTeamMember.line_manager.last_name}
                          </p>
                          {linkedTeamMember.line_manager.role && (
                            <p className="text-xs text-muted-foreground">
                              {linkedTeamMember.line_manager.role}
                            </p>
                          )}
                        </div>
                      )}
                      {!linkedTeamMember.line_manager_id && (
                        <p className="text-xs text-muted-foreground border-t pt-2">
                          Kein Vorgesetzter zugeordnet
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Tasks Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ClipboardList className="w-4 h-4" />
                      Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Task Input with Due Date and Priority */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              placeholder="Add a task..."
                              value={newTaskTitle}
                              onChange={(e) => {
                                const value = e.target.value;
                                const cursorPos = e.target.selectionStart || 0;
                                setNewTaskTitle(value);

                                const textBeforeCursor = value.substring(
                                  0,
                                  cursorPos
                                );
                                const lastAtIndex =
                                  textBeforeCursor.lastIndexOf("@");

                                if (lastAtIndex !== -1) {
                                  const textAfterAt =
                                    textBeforeCursor.substring(lastAtIndex + 1);
                                  if (!textAfterAt.includes(" ")) {
                                    setTaskMentionSearch(textAfterAt);
                                    setShowTaskMentionDropdown(true);
                                  } else {
                                    setShowTaskMentionDropdown(false);
                                  }
                                } else {
                                  setShowTaskMentionDropdown(false);
                                }
                              }}
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleCreateTask()
                              }
                              className="text-sm"
                            />
                            {showTaskMentionDropdown &&
                              filteredTaskEmployees.length > 0 && (
                                <Card className="absolute top-full mt-1 w-full max-h-48 overflow-y-auto z-50 shadow-lg">
                                  <CardContent className="p-2">
                                    {filteredTaskEmployees.map((emp) => (
                                      <div
                                        key={emp.id}
                                        className="px-3 py-2 hover:bg-muted rounded cursor-pointer"
                                        onClick={() => {
                                          const cursorPos = newTaskTitle.length;
                                          const textBeforeCursor =
                                            newTaskTitle.substring(
                                              0,
                                              cursorPos
                                            );
                                          const lastAtIndex =
                                            textBeforeCursor.lastIndexOf("@");
                                          const textBeforeAt =
                                            newTaskTitle.substring(
                                              0,
                                              lastAtIndex
                                            );
                                          const textAfterCursor =
                                            newTaskTitle.substring(cursorPos);
                                          setNewTaskTitle(
                                            `${textBeforeAt}@${emp.full_name} ${textAfterCursor}`
                                          );
                                          setShowTaskMentionDropdown(false);
                                        }}
                                      >
                                        <div className="font-medium text-sm">
                                          {emp.full_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          #{emp.employee_number}
                                        </div>
                                      </div>
                                    ))}
                                  </CardContent>
                                </Card>
                              )}
                          </div>
                          <Button onClick={handleCreateTask} size="sm">
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Due Date and Priority Buttons */}
                        <div className="flex gap-2">
                          {/* Set due date button */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8"
                              >
                                <CalendarIcon className="w-3 h-3 mr-1" />
                                {newTaskDueDate
                                  ? format(newTaskDueDate, "MMM d")
                                  : "Set due date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={newTaskDueDate}
                                onSelect={setNewTaskDueDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>

                          {/* Priority button */}
                          <Select
                            value={newTaskPriority}
                            onValueChange={(value: "low" | "medium" | "high") =>
                              setNewTaskPriority(value)
                            }
                          >
                            <SelectTrigger className="w-[80px] h-8 text-xs">
                              <SelectValue>
                                <span className="flex items-center gap-1">
                                  <span
                                    className={`w-2 h-2 rounded-full ${newTaskPriority === "high"
                                      ? "bg-red-500"
                                      : newTaskPriority === "medium"
                                        ? "bg-yellow-500"
                                        : "bg-green-500"
                                      }`}
                                  />
                                  PR
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-green-500" />
                                  Low
                                </span>
                              </SelectItem>
                              <SelectItem value="medium">
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                  Medium
                                </span>
                              </SelectItem>
                              <SelectItem value="high">
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-red-500" />
                                  High
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {/* @ button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowTaskMentionDropdown(!showTaskMentionDropdown)}
                          >
                            <AtSign className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Hide completed tasks toggle — nur wenn erledigte Tasks vorhanden */}
                      {tasks.some((t) => t.status === "completed") && (
                        <div className="flex justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground"
                            onClick={() =>
                              toggleHideCompleted(!hideCompletedTasks)
                            }
                          >
                            {hideCompletedTasks ? (
                              <>
                                <Eye className="w-3 h-3 mr-1" />
                                Show completed tasks (
                                {tasks.filter((t) => t.status === "completed").length}
                                )
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3 mr-1" />
                                Hide completed tasks
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2 pr-4">
                          {tasks.length === 0 ? (
                            <p className="text-center text-muted-foreground text-xs py-4">
                              No tasks assigned
                            </p>
                          ) : (
                            <>
                              {tasks
                                .filter(
                                  (task) =>
                                    !hideCompletedTasks ||
                                    task.status !== "completed"
                                )
                                .map((task) => (
                                  <div
                                    key={task.id}
                                    className="flex items-start gap-2 p-2 border rounded hover:bg-muted/50 text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={task.status === "completed"}
                                      onChange={() =>
                                        handleToggleTaskStatus(task)
                                      }
                                      className="w-3.5 h-3.5 rounded border-gray-300 mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <span
                                        className={
                                          task.status === "completed"
                                            ? "line-through text-muted-foreground text-xs"
                                            : "text-xs"
                                        }
                                      >
                                        {task.title}
                                      </span>
                                      {task.assigned_to !== id && (task as any).assigned_employee && (
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                          → Zugewiesen an: {(task as any).assigned_employee.full_name}
                                        </p>
                                      )}
                                      <div className="flex flex-wrap items-center gap-1 mt-1">
                                        {task.due_date && (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] px-1 py-0"
                                          >
                                            {new Date(
                                              task.due_date
                                            ).toLocaleDateString()}
                                          </Badge>
                                        )}
                                        <Badge
                                          variant={
                                            task.priority === "high"
                                              ? "destructive"
                                              : task.priority === "medium"
                                                ? "default"
                                                : "secondary"
                                          }
                                          className="text-[10px] px-1 py-0"
                                        >
                                          {task.priority}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </>
                          )}
                        </div>
                      </ScrollArea>

                    </div>
                  </CardContent>
                </Card>

                {/* Notes Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <StickyNote className="w-4 h-4" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Add Note Input with Formatting Toolbar */}
                      <div className="space-y-2">
                        <div className="border rounded-lg p-3 space-y-2">
                          {/* Formatting Toolbar */}
                          <div className="flex items-center gap-1 pb-2 border-b">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 w-7 p-0 ${activeFormats.has('bold') ? 'bg-accent' : ''}`}
                              onClick={() => applyFormatting('bold')}
                            >
                              <Bold className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 w-7 p-0 ${activeFormats.has('italic') ? 'bg-accent' : ''}`}
                              onClick={() => applyFormatting('italic')}
                            >
                              <Italic className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 w-7 p-0 ${activeFormats.has('underline') ? 'bg-accent' : ''}`}
                              onClick={() => applyFormatting('underline')}
                            >
                              <Underline className="w-3.5 h-3.5" />
                            </Button>
                            <div className="w-px h-4 bg-border mx-1" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 w-7 p-0 ${activeFormats.has('list') ? 'bg-accent' : ''}`}
                              onClick={() => applyFormatting('list')}
                            >
                              <List className="w-3.5 h-3.5" />
                            </Button>
                            <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                >
                                  <Link className="w-3.5 h-3.5" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-3" align="start">
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Insert Link</p>
                                  <Input
                                    placeholder="https://example.com"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    className="h-8 text-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && handleInsertLink()}
                                  />
                                  <Input
                                    placeholder="Display text (optional)"
                                    value={linkLabel}
                                    onChange={(e) => setLinkLabel(e.target.value)}
                                    className="h-8 text-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && handleInsertLink()}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setShowLinkPopover(false); setLinkUrl(''); setLinkLabel(''); }}>Cancel</Button>
                                    <Button size="sm" className="h-7 text-xs" onClick={handleInsertLink} disabled={!linkUrl.trim()}>Insert</Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <div className="w-px h-4 bg-border mx-1" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => noteAttachmentInputRef.current?.click()}
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                            </Button>
                            <input
                              ref={noteAttachmentInputRef}
                              type="file"
                              className="hidden"
                              onChange={handleNoteAttachment}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                const editorDiv = notesTextareaRef.current;
                                if (editorDiv) {
                                  editorDiv.focus();
                                  // Insert @ at the current cursor position
                                  const selection = window.getSelection();
                                  if (selection && selection.rangeCount > 0) {
                                    const range = selection.getRangeAt(0);
                                    const textNode = document.createTextNode('@');
                                    range.insertNode(textNode);
                                    range.setStartAfter(textNode);
                                    range.collapse(true);
                                    selection.removeAllRanges();
                                    selection.addRange(range);
                                  } else {
                                    document.execCommand('insertText', false, '@');
                                  }
                                  setNotes(editorDiv.innerHTML);
                                  // Trigger the mention dropdown
                                  setTimeout(() => setShowNotesMentionDropdown(true), 50);
                                }
                              }}
                            >
                              <AtSign className="w-3.5 h-3.5" />
                            </Button>
                            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                >
                                  <Smile className="w-3.5 h-3.5" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-2" align="end">
                                <div className="grid grid-cols-8 gap-1">
                                  {commonEmojis.map((emoji) => (
                                    <button
                                      key={emoji}
                                      className="h-8 w-8 flex items-center justify-center hover:bg-muted rounded text-lg cursor-pointer"
                                      onClick={() => handleInsertEmoji(emoji)}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Rich Text Editor */}
                          <div className="relative">
                            <div
                              ref={notesTextareaRef}
                              contentEditable
                              onInput={() => {
                                handleNotesChange();
                                updateActiveFormats();
                              }}
                              onClick={updateActiveFormats}
                              onKeyUp={updateActiveFormats}
                              data-placeholder="Add a note..."
                              className="min-h-[60px] text-sm border-0 p-0 focus-visible:outline-none resize-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
                              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                            />
                            {showNotesMentionDropdown &&
                              filteredNotesEmployees.length > 0 && (
                                <Card className="absolute bottom-full mb-1 w-full max-h-48 overflow-y-auto z-50 shadow-lg">
                                  <CardContent className="p-2">
                                    {filteredNotesEmployees.map((emp) => (
                                      <div
                                        key={emp.id}
                                        className="px-3 py-2 hover:bg-muted rounded cursor-pointer"
                                        onMouseDown={(e) => {
                                          e.preventDefault(); // Prevent editor from losing focus
                                          handleMentionSelect(emp.full_name);
                                        }}
                                      >
                                        <div className="font-medium text-sm">
                                          {emp.full_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {emp.employee_number} • {emp.role || "Member"}
                                        </div>
                                      </div>
                                    ))}
                                  </CardContent>
                                </Card>
                              )}
                          </div>

                          {/* Enhanced Visibility Selector */}
                          <div className="flex items-center gap-2 pt-2">
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            <div className="flex items-center gap-2">
                              {/* Everyone Button */}
                              <Button
                                variant={noteVisibilityMode === 'everyone' ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setNoteVisibilityMode('everyone');
                                  setSelectedVisibilityUsers([]);
                                }}
                              >
                                Everyone
                              </Button>

                              {/* Specific Users Button */}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant={noteVisibilityMode === 'specific' ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-7 text-xs"
                                  >
                                    Specific Users
                                    {selectedVisibilityUsers.length > 0 && (
                                      <Badge variant="secondary" className="ml-2 text-xs h-4 px-1">
                                        {selectedVisibilityUsers.length}
                                      </Badge>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-0" align="start">
                                  <Card className="border-0 shadow-none">
                                    <CardHeader className="p-3 pb-2">
                                      <CardTitle className="text-sm">Select Users</CardTitle>
                                      <CardDescription className="text-xs">
                                        Choose who can see this note
                                      </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                      <ScrollArea className="h-48">
                                        <div className="p-2 space-y-1">
                                          {teamMembers.map((member) => {
                                            const isSelected = selectedVisibilityUsers.includes(member.id);
                                            return (
                                              <div
                                                key={member.id}
                                                className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted ${isSelected ? 'bg-primary/10' : ''
                                                  }`}
                                                onClick={() => {
                                                  setNoteVisibilityMode('specific');
                                                  setSelectedVisibilityUsers(prev =>
                                                    prev.includes(member.id)
                                                      ? prev.filter(id => id !== member.id)
                                                      : [...prev, member.id]
                                                  );
                                                }}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  onChange={() => { }}
                                                  className="w-3.5 h-3.5 cursor-pointer"
                                                />
                                                <div className="flex-1 text-xs">
                                                  <div className="font-medium">
                                                    {member.first_name} {member.last_name}
                                                  </div>
                                                  <div className="text-muted-foreground text-xs">
                                                    {member.role || 'User'}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </ScrollArea>
                                    </CardContent>
                                  </Card>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                          >
                            Cancel
                          </Button>

                          <Button
                            onClick={handleSaveNotes}
                            size="sm"
                            className="text-xs h-7"
                          >
                            Save
                          </Button>
                        </div>
                      </div>

                      {/* Notes List */}
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-4 pr-4">
                          {(() => {
                            try {
                              const parsedNotes =
                                employee?.notes &&
                                  (employee.notes.startsWith("[") ||
                                    employee.notes.startsWith("{"))
                                  ? JSON.parse(employee.notes)
                                  : null;

                              if (
                                Array.isArray(parsedNotes) &&
                                parsedNotes.length > 0
                              ) {
                                // Resolve current user's team_member row ID for visibility checks
                                const currentUserTeamMemberId = teamMembers.find(
                                  (m) => m.user_id === user?.id
                                )?.id;

                                // Filter notes by visibility:
                                // - 'everyone' (or missing) → visible to all company members
                                // - array of team_member IDs → only those members (+ the author)
                                const visibleNotes = parsedNotes.filter((note: any) => {
                                  if (!note.visibleTo || note.visibleTo === 'everyone') return true;
                                  if (note.author_id === user?.id) return true; // author always sees own note
                                  if (Array.isArray(note.visibleTo) && currentUserTeamMemberId) {
                                    return note.visibleTo.includes(currentUserTeamMemberId);
                                  }
                                  return false;
                                });

                                if (visibleNotes.length === 0) {
                                  return (
                                    <div className="text-center text-muted-foreground py-8 text-sm">
                                      No notes to display
                                    </div>
                                  );
                                }

                                return visibleNotes.map((note: any) => (
                                  <div key={note.id} className="flex gap-4 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                                    {/* Avatar - Larger and more prominent */}
                                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold text-base">
                                      {note.author?.[0]?.toUpperCase() || "U"}
                                    </div>

                                    {/* Note Content */}
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="font-semibold text-sm">
                                            {note.author || "Current User"}
                                          </p>
                                          {/* Show role if available from team members data */}
                                          {(() => {
                                            const member = teamMembers.find(
                                              (m) => `${m.first_name} ${m.last_name}` === note.author
                                            );
                                            return member?.role ? (
                                              <Badge variant="secondary" className="text-xs px-2 py-0">
                                                {member.role}
                                              </Badge>
                                            ) : null;
                                          })()}
                                          <span className="text-xs text-muted-foreground">
                                            {note.date
                                              ? new Date(
                                                note.date
                                              ).toLocaleString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              })
                                              : ""}
                                          </span>
                                          {/* Visibility badge */}
                                          {note.visibleTo && note.visibleTo !== 'everyone' ? (
                                            <Badge variant="outline" className="text-xs px-1.5 py-0 border-amber-400 text-amber-600 dark:text-amber-400">
                                              🔒 Specific users
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-xs px-1.5 py-0 border-green-400 text-green-600 dark:text-green-400">
                                              🌐 Everyone
                                            </Badge>
                                          )}
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                                          onClick={() =>
                                            handleDeleteNote(note.id)
                                          }
                                          title="Delete note"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>

                                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                        {renderNoteContent(note.content)}
                                      </p>

                                      {/* Action Buttons */}
                                      <div className="flex items-center gap-3">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={`h-6 px-2 text-xs ${note.likes?.includes(user?.id)
                                            ? "text-primary bg-primary/10"
                                            : "text-muted-foreground hover:text-foreground"
                                            }`}
                                          onClick={() => handleLikeNote(note.id)}
                                        >
                                          <ThumbsUp className={`w-3 h-3 mr-1 ${note.likes?.includes(user?.id) ? "fill-current" : ""}`} />
                                          Like{note.likes?.length > 0 ? ` (${note.likes.length})` : ""}
                                        </Button>

                                        
                                      </div>

                                      {/* Display existing replies */}
                                      {note.replies && note.replies.length > 0 && (
                                        <div className="mt-3 pl-4 border-l-2 border-muted space-y-2">
                                          {note.replies.map((reply: any) => (
                                            <div key={reply.id} className="flex gap-2 p-2 rounded bg-muted/30">
                                              <div className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                                                {reply.author?.[0]?.toUpperCase() || "U"}
                                              </div>
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                  <p className="font-medium text-xs">{reply.author}</p>
                                                  <span className="text-xs text-muted-foreground">
                                                    {reply.date
                                                      ? new Date(reply.date).toLocaleString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                      })
                                                      : ""}
                                                  </span>
                                                </div>
                                                <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">
                                                  {renderNoteContent(reply.content)}
                                                </p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Reply Input - shown below the note when replying */}
                                      {replyingToNoteId === note.id && (
                                        <div className="mt-3 pl-4 border-l-2 border-primary/20">
                                          <div className="space-y-2">
                                            <Textarea
                                              placeholder="Write a reply..."
                                              value={replyText}
                                              onChange={(e) =>
                                                setReplyText(e.target.value)
                                              }
                                              className="min-h-[60px] text-sm"
                                            />
                                            <div className="flex justify-end gap-2">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs h-7"
                                                onClick={() => {
                                                  setReplyingToNoteId(null);
                                                  setReplyText("");
                                                }}
                                              >
                                                Cancel
                                              </Button>
                                              <Button
                                                size="sm"
                                                className="text-xs h-7"
                                                onClick={() => handleSaveReply(note.id)}
                                              >
                                                Save
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ));
                              }
                            } catch (e) {
                              console.error("Error parsing notes:", e);
                            }

                            return (
                              <p className="text-center text-muted-foreground text-xs py-4">
                                No notes added yet
                              </p>
                            );
                          })()}
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>

                {/* Notification Preferences — nur auf eigenem Profil */}
                {employee?.user_id === user?.id && (() => {
                  const categories = [
                    { key: "task",     label: "Aufgaben-Zuweisung" },
                    { key: "mention",  label: "@Erwähnungen" },
                    { key: "measure",  label: "Maßnahmen" },
                    { key: "audit",    label: "Audits" },
                    { key: "training", label: "Schulungen" },
                    { key: "checkup",  label: "Gesundheits-Check-Ups" },
                  ];
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Bell className="w-4 h-4" />
                          Benachrichtigungseinstellungen
                        </CardTitle>
                        <CardDescription>
                          Wähle wie du über Ereignisse informiert werden möchtest
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {/* Header */}
                          <div className="grid grid-cols-[1fr_auto_auto] gap-4 pb-2 border-b text-xs font-medium text-muted-foreground">
                            <span>Kategorie</span>
                            <span className="w-16 text-center">In-App</span>
                            <span className="w-16 text-center">E-Mail</span>
                          </div>
                          {categories.map(({ key, label }) => {
                            const pref = notifPrefs[key] ?? { in_app_enabled: true, email_enabled: true };
                            return (
                              <div key={key} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center py-2 border-b last:border-0">
                                <span className="text-sm">{label}</span>
                                <div className="w-16 flex justify-center">
                                  <Switch
                                    checked={pref.in_app_enabled}
                                    onCheckedChange={v => saveNotifPref(key, "in_app_enabled", v)}
                                  />
                                </div>
                                <div className="w-16 flex justify-center">
                                  <Switch
                                    checked={pref.email_enabled}
                                    onCheckedChange={v => saveNotifPref(key, "email_enabled", v)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            </div>
          </TabsContent>

          {/* Check-Ups Tab */}
          <TabsContent value="checkups">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5" />
                      Health Check-Ups
                    </CardTitle>
                    <CardDescription>
                      Manage health examinations and G-Investigations
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsCheckupDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Check-Up
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {healthCheckups.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No check-ups scheduled
                  </p>
                ) : (
                  <div className="space-y-4">
                    {healthCheckups.map((checkup) => {
                      // Calculate if checkup is overdue (applies to both 'open' and 'planned')
                      const today = new Date();
                      const dueDate = checkup.due_date ? new Date(checkup.due_date) : null;
                      const isOverdue = dueDate && today > dueDate && (checkup.status === 'open' || checkup.status === 'planned');

                      return (
                        <Card key={checkup.id} className={`p-4 border rounded-lg space-y-3 ${(() => {
                          if (checkup.status === 'done') return 'bg-green-50 border-green-200';
                          if (isOverdue) return 'bg-red-50 border-red-200';
                          if (checkup.status === 'planned' || checkup.status === 'open') return 'bg-blue-50 border-blue-200';
                          return 'bg-gray-50 border-gray-200';
                        })()
                          }`}>
                          {/* Investigation Name */}
                          <h3 className="font-semibold text-base">
                            {(() => {
                              // Check if investigation_name looks like a UUID (contains hyphens and is long)
                              const isUUID = checkup.investigation_name?.includes('-') && checkup.investigation_name?.length > 30;

                              // If it's a UUID or empty, look up from gInvestigations using investigation_id
                              if (!checkup.investigation_name || isUUID) {
                                const investigation = gInvestigations.find(
                                  (g) => g.id === checkup.investigation_id
                                );
                                return investigation?.name || "Investigation";
                              }

                              // Otherwise use the stored investigation_name
                              return checkup.investigation_name;
                            })()}
                          </h3>

                          {/* Due Date - When investigation expires (no special styling) */}
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">
                              Due Date: {checkup.due_date
                                ? new Date(checkup.due_date).toLocaleDateString('de-DE')
                                : 'Not calculated yet'}
                            </span>
                          </div>

                          {/* Status Badge - Automatic, Read-only */}
                          <div className="flex items-center gap-2">


                            {/* Manual Status Override */}
                            <Select
                              value={checkup.status}
                              onValueChange={(value) =>
                                handleUpdateCheckup(checkup.id, {
                                  status: value,
                                })
                              }
                            >
                              <SelectTrigger
                                className={`w-32 h-8 ${checkup.status === 'done'
                                  ? 'bg-green-100 text-green-800 border-green-300'
                                  : isOverdue
                                    ? 'bg-red-100 text-red-800 border-red-300'
                                    : (checkup.status === 'open' || checkup.status === 'planned')
                                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                                      : ''
                                  }`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="planned">Planned</SelectItem>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Appointment Info (only show if set) */}
                          {checkup.appointment_date && (
                            <p className="text-sm text-muted-foreground">
                              Appointment: {new Date(checkup.appointment_date).toLocaleDateString('de-DE')}
                            </p>
                          )}

                          {/* Notes (if any) */}
                          {checkup.notes && (
                            <p className="text-xs text-muted-foreground italic">
                              {checkup.notes}
                            </p>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 flex-wrap pt-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setSelectedCheckupForAppointment(checkup);
                                setAppointmentDate(checkup.appointment_date ? new Date(checkup.appointment_date) : undefined);
                                setIsAppointmentDialogOpen(true);
                              }}
                              className="text-xs"
                            >
                              <CalendarIcon className="w-3 h-3 mr-1" />
                              Set Appointment
                            </Button>

                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                const completionDate = new Date().toISOString().split('T')[0];
                                // Calculate due date as 3 years from completion
                                const dueDate = new Date();
                                dueDate.setFullYear(dueDate.getFullYear() + 3);
                                const dueDateString = dueDate.toISOString().split('T')[0];

                                handleUpdateCheckup(checkup.id, {
                                  status: 'done',
                                  completion_date: completionDate,
                                  due_date: dueDateString,
                                });
                              }}
                              disabled={checkup.status === 'done'}
                              className="text-xs"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Complete
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCheckup(checkup.id)}
                              className="text-xs"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>

                            {/* Upload Document Button */}
                            <div>
                              <input
                                type="file"
                                id={`doc-upload-${checkup.id}`}
                                className="hidden"
                                onChange={(e) => handleCheckupDocumentUpload(e, checkup.id)}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById(`doc-upload-${checkup.id}`)?.click()}
                                disabled={uploadingDocument === checkup.id}
                                className="text-xs"
                              >
                                <Upload className="w-3 h-3 mr-1" />
                                {uploadingDocument === checkup.id ? 'Uploading...' : 'Upload Document'}
                              </Button>
                            </div>
                          </div>

                          {/* Documents List */}
                          {checkupDocuments[checkup.id] && checkupDocuments[checkup.id].length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs font-medium mb-2">Attached Documents:</p>
                              <div className="space-y-1">
                                {checkupDocuments[checkup.id].map((doc: any) => (
                                  <div key={doc.id} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                                    <div className="flex items-center gap-1 text-xs flex-1">
                                      <FileText className="w-3 h-3 text-blue-600" />
                                      <span className="truncate">{doc.file_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handlePreviewCheckupDocument(doc.file_path)}
                                        className="h-6 w-6 p-0"
                                        title="Preview document"
                                      >
                                        <Eye className="w-3 h-3 text-blue-600" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteCheckupDocument(doc.id, doc.file_path)}
                                        className="h-6 w-6 p-0"
                                        title="Delete document"
                                      >
                                        <Trash2 className="w-3 h-3 text-red-600" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Check-Up Dialog */}
            <Dialog
              open={isCheckupDialogOpen}
              onOpenChange={setIsCheckupDialogOpen}
            >
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Health Check-Up</DialogTitle>
                  <DialogDescription>
                    Schedule a new health examination
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>G-Investigation *</Label>
                    {gInvestigations.length === 0 ? (
                      <div className="space-y-2">
                        <Select disabled>
                          <SelectTrigger className="border-destructive">
                            <SelectValue placeholder="No investigations available" />
                          </SelectTrigger>
                        </Select>
                        <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                          <p className="font-semibold mb-1">
                            Dropdown of Occupational Medical Care (Settings) is
                            missing.
                          </p>
                          <p className="text-muted-foreground">
                            <strong>Explanation:</strong> Company Set up all
                            G-Check Ups which they need for their company. Those
                            selected G-Check ups will be shown in the dropdown
                            list.
                          </p>
                          <p className="mt-2 text-muted-foreground">
                            Please go to{" "}
                            <strong>
                              Settings → Occupational Medical Care
                            </strong>{" "}
                            to configure G-Investigations for your company.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <Select
                        value={checkupFormData.investigation_id}
                        onValueChange={(value) =>
                          setCheckupFormData({
                            ...checkupFormData,
                            investigation_id: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select investigation" />
                        </SelectTrigger>
                        <SelectContent>
                          {gInvestigations.map((inv) => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Date Fields - Row Layout */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Appointment Date (optional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!checkupFormData.appointment_date && "text-muted-foreground"}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {checkupFormData.appointment_date ? (
                              format(new Date(checkupFormData.appointment_date), "PPP")
                            ) : (
                              <span>{t("common.pickDate")}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={checkupFormData.appointment_date ? new Date(checkupFormData.appointment_date) : undefined}
                            onSelect={(date) =>
                              setCheckupFormData({
                                ...checkupFormData,
                                appointment_date: date ? format(date, "yyyy-MM-dd") : "",
                              })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label>Due Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!checkupFormData.due_date && "text-muted-foreground"}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {checkupFormData.due_date ? (
                              format(new Date(checkupFormData.due_date), "PPP")
                            ) : (
                              <span>{t("common.pickDate")}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={checkupFormData.due_date ? new Date(checkupFormData.due_date) : undefined}
                            onSelect={(date) =>
                              setCheckupFormData({
                                ...checkupFormData,
                                due_date: date ? format(date, "yyyy-MM-dd") : "",
                              })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select
                      value={checkupFormData.status}
                      onValueChange={(value: any) =>
                        setCheckupFormData({
                          ...checkupFormData,
                          status: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {checkupFormData.status === "done" && (
                    <div>
                      <Label>Completion Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!checkupFormData.completion_date && "text-muted-foreground"}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {checkupFormData.completion_date ? (
                              format(new Date(checkupFormData.completion_date), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={checkupFormData.completion_date ? new Date(checkupFormData.completion_date) : undefined}
                            onSelect={(date) =>
                              setCheckupFormData({
                                ...checkupFormData,
                                completion_date: date ? format(date, "yyyy-MM-dd") : "",
                              })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={checkupFormData.notes}
                      onChange={(e) =>
                        setCheckupFormData({
                          ...checkupFormData,
                          notes: e.target.value,
                        })
                      }
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCheckupDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCheckup}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Check-Up
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Set Appointment Dialog */}
            <Dialog
              open={isAppointmentDialogOpen}
              onOpenChange={setIsAppointmentDialogOpen}
            >
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Set Appointment Date</DialogTitle>
                  <DialogDescription>
                    Choose an appointment date for this health check-up
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Appointment Date (optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {appointmentDate ? (
                            format(appointmentDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={appointmentDate}
                          onSelect={setAppointmentDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAppointmentDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (appointmentDate && selectedCheckupForAppointment) {
                        handleUpdateCheckup(selectedCheckupForAppointment.id, {
                          appointment_date: format(appointmentDate, "yyyy-MM-dd"),
                          status: 'planned',
                        });
                        setIsAppointmentDialogOpen(false);
                      } else {
                        toast.error("Please select a date");
                      }
                    }}
                  >
                    Save Appointment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documents
                </CardTitle>
                <CardDescription>Employee documents and files</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                    }`}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    Drag and drop files here
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click the button below to select files
                  </p>
                  <Button variant="outline" asChild>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        onChange={handleDocumentUpload}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                      />
                    </label>
                  </Button>
                </div>

                {/* Documents List */}
                {documents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No documents uploaded yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50"
                      >
                        {/* File Type Icon */}
                        {getFileIcon(doc.file_name)}

                        {/* Document Info */}
                        <div className="flex-1">
                          {editingDocumentId === doc.id ? (
                            <div className="flex gap-2 items-center">
                              <Input
                                value={editingDocumentTitle}
                                onChange={(e) =>
                                  setEditingDocumentTitle(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleSaveRename(doc.id);
                                  if (e.key === "Escape") handleCancelRename();
                                }}
                                className="h-8"
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSaveRename(doc.id)}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelRename}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <p className="font-medium">{doc.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.file_name} • Uploaded{" "}
                                {new Date(doc.created_at).toLocaleDateString()}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Action Buttons */}
                        {editingDocumentId !== doc.id && (
                          <>
                            {/* Preview Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreviewDocument(doc)}
                              title="Preview document"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {/* Rename Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartRename(doc)}
                              title="Rename document"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            {/* Download Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const { data, error } = await supabase.storage
                                    .from("documents")
                                    .download(doc.file_path);

                                  if (error) throw error;

                                  const url = URL.createObjectURL(data);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = doc.file_name;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);

                                  toast.success("Document downloaded");
                                } catch (error: any) {
                                  console.error("Error downloading:", error);
                                  toast.error("Failed to download document");
                                }
                              }}
                              title="Download document"
                            >
                              <Download className="w-4 h-4" />
                            </Button>

                            {/* Delete Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={async () => {
                                if (!confirm(`Delete ${doc.title}?`)) return;

                                try {
                                  await supabase.storage
                                    .from("documents")
                                    .remove([doc.file_path]);

                                  await supabase
                                    .from("documents")
                                    .delete()
                                    .eq("id", doc.id);

                                  await logActivity(
                                    "Deleted document",
                                    "delete",
                                    `Deleted file: ${doc.file_name}`,
                                    {
                                      documentId: doc.id,
                                      fileName: doc.file_name,
                                    }
                                  );

                                  toast.success("Document deleted");
                                  fetchDocuments();
                                  fetchActivityLogs();
                                } catch (error: any) {
                                  console.error("Error deleting:", error);
                                  toast.error("Failed to delete document");
                                }
                              }}
                              title="Delete document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document Preview Dialog */}
            <Dialog
              open={showPreviewDialog}
              onOpenChange={setShowPreviewDialog}
            >
              <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>{previewDocument?.title}</DialogTitle>
                  <DialogDescription>
                    {previewDocument?.file_name}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto">
                  {previewDocument &&
                    previewUrl &&
                    (() => {
                      const ext = previewDocument.file_name
                        .split(".")
                        .pop()
                        ?.toLowerCase();
                      const isImage = [
                        "jpg",
                        "jpeg",
                        "png",
                        "gif",
                        "webp",
                      ].includes(ext || "");
                      const isPDF = ext === "pdf";

                      if (isImage) {
                        // Preview images
                        return (
                          <div className="flex items-center justify-center p-4">
                            <img
                              src={previewUrl}
                              alt={previewDocument.title}
                              className="max-w-full h-auto rounded"
                            />
                          </div>
                        );
                      } else if (isPDF) {
                        // Preview PDFs
                        return (
                          <iframe
                            src={previewUrl}
                            className="w-full h-[600px] border rounded"
                            title={previewDocument.title}
                          />
                        );
                      } else {
                        // Other file types - show message and download button
                        return (
                          <div className="flex flex-col items-center justify-center p-8 text-center">
                            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                            <p className="text-lg font-medium mb-2">
                              Preview not available
                            </p>
                            <p className="text-sm text-muted-foreground mb-4">
                              This file type cannot be previewed in the browser.
                            </p>
                            <Button
                              onClick={() => {
                                const a = document.createElement("a");
                                a.href = previewUrl;
                                a.download = previewDocument.file_name;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                toast.success("Document downloaded");
                              }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download File
                            </Button>
                          </div>
                        );
                      }
                    })()}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={handleClosePreview}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Activity Log
                </CardTitle>
                <CardDescription>
                  Complete history of all changes and actions for this employee
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activityLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground font-medium mb-1">
                      No activities tracked yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      All actions related to this employee will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityLogs.map((log) => {
                      // Determine icon based on action type
                      const getActionIcon = () => {
                        const type = log.action_type?.toLowerCase();
                        if (type === "create") return "✨";
                        if (type === "update") return "✏️";
                        if (type === "delete") return "🗑️";
                        if (type === "upload") return "📤";
                        if (type === "status_change") return "🔄";
                        return "📝";
                      };

                      return (
                        <div
                          key={log.id}
                          className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <span className="text-lg">{getActionIcon()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{log.action}</p>
                            {log.details && (
                              <p className="text-sm text-muted-foreground mt-1 break-words">
                                {log.details}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>
                                {new Date(log.changed_at).toLocaleDateString()}{" "}
                                at{" "}
                                {new Date(log.changed_at).toLocaleTimeString()}
                              </span>
                              <span>•</span>
                              <span className="truncate">
                                {log.changed_by_name || "Unknown User"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags">
            <Card>
              <CardHeader>
                <CardTitle>Tags / Keywords</CardTitle>
                <CardDescription>Manage tags for this employee</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a new tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                    />
                    <Button onClick={handleAddTag}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {employee.tags && employee.tags.length > 0 ? (
                      employee.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-3 py-1 text-sm"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 hover:text-destructive focus:outline-none"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No tags added yet.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity / Stress Group Tab */}
          <TabsContent value="groups">
            <Card>
              <CardHeader>
                <CardTitle>Activity / Stress Group</CardTitle>
                <CardDescription>
                  Manage activity and stress groups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Assigned Group</Label>
                      <div className="p-3 bg-muted rounded-md font-medium">
                        {employee.exposure_groups?.name || "No Group Assigned"}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    To change the group, please use the Overview tab.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
