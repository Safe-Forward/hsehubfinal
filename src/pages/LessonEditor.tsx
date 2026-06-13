import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowLeft,
  Save,
  ChevronRight,
  X,
  Plus,
  Trash2,
  ClipboardList,
  Lock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import LessonTypeSelector from "@/components/training/LessonTypeSelector";
import FileUploadZone from "@/components/training/FileUploadZone";

const lessonSchema = z.object({
  name: z.string().min(1, "Lektionsname ist erforderlich"),
  type: z.enum(["subchapter", "video_audio", "pdf", "text", "iframe", "quiz"]),
  content_url: z.string().optional(),
  content_text: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  is_required: z.boolean().default(true),
  unlock_after: z.string().optional(),
});

type LessonFormData = z.infer<typeof lessonSchema>;

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
  type: string;
  content_url: string | null;
  content_data: any;
  order_index: number;
  status: "draft" | "published";
  is_required: boolean;
  unlock_after: string | null;
  quiz_data: QuizData | null;
  parent_id: string | null;
}

interface Course {
  id: string;
  name: string;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const defaultQuizData: QuizData = {
  passing_score: 70,
  max_attempts: 3,
  questions: [],
};

export default function LessonEditor() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user, loading, companyId } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [quizData, setQuizData] = useState<QuizData>(defaultQuizData);

  const isNewLesson = lessonId === "new";

  const form = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      name: "",
      type: "video_audio",
      content_url: "",
      content_text: "",
      description: "",
      tags: [],
      is_required: true,
      unlock_after: "",
    },
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (user && companyId && courseId) {
      fetchCourse();
      fetchAllLessons();
      if (!isNewLesson && lessonId) {
        fetchLesson();
      } else {
        setIsLoading(false);
      }
    }
  }, [user, loading, navigate, companyId, courseId, lessonId, isNewLesson]);

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
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
      navigate(`/training/${courseId}`);
    }
  };

  const fetchAllLessons = async () => {
    if (!courseId) return;
    const { data } = await supabase
      .from("course_lessons")
      .select("id, name, order_index")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });
    setAllLessons(data || []);
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
      setLesson(data as any);
      form.reset({
        name: data.name,
        type: (data.type as any) || "video_audio",
        content_url: data.content_url || "",
        content_text: data.content_data?.text_content || "",
        description: data.content_data?.description || "",
        tags: data.content_data?.tags || [],
        is_required: (data as any).is_required ?? true,
        unlock_after: (data as any).unlock_after || "",
      });
      if ((data as any).quiz_data) {
        setQuizData((data as any).quiz_data);
      }
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
      navigate("/training");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Quiz Helpers ──────────────────────────────────────────────────────────

  const addQuestion = (type: QuestionType) => {
    const newQuestion: QuizQuestion = {
      id: generateId(),
      type,
      question: "",
      answers: type === "truefalse"
        ? [
            { id: generateId(), text: "Wahr", is_correct: true },
            { id: generateId(), text: "Falsch", is_correct: false },
          ]
        : [
            { id: generateId(), text: "", is_correct: true },
            { id: generateId(), text: "", is_correct: false },
          ],
    };
    setQuizData((prev) => ({ ...prev, questions: [...prev.questions, newQuestion] }));
  };

  const updateQuestion = (qId: string, updates: Partial<QuizQuestion>) => {
    setQuizData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => q.id === qId ? { ...q, ...updates } : q),
    }));
  };

  const deleteQuestion = (qId: string) => {
    setQuizData((prev) => ({ ...prev, questions: prev.questions.filter((q) => q.id !== qId) }));
  };

  const addAnswer = (qId: string) => {
    setQuizData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === qId
          ? { ...q, answers: [...q.answers, { id: generateId(), text: "", is_correct: false }] }
          : q
      ),
    }));
  };

  const updateAnswer = (qId: string, aId: string, updates: Partial<QuizAnswer>) => {
    setQuizData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === qId
          ? {
              ...q,
              answers: q.answers.map((a) => {
                if (a.id !== aId) {
                  if (updates.is_correct && q.type === "single") return { ...a, is_correct: false };
                  return a;
                }
                return { ...a, ...updates };
              }),
            }
          : q
      ),
    }));
  };

  const deleteAnswer = (qId: string, aId: string) => {
    setQuizData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === qId ? { ...q, answers: q.answers.filter((a) => a.id !== aId) } : q
      ),
    }));
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    const currentTags = form.getValues("tags") || [];
    if (!currentTags.includes(newTag.trim())) {
      form.setValue("tags", [...currentTags, newTag.trim()]);
    }
    setNewTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter((tag) => tag !== tagToRemove));
  };

  const onSubmit = async (data: LessonFormData) => {
    if (!courseId || !companyId) return;
    setIsSaving(true);
    try {
      const contentData: any = {};
      if (data.type === "text" && data.content_text) contentData.text_content = data.content_text;
      if (data.description) contentData.description = data.description;
      if (data.tags) contentData.tags = data.tags;

      const payload: any = {
        name: data.name,
        type: data.type,
        content_url: data.content_url || null,
        content_data: Object.keys(contentData).length > 0 ? contentData : null,
        is_required: data.is_required,
        unlock_after: data.unlock_after || null,
        quiz_data: data.type === "quiz" ? quizData : null,
      };

      if (isNewLesson) {
        const { data: existingLessons } = await supabase
          .from("course_lessons")
          .select("order_index")
          .eq("course_id", courseId)
          .order("order_index", { ascending: false })
          .limit(1);

        payload.course_id = courseId;
        payload.order_index = existingLessons && existingLessons.length > 0
          ? existingLessons[0].order_index + 1 : 0;
        payload.status = "draft";

        const { error } = await supabase.from("course_lessons").insert([payload]);
        if (error) throw error;
        toast({ title: "Erfolgreich", description: "Lektion wurde erstellt" });
      } else {
        const { error } = await supabase
          .from("course_lessons")
          .update(payload)
          .eq("id", lessonId);
        if (error) throw error;
        toast({ title: "Erfolgreich", description: "Lektion wurde gespeichert" });
      }

      navigate(`/training/${courseId}`);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentType = form.watch("type");
  const otherLessons = allLessons.filter((l) => l.id !== lessonId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/training/${courseId}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hover:text-foreground cursor-pointer" onClick={() => navigate(`/training/${courseId}`)}>
                {course?.name || "Kurs"}
              </span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium">
                {isNewLesson ? "Neue Lektion" : lesson?.name || "Lektion"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* ── Grundeinstellungen ── */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Lektionsdetails</CardTitle>
                <CardDescription>Grundlegende Informationen zur Lektion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lektionstyp</FormLabel>
                      <FormControl>
                        <LessonTypeSelector
                          value={field.value as any}
                          onChange={field.onChange as any}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lektionsname *</FormLabel>
                      <FormControl>
                        <Input placeholder="z. B. Einfuehrung in die Arbeitssicherheit" {...field} />
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
                      <FormLabel>Kurzbeschreibung (optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Was lernen die Nutzer in dieser Lektion?" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tag hinzufuegen..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                    />
                    <Button type="button" variant="outline" onClick={handleAddTag}>
                      <Plus className="w-4 h-4 mr-1" />Hinzufuegen
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(form.watch("tags") || []).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-2 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Lernpfad ── */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Lernpfad & Freischaltung
                </CardTitle>
                <CardDescription>Steuere ob diese Lektion zwingend erforderlich ist und wann sie freigeschaltet wird</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">

                <FormField
                  control={form.control}
                  name="is_required"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between p-4 rounded-xl border-2 border-border">
                        <div>
                          <p className="font-medium">Pflichtlektion</p>
                          <p className="text-sm text-muted-foreground">
                            Muss abgeschlossen sein um das Zertifikat zu erhalten
                          </p>
                        </div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    </FormItem>
                  )}
                />

                {otherLessons.length > 0 && (
                  <FormField
                    control={form.control}
                    name="unlock_after"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Freischalten nach Abschluss von
                        </FormLabel>
                        <Select
  value={field.value || "none"}
  onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
>
                          <SelectTrigger>
                            <SelectValue placeholder="Sofort verfuegbar (keine Voraussetzung)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sofort verfuegbar</SelectItem>
                            {otherLessons.map((l) => (
                              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Nutzer muessen die ausgewaehlte Lektion abschliessen bevor sie diese sehen koennen
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* ── Inhalt (nicht Quiz) ── */}
            {currentType !== "quiz" && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle>Inhalt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">

                  {currentType === "video_audio" && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="content_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Video-Link (YouTube oder direkte URL)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://youtube.com/watch?v=..."
                                value={field.value || ""}
                                onChange={field.onChange}
                                type="url"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">YouTube-Links werden automatisch eingebettet.</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch("content_url") && !form.watch("content_url")?.includes("cloudinary.com") && (
                        <div className="p-4 border rounded-lg bg-muted/30">
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-sm font-medium">Vorschau</Label>
                            <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue("content_url", "")}>
                              <X className="w-4 h-4 mr-1" />Entfernen
                            </Button>
                          </div>
                          {(form.watch("content_url")?.includes("youtube.com") || form.watch("content_url")?.includes("youtu.be")) ? (
                            <div className="aspect-video bg-black rounded-lg overflow-hidden">
                              <iframe
                                src={form.watch("content_url")?.includes("youtube.com")
                                  ? form.watch("content_url")?.replace("watch?v=", "embed/")
                                  : form.watch("content_url")?.replace("youtu.be/", "youtube.com/embed/")}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen title="Vorschau"
                              />
                            </div>
                          ) : (
                            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                              <p className="text-sm text-muted-foreground">Video-URL eingegeben</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 py-2">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-sm text-muted-foreground px-2">ODER Datei hochladen</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>

                      <FormField
                        control={form.control}
                        name="content_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <FileUploadZone
                                lessonType="video_audio"
                                currentFileUrl={field.value?.includes("cloudinary.com") ? field.value : undefined}
                                onUploadComplete={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {currentType === "pdf" && (
                    <FormField
                      control={form.control}
                      name="content_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PDF hochladen</FormLabel>
                          <FormControl>
                            <FileUploadZone
                              lessonType="pdf"
                              currentFileUrl={field.value}
                              onUploadComplete={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {currentType === "text" && (
                    <FormField
                      control={form.control}
                      name="content_text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Textinhalt</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Inhalt hier eingeben..." {...field} rows={10} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {currentType === "iframe" && (
                    <FormField
                      control={form.control}
                      name="content_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>iFrame URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {currentType === "subchapter" && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">Kapitel dienen als Strukturelemente und haben keinen eigenen Inhalt.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Quiz Builder ── */}
            {currentType === "quiz" && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    Quiz erstellen
                  </CardTitle>
                  <CardDescription>Erstelle Fragen mit verschiedenen Antwortformaten</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* Quiz Einstellungen */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl">
                    <div>
                      <Label className="text-sm">Mindestpunktzahl zum Bestehen (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={quizData.passing_score}
                        onChange={(e) => setQuizData((prev) => ({ ...prev, passing_score: Number(e.target.value) }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Maximale Versuche</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={quizData.max_attempts}
                        onChange={(e) => setQuizData((prev) => ({ ...prev, max_attempts: Number(e.target.value) }))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Fragen */}
                  <div className="space-y-4">
                    {quizData.questions.map((question, qIndex) => (
                      <Card key={question.id} className="border-2 border-border">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                                {qIndex + 1}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {question.type === "single" && "Einzelauswahl"}
                                {question.type === "multiple" && "Mehrfachauswahl"}
                                {question.type === "truefalse" && "Wahr/Falsch"}
                                {question.type === "image" && "Bildfrage"}
                                {question.type === "video" && "Videofrage"}
                              </Badge>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteQuestion(question.id)}
                              className="text-destructive hover:text-destructive h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">

                          {(question.type === "image" || question.type === "video") && (
                            <div>
                              <Label className="text-sm">
                                {question.type === "image" ? "Bild-URL" : "Video-URL"}
                              </Label>
                              <Input
                                placeholder={question.type === "image" ? "https://..." : "https://youtube.com/..."}
                                value={question.media_url || ""}
                                onChange={(e) => updateQuestion(question.id, {
                                  media_url: e.target.value,
                                  media_type: question.type as "image" | "video",
                                })}
                                className="mt-1"
                              />
                              {question.media_url && question.type === "image" && (
                                <img
                                  src={question.media_url}
                                  alt="Vorschau"
                                  className="mt-2 rounded-lg max-h-48 object-cover"
                                  onError={(e) => (e.currentTarget.style.display = "none")}
                                />
                              )}
                              {question.media_url && question.type === "video" && (
                                <div className="aspect-video mt-2 bg-black rounded-lg overflow-hidden">
                                  <iframe
                                    src={question.media_url.includes("youtube.com")
                                      ? question.media_url.replace("watch?v=", "embed/")
                                      : question.media_url.includes("youtu.be")
                                      ? question.media_url.replace("youtu.be/", "youtube.com/embed/")
                                      : question.media_url}
                                    className="w-full h-full"
                                    allowFullScreen
                                    title="Video"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          <div>
                            <Label className="text-sm">Frage *</Label>
                            <Textarea
                              placeholder="Fragetext eingeben..."
                              value={question.question}
                              onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                              rows={2}
                              className="mt-1"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">
                              Antworten
                              {question.type === "single" && <span className="text-muted-foreground ml-1">(1 richtige Antwort)</span>}
                              {question.type === "multiple" && <span className="text-muted-foreground ml-1">(mehrere richtige moeglich)</span>}
                            </Label>

                            {question.answers.map((answer) => (
                              <div
                                key={answer.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                                  answer.is_correct
                                    ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/20"
                                    : "border-border"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => updateAnswer(question.id, answer.id, { is_correct: !answer.is_correct })}
                                  className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                                    answer.is_correct
                                      ? "bg-green-500 border-green-500 text-white"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {answer.is_correct && <span className="text-xs">✓</span>}
                                </button>

                                {question.type === "truefalse" ? (
                                  <span className="flex-1 text-sm font-medium">{answer.text}</span>
                                ) : (
                                  <Input
                                    placeholder={`Antwort ${question.answers.indexOf(answer) + 1}`}
                                    value={answer.text}
                                    onChange={(e) => updateAnswer(question.id, answer.id, { text: e.target.value })}
                                    className="flex-1 h-8 border-0 bg-transparent focus-visible:ring-0 p-0"
                                  />
                                )}

                                {question.type !== "truefalse" && question.answers.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => deleteAnswer(question.id, answer.id)}
                                    className="text-muted-foreground hover:text-destructive flex-shrink-0"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}

                            {question.type !== "truefalse" && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addAnswer(question.id)}
                                className="w-full border-dashed"
                              >
                                <Plus className="w-4 h-4 mr-1" />Antwort hinzufuegen
                              </Button>
                            )}
                          </div>

                          {!question.answers.some((a) => a.is_correct) && (
                            <div className="flex items-center gap-2 text-amber-600 text-xs">
                              <AlertCircle className="w-3 h-3" />
                              Mindestens eine Antwort muss als richtig markiert sein
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {/* Neue Frage */}
                    <Card className="border-2 border-dashed border-border">
                      <CardContent className="p-4">
                        <p className="text-sm font-medium text-center mb-3 text-muted-foreground">Fragetyp waehlen</p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {[
                            { type: "single" as QuestionType, label: "Einzelauswahl", icon: "☑" },
                            { type: "multiple" as QuestionType, label: "Mehrfachauswahl", icon: "☑☑" },
                            { type: "truefalse" as QuestionType, label: "Wahr/Falsch", icon: "T/F" },
                            { type: "image" as QuestionType, label: "Bildfrage", icon: "🖼" },
                            { type: "video" as QuestionType, label: "Videofrage", icon: "▶" },
                          ].map((qt) => (
                            <button
                              key={qt.type}
                              type="button"
                              onClick={() => addQuestion(qt.type)}
                              className="p-3 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-center"
                            >
                              <div className="text-lg mb-1">{qt.icon}</div>
                              <div className="text-xs font-medium">{qt.label}</div>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {quizData.questions.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Noch keine Fragen. Waehle einen Fragetyp um zu starten.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Speichern ── */}
            <div className="flex justify-end gap-2 pb-8">
              <Button type="button" variant="outline" onClick={() => navigate(`/training/${courseId}`)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <><Save className="w-4 h-4 mr-2 animate-spin" />Wird gespeichert...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" />Speichern</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
