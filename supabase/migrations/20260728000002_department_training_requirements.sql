-- Direct department → training-type mapping.
-- When an employee's department changes, CoreTrainingsTab reads from here
-- (as a fallback when no position-based requirements exist).

CREATE TABLE IF NOT EXISTS public.department_training_requirements (
  id            uuid  DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    uuid  NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id uuid  NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  training_type_id uuid NOT NULL REFERENCES public.training_types(id) ON DELETE CASCADE,
  is_mandatory  boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(department_id, training_type_id)
);

ALTER TABLE public.department_training_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members view dept training requirements"
  ON public.department_training_requirements FOR SELECT
  USING (user_belongs_to_company(( SELECT auth.uid() AS uid), company_id));

CREATE POLICY "Admins manage dept training requirements"
  ON public.department_training_requirements FOR ALL
  USING (
    (has_role(( SELECT auth.uid() AS uid), 'company_admin'::app_role)
     OR has_role(( SELECT auth.uid() AS uid), 'safety_officer'::app_role))
    AND company_id = get_user_company_id(( SELECT auth.uid() AS uid))
  );

CREATE INDEX idx_dept_training_req_dept ON public.department_training_requirements(department_id);
CREATE INDEX idx_dept_training_req_company ON public.department_training_requirements(company_id);
