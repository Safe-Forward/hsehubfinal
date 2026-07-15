-- Workplace-specific safety briefings for employees
CREATE TABLE IF NOT EXISTS public.workplace_briefings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  workplace_name text NOT NULL,
  briefing_date date NOT NULL,
  valid_until date,
  briefing_by text,
  notes text,
  is_confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.workplace_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view workplace briefings" ON public.workplace_briefings
  FOR SELECT USING (
    user_belongs_to_company(( SELECT auth.uid() AS uid), company_id)
  );

CREATE POLICY "Non-employees can manage workplace briefings" ON public.workplace_briefings
  FOR ALL USING (
    (has_role(( SELECT auth.uid() AS uid), 'company_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'safety_officer'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))
    AND company_id = get_user_company_id(( SELECT auth.uid() AS uid))
  );

CREATE INDEX idx_workplace_briefings_employee ON public.workplace_briefings(employee_id);
CREATE INDEX idx_workplace_briefings_company ON public.workplace_briefings(company_id);
