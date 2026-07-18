-- Creates the SECURITY DEFINER helper the @mention assignment path calls in
-- EmployeeProfile.tsx (line 2271). Without this function the RPC returns an
-- error, the primary lookup is skipped, and the task falls back to an
-- RLS-gated employee SELECT that may return no rows — resulting in the task
-- being assigned to the profile owner instead of the mentioned person.
--
-- SECURITY DEFINER is required: the caller may be a Line Manager whose RLS
-- policy only shows their own department; we need to look up any employee in
-- the same company regardless of the caller's row-level restrictions.

CREATE OR REPLACE FUNCTION public.get_employee_id_for_mention(
  p_user_id    UUID,
  p_company_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  SELECT id INTO v_employee_id
    FROM public.employees
   WHERE user_id    = p_user_id
     AND company_id = p_company_id
   LIMIT 1;

  RETURN v_employee_id;   -- NULL when team_member has no linked employee row
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_employee_id_for_mention(UUID, UUID) TO authenticated;
