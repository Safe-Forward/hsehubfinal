import { useEffect, useState } from "react";
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
  Play,
  Lock,
  BarChart3,
  Star,
} from "lucide-react";
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

const courseSchema = z.object({
  name: z.string().min(1, "Kursname ist erforderlich"),
  description: z.string().optional(),
});

type CourseFormData = z.infer<typeof courseSchema>;

interface Course {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
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
  email?: string | null;
  role?: string | null;
}

const COURSE_COLORS = [
  "from-blue-500 to-blue-700",
  "from-green-500 to-emerald-700",
  "from-purple-500 to-purple-700",
  "from-orange-500 to-orange-700",
  "from-pink-500 to-rose-700",
  "from-cyan-500 to-cyan-700",
];

const COURSE_ICONS = [
  <GraduationCap className="w-10 h-10 text-white" />,
  <BookOpen className="w-10 h-10 text-white" />,
  <Award className="w-10 h-10 text-white" />,
  <Star className="w-10 h-10 text-white" />,
];

export default function Training() {
  const { courseId: urlCourseId } = useParams<{ courseId?: string }>();
  const { user, loading, companyId } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const courseForm = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (user && companyId) {
      fetchCourses();
      fetchEmployees();
      fetchCourseAccess();
    }
  }, [user, loading, navigate, companyId]);

  useEffect(() => {
    if (urlCourseId && courses.length > 0) {
      const course = courses.find((c) => c.id === urlCourseId);
      if (course && selectedCourse?.id !== urlCourseId) {
        setSelectedCourse(course);
        fetchLessons(urlCourseId);
      }
    } else if (!urlCourseId && selectedCourse) {
      setSelectedCourse(null);
      setLessons([]);
    }
  }, [urlCourseId, courses]);

  const fetchCourses = async () => {
    if (!companyId) return;
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCourses(data || []);
    } catch (err: any) {
      toast({ title: "Fehler beim Laden der Kurse", description: err.message, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };

  const fetchLessons = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      setLessons(data || []);
    } catch (err: any) {
      toast({ title: "Fehler beim Laden der Lektionen", description: err.message, variant: "destructive" });
    }
  };

