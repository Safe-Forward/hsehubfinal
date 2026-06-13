import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  ChevronRight,
  Video,
  FileText,
  Type,
  Code,
  FolderOpen,
  CheckCircle,
  Award,
  Download,
  Loader2,
  ClipboardList,
  X,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import jsPDF from "jspdf";

// ── Quiz Types ────────────────────────────────────────────────────────────
type QuestionType = "single" | "multiple" | "truefalse" | "image" | "video";

interface QuizAnswer {
  id: string;
  text: string;
  is_correct: boolean;
}

interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  media_url?: string;
  media_type?: "image" | "video";
  answers: QuizAnswer[];
}

interface QuizData {
  passing_score: number;
  max_attempts: number;
  questions: QuizQuestion[];
}

interface Lesson {
  id: string;
  course_id: string;
  name: string;
  type: "subchapter" | "video_audio" | "pdf" | "text" | "iframe" | "quiz";
  content_url: string | null;
  content_data: any;
  order_index: number;
  status: "draft" | "published";
  is_required?: boolean;
  unlock_after?: string | null;
  quiz_data?: QuizData | null;
}

interface Course {
  id: string;
  name: string;
}

export default function LessonViewer() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user, loading, companyId, userRole } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isAdmin = userRole === "company_admin" || userRole === "super_admin";

  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [savingProgress, setSavingProgress] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<any>(null);
  const [generatingCert, setGeneratingCert] = useState(false);

  // ── Quiz States ───────────────────────────────────────────────────────────
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizPassed, setQuizPassed] = useState(false);
  const [quizAttempts, setQuizAttempts] = useState(0);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (user && companyId && courseId && lessonId) {
      fetchCourse();
      fetchLesson();
      if (!isAdmin) fetchEmployeeId();
    }
  }, [user, loading, navigate, companyId, courseId, lessonId]);

  useEffect(() => {
    if (employeeId && courseId) {
      fetchProgress();
      fetchAllLessons();
      fetchCertificate();
      fetchQuizAttempts();
    }
  }, [employeeId, courseId]);

  const fetchEmployeeId = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from("employees").select("id").eq("user_id", user.id).single();
    if (data) setEmployeeId(data.id);
  };

  const fetchCourse = async () => {
    if (!courseId || !companyId) return;
    try {
      const { data, error } = await supabase.from("courses").select("id, name").eq("id", courseId).eq("company_id", companyId).single();
      if (error) throw error;
      setCourse(data);
    } catch (err: any) {
      toast({ title: "Fehler beim Laden des Kurses", description: err.message, variant: "destructive" });
      navigate("/training");
    }
  };

  const fetchLesson = async () => {
    if (!lessonId || !courseId) return;
    try {
      const { data, error } = await supabase.from("course_lessons").select("*").eq("id", lessonId).eq("course_id", courseId).single();
      if (error) throw error;
      if (!isAdmin && data.status === "draft") {
        toast({ title: "Kein Zugriff", description: "Diese Lektion ist noch nicht veroeffentlicht.", variant: "destructive" });
        navigate(`/training/${courseId}`);
        return;
      }
      setLesson(data as any);
    } catch (err: any) {
      toast({ title: "Fehler beim Laden der Lektion", description: err.message, variant: "destructive" });
      navigate("/training");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllLessons = async () => {
    if (!courseId) return;
    const { data } = await supabase
      .from("course_lessons")
      .select("id, name, order_index, status, is_required, unlock_after, quiz_data, type, content_url, content_data, course_id")
      .eq("course_id", courseId)
      .eq("status", "published")
      .order("order_index", { ascending: true });
    setAllLessons((data as any) || []);
  };

  const fetchProgress = async () => {
    if (!employeeId || !courseId) return;
    const { data } = await (supabase as any)
      .from("course_lesson_progress")
      .select("lesson_id")
      .eq("employee_id", employeeId)
      .eq("course_id", courseId);
    const ids = new Set((data || []).map((p: any) => p.lesson_id));
    setCompletedLessonIds(ids);
    if (lessonId && ids.has(lessonId)) setCompleted(true);
  };

  const fetchCertificate = async () => {
    if (!employeeId || !courseId) return;
    const { data } = await (supabase as any)
      .from("course_certificates")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("course_id", courseId)
      .single();
    if (data) setCertificate(data);
  };

  const fetchQuizAttempts = async () => {
    if (!employeeId || !lessonId) return;
    const { data } = await (supabase as any)
      .from("course_quiz_results")
      .select("id, score, passed")
      .eq("employee_id", employeeId)
      .eq("quiz_id", lessonId);
    setQuizAttempts((data || []).length);
  };

  // ── Quiz Logic ────────────────────────────────────────────────────────────

  const toggleAnswer = (questionId: string, answerId: string, type: QuestionType) => {
    setSelectedAnswers((prev) => {
      const current = prev[questionId] || [];
      if (type === "single" || type === "truefalse" || type === "image" || type === "video") {
        return { ...prev, [questionId]: [answerId] };
      }
      // multiple
      if (current.includes(answerId)) {
        return { ...prev, [questionId]: current.filter((id) => id !== answerId) };
      }
      return { ...prev, [questionId]: [...current, answerId] };
    });
  };

  const submitQuiz = async () => {
    if (!lesson?.quiz_data || !employeeId || !companyId) return;
    setSubmittingQuiz(true);

    const questions = lesson.quiz_data.questions;
    let correctCount = 0;

    questions.forEach((q) => {
      const selected = selectedAnswers[q.id] || [];
      const correct = q.answers.filter((a) => a.is_correct).map((a) => a.id);

      if (q.type === "multiple") {
        const allCorrect = correct.every((id) => selected.includes(id));
        const noWrong = selected.every((id) => correct.includes(id));
        if (allCorrect && noWrong) correctCount++;
      } else {
        if (selected.length === 1 && correct.includes(selected[0])) correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= lesson.quiz_data.passing_score;

    setQuizScore(score);
    setQuizPassed(passed);
    setQuizSubmitted(true);

    try {
      // Quiz-Ergebnis speichern
      await (supabase as any).from("course_quiz_results").insert({
        company_id: companyId,
        quiz_id: lessonId,
        employee_id: employeeId,
        score,
        passed,
        answers: Object.entries(selectedAnswers).map(([qId, aIds]) => ({ question_id: qId, answer_ids: aIds })),
        completed_at: new Date().toISOString(),
      });

      setQuizAttempts((prev) => prev + 1);

      if (passed) {
        // Lektion als abgeschlossen markieren
        await handleCompleteLesson(true);
      }
    } catch (err: any) {
      console.error("Fehler beim Speichern des Quiz-Ergebnisses:", err);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const resetQuiz = () => {
    setQuizStarted(false);
    setQuizSubmitted(false);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setQuizScore(0);
    setQuizPassed(false);
  };

  const handleCompleteLesson = async (fromQuiz = false) => {
    if (!employeeId || !lessonId || !courseId || !companyId) return;
    if (!fromQuiz) setSavingProgress(true);
    try {
      await (supabase as any).from("course_lesson_progress").upsert({
        company_id: companyId,
        course_id: courseId,
        lesson_id: lessonId,
        employee_id: employeeId,
        completed_at: new Date().toISOString(),
      }, { onConflict: "lesson_id,employee_id" });

      const newCompleted = new Set(completedLessonIds);
      newCompleted.add(lessonId);
      setCompletedLessonIds(newCompleted);
      setCompleted(true);

      // Nur Pflichtlektionen für Zertifikat prüfen
      const requiredLessons = allLessons.filter((l) => (l as any).is_required !== false);
      const allRequiredDone = requiredLessons.every((l) => newCompleted.has(l.id));

      if (allRequiredDone && !certificate) {
        await generateCertificate();
      } else if (!fromQuiz) {
        toast({ title: "Lektion abgeschlossen!", description: "Dein Fortschritt wurde gespeichert." });
        const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
        if (currentIndex < allLessons.length - 1) {
          setTimeout(() => navigate(`/training/${courseId}/lesson/${allLessons[currentIndex + 1].id}/view`), 1000);
        } else {
          setTimeout(() => navigate(`/training/${courseId}`), 1000);
        }
      }
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      if (!fromQuiz) setSavingProgress(false);
    }
  };

  const generateCertificate = async () => {
    if (!employeeId || !courseId || !companyId) return;
    setGeneratingCert(true);
    try {
      const certNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const { data: certData, error } = await (supabase as any)
        .from("course_certificates")
        .insert({ company_id: companyId, course_id: courseId, employee_id: employeeId, certificate_number: certNumber, issued_at: new Date().toISOString() })
        .select().single();
      if (error) throw error;
      setCertificate(certData);
      toast({ title: "Kurs abgeschlossen! 🎉", description: "Herzlichen Glueckwunsch! Ihr Zertifikat wurde generiert." });
    } catch (err: any) {
      toast({ title: "Fehler beim Generieren des Zertifikats", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingCert(false);
    }
  };

  const downloadCertificate = async () => {
    if (!certificate || !course) return;
    const { data: empData } = await supabase.from("employees").select("full_name").eq("id", employeeId!).single();
    const userName = empData?.full_name || "Teilnehmer";
    const issuedDate = new Date(certificate.issued_at).toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" });

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
    doc.text("Hiermit wird bestaetigt, dass", width / 2, 88, { align: "center" });
    doc.setFontSize(28); doc.setFont("helvetica", "bold"); doc.setTextColor(15, 41, 66);
    doc.text(userName, width / 2, 108, { align: "center" });
    doc.setDrawColor(34, 197, 94); doc.setLineWidth(1.5);
    const nameWidth = doc.getTextWidth(userName);
    doc.line(width / 2 - nameWidth / 2, 112, width / 2 + nameWidth / 2, 112);
    doc.setFontSize(13); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
    doc.text("den folgenden Kurs erfolgreich abgeschlossen hat:", width / 2, 124, { align: "center" });
    doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 78, 137);
    doc.text(course.name, width / 2, 140, { align: "center" });
    doc.setFillColor(34, 197, 94); doc.rect(width / 2 - 40, 145, 80, 3, "F");
    doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
    doc.text(`Ausgestellt am: ${issuedDate}`, width / 2, 162, { align: "center" });
    doc.setFontSize(9); doc.setTextColor(150, 150, 150);
    doc.text(`Zertifikatsnummer: ${certificate.certificate_number}`, width / 2, 172, { align: "center" });
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
    doc.save(`Zertifikat_${course.name}_${userName}.pdf`);
  };

  const progressPercent = allLessons.length > 0
    ? Math.round((completedLessonIds.size / allLessons.length) * 100) : 0;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video_audio": return <Video className="w-6 h-6" />;
      case "pdf": return <FileText className="w-6 h-6" />;
      case "text": return <Type className="w-6 h-6" />;
      case "iframe": return <Code className="w-6 h-6" />;
      case "subchapter": return <FolderOpen className="w-6 h-6" />;
      case "quiz": return <ClipboardList className="w-6 h-6" />;
      default: return <FileText className="w-6 h-6" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "video_audio": return "Video/Audio";
      case "pdf": return "PDF";
      case "text": return "Text";
      case "iframe": return "iFrame";
      case "subchapter": return "Kapitel";
      case "quiz": return "Quiz";
      default: return type;
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Lektion wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Lektion nicht gefunden</p>
      </div>
    );
  }

  const quizData = lesson.quiz_data;
  const maxAttemptsReached = quizData && quizAttempts >= quizData.max_attempts && !completed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/training/${courseId}`)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="hover:text-foreground cursor-pointer" onClick={() => navigate(`/training/${courseId}`)}>
                  {course?.name || "Kurs"}
                </span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-medium">{lesson.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isAdmin && allLessons.length > 0 && (
                <div className="hidden md:flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{completedLessonIds.size}/{allLessons.length} Lektionen</span>
                  <Progress value={progressPercent} className="w-24 h-2" />
                  <span className="text-xs font-medium text-primary">{progressPercent}%</span>
                </div>
              )}
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate(`/training/${courseId}/lesson/${lessonId}`)}>
                  Lektion bearbeiten
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Zertifikat Banner */}
        {certificate && !isAdmin && (
          <Card className="mb-6 border-0 shadow-md bg-gradient-to-r from-amber-500 to-orange-600 text-white overflow-hidden relative">
            <div className="absolute right-0 top-0 opacity-10"><Award className="w-32 h-32 -mr-4 -mt-4" /></div>
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"><Award className="w-6 h-6 text-white" /></div>
                  <div>
                    <p className="font-bold text-lg">Kurs abgeschlossen!</p>
                    <p className="text-white/80 text-sm">Zertifikat Nr. {certificate.certificate_number}</p>
                    <p className="text-white/70 text-xs">Ausgestellt am {new Date(certificate.issued_at).toLocaleDateString("de-DE")}</p>
                  </div>
                </div>
                <Button onClick={downloadCertificate} className="bg-white text-orange-600 hover:bg-orange-50">
                  <Download className="w-4 h-4 mr-2" />PDF herunterladen
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lektion Info */}
        <Card className="mb-6 border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white ${
                completed ? "bg-gradient-to-br from-green-500 to-green-700"
                : lesson.type === "quiz" ? "bg-gradient-to-br from-pink-500 to-rose-600"
                : "bg-gradient-to-br from-purple-500 to-pink-600"
              }`}>
                {completed ? <CheckCircle className="w-7 h-7" /> : getTypeIcon(lesson.type)}
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{lesson.name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{getTypeLabel(lesson.type)}</Badge>
                  {completed && <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Abgeschlossen</Badge>}
                  {isAdmin && <Badge variant={lesson.status === "published" ? "default" : "secondary"}>{lesson.status === "published" ? "Veroeffentlicht" : "Entwurf"}</Badge>}
                  {lesson.type === "quiz" && quizData && (
                    <Badge className="bg-pink-100 text-pink-700 border-pink-200">
                      {quizData.questions.length} Fragen • {quizData.passing_score}% zum Bestehen
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          {lesson.content_data?.description && (
            <CardContent><p className="text-muted-foreground">{lesson.content_data.description}</p></CardContent>
          )}
        </Card>

        {/* Tags */}
        {lesson.content_data?.tags && Array.isArray(lesson.content_data.tags) && lesson.content_data.tags.length > 0 && (
          <Card className="mb-6 border-0 shadow-md">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                {lesson.content_data.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── QUIZ ANSICHT ── */}
        {lesson.type === "quiz" && quizData && !isAdmin && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">

              {/* Quiz noch nicht gestartet */}
              {!quizStarted && !quizSubmitted && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mx-auto mb-4">
                    <ClipboardList className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{lesson.name}</h2>
                  <p className="text-muted-foreground mb-6">
                    {quizData.questions.length} Fragen • Mindestpunktzahl: {quizData.passing_score}% • Max. {quizData.max_attempts} Versuche
                  </p>
                  {quizAttempts > 0 && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Bisher {quizAttempts} von {quizData.max_attempts} Versuchen genutzt
                    </p>
                  )}
                  {completed ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Quiz bereits bestanden!</span>
                    </div>
                  ) : maxAttemptsReached ? (
                    <div className="flex items-center justify-center gap-2 text-destructive">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">Maximale Anzahl an Versuchen erreicht.</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setQuizStarted(true)}
                      className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 px-8"
                    >
                      Quiz starten
                    </Button>
                  )}
                </div>
              )}

              {/* Quiz läuft */}
              {quizStarted && !quizSubmitted && quizData.questions.length > 0 && (
                <div className="space-y-6">
                  {/* Fortschritt */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Frage {currentQuestionIndex + 1} von {quizData.questions.length}</span>
                      <span className="font-medium">{Math.round(((currentQuestionIndex) / quizData.questions.length) * 100)}%</span>
                    </div>
                    <Progress value={(currentQuestionIndex / quizData.questions.length) * 100} className="h-2" />
                  </div>

                  {/* Aktuelle Frage */}
                  {(() => {
                    const q = quizData.questions[currentQuestionIndex];
                    const selected = selectedAnswers[q.id] || [];
                    return (
                      <div className="space-y-4">
                        {/* Media */}
                        {q.media_url && q.media_type === "image" && (
                          <img src={q.media_url} alt="Frage" className="w-full rounded-xl max-h-64 object-cover" />
                        )}
                        {q.media_url && q.media_type === "video" && (
                          <div className="aspect-video bg-black rounded-xl overflow-hidden">
                            <iframe
                              src={q.media_url.includes("youtube.com")
                                ? q.media_url.replace("watch?v=", "embed/")
                                : q.media_url.includes("youtu.be")
                                ? q.media_url.replace("youtu.be/", "youtube.com/embed/")
                                : q.media_url}
                              className="w-full h-full" allowFullScreen title="Video"
                            />
                          </div>
                        )}

                        {/* Fragetext */}
                        <h3 className="text-lg font-semibold leading-relaxed">{q.question}</h3>

                        {q.type === "multiple" && (
                          <p className="text-xs text-muted-foreground">Mehrere Antworten möglich</p>
                        )}

                        {/* Antworten */}
                        <div className="space-y-2">
                          {q.answers.map((answer) => {
                            const isSelected = selected.includes(answer.id);
                            return (
                              <button
                                key={answer.id}
                                type="button"
                                onClick={() => toggleAnswer(q.id, answer.id, q.type)}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/10 font-medium"
                                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded-${q.type === "multiple" ? "sm" : "full"} border-2 flex items-center justify-center flex-shrink-0 ${
                                    isSelected ? "bg-primary border-primary" : "border-gray-300"
                                  }`}>
                                    {isSelected && <span className="text-white text-xs">✓</span>}
                                  </div>
                                  <span className="text-sm">{answer.text}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Navigation */}
                        <div className="flex justify-between pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0}
                          >
                            <ArrowLeft className="w-4 h-4 mr-1" />Zurück
                          </Button>

                          {currentQuestionIndex < quizData.questions.length - 1 ? (
                            <Button
                              type="button"
                              onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                              disabled={!selected.length}
                            >
                              Weiter<ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              onClick={submitQuiz}
                              disabled={!selected.length || submittingQuiz}
                              className="bg-gradient-to-r from-green-600 to-green-700"
                            >
                              {submittingQuiz ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                              Quiz abschliessen
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Quiz Ergebnis */}
              {quizSubmitted && (
                <div className="text-center py-8 space-y-6">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${
                    quizPassed ? "bg-gradient-to-br from-green-400 to-green-600" : "bg-gradient-to-br from-red-400 to-red-600"
                  }`}>
                    {quizPassed
                      ? <CheckCircle className="w-12 h-12 text-white" />
                      : <X className="w-12 h-12 text-white" />}
                  </div>

                  <div>
                    <h2 className={`text-3xl font-bold ${quizPassed ? "text-green-600" : "text-red-600"}`}>
                      {quizScore}%
                    </h2>
                    <p className="text-lg font-medium mt-1">
                      {quizPassed ? "Bestanden!" : "Nicht bestanden"}
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Mindestpunktzahl: {quizData.passing_score}% • Versuche: {quizAttempts}/{quizData.max_attempts}
                    </p>
                  </div>

                  {/* Auswertung */}
                  <div className="text-left space-y-3 max-w-lg mx-auto">
                    {quizData.questions.map((q, idx) => {
                      const selected = selectedAnswers[q.id] || [];
                      const correct = q.answers.filter((a) => a.is_correct).map((a) => a.id);
                      const isCorrect = q.type === "multiple"
                        ? correct.every((id) => selected.includes(id)) && selected.every((id) => correct.includes(id))
                        : selected.length === 1 && correct.includes(selected[0]);

                      return (
                        <div key={q.id} className={`p-3 rounded-xl border-2 ${isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                          <div className="flex items-start gap-2">
                            {isCorrect
                              ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              : <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{q.question}</p>
                              {!isCorrect && (
                                <p className="text-xs text-green-700 mt-1">
                                  Richtig: {q.answers.filter((a) => a.is_correct).map((a) => a.text).join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Aktionen */}
                  <div className="flex gap-3 justify-center">
                    {!quizPassed && quizAttempts < quizData.max_attempts && (
                      <Button onClick={resetQuiz} variant="outline">
                        <RotateCcw className="w-4 h-4 mr-2" />Nochmal versuchen ({quizData.max_attempts - quizAttempts} verbleibend)
                      </Button>
                    )}
                    <Button onClick={() => navigate(`/training/${courseId}`)} variant={quizPassed ? "default" : "outline"}>
                      Zum Kurs
                    </Button>
                  </div>

                  {quizPassed && certificate && (
                    <Button onClick={downloadCertificate} className="bg-gradient-to-r from-amber-500 to-orange-600">
                      <Download className="w-4 h-4 mr-2" />Zertifikat herunterladen
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Admin Quiz Vorschau */}
        {lesson.type === "quiz" && quizData && isAdmin && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-pink-600" />
                Quiz Vorschau
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 p-4 bg-muted/30 rounded-xl text-sm">
                <span><strong>{quizData.questions.length}</strong> Fragen</span>
                <span><strong>{quizData.passing_score}%</strong> zum Bestehen</span>
                <span><strong>{quizData.max_attempts}</strong> max. Versuche</span>
              </div>
              {quizData.questions.map((q, idx) => (
                <div key={q.id} className="p-4 border rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                    <Badge variant="outline" className="text-xs">
                      {q.type === "single" && "Einzelauswahl"}
                      {q.type === "multiple" && "Mehrfachauswahl"}
                      {q.type === "truefalse" && "Wahr/Falsch"}
                      {q.type === "image" && "Bildfrage"}
                      {q.type === "video" && "Videofrage"}
                    </Badge>
                  </div>
                  {q.media_url && q.media_type === "image" && (
                    <img src={q.media_url} alt="" className="rounded-lg max-h-32 object-cover" />
                  )}
                  <p className="font-medium text-sm">{q.question || <span className="text-muted-foreground italic">Kein Fragetext</span>}</p>
                  <div className="space-y-1">
                    {q.answers.map((a) => (
                      <div key={a.id} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${a.is_correct ? "bg-green-50 text-green-700" : "bg-muted/30"}`}>
                        {a.is_correct ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-gray-300" />}
                        {a.text || <span className="italic text-muted-foreground">Leer</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Normaler Inhalt (nicht Quiz) */}
        {lesson.type !== "quiz" && (
          <Card className="border-0 shadow-md">
            <CardHeader><CardTitle className="text-lg">Inhalt</CardTitle></CardHeader>
            <CardContent>
              {lesson.type === "video_audio" && lesson.content_url && (
                <div className="w-full">
                  {(lesson.content_url.includes("youtube.com") || lesson.content_url.includes("youtu.be") || lesson.content_url.includes("vimeo.com")) ? (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <iframe
                        src={lesson.content_url.includes("youtube.com") ? lesson.content_url.replace("watch?v=", "embed/")
                          : lesson.content_url.includes("youtu.be") ? lesson.content_url.replace("youtu.be/", "youtube.com/embed/")
                          : lesson.content_url.replace("vimeo.com/", "player.vimeo.com/video/")}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen title={lesson.name}
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <video src={lesson.content_url} controls preload="auto" className="w-full h-full">
                        Ihr Browser unterstuetzt kein Video.
                      </video>
                    </div>
                  )}
                </div>
              )}
              {lesson.type === "pdf" && lesson.content_url && (
                <div className="w-full space-y-4">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      let url = lesson.content_url!;
                      if (url.includes("cloudinary.com")) url = url.replace(/\/(raw|image|video|auto)\/upload\//, "/$1/upload/fl_attachment/");
                      fetch(url).then((r) => r.blob()).then((blob) => {
                        const a = document.createElement("a");
                        a.href = window.URL.createObjectURL(blob);
                        a.download = lesson.name + ".pdf";
                        document.body.appendChild(a); a.click(); document.body.removeChild(a);
                      }).catch(() => window.open(lesson.content_url!, "_blank"));
                    }}>
                      <FileText className="w-4 h-4 mr-2" />PDF herunterladen
                    </Button>
                    <Button variant="default" size="sm" onClick={() => window.open(lesson.content_url!, "_blank", "noopener,noreferrer")}>
                      In neuem Tab oeffnen
                    </Button>
                  </div>
                  <object data={lesson.content_url} type="application/pdf" className="w-full rounded-lg border-2 border-gray-300" style={{ height: "800px" }}>
                    <embed src={lesson.content_url} type="application/pdf" className="w-full h-full" />
                  </object>
                </div>
              )}
              {lesson.type === "text" && lesson.content_data?.text_content && (
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{lesson.content_data.text_content}</p>
                </div>
              )}
              {lesson.type === "iframe" && lesson.content_url && (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <iframe src={lesson.content_url} className="w-full h-full" title="Inhalt" allowFullScreen />
                </div>
              )}
              {!lesson.content_url && !lesson.content_data?.text_content && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Kein Inhalt verfuegbar.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Abschliessen für normale Nutzer (nicht Quiz) */}
        {!isAdmin && lesson.type !== "quiz" && (
          <Card className="mt-6 border-0 shadow-md">
            <CardContent className="p-5">
              {allLessons.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Kursfortschritt</span>
                    <span className="font-medium text-primary">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{completedLessonIds.size} von {allLessons.length} Lektionen abgeschlossen</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{completed ? "Lektion bereits abgeschlossen" : "Lektion abschliessen"}</p>
                  <p className="text-sm text-muted-foreground">
                    {completed ? "Du hast diese Lektion erfolgreich abgeschlossen." : "Markiere diese Lektion als abgeschlossen."}
                  </p>
                </div>
                <Button
                  onClick={() => handleCompleteLesson()}
                  className={completed ? "bg-green-600 hover:bg-green-700" : "bg-gradient-to-r from-green-600 to-green-700"}
                  disabled={completed || savingProgress || generatingCert}
                >
                  {savingProgress || generatingCert ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{generatingCert ? "Zertifikat..." : "Speichern..."}</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 mr-2" />{completed ? "Abgeschlossen" : "Als abgeschlossen markieren"}</>
                  )}
                </Button>
              </div>
              {certificate && (
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">Zertifikat verfuegbar</p>
                      <p className="text-xs text-muted-foreground">Nr. {certificate.certificate_number}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadCertificate}>
                    <Download className="w-4 h-4 mr-2" />Herunterladen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => navigate(`/training/${courseId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />Zurueck zum Kurs
          </Button>
          {!isAdmin && lesson.type !== "quiz" && (() => {
            const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
            const nextLesson = allLessons[currentIndex + 1];
            if (!nextLesson) return null;
            return (
              <Button onClick={() => navigate(`/training/${courseId}/lesson/${nextLesson.id}/view`)} className="bg-gradient-to-r from-blue-600 to-blue-700">
                Naechste Lektion<ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
