import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
// Removed unused import for Tables
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
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
  DialogTrigger,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Filter,
  Users,
  ClipboardList,
  StickyNote,
  Trash2,
  Save,
  Download,
  Upload,
  FileDown,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RefreshAuthButton } from "@/components/RefreshAuthButton";
import { useAuditLog } from "@/hooks/useAuditLog";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Employee {
  id: string;
  employee_number: string;
  full_name: string;
  email: string;
  department_id: string | null;
  hire_date: string | null;
  is_active: boolean;
  departments: { id: string; name: string } | null;
  job_roles: { title: string } | null;
  exposure_groups: { name: string } | null;
}

export default function Employees() {
  const { companyId, userRole, loading, user } = useAuth();
  const { t } = useLanguage();
  const { hasDetailedPermission, loading: permissionsLoading } = usePermissions();
  const { logAction } = useAuditLog();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employee_number: "",
    first_name: "",
    last_name: "",
    email: "",
    hire_date: "",
    department_id: "",
    job_role_id: "",
  });

  // Tasks and Notes dialog states
  const [isTasksDialogOpen, setIsTasksDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [selectedEmployeeForAction, setSelectedEmployeeForAction] =
    useState<Employee | null>(null);
  const [employeeTasks, setEmployeeTasks] = useState<any[]>([]);
  const [employeeNotes, setEmployeeNotes] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  // Filters
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);

  // Bulk delete states
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Import/Export states
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [lastImportReport, setLastImportReport] = useState<{
    fileName: string;
    totalRows: number;
    importedCount: number;
    skippedCount: number;
    importedRows: string[];
    skippedRows: string[];
  } | null>(null);
  const [isImportGuideDialogOpen, setIsImportGuideDialogOpen] = useState(false);

  useEffect(() => {
    // Debug logging
    console.log("Employees page - Auth state:", {
      loading,
      user: user?.email,
      userId: user?.id,
      userRole,
      companyId,
    });

    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    if (companyId && !permissionsLoading) {
      fetchEmployees();
      fetchDepartments();
      fetchJobRoles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, loading, user, navigate, permissionsLoading]);

  const fetchDepartments = async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from("departments")
      .select("id, name")
      .eq("company_id", companyId);

    if (!error && data) {
      setDepartments(data);
    }
  };

  const fetchJobRoles = async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from("job_roles")
      .select("id, title")
      .eq("company_id", companyId);

    if (!error && data) {
      setJobRoles(data);
    }
  };

  const fetchEmployees = async () => {
    if (!companyId) return;

    let query = supabase
      .from("employees")
      .select(
        `
        *,
        departments(name),
        job_roles(title),
        exposure_groups(name)
      `
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    // Rollen mit view_own_department (statt view_all) sehen nur ihre eigene Abteilung,
    // z.B. Abteilungsleiter. Ohne eigenes Mitarbeiterprofil/Abteilung gibt es keine Treffer.
    if (!hasDetailedPermission("employees", "view_all") && hasDetailedPermission("employees", "view_own_department")) {
      const { data: ownEmployee } = await supabase
        .from("employees")
        .select("department_id")
        .eq("company_id", companyId)
        .eq("user_id", user?.id)
        .maybeSingle();

      if (ownEmployee?.department_id) {
        query = query.eq("department_id", ownEmployee.department_id);
      } else {
        setEmployees([]);
        return;
      }
    }

    const { data, error } = await query;

    if (error) {
      toast.error(t("employees.loadError"));
      console.error(error);
    } else {
      setEmployees((data as Employee[]) || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check permission before allowing create
    if (!hasDetailedPermission('employees', 'manage')) {
      toast.error(t("employees.noCreatePermission") || "You do not have permission to create employees");
      return;
    }

    console.log("Submit - Auth state:", {
      user: user?.email,
      userRole,
      companyId,
    });

    if (!companyId) {
      toast.error(t("employees.noCompanyId"));
      console.error("Missing companyId. User:", user?.email, "Role:", userRole);
      console.error(
        "Please check user_roles table in Supabase for user_id:",
        user?.id
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert employee (combine first_name and last_name into full_name for DB)
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`;

      const { data, error } = await supabase.from("employees").insert({
        employee_number: formData.employee_number,
        full_name: fullName,
        email: formData.email || null,
        hire_date: formData.hire_date || null,
        job_role_id: formData.job_role_id || null,
        department_id: formData.department_id || null,
        exposure_group_id: null,
        is_active: true,
        company_id: companyId,
      } as any).select().single();

      if (error) {
        const details =
          (error && (error.message || (error as any).details)) ||
          "Unknown error";
        toast.error(t("employees.addError") + ": " + details);
        console.error("Add employee error:", error);
        return;
      }

      // Create audit log
      logAction({
        action: "create_employee",
        targetType: "employee",
        targetId: (data as any)?.id,
        targetName: fullName,
        details: {
          employee_number: formData.employee_number,
          department_id: formData.department_id,
          job_role_id: formData.job_role_id
        }
      });

      toast.success(t("employees.addSuccess"));
      setIsDialogOpen(false);
      setFormData({
        employee_number: "",
        first_name: "",
        last_name: "",
        email: "",
        hire_date: "",
        department_id: "",
        job_role_id: "",
      });
      fetchEmployees();
      return data;
    } catch (err) {
      console.error("Unexpected error adding employee:", err);
      toast.error(t("employees.addError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchEmployeeTasks = async (employeeId: string) => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", employeeId)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setEmployeeTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Aufgaben konnten nicht geladen werden");
    }
  };

  const fetchEmployeeNotes = async (employeeId: string) => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("notes")
        .eq("id", employeeId)
        .single();

      if (error) throw error;

      let parsedNotes: any[] = [];
      if (data?.notes) {
        try {
          if (data.notes.startsWith("[") || data.notes.startsWith("{")) {
            parsedNotes = JSON.parse(data.notes);
            if (!Array.isArray(parsedNotes)) parsedNotes = [];
          }
        } catch (e) {
          console.error("Error parsing notes:", e);
        }
      }
      setEmployeeNotes(parsedNotes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Notizen konnten nicht geladen werden");
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      // Extract employee mentions from task title - improved regex to capture full names with spaces
      const mentionRegex = /@([^\s@]+(?:\s+[^\s@]+)*?)(?=\s|$|@)/g;
      const mentions = [];
      let match;
      while ((match = mentionRegex.exec(newTaskTitle)) !== null) {
        mentions.push(match[1].trim());
      }

      // Find employees by mentioned names (exact match only)
      const mentionedEmployees = employees.filter((emp) =>
        mentions.some((mention) => {
          const empNameLower = emp.full_name.toLowerCase();
          const mentionLower = mention.toLowerCase();
          return empNameLower === mentionLower;
        })
      );

      if (mentionedEmployees.length === 0) {
        toast.error("Bitte mindestens einen Mitarbeiter mit @ erwähnen");
        return;
      }

      // Remove @ mentions from task title and keep only the clean text
      const cleanTaskTitle = newTaskTitle
        .replace(/@[^\s@]+(?:\s+[^\s@]+)*?(?=\s|$|@)/g, "")
        .trim();

      // Create tasks for each mentioned employee
      const taskPromises = mentionedEmployees.map((emp) =>
        supabase
          .from("tasks")
          .insert({
            title: cleanTaskTitle,
            assigned_to: emp.id,
            company_id: companyId,
            status: "pending",
            priority: "medium",
          } as any)
          .select()
          .single()
      );

      const results = await Promise.all(taskPromises);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        console.error("Some tasks failed:", errors);
        toast.error("Einige Aufgaben konnten nicht erstellt werden");
      } else {
        const createdTasks = results.map((r) => r.data).filter(Boolean);
        setEmployeeTasks([...createdTasks, ...employeeTasks]);
        setNewTaskTitle("");
        setShowMentionDropdown(false);
        toast.success(
          `Task assigned to ${mentionedEmployees.length} employee(s)`
        );

        // Create audit log for valid tasks
        createdTasks.forEach((task) => {
          const assignee = mentionedEmployees.find(e => e.id === task.assigned_to);
          logAction({
            action: "assign_task",
            targetType: "task",
            targetId: task.id,
            targetName: task.title,
            details: { assignee_name: assignee?.full_name, priority: task.priority }
          });
        });
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Aufgabe konnte nicht erstellt werden");
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

      setEmployeeTasks(
        employeeTasks.map((t) =>
          t.id === task.id ? { ...t, status: newStatus } : t
        )
      );
      toast.success(`Task marked as ${newStatus}`);

      // Create audit log
      logAction({
        action: newStatus === "completed" ? "complete_task" : "reopen_task",
        targetType: "task",
        targetId: task.id,
        targetName: task.title,
        details: { previous_status: task.status, new_status: newStatus }
      });
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Aufgabe konnte nicht aktualisiert werden");
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.trim()) return;

    try {
      // Extract employee mentions from note - improved regex to capture full names with spaces
      const mentionRegex = /@([^\s@]+(?:\s+[^\s@]+)*?)(?=\s|$|@)/g;
      const mentions = [];
      let match;
      while ((match = mentionRegex.exec(newNote)) !== null) {
        mentions.push(match[1].trim());
      }

      // Find employees by mentioned names (exact match only)
      const mentionedEmployees = employees.filter((emp) =>
        mentions.some((mention) => {
          const empNameLower = emp.full_name.toLowerCase();
          const mentionLower = mention.toLowerCase();
          return empNameLower === mentionLower;
        })
      );

      if (mentionedEmployees.length === 0) {
        toast.error("Bitte mindestens einen Mitarbeiter mit @ erwähnen");
        return;
      }

      // Remove @ mentions from note content and keep only the clean text
      const cleanNoteContent = newNote
        .replace(/@[^\s@]+(?:\s+[^\s@]+)*?(?=\s|$|@)/g, "")
        .trim();

      // Add employee names list at the bottom
      const employeeNames = mentionedEmployees
        .map((emp) => emp.full_name)
        .join(", ");
      const noteWithEmployees = `${cleanNoteContent}\n\n[Assigned to: ${employeeNames}]`;

      const newNoteObj = {
        id: Date.now().toString(),
        content: noteWithEmployees,
        author: "Current User",
        date: new Date().toISOString(),
        replies: [],
      };

      // Add note to each mentioned employee
      const notePromises = mentionedEmployees.map(async (emp) => {
        // Fetch current notes
        const { data: empData } = await supabase
          .from("employees")
          .select("notes")
          .eq("id", emp.id)
          .single();

        let existingNotes: any[] = [];
        if (empData?.notes) {
          try {
            if (
              empData.notes.startsWith("[") ||
              empData.notes.startsWith("{")
            ) {
              existingNotes = JSON.parse(empData.notes);
              if (!Array.isArray(existingNotes)) existingNotes = [];
            }
          } catch (e) {
            console.error("Error parsing notes:", e);
          }
        }

        const updatedNotes = [...existingNotes, newNoteObj];
        const updatedNotesString = JSON.stringify(updatedNotes);

        return supabase
          .from("employees")
          .update({ notes: updatedNotesString } as any)
          .eq("id", emp.id);
      });

      const results = await Promise.all(notePromises);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        console.error("Some notes failed:", errors);
        toast.error("Einige Notizen konnten nicht gespeichert werden");
      } else {
        setEmployeeNotes([newNoteObj, ...employeeNotes]);
        setNewNote("");
        setShowMentionDropdown(false);
        toast.success(`Note added to ${mentionedEmployees.length} employee(s)`);

        // Create audit log
        mentionedEmployees.forEach((emp) => {
          logAction({
            action: "add_employee_note",
            targetType: "employee",
            targetId: emp.id,
            targetName: emp.full_name,
            details: { note_content: cleanNoteContent.substring(0, 50) + "..." }
          });
        });
      }
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Notiz konnte nicht gespeichert werden");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedEmployeeForAction) return;

    try {
      const updatedNotes = employeeNotes.filter((note) => note.id !== noteId);
      const updatedNotesString = JSON.stringify(updatedNotes);

      const { error } = await (supabase as any)
        .from("employees")
        .update({ notes: updatedNotesString })
        .eq("id", selectedEmployeeForAction.id);

      if (error) throw error;

      setEmployeeNotes(updatedNotes);
      toast.success("Notiz wurde gelöscht");

      // Create audit log
      logAction({
        action: "delete_employee_note",
        targetType: "employee",
        targetId: selectedEmployeeForAction.id,
        targetName: selectedEmployeeForAction.full_name,
        details: { note_id: noteId }
      });
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Notiz konnte nicht gelöscht werden");
    }
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewNote(value);
    setCursorPosition(cursorPos);

    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(" ") && textAfterAt.length >= 0) {
        setMentionSearch(textAfterAt);
        setShowMentionDropdown(true);
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  const handleMentionSelect = (employeeName: string) => {
    const textBeforeCursor = newNote.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    const textBeforeAt = newNote.substring(0, lastAtIndex);
    const textAfterCursor = newNote.substring(cursorPosition);

    const newText = `${textBeforeAt}@${employeeName} ${textAfterCursor}`;
    setNewNote(newText);
    setShowMentionDropdown(false);
  };

  const filteredEmployeesForMention = employees.filter((emp) =>
    emp.full_name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  // Bulk delete handlers
  const handleSelectAll = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map(emp => emp.id)));
    }
  };

  const handleSelectEmployee = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedEmployees.size === 0) return;

    // Check permission before allowing delete
    if (!hasDetailedPermission('employees', 'delete')) {
      toast.error(t("employees.noDeletePermission") || "You do not have permission to delete employees");
      return;
    }

    const confirmed = window.confirm(
      `${selectedEmployees.size} Mitarbeiter wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("employees")
        .delete()
        .in("id", Array.from(selectedEmployees));

      if (error) throw error;

      // Create audit logs for deleted employees
      const deletedIds = Array.from(selectedEmployees);
      deletedIds.forEach((id) => {
        const emp = employees.find(e => e.id === id);
        logAction({
          action: "delete_employee",
          targetType: "employee",
          targetId: id,
          targetName: emp?.full_name || "Unknown Employee",
          details: { employee_number: emp?.employee_number }
        });
      });

      toast.success(`Successfully deleted ${selectedEmployees.size} employee(s)`);
      setSelectedEmployees(new Set());
      fetchEmployees();
    } catch (error: any) {
      console.error("Error deleting employees:", error);

      // Show detailed error message
      const errorMessage = error?.message || error?.details || error?.hint || "Failed to delete employees";
      const errorDetails = error?.code ? ` (Error code: ${error.code})` : "";

      toast.error(`${errorMessage}${errorDetails}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Import handler
  const normalizeHeader = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

  const getCellValue = (row: Record<string, unknown>, aliases: string[]) => {
    const normalizedAliases = aliases.map(normalizeHeader);
    for (const key of Object.keys(row)) {
      if (normalizedAliases.includes(normalizeHeader(key))) {
        const value = row[key];
        if (value === undefined || value === null) return null;
        const text = String(value).trim();
        return text.length > 0 ? text : null;
      }
    }
    return null;
  };

  const convertImportedDate = (raw: unknown): string | null => {
    if (!raw) return null;

    if (typeof raw === "number" && Number.isFinite(raw)) {
      const parsed = XLSX.SSF.parse_date_code(raw);
      if (!parsed) return null;
      const yyyy = String(parsed.y).padStart(4, "0");
      const mm = String(parsed.m).padStart(2, "0");
      const dd = String(parsed.d).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }

    const text = String(raw).trim();
    if (!text) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    const dotFormat = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dotFormat) {
      const [, d, m, y] = dotFormat;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    const slashFormat = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashFormat) {
      const [, d, m, y] = slashFormat;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    const asDate = new Date(text);
    if (!Number.isNaN(asDate.getTime())) {
      return asDate.toISOString().split("T")[0];
    }

    return null;
  };

  const handleDownloadImportTemplate = () => {
    const templateRows = [
      {
        employee_number: "2600125",
        first_name: "Max",
        last_name: "Mustermann",
        email: "max.mustermann@example.com",
        department: "Produktion",
        hire_date: "2026-01-15",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MitarbeiterImportVorlage");
    XLSX.writeFile(
      workbook,
      `employees_import_template_${new Date().toISOString().split("T")[0]}.xlsx`
    );
    toast.success("Importvorlage heruntergeladen");
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error(t("employees.invalidFile"));
      event.target.value = ''; // Reset input
      return;
    }

    setIsImporting(true);
    setImportErrors([]);
    setLastImportReport(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
        raw: false,
      });

      if (jsonData.length === 0) {
        toast.error(t("employees.noValidData"));
        return;
      }

      let importedCount = 0;
      let skippedCount = 0;
      const rowErrors: string[] = [];
      const importedRows: string[] = [];

      for (let index = 0; index < jsonData.length; index++) {
        const row = jsonData[index] as Record<string, unknown>;
        const rowNumber = index + 2;

        const employeeNumber = getCellValue(row, [
          "employee_number",
          "Employee Number",
          "employeeNumber",
          "Mitarbeiternummer",
          "Employee #",
          "Emp #",
        ]);
        let firstName = getCellValue(row, [
          "first_name",
          "First Name",
          "firstName",
          "Vorname",
          "First",
        ]);
        let lastName = getCellValue(row, [
          "last_name",
          "Last Name",
          "lastName",
          "Nachname",
          "Last",
        ]);

        if (!firstName || !lastName) {
          const fullName = getCellValue(row, ["full_name", "Full Name", "Name", "Mitarbeitername"]);
          if (fullName) {
            const parts = fullName.split(/\s+/).filter(Boolean);
            if (parts.length > 1) {
              firstName = parts.slice(0, -1).join(" ");
              lastName = parts[parts.length - 1];
            }
          }
        }

        const rowProblems: string[] = [];
        if (!employeeNumber) rowProblems.push("missing employee_number");
        if (!firstName) rowProblems.push("missing first_name");
        if (!lastName) rowProblems.push("missing last_name");

        if (rowProblems.length > 0) {
          rowErrors.push(`Row ${rowNumber}: ${rowProblems.join(", ")}`);
          skippedCount++;
          continue;
        }

        // Get and convert hire_date
        const hireDateRaw = getCellValue(row, [
          "hire_date",
          "Hire Date",
          "hireDate",
          "Einstellungsdatum",
          "Start Date",
        ]);
        const hireDate = convertImportedDate(hireDateRaw);

        if (hireDateRaw && !hireDate) {
          rowErrors.push(`Row ${rowNumber}: invalid hire_date (${hireDateRaw})`);
          skippedCount++;
          continue;
        }

        // Prepare employee data - match actual database schema
        const employeeData: Record<string, unknown> = {
          company_id: companyId,
          employee_number: String(employeeNumber).trim(),
          full_name: `${String(firstName).trim()} ${String(lastName).trim()}`,
          email: getCellValue(row, ["email", "Email", "E-Mail", "e-mail", "E-mail"]) || null,
          hire_date: hireDate,
          is_active: true,
        };

        // Handle department
        const departmentName = getCellValue(row, ["department", "Department", "Abteilung", "Dept"]);
        if (departmentName) {
          const { data: existingDept, error: findDeptError } = await supabase
            .from('departments')
            .select('id')
            .eq('company_id', companyId)
            .ilike('name', String(departmentName).trim())
            .maybeSingle();

          if (findDeptError && findDeptError.code !== "PGRST116") {
            rowErrors.push(`Row ${rowNumber}: could not validate department (${findDeptError.message})`);
            skippedCount++;
            continue;
          }

          if (existingDept) {
            employeeData.department_id = existingDept.id;
          } else {
            // Create new department
            const { data: newDept, error: deptInsertError } = await supabase
              .from('departments')
              .insert({ name: String(departmentName).trim(), company_id: companyId })
              .select('id')
              .single();

            if (deptInsertError) {
              rowErrors.push(`Row ${rowNumber}: could not create department (${deptInsertError.message})`);
              skippedCount++;
              continue;
            }

            if (newDept) {
              employeeData.department_id = newDept.id;
            }
          }
        }

        // Insert employee
        const { error } = await supabase
          .from('employees')
          .insert(employeeData);

        if (error) {
          // Check if it's a duplicate employee number
          if (error.code === '23505' && error.message.includes('employee_number')) {
            rowErrors.push(`Row ${rowNumber}: duplicate employee_number (${employeeNumber})`);
            skippedCount++;
            continue;
          }

          rowErrors.push(`Row ${rowNumber}: ${error.message || "import failed"}`);
          skippedCount++;
        } else {
          importedCount++;
          importedRows.push(
            `Row ${rowNumber}: ${String(employeeNumber)} - ${String(
              firstName
            )} ${String(lastName)}`
          );
          // Note: Audit logging removed for bulk imports since we don't have the employee ID
        }
      }

      setImportErrors(rowErrors);
      setLastImportReport({
        fileName: file.name,
        totalRows: jsonData.length,
        importedCount,
        skippedCount,
        importedRows,
        skippedRows: rowErrors,
      });

      if (importedCount === 0 && skippedCount > 0) {
        toast.error(`${t("employees.importError")}: all ${skippedCount} rows skipped`);
        return;
      }

      if (skippedCount > 0) {
        toast.success(
          `${t("employees.importSuccess")}: ${importedCount} imported, ${skippedCount} skipped. See import details below.`
        );
      } else {
        toast.success(
          `${t("employees.importSuccess")}: ${importedCount} employee${importedCount > 1 ? "s" : ""} imported`
        );
      }

      fetchEmployees(); // Refresh the list
    } catch (error) {
      console.error('Import error:', error);
      toast.error(t("employees.importError"));
    } finally {
      setIsImporting(false);
      event.target.value = ''; // Reset input
    }
  };

  // Export handlers
  const handleExportXLSX = () => {
    setIsExporting(true);
    try {
      const exportData = filteredEmployees.map(emp => ({
        'Employee Number': emp.employee_number,
        'First Name': emp.full_name.split(' ')[0],
        'Last Name': emp.full_name.split(' ').slice(1).join(' '),
        'Email': emp.email || '',
        'Department': emp.departments?.name || '',
        'Job Role': emp.job_roles?.title || '',
        'Hire Date': emp.hire_date || '',
        'Status': emp.is_active ? 'Active' : 'Inactive',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
      XLSX.writeFile(workbook, `employees_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast.success(t("employees.exportSuccess"));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t("employees.exportError"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const exportData = filteredEmployees.map(emp => ({
        'Employee Number': emp.employee_number,
        'First Name': emp.full_name.split(' ')[0],
        'Last Name': emp.full_name.split(' ').slice(1).join(' '),
        'Email': emp.email || '',
        'Department': emp.departments?.name || '',
        'Job Role': emp.job_roles?.title || '',
        'Hire Date': emp.hire_date || '',
        'Status': emp.is_active ? 'Active' : 'Inactive',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success(t("employees.exportSuccess"));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t("employees.exportError"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(16);
      doc.text('Employee List', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);

      // Prepare table data
      const tableData = filteredEmployees.map(emp => [
        emp.employee_number,
        emp.full_name,
        emp.email || '-',
        emp.departments?.name || '-',
        emp.job_roles?.title || '-',
        emp.is_active ? 'Active' : 'Inactive',
      ]);

      // Generate table
      autoTable(doc, {
        head: [['Employee #', 'Name', 'Email', 'Department', 'Job Role', 'Status']],
        body: tableData,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      doc.save(`employees_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(t("employees.exportSuccess"));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t("employees.exportError"));
    } finally {
      setIsExporting(false);
    }
  };

  // Render text with @ mentions as styled badges
  const renderTextWithMentions = (text: string) => {
    const mentionRegex = /(@[^\s@]+(?:\s+[^\s@]+)*?)(?=\s|$|@)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: text.substring(lastIndex, match.index),
        });
      }
      // Add mention (match[1] includes the @)
      parts.push({
        type: "mention",
        content: match[1].substring(1), // Remove @ for display
      });
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex),
      });
    }

    return parts.map((part, index) =>
      part.type === "mention" ? (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800"
        >
          <Users className="w-3 h-3" />
          {part.content}
        </span>
      ) : (
        <span key={index}>{part.content}</span>
      )
    );
  };

  const handleViewEmployee = async (employee: Employee) => {
    const { data } = await supabase
      .from("employees")
      .select(
        `
        *,
        departments(name),
        job_roles(title),
        exposure_groups(name)
      `
      )
      .eq("id", employee.id)
      .single();

    setSelectedEmployee((data as Employee) || null);
    setIsSheetOpen(true);
  };

  const filteredEmployees = employees.filter((emp) => {
    // Search filter
    const matchesSearch =
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.email &&
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase());

    // Active status filter
    const matchesActive =
      filterActive === "all" ||
      (filterActive === "active" && emp.is_active) ||
      (filterActive === "inactive" && !emp.is_active);

    // Department filter
    const matchesDepartment =
      filterDepartment === "all" || emp.department_id === filterDepartment;

    return matchesSearch && matchesActive && matchesDepartment;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back")}
          </Button>
        </div>

        {/* Setup warning */}
        {!companyId && user && !loading && (
          <Card className="mb-4 border-orange-500 bg-orange-50 dark:bg-orange-950">
            <CardHeader>
              <CardTitle className="text-orange-700 dark:text-orange-300">
                ⚠️ Company Setup Required
              </CardTitle>
              <CardDescription className="text-orange-600 dark:text-orange-400">
                Your account is not linked to a company. If you just created a
                company, please <strong>sign out and sign back in</strong> to
                refresh your session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <RefreshAuthButton />
                <Button
                  onClick={() => {
                    console.log("Signing out to refresh auth state...");
                    navigate("/auth");
                    window.location.href = "/auth"; // Force reload
                  }}
                  variant="default"
                  size="sm"
                >
                  Sign Out & Refresh
                </Button>
                <Button
                  onClick={() => navigate("/setup-company")}
                  variant="outline"
                  size="sm"
                  className="border-orange-600 text-orange-700"
                >
                  Set Up Company
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Logged in as: {user.email}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-mono">
                Debug: User ID: {user.id?.substring(0, 8)}... | Company ID:{" "}
                {companyId?.substring(0, 8) || "null"} | Role:{" "}
                {userRole || "null"}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {t("employees.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("employees.description")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedEmployees.size > 0 && hasDetailedPermission('employees', 'delete') && (
                  <Button
                    variant="destructive"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? "Deleting..." : `Delete (${selectedEmployees.size})`}
                  </Button>
                )}
                {hasDetailedPermission('employees', 'manage') && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("employees.addEmployee")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{t("employees.addNew")}</DialogTitle>
                        <DialogDescription>
                          {t("employees.enterDetails")}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4 p-4">
                        <div className="space-y-2">
                          <Label htmlFor="employee_number">
                            {t("employees.employeeNumber")} *
                          </Label>
                          <Input
                            id="employee_number"
                            className="h-11 border-2 focus:border-primary transition-colors"
                            value={formData.employee_number}
                            onChange={(e) =>
                            setFormData({
                              ...formData,
                              employee_number: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="first_name">
                          {t("employees.firstName")} *
                        </Label>
                        <Input
                          id="first_name"
                          className="h-11 border-2 focus:border-primary transition-colors"
                          value={formData.first_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              first_name: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">
                          {t("employees.lastName")} *
                        </Label>
                        <Input
                          id="last_name"
                          className="h-11 border-2 focus:border-primary transition-colors"
                          value={formData.last_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              last_name: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          {t("employees.emailOptional")}
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          className="h-11 border-2 focus:border-primary transition-colors"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="job_role">
                          {t("employees.jobRole")}
                        </Label>
                        <Combobox
                          options={jobRoles.map((role) => ({
                            value: role.id,
                            label: role.title,
                          }))}
                          value={formData.job_role_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, job_role_id: value })
                          }
                          placeholder={t("employees.jobRolePlaceholder")}
                          searchPlaceholder="Search or type to create..."
                          emptyText="No job role found."
                          allowCustom={true}
                          onCreateCustom={async (customRole) => {
                            if (!companyId) return;
                            try {
                              const { data, error } = await (supabase as any)
                                .from("job_roles")
                                .insert({
                                  title: customRole,
                                  company_id: companyId,
                                })
                                .select()
                                .single();

                              if (error) throw error;

                              if (data) {
                                setFormData({
                                  ...formData,
                                  job_role_id: (data as any).id,
                                });
                                await fetchJobRoles();
                                toast.success(
                                  `Job role "${customRole}" created`
                                );
                              }
                            } catch (error) {
                              console.error("Error creating job role:", error);
                              toast.error("Stellenbezeichnung konnte nicht erstellt werden");
                            }
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="department">
                          {t("employees.department")}
                        </Label>
                        <Combobox
                          options={departments.map((dept) => ({
                            value: dept.id,
                            label: dept.name,
                          }))}
                          value={formData.department_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, department_id: value })
                          }
                          placeholder={t("employees.departmentPlaceholder")}
                          searchPlaceholder="Search or type to create..."
                          emptyText="No department found."
                          allowCustom={true}
                          onCreateCustom={async (customDept) => {
                            if (!companyId) return;
                            try {
                              const { data, error } = await (supabase as any)
                                .from("departments")
                                .insert({
                                  name: customDept,
                                  company_id: companyId,
                                })
                                .select()
                                .single();

                              if (error) throw error;

                              if (data) {
                                setFormData({
                                  ...formData,
                                  department_id: (data as any).id,
                                });
                                await fetchDepartments();
                                toast.success(
                                  `Department "${customDept}" created`
                                );
                              }
                            } catch (error) {
                              console.error(
                                "Error creating department:",
                                error
                              );
                              toast.error("Abteilung konnte nicht erstellt werden");
                            }
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>{t("employees.hireDate")}</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full justify-start text-left font-normal border-2 ${!formData.hire_date && "text-muted-foreground"}`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.hire_date ? (
                                format(new Date(formData.hire_date), "PPP")
                              ) : (
                                <span>{t("common.pickDate")}</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.hire_date ? new Date(formData.hire_date) : undefined}
                              onSelect={(date) =>
                                setFormData({
                                  ...formData,
                                  hire_date: date ? format(date, "yyyy-MM-dd") : "",
                                })
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <DialogFooter className="pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting
                            ? t("employees.adding")
                            : t("employees.addEmployee")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-2 mb-2 sm:mb-0">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters</span>
              </div>
              <div className="flex-1">
                <Label className="text-xs mb-1">
                  {t("employees.filterStatus")}
                </Label>
                <Select value={filterActive} onValueChange={setFilterActive}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("employees.filterStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("employees.allEmployees")}
                    </SelectItem>
                    <SelectItem value="active">
                      {t("employees.activeOnly")}
                    </SelectItem>
                    <SelectItem value="inactive">
                      {t("employees.inactiveOnly")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs mb-1">
                  {t("employees.filterDepartment")}
                </Label>
                <Select
                  value={filterDepartment}
                  onValueChange={setFilterDepartment}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("employees.filterDepartment")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("employees.allDepartments")}
                    </SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Import/Export Buttons */}
              <div className="flex items-end gap-2">
                {/* Import Button */}
                <div>
                  <Label className="text-xs mb-1 block">&nbsp;</Label>
                  <input
                    type="file"
                    id="import-employees"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleImport}
                    className="hidden"
                    disabled={isImporting}
                  />
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => setIsImportGuideDialogOpen(true)}
                    disabled={isImporting}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {isImporting ? t("employees.importing") : t("employees.import")}
                  </Button>
                </div>

                {/* Export Dropdown */}
                <div>
                  <Label className="text-xs mb-1 block">&nbsp;</Label>
                  <Select
                    onValueChange={(format) => {
                      if (format === 'xlsx') handleExportXLSX();
                      else if (format === 'csv') handleExportCSV();
                      else if (format === 'pdf') handleExportPDF();
                    }}
                    disabled={isExporting}
                  >
                    <SelectTrigger className="w-[140px] gap-2">
                      <Download className="w-4 h-4" />
                      <SelectValue placeholder={isExporting ? t("employees.exporting") : t("employees.export")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xlsx">
                        <div className="flex items-center gap-2">
                          <FileDown className="w-4 h-4" />
                          <span>Excel (.xlsx)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          <FileDown className="w-4 h-4" />
                          <span>CSV (.csv)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pdf">
                        <div className="flex items-center gap-2">
                          <FileDown className="w-4 h-4" />
                          <span>PDF (.pdf)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Dialog
              open={isImportGuideDialogOpen}
              onOpenChange={setIsImportGuideDialogOpen}
            >
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Employee import requirements</DialogTitle>
                  <DialogDescription>
                    Review the format once, then continue to choose your file.
                  </DialogDescription>
                </DialogHeader>

                <div className="text-sm space-y-2">
                  <p>Accepted file formats: .xlsx, .xls, .csv</p>
                  <p>Required columns: employee_number, first_name, last_name</p>
                  <p>
                    Optional columns: email, department, hire_date
                    (YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY, or Excel date)
                  </p>
                  <p>
                    Header aliases are accepted (for example:
                    Mitarbeiternummer, Vorname, Nachname, Abteilung,
                    Einstellungsdatum).
                  </p>
                  <p>
                    Need a sample file?{" "}
                    <a
                      href="#"
                      className="text-primary underline underline-offset-4"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDownloadImportTemplate();
                      }}
                    >
                      Download template
                    </a>
                  </p>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsImportGuideDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setIsImportGuideDialogOpen(false);
                      document.getElementById("import-employees")?.click();
                    }}
                  >
                    Continue to file selection
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {importErrors.length > 0 && (
              <div className="mb-4 p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-sm space-y-2">
                <p className="font-medium text-destructive">
                  Import issues ({importErrors.length})
                </p>
                <div className="max-h-48 overflow-auto space-y-1 pr-1">
                  {importErrors.map((issue, idx) => (
                    <p key={idx} className="text-muted-foreground">
                      {issue}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {lastImportReport && lastImportReport.skippedCount > 0 && (
              <div className="mb-4 p-4 rounded-xl border border-amber-300 bg-amber-50 text-sm space-y-3">
                <p className="font-medium text-amber-900">
                  Import report for {lastImportReport.fileName}
                </p>
                <p className="text-amber-900">
                  Total rows: {lastImportReport.totalRows} | Imported: {lastImportReport.importedCount} | Skipped: {lastImportReport.skippedCount}
                </p>

                <div className="space-y-1">
                  <p className="font-medium text-amber-900">Imported rows</p>
                  <div className="max-h-32 overflow-auto space-y-1 pr-1">
                    {lastImportReport.importedRows.length === 0 ? (
                      <p className="text-muted-foreground">No rows imported.</p>
                    ) : (
                      lastImportReport.importedRows.map((item, idx) => (
                        <p key={idx} className="text-muted-foreground">
                          {item}
                        </p>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="font-medium text-amber-900">Skipped rows</p>
                  <div className="max-h-40 overflow-auto space-y-1 pr-1">
                    {lastImportReport.skippedRows.map((item, idx) => (
                      <p key={idx} className="text-muted-foreground">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder={t("employees.search")}
                  className="pl-12 h-12 border-2 focus:border-primary transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer"
                        checked={filteredEmployees.length > 0 && selectedEmployees.size === filteredEmployees.length}
                        onChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>{t("employees.employeeNumber")}</TableHead>
                    <TableHead>{t("employees.name")}</TableHead>
                    <TableHead>{t("employees.email")}</TableHead>
                    <TableHead>{t("employees.department")}</TableHead>
                    <TableHead>{t("employees.jobRole")}</TableHead>
                    <TableHead>{t("employees.hireDate")}</TableHead>
                    <TableHead>{t("employees.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center">
                          <Users className="w-16 h-16 text-muted-foreground/20 mb-4" />
                          <p className="text-lg font-medium text-muted-foreground mb-1">
                            {t("employees.noEmployees")}
                          </p>
                          <p className="text-sm text-muted-foreground/60">
                            Add your first employee to get started
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow
                        key={employee.id}
                        className="hover:bg-muted/70 transition-all duration-200 border-b border-border/50 hover:shadow-sm group"
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 cursor-pointer"
                            checked={selectedEmployees.has(employee.id)}
                            onChange={() => handleSelectEmployee(employee.id)}
                          />
                        </TableCell>
                        <TableCell
                          className="cursor-pointer"
                          onClick={() => navigate(`/employees/${employee.id}`)}
                        >
                          {employee.employee_number}
                        </TableCell>
                        <TableCell
                          className="font-medium cursor-pointer"
                          onClick={() => navigate(`/employees/${employee.id}`)}
                        >
                          {employee.full_name || "Unnamed Employee"}
                        </TableCell>
                        <TableCell
                          className="cursor-pointer"
                          onClick={() => navigate(`/employees/${employee.id}`)}
                        >
                          {employee.email || "-"}
                        </TableCell>
                        <TableCell
                          className="cursor-pointer"
                          onClick={() => navigate(`/employees/${employee.id}`)}
                        >
                          {employee.departments?.name || "-"}
                        </TableCell>
                        <TableCell
                          className="cursor-pointer"
                          onClick={() => navigate(`/employees/${employee.id}`)}
                        >
                          {employee.job_roles?.title || "-"}
                        </TableCell>
                        <TableCell
                          className="cursor-pointer"
                          onClick={() => navigate(`/employees/${employee.id}`)}
                        >
                          {employee.hire_date || "-"}
                        </TableCell>
                        <TableCell
                          className="cursor-pointer"
                          onClick={() => navigate(`/employees/${employee.id}`)}
                        >
                          <Badge
                            variant={
                              employee.is_active ? "default" : "secondary"
                            }
                            className="flex items-center gap-1 px-2.5 py-0.5 font-semibold w-fit"
                          >
                            {employee.is_active ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                {t("employees.active")}
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                {t("employees.inactive")}
                              </>
                            )}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{selectedEmployee?.full_name || "Employee Details"}</SheetTitle>
              <SheetDescription>{t("employees.details")}</SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="info" className="mt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">{t("employees.info")}</TabsTrigger>
                <TabsTrigger value="risk">
                  {t("employees.riskProfile")}
                </TabsTrigger>
                <TabsTrigger value="training">
                  {t("employees.training")}
                </TabsTrigger>
                <TabsTrigger value="tasks">{t("employees.tasks")}</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("employees.employeeNumber")}
                    </p>
                    <p className="font-medium">
                      {selectedEmployee?.employee_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("employees.email")}
                    </p>
                    <p className="font-medium">{selectedEmployee?.email}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("employees.hireDate")}
                    </p>
                    <p className="font-medium">
                      {selectedEmployee?.hire_date || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("employees.department")}
                    </p>
                    <p className="font-medium">
                      {selectedEmployee?.departments?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("employees.jobRole")}
                    </p>
                    <p className="font-medium">
                      {selectedEmployee?.job_roles?.title || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("employees.exposureGroup")}
                    </p>
                    <p className="font-medium">
                      {selectedEmployee?.exposure_groups?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("employees.status")}
                    </p>
                    <Badge
                      variant={
                        selectedEmployee?.is_active ? "default" : "secondary"
                      }
                    >
                      {selectedEmployee?.is_active
                        ? t("employees.active")
                        : t("employees.inactive")}
                    </Badge>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="risk" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  {t("employees.riskAssignments")}
                </p>
              </TabsContent>

              <TabsContent value="training" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  {t("employees.trainingRecords")}
                </p>
              </TabsContent>

              <TabsContent value="tasks" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  {t("employees.assignedTasks")}
                </p>
              </TabsContent>
            </Tabs>
          </SheetContent>
        </Sheet>

        {/* Tasks Dialog */}
        <Dialog open={isTasksDialogOpen} onOpenChange={setIsTasksDialogOpen}>
          <DialogContent
            className={`transition-all duration-300 ${showMentionDropdown && filteredEmployeesForMention.length > 0
              ? "max-w-2xl max-h-[600px]"
              : "max-w-xl max-h-[200px]"
              }`}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="w-4 h-4" />
                Assign Task
              </DialogTitle>
              <DialogDescription className="text-xs">
                Type @ to mention employees
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {/* Search Input */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Enter task and type @ to select employee..."
                    value={newTaskTitle}
                    className="h-9 text-sm flex-1"
                    onChange={(e) => {
                      const value = e.target.value;
                      const cursorPos = e.target.selectionStart || 0;
                      setNewTaskTitle(value);

                      const textBeforeCursor = value.substring(0, cursorPos);
                      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

                      if (lastAtIndex !== -1) {
                        const textAfterAt = textBeforeCursor.substring(
                          lastAtIndex + 1
                        );
                        if (!textAfterAt.includes(" ")) {
                          setMentionSearch(textAfterAt);
                          setShowMentionDropdown(true);
                        } else {
                          setShowMentionDropdown(false);
                        }
                      } else {
                        setShowMentionDropdown(false);
                      }
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
                  />
                  <Button
                    onClick={handleCreateTask}
                    size="sm"
                    className="h-9 px-4"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Assign
                  </Button>
                </div>
                {/* Preview with styled mentions */}
                {newTaskTitle && (
                  <div className="px-3 py-2 bg-muted/30 rounded-md border border-border/50 min-h-[32px] flex items-center flex-wrap gap-1">
                    {renderTextWithMentions(newTaskTitle)}
                  </div>
                )}
              </div>

              {/* Employee List - shows when @ is typed */}
              {showMentionDropdown &&
                filteredEmployeesForMention.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-3 py-2 border-b">
                      <p className="text-xs font-medium text-muted-foreground">
                        Select Employee ({filteredEmployeesForMention.length})
                      </p>
                    </div>
                    <div className="max-h-[380px] overflow-y-auto">
                      {filteredEmployeesForMention.map((emp) => (
                        <div
                          key={emp.id}
                          className="px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors border-b last:border-0"
                          onClick={() => {
                            const cursorPos = newTaskTitle.length;
                            const textBeforeCursor = newTaskTitle.substring(
                              0,
                              cursorPos
                            );
                            const lastAtIndex =
                              textBeforeCursor.lastIndexOf("@");
                            const textBeforeAt = newTaskTitle.substring(
                              0,
                              lastAtIndex
                            );
                            const textAfterCursor =
                              newTaskTitle.substring(cursorPos);
                            setNewTaskTitle(
                              `${textBeforeAt}@${emp.full_name} ${textAfterCursor}`
                            );
                            setShowMentionDropdown(false);
                          }}
                        >
                          <div className="font-medium text-sm">
                            {emp.full_name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {emp.employee_number} •{" "}
                            {emp.departments?.name || "No dept"} •{" "}
                            {emp.job_roles?.title || "No role"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Notes Dialog */}
        <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
          <DialogContent
            className={`transition-all duration-300 ${showMentionDropdown && filteredEmployeesForMention.length > 0
              ? "max-w-2xl max-h-[600px]"
              : "max-w-xl max-h-[280px]"
              }`}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <StickyNote className="w-4 h-4" />
                Add Note
              </DialogTitle>
              <DialogDescription className="text-xs">
                Type @ to mention employees
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {/* Note Input */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Enter note and type @ to select employee..."
                  value={newNote}
                  onChange={handleNoteChange}
                  className="min-h-[80px] text-sm resize-none"
                />
                {/* Preview with styled mentions */}
                {newNote && (
                  <div className="px-3 py-2 bg-muted/30 rounded-md border border-border/50 min-h-[40px] flex items-start flex-wrap gap-1">
                    {renderTextWithMentions(newNote)}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveNote}
                    size="sm"
                    className="h-9 px-4"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>

              {/* Employee List - shows when @ is typed */}
              {showMentionDropdown &&
                filteredEmployeesForMention.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-3 py-2 border-b">
                      <p className="text-xs font-medium text-muted-foreground">
                        Select Employee ({filteredEmployeesForMention.length})
                      </p>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto">
                      {filteredEmployeesForMention.map((emp) => (
                        <div
                          key={emp.id}
                          className="px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors border-b last:border-0"
                          onClick={() => handleMentionSelect(emp.full_name)}
                        >
                          <div className="font-medium text-sm">
                            {emp.full_name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {emp.employee_number} •{" "}
                            {emp.departments?.name || "No dept"} •{" "}
                            {emp.job_roles?.title || "No role"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
