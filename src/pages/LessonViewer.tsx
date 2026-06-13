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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import jsPDF from "jspdf";

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

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (user && companyId && courseId && lessonId) {
      fetchCourse();
      fetchLesson();
      if (!isAdmin) {
        fetchEmployeeId();
      }
    }
  }, [user, loading, navigate, companyId, courseId, lessonId]);

  useEffect(() => {
    if (employeeId && courseId) {
      fetchProgress();
      fetchAllLessons();
      fetchCertificate();
    }
  }, [employeeId, courseId]);

  const fetchEmployeeId = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (data) setEmployeeId(data.id);
  };

  const fetchCourse = async () => {
    if (!courseId || !companyId) return;
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name")
        .eq("id", courseId)
        .eq("company_id", companyId)
        .single();
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
      const { data, error } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("id", lessonId)
        .eq("course_id", courseId)
        .single();
      if (error) throw error;
      if (!isAdmin && data.status === "draft") {
        toast({ title: "Kein Zugriff", description: "Diese Lektion ist noch nicht veroeffentlicht.", variant: "destructive" });
        navigate(`/training/${courseId}`);
        return;
      }
      setLesson(data);
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
      .select("id, name, order_index, status")
      .eq("course_id", courseId)
      .eq("status", "published")
      .order("order_index", { ascending: true });
    setAllLessons((data as Lesson[]) || []);
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

  const handleCompleteLesson = async () => {
    if (!employeeId || !lessonId || !courseId || !companyId) return;
    setSavingProgress(true);
    try {
      await (supabase as any)
        .from("course_lesson_progress")
        .upsert({
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

      // Prüfen ob alle Lektionen abgeschlossen
      const allDone = allLessons.every((l) => newCompleted.has(l.id));

      if (allDone && !certificate) {
        await generateCertificate();
      } else {
        toast({ title: "Lektion abgeschlossen!", description: "Dein Fortschritt wurde gespeichert." });
        // Nächste Lektion
        const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
        if (currentIndex < allLessons.length - 1) {
          const nextLesson = allLessons[currentIndex + 1];
          setTimeout(() => navigate(`/training/${courseId}/lesson/${nextLesson.id}/view`), 1000);
        } else {
          setTimeout(() => navigate(`/training/${courseId}`), 1000);
        }
      }
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setSavingProgress(false);
    }
  };

  const generateCertificate = async () => {
    if (!employeeId || !courseId || !companyId) return;
    setGeneratingCert(true);
    try {
      const certNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const { data: certData, error } = await (supabase as any)
        .from("course_certificates")
        .insert({
          company_id: companyId,
          course_id: courseId,
          employee_id: employeeId,
          certificate_number: certNumber,
          issued_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      setCertificate(certData);

      toast({
        title: "Kurs abgeschlossen! 🎉",
        description: "Herzlichen Glueckwunsch! Ihr Zertifikat wurde generiert.",
      });
    } catch (err: any) {
      toast({ title: "Fehler beim Generieren des Zertifikats", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingCert(false);
    }
  };

  const downloadCertificate = async () => {
    if (!certificate || !course) return;

    // Nutzername laden
    const { data: empData } = await supabase
      .from("employees")
      .select("full_name")
      .eq("id", employeeId!)
      .single();

    const userName = empData?.full_name || "Teilnehmer";
    const courseName = course.name;
    const issuedDate = new Date(certificate.issued_at).toLocaleDateString("de-DE", {
      year: "numeric", month: "long", day: "numeric"
    });
    const certNumber = certificate.certificate_number;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Hintergrund
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, width, height, "F");

    // Rahmen außen
    doc.setDrawColor(30, 78, 137);
    doc.setLineWidth(3);
    doc.rect(8, 8, width - 16, height - 16);

    // Rahmen innen
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(1);
    doc.rect(12, 12, width - 24, height - 24);

    // Header Hintergrund
    doc.setFillColor(15, 41, 66);
    doc.rect(8, 8, width - 16, 40, "F");

    // HSE Hub Titel
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("HSE HUB", width / 2, 24, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Health, Safety & Environment Management", width / 2, 34, { align: "center" });

    // Zertifikat Titel
    doc.setTextColor(30, 78, 137);
    doc.setFontSize(32);
    doc.setFont("helvetica", "bold");
    doc.text("ZERTIFIKAT", width / 2, 72, { align: "center" });

    // Untertitel
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Hiermit wird bestätigt, dass", width / 2, 88, { align: "center" });

    // Name
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 41, 66);
    doc.text(userName, width / 2, 108, { align: "center" });

    // Linie unter Name
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(1.5);
    const nameWidth = doc.getTextWidth(userName);
    doc.line(width / 2 - nameWidth / 2, 112, width / 2 + nameWidth / 2, 112);

    // Beschreibung
    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("den folgenden Kurs erfolgreich abgeschlossen hat:", width / 2, 124, { align: "center" });

    // Kursname
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 78, 137);
    doc.text(courseName, width / 2, 140, { align: "center" });

    // Grüner Akzentbalken
    doc.setFillColor(34, 197, 94);
    doc.rect(width / 2 - 40, 145, 80, 3, "F");

    // Datum
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Ausgestellt am: ${issuedDate}`, width / 2, 162, { align: "center" });

    // Zertifikatsnummer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Zertifikatsnummer: ${certNumber}`, width / 2, 172, { align: "center" });

    // Unterschriftslinie links
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.5);
    doc.line(40, 188, 110, 188);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Safe-Forward GmbH", 75, 194, { align: "center" });
    doc.setFontSize(9);
    doc.text("Geschäftsführung", 75, 200, { align: "center" });

    // Unterschriftslinie rechts
    doc.line(width - 110, 188, width - 40, 188);
    doc.setFontSize(10);
    doc.text("HSE Hub", width - 75, 194, { align: "center" });
    doc.setFontSize(9);
    doc.text("Schulungsplattform", width - 75, 200, { align: "center" });

    // Footer
    doc.setFillColor(15, 41, 66);
    doc.rect(8, height - 20, width - 16, 12, "F");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("www.safe-forward.de  |  info@tech-forward.de  |  HSE Hub – Health, Safety & Environment", width / 2, height - 12, { align: "center" });

    doc.save(`Zertifikat_${courseName}_${userName}.pdf`);
  };

  const progressPercent = allLessons.length > 0
    ? Math.round((completedLessonIds.size / allLessons.length) * 100)
    : 0;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video_audio": return <Video className="w-6 h-6" />;
      case "pdf": return <FileText className="w-6 h-6" />;
      case "text": return <Type className="w-6 h-6" />;
      case "iframe": return <Code className="w-6 h-6" />;
      case "subchapter": return <FolderOpen className="w-6 h-6" />;
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
              {/* Fortschritt im Header */}
              {!isAdmin && allLessons.length > 0 && (
                <div className="hidden md:flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {completedLessonIds.size}/{allLessons.length} Lektionen
                  </span>
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

        {/* Zertifikat Banner – wenn bereits erhalten */}
        {certificate && !isAdmin && (
          <Card className="mb-6 border-0 shadow-md bg-gradient-to-r from-amber-500 to-orange-600 text-white overflow-hidden relative">
            <div className="absolute right-0 top-0 opacity-10">
              <Award className="w-32 h-32 -mr-4 -mt-4" />
            </div>
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Kurs abgeschlossen!</p>
                    <p className="text-white/80 text-sm">
                      Zertifikat Nr. {certificate.certificate_number}
                    </p>
                    <p className="text-white/70 text-xs">
                      Ausgestellt am {new Date(certificate.issued_at).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={downloadCertificate}
                  className="bg-white text-orange-600 hover:bg-orange-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF herunterladen
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
                completed ? "bg-gradient-to-br from-green-500 to-green-700" : "bg-gradient-to-br from-purple-500 to-pink-600"
              }`}>
                {completed ? <CheckCircle className="w-7 h-7" /> : getTypeIcon(lesson.type)}
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{lesson.name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{getTypeLabel(lesson.type)}</Badge>
                  {completed && (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Abgeschlossen
                    </Badge>
                  )}
                  {isAdmin && (
                    <Badge variant={lesson.status === "published" ? "default" : "secondary"}>
                      {lesson.status === "published" ? "Veroeffentlicht" : "Entwurf"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          {lesson.content_data?.description && (
            <CardContent>
              <p className="text-muted-foreground">{lesson.content_data.description}</p>
            </CardContent>
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

        {/* Inhalt */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Inhalt</CardTitle>
          </CardHeader>
          <CardContent>
            {lesson.type === "video_audio" && lesson.content_url && (
              <div className="w-full">
                {(lesson.content_url.includes("youtube.com") ||
                  lesson.content_url.includes("youtu.be") ||
                  lesson.content_url.includes("vimeo.com")) ? (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <iframe
                      src={
                        lesson.content_url.includes("youtube.com")
                          ? lesson.content_url.replace("watch?v=", "embed/")
                          : lesson.content_url.includes("youtu.be")
                          ? lesson.content_url.replace("youtu.be/", "youtube.com/embed/")
                          : lesson.content_url.replace("vimeo.com/", "player.vimeo.com/video/")
                      }
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={lesson.name}
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
                    let downloadUrl = lesson.content_url!;
                    if (downloadUrl.includes("cloudinary.com")) {
                      downloadUrl = downloadUrl.replace(/\/(raw|image|video|auto)\/upload\//, "/$1/upload/fl_attachment/");
                    }
                    fetch(downloadUrl).then((r) => r.blob()).then((blob) => {
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = lesson.name + ".pdf";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    }).catch(() => window.open(lesson.content_url!, "_blank", "noopener,noreferrer"));
                  }}>
                    <FileText className="w-4 h-4 mr-2" />
                    PDF herunterladen
                  </Button>
                  <Button variant="default" size="sm" onClick={() => window.open(lesson.content_url!, "_blank", "noopener,noreferrer")}>
                    In neuem Tab oeffnen
                  </Button>
                </div>
                <object data={lesson.content_url} type="application/pdf" className="w-full rounded-lg border-2 border-gray-300" style={{ height: "800px", minHeight: "600px" }}>
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
                <iframe src={lesson.content_url} className="w-full h-full" title="Eingebetteter Inhalt" allowFullScreen />
              </div>
            )}

            {!lesson.content_url && !lesson.content_data?.text_content && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Kein Inhalt fuer diese Lektion verfuegbar.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Abschliessen Button für normale Nutzer */}
        {!isAdmin && (
          <Card className="mt-6 border-0 shadow-md">
            <CardContent className="p-5">
              {/* Kursfortschritt */}
              {allLessons.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Kursfortschritt</span>
                    <span className="font-medium text-primary">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {completedLessonIds.size} von {allLessons.length} Lektionen abgeschlossen
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {completed ? "Lektion bereits abgeschlossen" : "Lektion abschliessen"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {completed
                      ? "Du hast diese Lektion erfolgreich abgeschlossen."
                      : "Markiere diese Lektion als abgeschlossen um deinen Fortschritt zu speichern."}
                  </p>
                </div>
                <Button
                  onClick={handleCompleteLesson}
                  className={completed
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  }
                  disabled={completed || savingProgress || generatingCert}
                >
                  {savingProgress || generatingCert ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {generatingCert ? "Zertifikat wird erstellt..." : "Wird gespeichert..."}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {completed ? "Abgeschlossen" : "Als abgeschlossen markieren"}
                    </>
                  )}
                </Button>
              </div>

              {/* Zertifikat Download wenn vorhanden */}
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
                    <Download className="w-4 h-4 mr-2" />
                    Zertifikat herunterladen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => navigate(`/training/${courseId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurueck zum Kurs
          </Button>
          {/* Nächste Lektion */}
          {!isAdmin && (() => {
            const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
            const nextLesson = allLessons[currentIndex + 1];
            if (!nextLesson) return null;
            return (
              <Button
                onClick={() => navigate(`/training/${courseId}/lesson/${nextLesson.id}/view`)}
                className="bg-gradient-to-r from-blue-600 to-blue-700"
              >
                Naechste Lektion
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
