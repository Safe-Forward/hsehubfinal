-- Create profile field templates and link profile fields to templates

CREATE TABLE IF NOT EXISTS public.profile_field_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_profile_field_templates_company_id
  ON public.profile_field_templates(company_id);

ALTER TABLE public.profile_field_templates ENABLE ROW LEVEL SECURITY;

-- Policies: any company member can read, only managers can write
CREATE POLICY "profile_field_templates_select"
  ON public.profile_field_templates
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.user_roles
      WHERE user_id = auth.uid()
        AND company_id IS NOT NULL
    )
  );

CREATE POLICY "profile_field_templates_insert"
  ON public.profile_field_templates
  FOR INSERT
  WITH CHECK (
    public.can_manage_profile_fields(company_id)
  );

CREATE POLICY "profile_field_templates_update"
  ON public.profile_field_templates
  FOR UPDATE
  USING (
    public.can_manage_profile_fields(company_id)
  );

CREATE POLICY "profile_field_templates_delete"
  ON public.profile_field_templates
  FOR DELETE
  USING (
    public.can_manage_profile_fields(company_id)
  );

-- Link profile fields to templates
ALTER TABLE public.profile_fields
  ADD COLUMN IF NOT EXISTS template_id UUID
  REFERENCES public.profile_field_templates(id) ON DELETE CASCADE;

ALTER TABLE public.profile_fields
  DROP CONSTRAINT IF EXISTS profile_fields_company_id_field_name_key;

ALTER TABLE public.profile_fields
  ADD CONSTRAINT profile_fields_template_id_field_name_key
  UNIQUE (template_id, field_name);

CREATE INDEX IF NOT EXISTS idx_profile_fields_template_id
  ON public.profile_fields(template_id);

-- Track applied template on employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS selected_profile_template_id UUID
  REFERENCES public.profile_field_templates(id);

CREATE INDEX IF NOT EXISTS idx_employees_selected_profile_template_id
  ON public.employees(selected_profile_template_id);

-- Migrate existing profile fields into a default template per company
INSERT INTO public.profile_field_templates (company_id, name, display_order)
SELECT DISTINCT company_id, 'Default', 0
FROM public.profile_fields
WHERE template_id IS NULL
ON CONFLICT (company_id, name) DO NOTHING;

UPDATE public.profile_fields pf
SET template_id = pft.id
FROM public.profile_field_templates pft
WHERE pf.template_id IS NULL
  AND pf.company_id = pft.company_id
  AND pft.name = 'Default';
