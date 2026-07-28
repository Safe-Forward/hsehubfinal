-- Link company_positions to a department so employees
-- auto-inherit the right training requirements when their
-- department is set or changed.
ALTER TABLE public.company_positions
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_company_positions_department ON public.company_positions(department_id);
