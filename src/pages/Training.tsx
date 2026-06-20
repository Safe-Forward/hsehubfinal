import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  GraduationCap,
  Trash2,
  Users,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  TrendingUp,
  Download,
  BarChart3,
  SortAsc,
  SortDesc,
  UserCheck,
  UserX,
  ShieldCheck,
} from "lucide-react";
import { useRealtimeRefetch } from "@/hooks/useRealtimeRefetch";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LessonCard from "@/components/training/LessonCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import jsPDF from "jspdf";

const courseSchema = z.object({
  name: z.string().min(1, "Kursname ist erforderlich"),
  description: z.string().optional(),
  is_mandatory: z.boolean().default(false),
  renewal_months: z.number().optional(),
});

type CourseFormData = z.infer<typeof courseSchema>;

interface Course {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  is_mandatory: boolean;
  renewal_months: number | null;
}

interface Lesson {
  id: string;
  course_id: string;
  name: string;
  type: "subchapter" | "video_audio" | "pdf" | "text" | "iframe";
  content_url: string | null;
  content_data: any;
  order_index: number;
  status: "draft" | "published";
}

interface Employee {
  id: string;
  full_name: string;
}

interface EmployeeProgress {
  employee_id: string;
  full_name: string;
  completed_lessons: number;
  total_lessons: number;
  has_certificate: boolean;
  certificate_number?: string;
  issued_at?: string;
  percent: number;
  participation_status: "registered" | "completed" | "absent" | null;
  participation_completion_date?: string | null;
}

const COURSE_COLORS = [
  "from-blue-500 to-blue-700",
  "from-green-500 to-emerald-700",
  "from-purple-500 to-purple-700",
  "from-orange-500 to-orange-700",
  "from-pink-500 to-rose-700",
  "from-cyan-500 to-cyan-700",
];

