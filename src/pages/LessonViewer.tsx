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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [isLoading, setIsLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId && courseId && lessonId) {
      fetchCourse();
      fetchLesson();
    }
  }, [user, loading, navigate, companyId, courseId, lessonId]);

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
      toast({
        title: "Fehler beim Laden des Kurses",
        description: err.message,
        variant: "destructive",
      });
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

      // Normale Nutzer duerfen keine Entwuerfe sehen
      if (!isAdmin && data.status === "draft") {
        toast({
          title: "Kein Zugriff",
          description: "Diese Lektion ist noch nicht veroeffentlicht.",
          variant: "destructive",
        });
        navigate(`/training/${courseId}`);
        return;
      }

      setLesson(data);
    } catch (err: any) {
      toast({
        title: "Fehler beim Laden der Lektion",
        description: err.message,
        variant: "destructive",
      });
      navigate("/training");
    } finally {
      setIsLoading(false);
    }
  };

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
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/training/${courseId}`)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span
                  className="hover:text-foreground cursor-pointer"
                  onClick={() => navigate(`/training/${courseId}`)}
                >
                  {course?.name || "Kurs"}
                </span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-medium">{lesson.name}</span>
              </div>
            </div>
            {/* Admin: Bearbeiten-Button */}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/training/${courseId}/lesson/${lessonId}`)}
              >
                Lektion bearbeiten
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Lektion Info */}
        <Card className="mb-6 border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white">
                {getTypeIcon(lesson.type)}
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{lesson.name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{getTypeLabel(lesson.type)}</Badge>
                  {/* Status nur für Admins sichtbar */}
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
            <CardHeader>
              <CardTitle className="text-lg">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {lesson.content_data.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {tag}
                  </Badge>
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
            {/* Video/Audio */}
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
                    <video
                      src={lesson.content_url}
                      controls
                      preload="auto"
                      className="w-full h-full"
                    >
                      Ihr Browser unterstuetzt kein Video.
                    </video>
                  </div>
                )}
              </div>
            )}

            {/* PDF */}
            {lesson.type === "pdf" && lesson.content_url && (
              <div className="w-full space-y-4">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      let downloadUrl = lesson.content_url!;
                      if (downloadUrl.includes("cloudinary.com")) {
                        downloadUrl = downloadUrl.replace(
                          /\/(raw|image|video|auto)\/upload\//,
                          "/$1/upload/fl_attachment/"
                        );
                      }
                      fetch(downloadUrl)
                        .then((r) => r.blob())
                        .then((blob) => {
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = lesson.name + ".pdf";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                        })
                        .catch(() => window.open(lesson.content_url!, "_blank", "noopener,noreferrer"));
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    PDF herunterladen
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => window.open(lesson.content_url!, "_blank", "noopener,noreferrer")}
                  >
                    In neuem Tab oeffnen
                  </Button>
                </div>
                <object
                  data={lesson.content_url}
                  type="application/pdf"
                  className="w-full rounded-lg border-2 border-gray-300"
                  style={{ height: "800px", minHeight: "600px" }}
                >
                  <embed src={lesson.content_url} type="application/pdf" className="w-full h-full" />
                </object>
                <p className="text-xs text-muted-foreground text-center">
                  Falls das PDF nicht angezeigt wird, nutzen Sie den Button "In neuem Tab oeffnen"
                </p>
              </div>
            )}

            {/* Text */}
            {lesson.type === "text" && lesson.content_data?.text_content && (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{lesson.content_data.text_content}</p>
              </div>
            )}

            {/* iFrame */}
            {lesson.type === "iframe" && lesson.content_url && (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <iframe
                  src={lesson.content_url}
                  className="w-full h-full"
                  title="Eingebetteter Inhalt"
                  allowFullScreen
                />
              </div>
            )}

            {/* Kein Inhalt */}
            {!lesson.content_url && !lesson.content_data?.text_content && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Kein Inhalt fuer diese Lektion verfuegbar.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Abgeschlossen Button für normale Nutzer */}
        {!isAdmin && (
          <Card className="mt-6 border-0 shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Lektion abschliessen</p>
                  <p className="text-sm text-muted-foreground">
                    Markieren Sie diese Lektion als abgeschlossen
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setCompleted(true);
                    toast({
                      title: "Lektion abgeschlossen!",
                      description: "Ihr Fortschritt wurde gespeichert.",
                    });
                    navigate(`/training/${courseId}`);
                  }}
                  className="bg-gradient-to-r from-green-600 to-green-700"
                  disabled={completed}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {completed ? "Abgeschlossen" : "Als abgeschlossen markieren"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => navigate(`/training/${courseId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurueck zum Kurs
          </Button>
        </div>
      </main>
    </div>
  );
}
