-- Core Training Feature
-- Marks certain courses as "core/mandatory" and tracks completions per employee,
-- including externally-completed trainings that were not done through the system.

-- Add core training flag to the courses table (this is the actual training catalog table)
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS is_core_training boolean DEFAULT false;

COMMENT ON COLUMN public.courses.is_core_training IS 'Marks this course as a core/mandatory training for the company';

-- Manual / external core training completion records
CREATE TABLE IF NOT EXISTS public.employee_core_training_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  completion_date date NOT NULL,
  -- 'system' = via course_lesson_progress / training_participations
  -- 'manual'  = entered by an admin without external proof
  -- 'external' = completed at an external provider, proof document optional
  completion_type text NOT NULL CHECK (completion_type IN ('system', 'manual', 'external')),
  proof_document_url text,  -- optional file path in Supabase Storage "documents" bucket
  notes text,
  recorded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.update_employee_core_training_records_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employee_core_training_records_updated_at
  ON public.employee_core_training_records;

CREATE TRIGGER trg_employee_core_training_records_updated_at
  BEFORE UPDATE ON public.employee_core_training_records
  FOR EACH ROW EXECUTE FUNCTION public.update_employee_core_training_records_updated_at();

-- RLS
ALTER TABLE public.employee_core_training_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view core training records"
  ON public.employee_core_training_records
  FOR SELECT USING (
    user_belongs_to_company(( SELECT auth.uid() AS uid), company_id)
  );

CREATE POLICY "Admins and managers can manage core training records"
  ON public.employee_core_training_records
  FOR ALL USING (
    (has_role(( SELECT auth.uid() AS uid), 'company_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'safety_officer'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))
    AND company_id = get_user_company_id(( SELECT auth.uid() AS uid))
  );

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_courses_is_core_training ON public.courses(is_core_training) WHERE is_core_training = true;
CREATE INDEX IF NOT EXISTS idx_ectr_company_id ON public.employee_core_training_records(company_id);
CREATE INDEX IF NOT EXISTS idx_ectr_employee_id ON public.employee_core_training_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_ectr_course_id ON public.employee_core_training_records(course_id);

COMMENT ON TABLE public.employee_core_training_records IS 'Manually or externally recorded completions for core (mandatory) courses per employee';