export default function Training() {
  const { courseId: urlCourseId } = useParams<{ courseId?: string }>();
  const { user, loading, companyId, userRole } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isAdmin = userRole === "company_admin" || userRole === "super_admin";

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [courseAccessByCourse, setCourseAccessByCourse] = useState<Record<string, string[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [managingAccessCourse, setManagingAccessCourse] = useState<Course | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [savingAccess, setSavingAccess] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "progress">("content");

  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [userCertificates, setUserCertificates] = useState<Record<string, any>>({});

  const [employeeProgress, setEmployeeProgress] = useState<EmployeeProgress[]>([]);
  const [progressSearch, setProgressSearch] = useState("");
  const [progressSort, setProgressSort] = useState<"name" | "percent">("name");
  const [progressSortDir, setProgressSortDir] = useState<"asc" | "desc">("asc");
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [updatingParticipation, setUpdatingParticipation] = useState<string | null>(null);

  const courseForm = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: { name: "", description: "", is_mandatory: false, renewal_months: undefined },
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (user && companyId) {
      fetchCourses();
      if (isAdmin) {
        fetchEmployees();
        fetchCourseAccess();
      } else {
        fetchEmployeeId();
      }
    }
  }, [user, loading, navigate, companyId, isAdmin]);

  useEffect(() => {
    if (employeeId) {
      fetchUserProgress();
      fetchUserCertificates();
    }
  }, [employeeId]);

  useEffect(() => {
    if (urlCourseId && courses.length > 0) {
      const course = courses.find((c) => c.id === urlCourseId);
      if (course && selectedCourse?.id !== urlCourseId) {
        setSelectedCourse(course);
        fetchLessons(urlCourseId);
        setActiveTab("content");
      }
    } else if (!urlCourseId && selectedCourse) {
      setSelectedCourse(null);
      setLessons([]);
      setEmployeeProgress([]);
    }
  }, [urlCourseId, courses]);

  useEffect(() => {
    if (activeTab === "progress" && selectedCourse && isAdmin) {
      fetchEmployeeProgress(selectedCourse.id);
    }
  }, [activeTab, selectedCourse]);

  const fetchEmployeeId = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from("employees").select("id").eq("user_id", user.id).single();
    if (data) setEmployeeId(data.id);
  };

  const fetchUserProgress = async () => {
    if (!employeeId) return;
    const { data } = await (supabase as any).from("course_lesson_progress").select("lesson_id").eq("employee_id", employeeId);
    setCompletedLessonIds(new Set((data || []).map((p: any) => p.lesson_id)));
  };

  const fetchUserCertificates = async () => {
    if (!employeeId) return;
    const { data } = await (supabase as any).from("course_certificates").select("*").eq("employee_id", employeeId);
    const mapped: Record<string, any> = {};
    (data || []).forEach((c: any) => { mapped[c.course_id] = c; });
    setUserCertificates(mapped);
  };

  const fetchEmployeeProgress = async (courseId: string) => {
    if (!companyId) return;
    setLoadingProgress(true);
    try {
      const { data: accessData } = await (supabase as any)
        .from("course_employee_access")
        .select("employee_id")
        .eq("course_id", courseId)
        .eq("company_id", companyId);

      if (!accessData || accessData.length === 0) {
        setEmployeeProgress([]);
        return;
      }

      const empIds = accessData.map((a: any) => a.employee_id);

      const { data: teamData } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("company_id", companyId)
        .not("user_id", "is", null);

      const teamUserIds = new Set((teamData || []).map((t: any) => t.user_id));

      const { data: empData } = await supabase
        .from("employees")
        .select("id, full_name, user_id")
        .in("id", empIds)
        .not("user_id", "is", null);

      const filteredEmpData = (empData || []).filter((e: any) => teamUserIds.has(e.user_id));

      const { data: lessonData } = await supabase
        .from("course_lessons")
        .select("id")
        .eq("course_id", courseId)
        .eq("status", "published");

      const totalLessons = lessonData?.length || 0;

      const { data: progressData } = await (supabase as any)
        .from("course_lesson_progress")
        .select("employee_id, lesson_id")
        .eq("course_id", courseId)
        .in("employee_id", empIds);

      const { data: certData } = await (supabase as any)
        .from("course_certificates")
        .select("employee_id, certificate_number, issued_at")
        .eq("course_id", courseId)
        .in("employee_id", empIds);

      const progressByEmp: Record<string, number> = {};
      (progressData || []).forEach((p: any) => {
        progressByEmp[p.employee_id] = (progressByEmp[p.employee_id] || 0) + 1;
      });

      const certByEmp: Record<string, any> = {};
      (certData || []).forEach((c: any) => { certByEmp[c.employee_id] = c; });

      // Fetch training_participations for manual attendance tracking
      const { data: partData } = await (supabase as any)
        .from("training_participations")
        .select("employee_id, status, completion_date")
        .eq("course_id", courseId)
        .eq("company_id", companyId)
        .in("employee_id", empIds);

      const partByEmp: Record<string, any> = {};
      (partData || []).forEach((p: any) => { partByEmp[p.employee_id] = p; });

      const result: EmployeeProgress[] = filteredEmpData.map((emp: any) => {
        const completed = Math.min(progressByEmp[emp.id] || 0, totalLessons);
        const pct = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
        return {
          employee_id: emp.id,
          full_name: emp.full_name,
          completed_lessons: completed,
          total_lessons: totalLessons,
          has_certificate: !!certByEmp[emp.id],
          certificate_number: certByEmp[emp.id]?.certificate_number,
          issued_at: certByEmp[emp.id]?.issued_at,
          percent: pct,
          participation_status: partByEmp[emp.id]?.status || null,
          participation_completion_date: partByEmp[emp.id]?.completion_date || null,
        };
      });

      setEmployeeProgress(result);
    } catch (err: any) {
      console.error("Fehler beim Laden des Fortschritts:", err);
    } finally {
      setLoadingProgress(false);
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

  const downloadCertificate = async (courseId: string, courseName: string, cert: any) => {
    const { data: empData } = await supabase.from("employees").select("full_name").eq("id", employeeId!).single();
    const userName = empData?.full_name || "Teilnehmer";
    generatePDF(userName, courseName, cert);
  };

  const downloadCertificateForEmployee = (employeeName: string, courseName: string, cert: any) => {
    generatePDF(employeeName, courseName, cert);
  };

  const updateParticipation = async (
    employeeId: string,
    status: "registered" | "completed" | "absent"
  ) => {
    if (!companyId || !selectedCourse) return;
    setUpdatingParticipation(employeeId);
    try {
      const payload: any = {
        company_id: companyId,
        course_id: selectedCourse.id,
        employee_id: employeeId,
        status,
        completion_date: status === "completed" ? new Date().toISOString().split("T")[0] : null,
        marked_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };
      await (supabase as any)
        .from("training_participations")
        .upsert(payload, { onConflict: "course_id,employee_id" });

      // Update local state immediately
      setEmployeeProgress((prev) =>
        prev.map((ep) =>
          ep.employee_id === employeeId
            ? { ...ep, participation_status: status, participation_completion_date: status === "completed" ? new Date().toISOString().split("T")[0] : null }
            : ep
        )
      );
      toast({ title: "Aktualisiert", description: `Teilnahmestatus wurde auf "${status === "completed" ? "Abgeschlossen" : status === "absent" ? "Abwesend" : "Registriert"}" gesetzt` });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingParticipation(null);
    }
  };

  const issueCertificateAdmin = async (employeeId: string, employeeName: string) => {
    if (!companyId || !selectedCourse) return;
    setUpdatingParticipation(employeeId);
    try {
      // Check if certificate already exists
      const { data: existing } = await (supabase as any)
        .from("course_certificates")
        .select("id")
        .eq("course_id", selectedCourse.id)
        .eq("employee_id", employeeId)
        .maybeSingle();

      if (existing) {
        toast({ title: "Bereits vorhanden", description: "Für diesen Mitarbeiter existiert bereits ein Zertifikat" });
        return;
      }

      const certNumber = `HSE-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const { data: newCert, error } = await (supabase as any)
        .from("course_certificates")
        .insert({
          company_id: companyId,
          course_id: selectedCourse.id,
          employee_id: employeeId,
          certificate_number: certNumber,
          issued_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Also set participation to completed
      await updateParticipation(employeeId, "completed");

      // Update local progress state with new cert
      setEmployeeProgress((prev) =>
        prev.map((ep) =>
          ep.employee_id === employeeId
            ? { ...ep, has_certificate: true, certificate_number: certNumber, issued_at: newCert.issued_at }
            : ep
        )
      );

      // Auto-download the cert
      generatePDF(employeeName, selectedCourse.name, newCert);
      toast({ title: "Zertifikat ausgestellt", description: `Zertifikat für ${employeeName} wurde erstellt und heruntergeladen` });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingParticipation(null);
    }
  };

  const fetchCourses = async () => {
    if (!companyId) return;
    setLoadingData(true);
    try {
      if (isAdmin) {
        const { data, error } = await supabase.from("courses").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
        if (error) throw error;
        setCourses(data || []);
      } else {
        const { data: employeeData } = await supabase.from("employees").select("id").eq("user_id", user!.id).single();
        if (!employeeData) { setCourses([]); return; }
        const { data: accessData } = await (supabase as any).from("course_employee_access").select("course_id").eq("employee_id", employeeData.id);
        const courseIds = (accessData || []).map((a: any) => a.course_id);
        if (courseIds.length === 0) { setCourses([]); return; }
        const { data, error } = await supabase.from("courses").select("*").in("id", courseIds).order("created_at", { ascending: false });
        if (error) throw error;
        setCourses(data || []);
      }
    } catch (err: any) {
      toast({ title: "Fehler beim Laden der Kurse", description: err.message, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };

  const fetchLessons = async (courseId: string) => {
    try {
      let query = supabase.from("course_lessons").select("*").eq("course_id", courseId).order("order_index", { ascending: true });
      if (!isAdmin) query = query.eq("status", "published");
      const { data, error } = await query;
      if (error) throw error;
      setLessons(data || []);
    } catch (err: any) {
      toast({ title: "Fehler beim Laden der Lektionen", description: err.message, variant: "destructive" });
    }
  };

  const fetchEmployees = async () => {
    if (!companyId) return;
    try {
      const { data: teamData, error: teamError } = await supabase.from("team_members").select("user_id").eq("company_id", companyId).not("user_id", "is", null);
      if (teamError) throw teamError;
      const teamUserIds = (teamData || []).map((t: any) => t.user_id);
      if (teamUserIds.length === 0) { setEmployees([]); return; }
      const { data, error } = await supabase.from("employees").select("id, full_name").eq("company_id", companyId).eq("is_active", true).in("user_id", teamUserIds).order("full_name");
      if (error) throw error;
      setEmployees((data as Employee[]) || []);
    } catch (err: any) {
      toast({ title: "Fehler beim Laden der Nutzer", description: err.message, variant: "destructive" });
    }
  };

  const fetchCourseAccess = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await (supabase as any).from("course_employee_access").select("course_id, employee_id").eq("company_id", companyId);
      if (error) throw error;
      const mapped: Record<string, string[]> = {};
      (data || []).forEach((row: any) => {
        if (!mapped[row.course_id]) mapped[row.course_id] = [];
        mapped[row.course_id].push(row.employee_id);
      });
      setCourseAccessByCourse(mapped);
    } catch (err: any) {
      toast({ title: "Fehler beim Laden der Zugriffsrechte", description: err.message, variant: "destructive" });
    }
  };

  const openAccessDialog = (course: Course) => {
    setManagingAccessCourse(course);
    setSelectedEmployeeIds(new Set(courseAccessByCourse[course.id] || []));
    setIsAccessDialogOpen(true);
  };

  const toggleEmployeeAccess = (empId: string, checked: boolean) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(empId) : next.delete(empId);
      return next;
    });
  };

  const saveCourseAccess = async () => {
    if (!companyId || !managingAccessCourse) return;
    setSavingAccess(true);
    try {
      await (supabase as any).from("course_employee_access").delete().eq("course_id", managingAccessCourse.id).eq("company_id", companyId);
      const empIds = Array.from(selectedEmployeeIds);
      if (empIds.length > 0) {
        await (supabase as any).from("course_employee_access").insert(empIds.map((empId) => ({ company_id: companyId, course_id: managingAccessCourse.id, employee_id: empId, assigned_by: user?.id || null })));
      }
      toast({ title: "Erfolgreich", description: "Zugriffsrechte wurden aktualisiert" });
      setIsAccessDialogOpen(false);
      setManagingAccessCourse(null);
      setSelectedEmployeeIds(new Set());
      fetchCourseAccess();
    } catch (err: any) {
      toast({ title: "Fehler beim Aktualisieren", description: err.message, variant: "destructive" });
    } finally {
      setSavingAccess(false);
    }
  };

  const onCourseSubmit = async (data: CourseFormData) => {
    if (!companyId) return;
    try {
      const { error } = await supabase.from("courses").insert([{
        company_id: companyId,
        name: data.name,
        description: data.description || null,
        is_mandatory: data.is_mandatory ?? false,
        renewal_months: data.renewal_months || null,
      }]);
      if (error) throw error;
      toast({ title: "Erfolgreich", description: "Kurs wurde erstellt" });
      setIsCourseDialogOpen(false);
      courseForm.reset();
      fetchCourses();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const onCourseDelete = async (courseId: string, courseName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Kurs "${courseName}" wirklich loeschen?`)) return;
    try {
      await supabase.from("course_lessons").delete().eq("course_id", courseId);
      await supabase.from("courses").delete().eq("id", courseId);
      toast({ title: "Erfolgreich", description: "Kurs wurde geloescht" });
      fetchCourses();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const handleDuplicateLesson = async (lessonId: string) => {
    const l = lessons.find((x) => x.id === lessonId);
    if (!l || !selectedCourse) return;
    try {
      await supabase.from("course_lessons").insert([{ course_id: selectedCourse.id, name: `${l.name} (Kopie)`, type: l.type, content_url: l.content_url, content_data: l.content_data, order_index: lessons.length, status: "draft" }]);
      toast({ title: "Erfolgreich", description: "Lektion wurde dupliziert" });
      fetchLessons(selectedCourse.id);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleLessonStatus = async (lessonId: string, currentStatus: string) => {
    const newStatus = currentStatus === "draft" ? "published" : "draft";
    try {
      await supabase.from("course_lessons").update({ status: newStatus }).eq("id", lessonId);
      setLessons(lessons.map((l) => l.id === lessonId ? { ...l, status: newStatus as "draft" | "published" } : l));
      toast({ title: "Erfolgreich", description: `Lektion ${newStatus === "published" ? "veroeffentlicht" : "als Entwurf gespeichert"}` });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const onLessonDelete = async (lessonId: string, lessonName: string) => {
    if (!confirm(`Lektion "${lessonName}" wirklich loeschen?`)) return;
    try {
      await supabase.from("course_lessons").delete().eq("id", lessonId);
      setLessons(lessons.filter((l) => l.id !== lessonId));
      toast({ title: "Erfolgreich", description: "Lektion wurde geloescht" });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  // Realtime-Sync für Training-Seite (ohne Loading-Spinner)
  const silentRefetch = useCallback(async () => {
    if (!companyId) return;
    try {
      if (isAdmin) {
        const { data } = await supabase.from("courses").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
        if (data) setCourses(data);
        await fetchCourseAccess();
      } else {
        if (!user?.id) return;
        const { data: emp } = await supabase.from("employees").select("id").eq("user_id", user.id).single();
        if (!emp) return;
        const { data: access } = await (supabase as any).from("course_employee_access").select("course_id").eq("employee_id", emp.id);
        const ids = (access || []).map((a: any) => a.course_id);
        if (ids.length > 0) {
          const { data } = await supabase.from("courses").select("*").in("id", ids).order("created_at", { ascending: false });
          if (data) setCourses(data);
        }
      }
    } catch { /* ignore */ }
  }, [companyId, isAdmin, user]);

  useRealtimeRefetch(
    ["courses", "course_lesson_progress", "training_participations", "course_certificates"],
    companyId,
    silentRefetch
  );

  const filteredCourses = courses.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const employeeIds = new Set(employees.map((e) => e.id));
  const totalEmployeesWithAccess = new Set(
    Object.values(courseAccessByCourse).flat().filter((id) => employeeIds.has(id))
  ).size;

  const filteredProgress = employeeProgress
    .filter((ep) => ep.full_name.toLowerCase().includes(progressSearch.toLowerCase()))
    .sort((a, b) => {
      const dir = progressSortDir === "asc" ? 1 : -1;
      if (progressSort === "name") return a.full_name.localeCompare(b.full_name) * dir;
      return (a.percent - b.percent) * dir;
    });

  const renderAccessDialog = () => (
    <Dialog open={isAccessDialogOpen} onOpenChange={(open) => { setIsAccessDialogOpen(open); if (!open) { setManagingAccessCourse(null); setSelectedEmployeeIds(new Set()); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Nutzerzugriff verwalten</DialogTitle>
          <DialogDescription>{managingAccessCourse ? `Zugriff fuer Kurs "${managingAccessCourse.name}" verwalten.` : "Nutzerzugriff verwalten."}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[420px] overflow-y-auto border rounded-xl p-3 space-y-2">
          {employees.length === 0 ? (
            <div className="text-center py-8"><Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" /><p className="text-sm text-muted-foreground">Keine Nutzer gefunden.</p></div>
          ) : (
            employees.map((emp) => {
              const checked = selectedEmployeeIds.has(emp.id);
              return (
                <label key={emp.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer transition-colors ${checked ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">{emp.full_name.charAt(0).toUpperCase()}</div>
                    <p className="text-sm font-medium">{emp.full_name}</p>
                  </div>
                  <Checkbox checked={checked} onCheckedChange={(v) => toggleEmployeeAccess(emp.id, Boolean(v))} />
                </label>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{selectedEmployeeIds.size} von {employees.length} Nutzern</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => { setIsAccessDialogOpen(false); setManagingAccessCourse(null); setSelectedEmployeeIds(new Set()); }}>Abbrechen</Button>
            <Button onClick={saveCourseAccess} disabled={savingAccess}>{savingAccess ? "Wird gespeichert..." : "Speichern"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Kurse werden geladen...</p>
        </div>
      </div>
    );
  }

  if (selectedCourse) {
    const publishedCount = lessons.filter((l) => l.status === "published").length;
    const draftCount = lessons.filter((l) => l.status === "draft").length;
    const accessCount = courseAccessByCourse[selectedCourse.id]?.length || 0;
    const userCert = userCertificates[selectedCourse.id];
    const userCompletedInCourse = isAdmin ? 0 : lessons.filter((l) => l.status === "published" && completedLessonIds.has(l.id)).length;
    const userProgressPercent = publishedCount > 0 ? Math.round((userCompletedInCourse / publishedCount) * 100) : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/training")}><ArrowLeft className="w-5 h-5" /></Button>
              <div>
                <h1 className="text-xl font-bold">{selectedCourse.name}</h1>
                <p className="text-xs text-muted-foreground">{selectedCourse.description || "Schulungsmodul"}</p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openAccessDialog(selectedCourse)}><Users className="w-4 h-4 mr-2" />Zugriff verwalten</Button>
                <Button size="sm" onClick={() => navigate(`/training/${selectedCourse.id}/lesson/new`)}><Plus className="w-4 h-4 mr-2" />Lektion hinzufuegen</Button>
              </div>
            )}
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 space-y-6">

          {!isAdmin && (
            <Card className="border-0 shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">Mein Fortschritt</p>
                    <p className="text-sm text-muted-foreground">{userCompletedInCourse} von {publishedCount} Lektionen abgeschlossen</p>
                  </div>
                  <span className="text-2xl font-bold text-primary">{userProgressPercent}%</span>
                </div>
                <Progress value={userProgressPercent} className="h-3" />
              </CardContent>
            </Card>
          )}

          {!isAdmin && userCert && (
            <Card className="border-0 shadow-md bg-gradient-to-r from-amber-500 to-orange-600 text-white overflow-hidden relative">
              <div className="absolute right-0 top-0 opacity-10"><Award className="w-32 h-32 -mr-4 -mt-4" /></div>
              <CardContent className="p-5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"><Award className="w-6 h-6 text-white" /></div>
                    <div>
                      <p className="font-bold text-lg">Kurs abgeschlossen!</p>
                      <p className="text-white/80 text-sm">Nr. {userCert.certificate_number}</p>
                      <p className="text-white/70 text-xs">Ausgestellt am {new Date(userCert.issued_at).toLocaleDateString("de-DE")}</p>
                    </div>
                  </div>
                  <Button onClick={() => downloadCertificate(selectedCourse.id, selectedCourse.name, userCert)} className="bg-white text-orange-600 hover:bg-orange-50">
                    <Download className="w-4 h-4 mr-2" />PDF herunterladen
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center"><BookOpen className="w-5 h-5 text-white" /></div>
                  <div><p className="text-2xl font-bold">{lessons.length}</p><p className="text-xs text-muted-foreground">Lektionen</p></div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-white" /></div>
                  <div><p className="text-2xl font-bold">{publishedCount}</p><p className="text-xs text-muted-foreground">Veroeffentlicht</p></div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center"><Clock className="w-5 h-5 text-white" /></div>
                  <div><p className="text-2xl font-bold">{draftCount}</p><p className="text-xs text-muted-foreground">Entwuerfe</p></div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center"><Users className="w-5 h-5 text-white" /></div>
                  <div><p className="text-2xl font-bold">{accessCount}</p><p className="text-xs text-muted-foreground">Nutzer</p></div>
                </CardContent>
              </Card>
            </div>
          )}

          {isAdmin && (
            <div className="flex gap-1 border-b">
              <button
                onClick={() => setActiveTab("content")}
                className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === "content" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <BookOpen className="w-4 h-4" />Kursinhalt
              </button>
              <button
                onClick={() => setActiveTab("progress")}
                className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === "progress" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <BarChart3 className="w-4 h-4" />Lernfortschritt
                {employeeProgress.length > 0 && <Badge className="ml-1 h-5 text-xs">{employeeProgress.length}</Badge>}
              </button>
            </div>
          )}

          {(!isAdmin || activeTab === "content") && (
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{isAdmin ? "Kursinhalt" : "Lektionen"}</CardTitle>
                    <CardDescription>{isAdmin ? "Lektionen verwalten" : "Klicken Sie auf eine Lektion um sie zu starten"}</CardDescription>
                  </div>
                  {isAdmin && <Button onClick={() => navigate(`/training/${selectedCourse.id}/lesson/new`)}><Plus className="w-4 h-4 mr-2" />Lektion hinzufuegen</Button>}
                </div>
              </CardHeader>
              <CardContent>
                {lessons.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4"><BookOpen className="w-10 h-10 text-muted-foreground/40" /></div>
                    <p className="text-lg font-medium text-muted-foreground mb-1">{isAdmin ? "Noch keine Lektionen" : "Noch keine Inhalte"}</p>
                    <p className="text-sm text-muted-foreground/60 mb-4">{isAdmin ? "Fuege die erste Lektion hinzu" : "Der Administrator hat noch keine Lektionen veroeffentlicht"}</p>
                    {isAdmin && <Button onClick={() => navigate(`/training/${selectedCourse.id}/lesson/new`)}><Plus className="w-4 h-4 mr-2" />Erste Lektion erstellen</Button>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lessons.map((lesson, index) => (
<LessonCard
  key={lesson.id}
  lesson={lesson}
  onDelete={isAdmin ? onLessonDelete : undefined}
  onDuplicate={isAdmin ? handleDuplicateLesson : undefined}
  onToggleStatus={isAdmin ? handleToggleLessonStatus : undefined}
  isCompleted={!isAdmin && completedLessonIds.has(lesson.id)}
  isLocked={!isAdmin && !!(lesson as any).unlock_after && !completedLessonIds.has((lesson as any).unlock_after)}
  lessonNumber={index + 1}
  isAdmin={isAdmin}
/>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isAdmin && activeTab === "progress" && (
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <div>
                  <CardTitle className="text-xl flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Lernfortschritt der Teilnehmer</CardTitle>
                  <CardDescription>Eingeladene Nutzer und ihr Fortschritt in diesem Kurs</CardDescription>
                </div>
                <div className="flex gap-2 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Nutzer suchen..." value={progressSearch} onChange={(e) => setProgressSearch(e.target.value)} className="pl-9" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setProgressSort("name"); setProgressSortDir(progressSort === "name" && progressSortDir === "asc" ? "desc" : "asc"); }} className={progressSort === "name" ? "border-primary text-primary" : ""}>
                    {progressSort === "name" && progressSortDir === "desc" ? <SortDesc className="w-4 h-4 mr-1" /> : <SortAsc className="w-4 h-4 mr-1" />}Name
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setProgressSort("percent"); setProgressSortDir(progressSort === "percent" && progressSortDir === "asc" ? "desc" : "asc"); }} className={progressSort === "percent" ? "border-primary text-primary" : ""}>
                    {progressSort === "percent" && progressSortDir === "desc" ? <SortDesc className="w-4 h-4 mr-1" /> : <SortAsc className="w-4 h-4 mr-1" />}Fortschritt
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingProgress ? (
                  <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                ) : filteredProgress.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-muted-foreground">{employeeProgress.length === 0 ? "Noch keine Nutzer diesem Kurs zugewiesen." : "Keine Ergebnisse gefunden."}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredProgress.map((ep) => {
                      const isUpdating = updatingParticipation === ep.employee_id;
                      return (
                        <div key={ep.employee_id} className="p-4 rounded-xl border hover:bg-muted/30 transition-colors space-y-3">
                          {/* Row 1: Name + E-Learning Progress */}
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold flex-shrink-0">
                              {ep.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{ep.full_name}</span>
                                  {ep.participation_status === "completed" && (
                                    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs"><UserCheck className="w-3 h-3 mr-1" />Teilgenommen</Badge>
                                  )}
                                  {ep.participation_status === "absent" && (
                                    <Badge className="bg-red-100 text-red-700 border-red-200 text-xs"><UserX className="w-3 h-3 mr-1" />Abwesend</Badge>
                                  )}
                                  {ep.participation_status === "registered" && (
                                    <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />Registriert</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  {ep.has_certificate && (
                                    <Badge
                                      className="bg-amber-100 text-amber-700 border-amber-200 text-xs cursor-pointer hover:bg-amber-200 transition-colors"
                                      onClick={() => downloadCertificateForEmployee(
                                        ep.full_name,
                                        selectedCourse.name,
                                        { certificate_number: ep.certificate_number, issued_at: ep.issued_at }
                                      )}
                                    >
                                      <Download className="w-3 h-3 mr-1" />Zertifikat
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">{ep.completed_lessons}/{ep.total_lessons} Lektionen</span>
                                  <span className={`text-sm font-bold w-12 text-right ${ep.percent === 100 ? "text-green-600" : "text-primary"}`}>{ep.percent}%</span>
                                </div>
                              </div>
                              <Progress value={ep.percent} className={`h-2 ${ep.percent === 100 ? "[&>div]:bg-green-500" : ""}`} />
                              {ep.has_certificate && ep.issued_at && (
                                <p className="text-xs text-muted-foreground mt-1">Zertifikat ausgestellt am {new Date(ep.issued_at).toLocaleDateString("de-DE")}</p>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Teilnahme-Aktionen */}
                          <div className="flex items-center gap-2 pt-1 border-t border-dashed">
                            <span className="text-xs text-muted-foreground mr-1">Präsenz-Schulung:</span>
                            <Button
                              size="sm"
                              variant={ep.participation_status === "completed" ? "default" : "outline"}
                              className={`h-7 text-xs gap-1 ${ep.participation_status === "completed" ? "bg-green-600 hover:bg-green-700" : "hover:bg-green-50 hover:border-green-400 hover:text-green-700"}`}
                              disabled={isUpdating}
                              onClick={() => updateParticipation(ep.employee_id, "completed")}
                            >
                              <UserCheck className="w-3 h-3" />Teilgenommen
                            </Button>
                            <Button
                              size="sm"
                              variant={ep.participation_status === "absent" ? "default" : "outline"}
                              className={`h-7 text-xs gap-1 ${ep.participation_status === "absent" ? "bg-red-600 hover:bg-red-700" : "hover:bg-red-50 hover:border-red-400 hover:text-red-700"}`}
                              disabled={isUpdating}
                              onClick={() => updateParticipation(ep.employee_id, "absent")}
                            >
                              <UserX className="w-3 h-3" />Abwesend
                            </Button>
                            {!ep.has_certificate && ep.participation_status === "completed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 ml-auto border-amber-400 text-amber-700 hover:bg-amber-50"
                                disabled={isUpdating}
                                onClick={() => issueCertificateAdmin(ep.employee_id, ep.full_name)}
                              >
                                <Award className="w-3 h-3" />Zertifikat ausstellen
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-md bg-gradient-to-r from-amber-500 to-orange-600 text-white overflow-hidden relative">
            <div className="absolute right-0 top-0 opacity-10"><Award className="w-40 h-40 -mr-8 -mt-8" /></div>
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"><Award className="w-6 h-6 text-white" /></div>
                <div>
                  <p className="font-bold text-lg">Zertifikat</p>
                  <p className="text-white/80 text-sm">{isAdmin ? "Nutzer erhalten nach Abschluss aller Lektionen automatisch ein PDF-Zertifikat." : "Nach Abschluss aller Lektionen erhalten Sie automatisch ein PDF-Zertifikat."}</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </main>
        {isAdmin && renderAccessDialog()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <h1 className="text-xl font-bold">{isAdmin ? "Schulungsmanagement" : "Meine Schulungen"}</h1>
              <p className="text-xs text-muted-foreground">{isAdmin ? "Kurse, Lektionen und Zertifikate verwalten" : "Ihre zugewiesenen Kurse"}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-green-600 text-white p-8 shadow-2xl">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3"><GraduationCap className="w-8 h-8" /><span className="text-lg font-bold">HSE Hub Akademie</span></div>
              <h2 className="text-3xl font-bold mb-2">{isAdmin ? "Schulungen & Qualifikationen" : "Meine Lernwelt"}</h2>
              <p className="text-blue-100 max-w-lg">{isAdmin ? "Erstellen Sie Kurse, verwalten Sie Lektionen und stellen Sie Ihren Nutzern automatische Zertifikate aus." : "Hier finden Sie alle Ihnen zugewiesenen Kurse. Schliessen Sie Lektionen ab und erhalten Sie Ihr Zertifikat."}</p>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="text-center bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-3xl font-bold">{courses.length}</p>
                <p className="text-xs text-blue-100">{isAdmin ? "Kurse" : "Meine Kurse"}</p>
              </div>
              {isAdmin && (
                <>
                  <div className="text-center bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                    <p className="text-3xl font-bold">{totalEmployeesWithAccess}</p>
                    <p className="text-xs text-blue-100">Zugewiesene Nutzer</p>
                  </div>
                  <div className="text-center bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                    <p className="text-3xl font-bold">{employees.length}</p>
                    <p className="text-xs text-blue-100">Nutzer gesamt</p>
                  </div>
                </>
              )}
              {!isAdmin && (
                <div className="text-center bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <p className="text-3xl font-bold">{Object.keys(userCertificates).length}</p>
                  <p className="text-xs text-blue-100">Zertifikate</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center"><BookOpen className="w-5 h-5 text-blue-600" /></div>
                <div><p className="text-2xl font-bold">{courses.length}</p><p className="text-xs text-muted-foreground">Kurse gesamt</p></div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center"><Users className="w-5 h-5 text-green-600" /></div>
                <div><p className="text-2xl font-bold">{totalEmployeesWithAccess}</p><p className="text-xs text-muted-foreground">Zugewiesene Nutzer</p></div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center"><Award className="w-5 h-5 text-amber-600" /></div>
                <div><p className="text-2xl font-bold">{courses.length}</p><p className="text-xs text-muted-foreground">Zertifikate bereit</p></div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-purple-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{employees.length > 0 ? Math.min(100, Math.round((totalEmployeesWithAccess / employees.length) * 100)) : 0}%</p>
                  <p className="text-xs text-muted-foreground">Abdeckungsquote</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{isAdmin ? "Alle Kurse" : "Meine Kurse"}</CardTitle>
                <CardDescription>{isAdmin ? "Klicken Sie auf einen Kurs um Lektionen zu verwalten" : "Klicken Sie auf einen Kurs um ihn zu starten"}</CardDescription>
              </div>
              {isAdmin && (
                <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"><Plus className="w-4 h-4 mr-2" />Neuen Kurs erstellen</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" />Neuen Kurs erstellen</DialogTitle>
                      <DialogDescription>Erstellen Sie einen neuen Schulungskurs fuer Ihre Nutzer.</DialogDescription>
                    </DialogHeader>
                    <Form {...courseForm}>
                      <form onSubmit={courseForm.handleSubmit(onCourseSubmit)} className="space-y-4">
                        <FormField control={courseForm.control} name="name" render={({ field }) => (
                          <FormItem><FormLabel>Kursname *</FormLabel><FormControl><Input placeholder="z. B. Arbeitssicherheit Grundlagen" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={courseForm.control} name="description" render={({ field }) => (
                          <FormItem><FormLabel>Beschreibung (optional)</FormLabel><FormControl><Textarea placeholder="Kurze Beschreibung..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={courseForm.control} name="is_mandatory" render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                id="is_mandatory"
                              />
                              <div>
                                <Label htmlFor="is_mandatory" className="font-medium text-amber-800 dark:text-amber-200 cursor-pointer">Pflichtschulung</Label>
                                <p className="text-xs text-amber-700 dark:text-amber-400">Mitarbeiter müssen diese Schulung absolvieren</p>
                              </div>
                            </div>
                          </FormItem>
                        )} />
                        {courseForm.watch("is_mandatory") && (
                          <FormField control={courseForm.control} name="renewal_months" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Wiederholungsintervall (optional)</FormLabel>
                              <Select onValueChange={(v) => field.onChange(v ? Number(v) : undefined)} value={field.value ? String(field.value) : ""}>
                                <SelectTrigger><SelectValue placeholder="Kein Ablaufdatum" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="6">Alle 6 Monate</SelectItem>
                                  <SelectItem value="12">Jährlich (12 Monate)</SelectItem>
                                  <SelectItem value="24">Alle 2 Jahre</SelectItem>
                                  <SelectItem value="36">Alle 3 Jahre</SelectItem>
                                  <SelectItem value="60">Alle 5 Jahre</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        )}
                        <div className="flex justify-end gap-2 pt-2">
                          <Button type="button" variant="outline" onClick={() => setIsCourseDialogOpen(false)}>Abbrechen</Button>
                          <Button type="submit">Kurs erstellen</Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input placeholder="Kurse durchsuchen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 h-12 border-2 focus:border-primary transition-colors" />
              </div>
            </div>

            {filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center mb-6"><GraduationCap className="w-12 h-12 text-blue-500" /></div>
                <p className="text-xl font-semibold mb-2">{isAdmin ? "Noch keine Kurse vorhanden" : "Noch keine Kurse zugewiesen"}</p>
                <p className="text-muted-foreground mb-6 max-w-sm">{isAdmin ? "Erstellen Sie Ihren ersten Schulungskurs." : "Ihr Administrator hat Ihnen noch keine Kurse zugewiesen."}</p>
                {isAdmin && <Button className="bg-gradient-to-r from-blue-600 to-blue-700" onClick={() => setIsCourseDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Ersten Kurs erstellen</Button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course, index) => {
                  const accessIds = courseAccessByCourse[course.id] || [];
                  const realAccessCount = accessIds.filter((id) => employeeIds.has(id)).length;
                  const colorClass = COURSE_COLORS[index % COURSE_COLORS.length];
                  const coveragePercent = employees.length > 0 ? Math.min(100, Math.round((realAccessCount / employees.length) * 100)) : 0;
                  const userCert = userCertificates[course.id];

                  return (
                    <div
                      key={course.id}
                      className="group rounded-2xl border-2 border-border hover:border-primary/40 hover:shadow-xl transition-all duration-300 overflow-hidden bg-card cursor-pointer"
                      onClick={() => navigate(`/training/${course.id}`)}
                    >
                      <div className={`h-32 bg-gradient-to-br ${colorClass} flex items-center justify-center relative overflow-hidden`}>
                        <div className="absolute inset-0 opacity-20">
                          <div className="absolute top-2 right-2 w-16 h-16 bg-white rounded-full" />
                          <div className="absolute bottom-2 left-2 w-10 h-10 bg-white rounded-full" />
                        </div>
                        <GraduationCap className="w-14 h-14 text-white relative z-10 group-hover:scale-110 transition-transform duration-300" />
                        {userCert ? (
                          <div className="absolute top-3 right-3 bg-amber-400 rounded-full px-2 py-1 flex items-center gap-1">
                            <Award className="w-3 h-3 text-white" /><span className="text-white text-xs font-medium">Abgeschlossen</span>
                          </div>
                        ) : (
                          <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                            <Award className="w-3 h-3 text-white" /><span className="text-white text-xs font-medium">Zertifikat</span>
                          </div>
                        )}
                        {course.is_mandatory && (
                          <div className="absolute top-3 left-3 bg-red-500/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-white" /><span className="text-white text-xs font-medium">Pflicht</span>
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">{course.name}</h3>
                        {course.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{course.description}</p>}
                        {isAdmin && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>Nutzerabdeckung</span><span className="font-medium">{coveragePercent}%</span>
                            </div>
                            <Progress value={coveragePercent} className="h-1.5" />
                          </div>
                        )}
                        {!isAdmin && userCert && (
                          <div className="mb-3">
                            <Button size="sm" variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                              onClick={(e) => { e.stopPropagation(); downloadCertificate(course.id, course.name, userCert); }}>
                              <Download className="w-3.5 h-3.5 mr-2" />Zertifikat herunterladen
                            </Button>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {isAdmin ? <><Users className="w-3.5 h-3.5" /><span>{realAccessCount} Nutzer</span></> : <><BookOpen className="w-3.5 h-3.5" /><span>{userCert ? "Abgeschlossen" : "Kurs starten"}</span></>}
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); openAccessDialog(course); }} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary hover:text-white text-primary transition-all"><Users className="w-4 h-4" /></button>
                              <button onClick={(e) => onCourseDelete(course.id, course.name, e)} className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive hover:text-white text-destructive transition-all"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {isAdmin && renderAccessDialog()}
    </div>
  );
}