const fetchEmployees = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("company_id", companyId)
        .order("full_name");
      if (error) throw error;
      setEmployees((data as Employee[]) || []);
    } catch (err: any) {
      toast({ title: "Fehler beim Laden der Nutzer", description: err.message, variant: "destructive" });
    }
  };

  const fetchCourseAccess = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await (supabase as any)
        .from("course_employee_access")
        .select("course_id, employee_id")
        .eq("company_id", companyId);
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

  const toggleEmployeeAccess = (employeeId: string, checked: boolean) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(employeeId) : next.delete(employeeId);
      return next;
    });
  };

  const saveCourseAccess = async () => {
    if (!companyId || !managingAccessCourse) return;
    setSavingAccess(true);
    try {
      const { error: deleteError } = await (supabase as any)
        .from("course_employee_access")
        .delete()
        .eq("course_id", managingAccessCourse.id)
        .eq("company_id", companyId);
      if (deleteError) throw deleteError;

      const employeeIds = Array.from(selectedEmployeeIds);
      if (employeeIds.length > 0) {
        const rows = employeeIds.map((employeeId) => ({
          company_id: companyId,
          course_id: managingAccessCourse.id,
          employee_id: employeeId,
          assigned_by: user?.id || null,
        }));
        const { error: insertError } = await (supabase as any)
          .from("course_employee_access")
          .insert(rows);
        if (insertError) throw insertError;
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
    if (!confirm(`Kurs "${courseName}" wirklich löschen? Alle Lektionen werden ebenfalls gelöscht.`)) return;
    try {
      const { error: lessonsError } = await supabase
        .from("course_lessons").delete().eq("course_id", courseId);
      if (lessonsError) throw lessonsError;
      const { error: courseError } = await supabase
        .from("courses").delete().eq("id", courseId);
      if (courseError) throw courseError;
      toast({ title: "Erfolgreich", description: "Kurs wurde gelöscht" });
      fetchCourses();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const handleDuplicateLesson = async (lessonId: string) => {
    const lessonToDuplicate = lessons.find((l) => l.id === lessonId);
    if (!lessonToDuplicate || !selectedCourse) return;
    try {
      const { error } = await supabase.from("course_lessons").insert([{
        course_id: selectedCourse.id,
        name: `${lessonToDuplicate.name} (Kopie)`,
        type: lessonToDuplicate.type,
        content_url: lessonToDuplicate.content_url,
        content_data: lessonToDuplicate.content_data,
        order_index: lessons.length,
        status: "draft",
      }]);
      if (error) throw error;
      toast({ title: "Erfolgreich", description: "Lektion wurde dupliziert" });
      fetchLessons(selectedCourse.id);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleLessonStatus = async (lessonId: string, currentStatus: string) => {
    const newStatus = currentStatus === "draft" ? "published" : "draft";
    try {
      const { error } = await supabase
        .from("course_lessons").update({ status: newStatus }).eq("id", lessonId);
      if (error) throw error;
      setLessons(lessons.map((l) => l.id === lessonId ? { ...l, status: newStatus as "draft" | "published" } : l));
      toast({ title: "Erfolgreich", description: `Lektion ${newStatus === "published" ? "veröffentlicht" : "als Entwurf gespeichert"}` });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const onLessonDelete = async (lessonId: string, lessonName: string) => {
    if (!confirm(`Lektion "${lessonName}" wirklich löschen?`)) return;
    try {
      const { error } = await supabase
        .from("course_lessons").delete().eq("id", lessonId);
      if (error) throw error;
      setLessons(lessons.filter((l) => l.id !== lessonId));
      toast({ title: "Erfolgreich", description: "Lektion wurde gelöscht" });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const filteredCourses = courses.filter((course) =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEmployeesWithAccess = Object.values(courseAccessByCourse)
    .flat()
    .filter((v, i, a) => a.indexOf(v) === i).length;

  const publishedLessonsCount = lessons.filter((l) => l.status === "published").length;

  // ── Access Dialog ─────────────────────────────────────────────────────────
  const renderAccessDialog = () => (
    <Dialog open={isAccessDialogOpen} onOpenChange={(open) => {
      setIsAccessDialogOpen(open);
      if (!open) { setManagingAccessCourse(null); setSelectedEmployeeIds(new Set()); }
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Mitarbeiterzugriff verwalten
          </DialogTitle>
          <DialogDescription>
            {managingAccessCourse
              ? `Zugriff für Kurs "${managingAccessCourse.name}" verwalten.`
              : "Mitarbeiterzugriff verwalten."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[420px] overflow-y-auto border rounded-xl p-3 space-y-2">
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Keine aktiven Mitarbeiter gefunden.</p>
          ) : (
            employees.map((employee) => {
              const checked = selectedEmployeeIds.has(employee.id);
              return (
                <label key={employee.id}
                  className={`flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer transition-colors ${checked ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                      {employee.full_name.charAt(0).toUpperCase()}
                    </div>
<div>
  <p className="text-sm font-medium">{employee.full_name}</p>
  {employee.email && (
    <p className="text-xs text-muted-foreground">{employee.email}</p>
  )}
  {employee.role && (
    <p className="text-xs text-muted-foreground capitalize">{employee.role}</p>
  )}
</div>
                  </div>
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggleEmployeeAccess(employee.id, Boolean(value))}
                  />
                </label>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedEmployeeIds.size} von {employees.length} Mitarbeitern ausgewählt
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => {
              setIsAccessDialogOpen(false);
              setManagingAccessCourse(null);
              setSelectedEmployeeIds(new Set());
            }}>
              Abbrechen
            </Button>
            <Button onClick={saveCourseAccess} disabled={savingAccess}>
              {savingAccess ? "Wird gespeichert..." : "Speichern"}
            </Button>
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

  // ── Kursdetail-Ansicht ────────────────────────────────────────────────────
  if (selectedCourse) {
    const publishedCount = lessons.filter((l) => l.status === "published").length;
    const draftCount = lessons.filter((l) => l.status === "draft").length;
    const accessCount = courseAccessByCourse[selectedCourse.id]?.length || 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header */}
        <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/training")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{selectedCourse.name}</h1>
                <p className="text-xs text-muted-foreground">{selectedCourse.description || "Schulungsmodul"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openAccessDialog(selectedCourse)}>
                <Users className="w-4 h-4 mr-2" />
                Zugriff verwalten
              </Button>
              <Button size="sm" onClick={() => navigate(`/training/${selectedCourse.id}/lesson/new`)}>
                <Plus className="w-4 h-4 mr-2" />
                Lektion hinzufügen
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 space-y-6">
          {/* Kurs-Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{lessons.length}</p>
                    <p className="text-xs text-muted-foreground">Lektionen gesamt</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{publishedCount}</p>
                    <p className="text-xs text-muted-foreground">Veröffentlicht</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{draftCount}</p>
                    <p className="text-xs text-muted-foreground">Entwürfe</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{accessCount}</p>
                    <p className="text-xs text-muted-foreground">Mitarbeiter</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fortschrittsbalken */}
          {lessons.length > 0 && (
            <Card className="border-0 shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Veröffentlichungsfortschritt</span>
                  <span className="text-sm font-bold text-primary">
                    {Math.round((publishedCount / lessons.length) * 100)}%
                  </span>
                </div>
                <Progress value={(publishedCount / lessons.length) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {publishedCount} von {lessons.length} Lektionen veröffentlicht
                </p>
              </CardContent>
            </Card>
          )}

          {/* Zertifikat-Banner */}
          <Card className="border-0 shadow-md bg-gradient-to-r from-amber-500 to-orange-600 text-white overflow-hidden relative">
            <div className="absolute right-0 top-0 opacity-10">
              <Award className="w-40 h-40 -mr-8 -mt-8" />
            </div>
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Zertifikate</p>
                    <p className="text-white/80 text-sm">
                      Mitarbeiter erhalten nach Abschluss aller Lektionen automatisch ein PDF-Zertifikat.
                    </p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  Automatisch
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Lektionen */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Kursinhalt</CardTitle>
                  <CardDescription>Lektionen verwalten und veröffentlichen</CardDescription>
                </div>
                <Button onClick={() => navigate(`/training/${selectedCourse.id}/lesson/new`)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Lektion hinzufügen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {lessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <BookOpen className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground mb-1">Noch keine Lektionen</p>
                  <p className="text-sm text-muted-foreground/60 mb-4">Füge die erste Lektion hinzu um den Kurs zu starten</p>
                  <Button onClick={() => navigate(`/training/${selectedCourse.id}/lesson/new`)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Erste Lektion erstellen
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lessons.map((lesson) => (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      onDelete={onLessonDelete}
                      onDuplicate={handleDuplicateLesson}
                      onToggleStatus={handleToggleLessonStatus}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
        {renderAccessDialog()}
      </div>
    );
  }

  // ── Kursübersicht ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Schulungsmanagement</h1>
              <p className="text-xs text-muted-foreground">Kurse, Lektionen und Zertifikate verwalten</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-green-600 text-white p-8 shadow-2xl">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-8 h-8" />
                <span className="text-lg font-bold">HSE Hub Akademie</span>
              </div>
              <h2 className="text-3xl font-bold mb-2">Schulungen & Qualifikationen</h2>
              <p className="text-blue-100 max-w-lg">
                Erstellen Sie Kurse, verwalten Sie Lektionen und stellen Sie Ihren Mitarbeitern
                automatische Zertifikate nach Kursabschluss aus.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="text-center bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-3xl font-bold">{courses.length}</p>
                <p className="text-xs text-blue-100">Kurse</p>
              </div>
              <div className="text-center bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-3xl font-bold">{totalEmployeesWithAccess}</p>
                <p className="text-xs text-blue-100">Mitarbeiter</p>
              </div>
              <div className="text-center bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-3xl font-bold">{employees.length}</p>
                <p className="text-xs text-blue-100">Gesamt</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Kacheln */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courses.length}</p>
                <p className="text-xs text-muted-foreground">Kurse gesamt</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEmployeesWithAccess}</p>
                <p className="text-xs text-muted-foreground">Zugewiesene Mitarbeiter</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courses.length}</p>
                <p className="text-xs text-muted-foreground">Zertifikate bereit</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {employees.length > 0
                    ? Math.round((totalEmployeesWithAccess / employees.length) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Abdeckungsquote</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kursliste */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Alle Kurse</CardTitle>
                <CardDescription>Klicken Sie auf einen Kurs um Lektionen zu verwalten</CardDescription>
              </div>
              <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                    <Plus className="w-4 h-4 mr-2" />
                    Neuen Kurs erstellen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      Neuen Kurs erstellen
                    </DialogTitle>
                    <DialogDescription>
                      Erstellen Sie einen neuen Schulungskurs für Ihre Mitarbeiter.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...courseForm}>
                    <form onSubmit={courseForm.handleSubmit(onCourseSubmit)} className="space-y-4">
                      <FormField
                        control={courseForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kursname *</FormLabel>
                            <FormControl>
                              <Input placeholder="z. B. Arbeitssicherheit Grundlagen" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={courseForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Beschreibung (optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Kurze Beschreibung des Kursinhalts..."
                                {...field}
                                rows={3}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsCourseDialogOpen(false)}>
                          Abbrechen
                        </Button>
                        <Button type="submit">Kurs erstellen</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {/* Suche */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Kurse durchsuchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 border-2 focus:border-primary transition-colors"
                />
              </div>
            </div>

            {filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center mb-6">
                  <GraduationCap className="w-12 h-12 text-blue-500" />
                </div>
                <p className="text-xl font-semibold mb-2">Noch keine Kurse vorhanden</p>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Erstellen Sie Ihren ersten Schulungskurs und weisen Sie ihn Ihren Mitarbeitern zu.
                </p>
                <Button
                  className="bg-gradient-to-r from-blue-600 to-blue-700"
                  onClick={() => setIsCourseDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ersten Kurs erstellen
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course, index) => {
                  const accessCount = courseAccessByCourse[course.id]?.length || 0;
                  const colorClass = COURSE_COLORS[index % COURSE_COLORS.length];
                  const coveragePercent = employees.length > 0
                    ? Math.round((accessCount / employees.length) * 100)
                    : 0;

                  return (
                    <div
                      key={course.id}
                      className="group rounded-2xl border-2 border-border hover:border-primary/40 hover:shadow-xl transition-all duration-300 overflow-hidden bg-card cursor-pointer"
                      onClick={() => navigate(`/training/${course.id}`)}
                    >
                      {/* Kurs-Cover */}
                      <div className={`h-32 bg-gradient-to-br ${colorClass} flex items-center justify-center relative overflow-hidden`}>
                        <div className="absolute inset-0 opacity-20">
                          <div className="absolute top-2 right-2 w-16 h-16 bg-white rounded-full" />
                          <div className="absolute bottom-2 left-2 w-10 h-10 bg-white rounded-full" />
                        </div>
                        <GraduationCap className="w-14 h-14 text-white relative z-10 group-hover:scale-110 transition-transform duration-300" />
                        {/* Badge: Zertifikat */}
                        <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                          <Award className="w-3 h-3 text-white" />
                          <span className="text-white text-xs font-medium">Zertifikat</span>
                        </div>
                      </div>

                      {/* Kurs-Info */}
                      <div className="p-5">
                        <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">
                          {course.name}
                        </h3>
                        {course.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {course.description}
                          </p>
                        )}

                        {/* Abdeckungsfortschritt */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Mitarbeiterabdeckung</span>
                            <span className="font-medium">{coveragePercent}%</span>
                          </div>
                          <Progress value={coveragePercent} className="h-1.5" />
                        </div>

                        {/* Aktionsleiste */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="w-3.5 h-3.5" />
                            <span>{accessCount} Mitarbeiter</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAccessDialog(course);
                              }}
                              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary hover:text-white text-primary transition-all"
                              title="Zugriff verwalten"
                            >
                              <Users className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => onCourseDelete(course.id, course.name, e)}
                              className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive hover:text-white text-destructive transition-all"
                              title="Kurs löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {renderAccessDialog()}
    </div>
  );
}
