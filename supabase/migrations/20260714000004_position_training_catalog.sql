-- Positions/job roles in the company
CREATE TABLE IF NOT EXISTS public.company_positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Training types required for a position
-- References training_types (the existing "Schulungskatalog")
CREATE TABLE IF NOT EXISTS public.position_training_requirements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id uuid REFERENCES public.company_positions(id) ON DELETE CASCADE NOT NULL,
  training_type_id uuid REFERENCES public.training_types(id) ON DELETE CASCADE NOT NULL,
  is_mandatory boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(position_id, training_type_id)
);

-- Employee position assignments (many-to-many, one primary)
CREATE TABLE IF NOT EXISTS public.employee_positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  position_id uuid REFERENCES public.company_positions(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  is_primary boolean DEFAULT false,
  UNIQUE(employee_id, position_id)
);

ALTER TABLE public.company_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_training_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view positions" ON public.company_positions
  FOR SELECT USING (user_belongs_to_company(( SELECT auth.uid() AS uid), company_id));

CREATE POLICY "Admins manage positions" ON public.company_positions
  FOR ALL USING (
    (has_role(( SELECT auth.uid() AS uid), 'company_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'safety_officer'::app_role))
    AND company_id = get_user_company_id(( SELECT auth.uid() AS uid))
  );

CREATE POLICY "Company members view position requirements" ON public.position_training_requirements
  FOR SELECT USING (position_id IN (
    SELECT id FROM public.company_positions
    WHERE user_belongs_to_company(( SELECT auth.uid() AS uid), company_id)
  ));

CREATE POLICY "Admins manage position requirements" ON public.position_training_requirements
  FOR ALL USING (position_id IN (
    SELECT id FROM public.company_positions
    WHERE (has_role(( SELECT auth.uid() AS uid), 'company_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'safety_officer'::app_role))
      AND company_id = get_user_company_id(( SELECT auth.uid() AS uid))
  ));

CREATE POLICY "Company members view employee positions" ON public.employee_positions
  FOR SELECT USING (employee_id IN (
    SELECT id FROM public.employees
    WHERE user_belongs_to_company(( SELECT auth.uid() AS uid), company_id)
  ));

CREATE POLICY "Non-employees manage employee positions" ON public.employee_positions
  FOR ALL USING (employee_id IN (
    SELECT id FROM public.employees
    WHERE (has_role(( SELECT auth.uid() AS uid), 'company_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'safety_officer'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))
      AND company_id = get_user_company_id(( SELECT auth.uid() AS uid))
  ));

CREATE INDEX idx_company_positions_company ON public.company_positions(company_id);
CREATE INDEX idx_position_training_req_position ON public.position_training_requirements(position_id);
CREATE INDEX idx_employee_positions_employee ON public.employee_positions(employee_id);
