import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  employeeId: string;
  employeeNumber?: string;
  companyId: string;
  canEdit: boolean;
  canUploadDocuments?: boolean;
}

interface CoreCourse {
  id: string;
  name: string;
  description: string | null;
}

type CompletionType = "manual" | "external";

interface CoreTrainingRecord {
  id: string;
  course_id: string;
  completion_date: string;
  completion_type: "system" | "manual" | "external";
  proof_document_url: string | null;
  notes: string | null;
  recorded_by: string | null;
}

/** Combined view of a core course with optional completion state */
interface CourseRow {
  course: CoreCourse;
  /** Most recent manual/external record (if any) */
  record: CoreTrainingRecord | null;
  /** True when there is a system-level participation (training_participations) */
  hasSystemCompletion: boolean;
  systemCompletionDate: string | null;
}

type FilterType = "all" | "pending" | "completed";

interface FormData {
  courseId: string;
  completionDate: string;
  completionType: CompletionType;
  notes: string;
  proofFile: File | null;
}

const EMPTY_FORM: FormData = {
  courseId: "",
  completionDate: new Date().toISOString().split("T")[0],
  completionType: "manual",
  notes: "",
  proofFile: null,
};

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function isCompleted(row: CourseRow): boolean {
  return row.hasSystemCompletion || row.record !== null;
}

