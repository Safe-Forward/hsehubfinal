# Quick Task: Training Teilnahmeverfolgung & Pflichtschulung

## Goal
Enhance Training page with:
1. `is_mandatory` + `renewal_months` fields on courses
2. `training_participations` DB table for manual attendance tracking
3. Admin UI in Lernfortschritt tab: set participation status (registered/completed/absent), manually issue certificate
4. Sidebar badge: count incomplete mandatory courses (employee) or employees with overdue mandatory training (admin)
5. Realtime for Training page

## Existing State
- `course_lesson_progress` tracks per-lesson e-learning completion
- `course_certificates` stores issued certificates
- `course_employee_access` manages access
- jsPDF certificate generation already works
- Training.tsx: 1024 lines, fully functional e-learning UI

## Tasks

### Task 1: DB Migration via Supabase MCP
- `ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT FALSE`
- `ALTER TABLE courses ADD COLUMN IF NOT EXISTS renewal_months INT`
- Create `training_participations` table
- RLS policies

### Task 2: Training.tsx — Course creation: add Pflichtschulung checkbox
- Add `is_mandatory` + `renewal_months` to courseSchema
- Add form fields in course creation dialog

### Task 3: Training.tsx — Lernfortschritt tab enhancement
- Fetch `training_participations` alongside existing progress
- Show participation status badge per employee
- Buttons: "Teilgenommen" / "Abwesend" / "Zertifikat ausstellen"
- When marking completed + no cert: option to issue certificate

### Task 4: MainLayout.tsx — Sidebar badge for training
- For employees: count mandatory courses without participation (completed or has_certificate)
- For admins: count employees with incomplete mandatory training
- Add to "Schulungen" nav item, similar to Maßnahmen badge

### Task 5: Realtime for Training page
- Add `useRealtimeRefetch(["courses", "course_lesson_progress", "training_participations"], companyId, fetchCourses)` after fetchCourses definition

### Task 6: Commit
