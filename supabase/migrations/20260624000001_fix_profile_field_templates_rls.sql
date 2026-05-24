-- Ensure RLS policies exist for profile_field_templates

ALTER TABLE public.profile_field_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_field_templates_select" ON public.profile_field_templates;
DROP POLICY IF EXISTS "profile_field_templates_insert" ON public.profile_field_templates;
DROP POLICY IF EXISTS "profile_field_templates_update" ON public.profile_field_templates;
DROP POLICY IF EXISTS "profile_field_templates_delete" ON public.profile_field_templates;

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