function StatusBadge({ row }: { row: CourseRow }) {
  if (row.hasSystemCompletion) {
    const date = row.systemCompletionDate
      ? new Date(row.systemCompletionDate).toLocaleDateString("de-DE")
      : "";
    return (
      <Badge className="gap-1 text-xs bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
        <CheckCircle2 className="w-3 h-3" />
        Über System{date ? ` (${date})` : ""}
      </Badge>
    );
  }
  if (row.record) {
    const date = new Date(row.record.completion_date).toLocaleDateString("de-DE");
    const label =
      row.record.completion_type === "external" ? "Extern" : "Manuell eingetragen";
    return (
      <Badge className="gap-1 text-xs bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100">
        <FileText className="w-3 h-3" />
        {label} ({date})
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
      <Clock className="w-3 h-3" />
      Ausstehend
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CoreTrainingsTab({
  employeeId,
  employeeNumber,
  companyId,
  canEdit,
  canUploadDocuments = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  // Pre-selected course when "Status eintragen" is clicked on a specific row
  const [preselectedCourseId, setPreselectedCourseId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, companyId]);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  async function fetchData() {
    setLoading(true);
    try {
      // 1. All core courses for this company
      const { data: coursesData, error: coursesErr } = await supabase
        .from("courses")
        .select("id, name, description")
        .eq("company_id", companyId)
        .eq("is_core_training", true)
        .order("name");

      if (coursesErr) throw coursesErr;
      const courses: CoreCourse[] = (coursesData as CoreCourse[]) || [];

      if (courses.length === 0) {
        setRows([]);
        return;
      }

      const courseIds = courses.map((c) => c.id);

      // 2. Manual/external records for this employee
      const { data: recordsData } = await (supabase as any)
        .from("employee_core_training_records")
        .select("*")
        .eq("employee_id", employeeId)
        .in("course_id", courseIds);

      const recordsByCourseId: Record<string, CoreTrainingRecord> = {};
      ((recordsData as CoreTrainingRecord[]) || []).forEach((r) => {
        // Keep the most recent one if multiple exist
        if (
          !recordsByCourseId[r.course_id] ||
          r.completion_date > recordsByCourseId[r.course_id].completion_date
        ) {
          recordsByCourseId[r.course_id] = r;
        }
      });

      // 3. System completions from training_participations
      const { data: partData } = await (supabase as any)
        .from("training_participations")
        .select("course_id, status, completion_date")
        .eq("employee_id", employeeId)
        .eq("status", "completed")
        .in("course_id", courseIds);

      const systemByCourseId: Record<string, string | null> = {};
      ((partData as any[]) || []).forEach((p) => {
        systemByCourseId[p.course_id] = p.completion_date || null;
      });

      const combined: CourseRow[] = courses.map((course) => ({
        course,
        record: recordsByCourseId[course.id] || null,
        hasSystemCompletion: !!systemByCourseId[course.id],
        systemCompletionDate: systemByCourseId[course.id] ?? null,
      }));

      setRows(combined);
    } catch (err: any) {
      console.warn("Kernschulungen konnten nicht geladen werden:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Dialog
  // -------------------------------------------------------------------------

  function openAddDialog(courseId?: string) {
    setFormData({
      ...EMPTY_FORM,
      courseId: courseId || "",
    });
    setPreselectedCourseId(courseId || null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setPreselectedCourseId(null);
    setFormData(EMPTY_FORM);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  async function handleSave() {
    if (!formData.courseId || !formData.completionDate) {
      toast.error("Bitte Kurs und Abschlussdatum ausfüllen.");
      return;
    }

    setSaving(true);
    try {
      let proofDocumentUrl: string | null = null;

      // Upload proof document if provided
      if (canUploadDocuments && formData.proofFile) {
        const file = formData.proofFile;
        const fileExt = file.name.split(".").pop();
        const fileName = `core-trainings/${companyId}/${employeeId}/${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(fileName, file, { cacheControl: "3600", upsert: false });

        if (uploadError) throw uploadError;
        proofDocumentUrl = fileName;

        // Mirror the proof document into the documents table so it appears in the employee's Documents tab
        const courseName = rows.find((r) => r.course.id === formData.courseId)?.course.name ?? "Kernschulung";
        const tags = [employeeId, employeeNumber].filter(Boolean) as string[];
        await supabase.from("documents").insert({
          company_id: companyId,
          title: `${courseName} – Nachweis`,
          description: `Schulungsnachweis für Kernschulung "${courseName}"`,
          category: "training",
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type || "application/octet-stream",
          is_public: false,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id ?? null,
          tags,
        });
      }

      const { data: userData } = await supabase.auth.getUser();
      const recordedBy = userData?.user?.id || null;

      const payload = {
        company_id: companyId,
        employee_id: employeeId,
        course_id: formData.courseId,
        completion_date: formData.completionDate,
        completion_type: formData.completionType,
        proof_document_url: proofDocumentUrl,
        notes: formData.notes.trim() || null,
        recorded_by: recordedBy,
      };

      const { error } = await (supabase as any)
        .from("employee_core_training_records")
        .insert(payload);

      if (error) throw error;

      toast.success("Kernschulung eingetragen.");
      closeDialog();
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  async function handleDelete(recordId: string) {
    if (!confirm("Eintrag wirklich entfernen?")) return;
    setDeleting(recordId);
    try {
      const { error } = await (supabase as any)
        .from("employee_core_training_records")
        .delete()
        .eq("id", recordId);
      if (error) throw error;
      toast.success("Eintrag entfernt.");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Löschen.");
    } finally {
      setDeleting(null);
    }
  }

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const pendingCourses = rows.filter((r) => !isCompleted(r));

  const filteredRows = rows.filter((row) => {
    if (filter === "pending") return !isCompleted(row);
    if (filter === "completed") return isCompleted(row);
    return true;
  });

  const completedCount = rows.filter(isCompleted).length;
  const totalCount = rows.length;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Kernschulungen
              </CardTitle>
              <CardDescription>
                Pflichtschulungen des Unternehmens — {completedCount} von {totalCount} abgeschlossen
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Filter */}
              <Select
                value={filter}
                onValueChange={(v) => setFilter(v as FilterType)}
              >
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="completed">Abgeschlossen</SelectItem>
                </SelectContent>
              </Select>
              {/* Add button (any course) */}
              {canEdit && (
                <Button size="sm" onClick={() => openAddDialog()}>
                  <Plus className="w-4 h-4 mr-1" />
                  Status eintragen
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Lade Kernschulungen...
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Keine Kernschulungen definiert</p>
              <p className="text-sm mt-1">
                Markieren Sie unter <em>Training</em> Kurse als Kernschulung, um sie hier zu verfolgen.
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Keine Schulungen in dieser Kategorie.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Schulung</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nachweise / Notizen</TableHead>
                  {canEdit && (
                    <TableHead className="w-28 text-right">Aktionen</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map(({ course, record, hasSystemCompletion, systemCompletionDate }) => {
                  const row: CourseRow = { course, record, hasSystemCompletion, systemCompletionDate };
                  const completed = isCompleted(row);
                  return (
                    <TableRow
                      key={course.id}
                      className={completed ? "" : "bg-amber-50/50"}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{course.name}</p>
                          {course.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
                              {course.description}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <StatusBadge row={row} />
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {record ? (
                          <div className="space-y-0.5">
                            {record.notes && (
                              <p className="max-w-[240px] truncate">{record.notes}</p>
                            )}
                            {record.proof_document_url && (
                              <a
                                href="#"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  const { data } = await supabase.storage
                                    .from("documents")
                                    .getPublicUrl(record.proof_document_url!);
                                  window.open(data.publicUrl, "_blank");
                                }}
                              >
                                <ExternalLink className="w-3 h-3" />
                                Dokument ansehen
                              </a>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Enter status for this specific course */}
                            {!hasSystemCompletion && !record && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => openAddDialog(course.id)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Eintragen
                              </Button>
                            )}
                            {/* Delete manual record */}
                            {record && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(record.id)}
                                disabled={deleting === record.id}
                                title="Eintrag entfernen"
                              >
                                {deleting === record.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Add Dialog                                                         */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kernschulung eintragen</DialogTitle>
            <DialogDescription>
              Abschluss einer Kernschulung manuell oder extern erfassen
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Course select */}
            <div className="space-y-1.5">
              <Label>Schulung *</Label>
              <Select
                value={formData.courseId}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, courseId: v }))
                }
                disabled={!!preselectedCourseId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kurs auswählen..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {/* When preselected, show all core courses; otherwise only pending ones */}
                  {(preselectedCourseId ? rows : pendingCourses).map(({ course }) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Completion date */}
            <div className="space-y-1.5">
              <Label>Abschlussdatum *</Label>
              <Input
                type="date"
                value={formData.completionDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    completionDate: e.target.value,
                  }))
                }
              />
            </div>

            {/* Completion type */}
            <div className="space-y-1.5">
              <Label>Art der Durchführung *</Label>
              <Select
                value={formData.completionType}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    completionType: v as CompletionType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">
                    Intern (manuell eingetragen)
                  </SelectItem>
                  <SelectItem value="external">
                    Extern (bei externem Anbieter)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notizen</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="z.B. Schulungsträger, Zertifikatsnummer, Anmerkungen..."
                rows={3}
              />
            </div>

            {/* Document upload (optional) */}
            {canUploadDocuments && (
              <div className="space-y-1.5">
                <Label>Nachweisdokument (optional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="text-sm"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        proofFile: e.target.files?.[0] || null,
                      }))
                    }
                  />
                  {formData.proofFile && (
                    <Upload className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  PDF, JPG, PNG oder Word-Dokument (max. 50 MB)
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Eintragen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
