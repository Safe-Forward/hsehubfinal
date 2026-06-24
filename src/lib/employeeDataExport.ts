import { supabase } from "@/integrations/supabase/client";

// Art. 15/20 DSGVO: collects all personal data HSE Hub holds about a single
// employee (i.e. tables where they are the data subject, not tables they
// merely administered as staff) and bundles it into one downloadable file.
export async function exportEmployeeData(employeeId: string) {
  const [
    employee,
    healthCheckups,
    trainingRecords,
    trainingParticipations,
    courseCertificates,
    courseLessonProgress,
    courseQuizResults,
    activityLogs,
    notificationPreferences,
    affectedInIncidents,
    assignedTasks,
  ] = await Promise.all([
    supabase.from("employees").select("*").eq("id", employeeId).single(),
    supabase.from("health_checkups").select("*").eq("employee_id", employeeId),
    supabase.from("training_records").select("*").eq("employee_id", employeeId),
    supabase.from("training_participations").select("*").eq("employee_id", employeeId),
    supabase.from("course_certificates").select("*").eq("employee_id", employeeId),
    supabase.from("course_lesson_progress").select("*").eq("employee_id", employeeId),
    supabase.from("course_quiz_results").select("*").eq("employee_id", employeeId),
    supabase.from("employee_activity_logs").select("*").eq("employee_id", employeeId),
    supabase.from("notification_preferences").select("*").eq("employee_id", employeeId),
    supabase.from("incidents").select("*").eq("affected_employee_id", employeeId),
    supabase.from("tasks").select("*").eq("employee_profile_id", employeeId),
  ]);

  const exportPayload = {
    export_generated_at: new Date().toISOString(),
    legal_basis: "Art. 15/20 DSGVO - Auskunfts- und Datenübertragbarkeitsrecht",
    employee: employee.data,
    health_checkups: healthCheckups.data ?? [],
    training_records: trainingRecords.data ?? [],
    training_participations: trainingParticipations.data ?? [],
    course_certificates: courseCertificates.data ?? [],
    course_lesson_progress: courseLessonProgress.data ?? [],
    course_quiz_results: courseQuizResults.data ?? [],
    activity_logs: activityLogs.data ?? [],
    notification_preferences: notificationPreferences.data ?? [],
    incidents_affected_by: affectedInIncidents.data ?? [],
    assigned_tasks: assignedTasks.data ?? [],
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const employeeName = employee.data?.full_name?.replace(/[^a-zA-Z0-9_-]/g, "_") ?? employeeId;
  a.href = url;
  a.download = `Datenexport_${employeeName}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
