-- ============================================================
-- API TOKENS TABLE FOR EXTERNAL SYSTEMS INTEGRATION
-- ============================================================

CREATE TABLE IF NOT EXISTS public.company_api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- Index for fast token lookups (crucial for API auth middleware)
CREATE INDEX IF NOT EXISTS idx_company_api_tokens_token ON public.company_api_tokens(token);

-- Enable RLS
ALTER TABLE public.company_api_tokens ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all
DROP POLICY IF EXISTS "api_tokens_super_admin_all" ON public.company_api_tokens;
CREATE POLICY "api_tokens_super_admin_all" ON public.company_api_tokens
  FOR ALL
  USING (public.is_platform_super_admin());

-- Company admins can manage their own tokens
DROP POLICY IF EXISTS "api_tokens_company_admin" ON public.company_api_tokens;
CREATE POLICY "api_tokens_company_admin" ON public.company_api_tokens
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'company_admin'
        AND company_id IS NOT NULL
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_api_tokens TO authenticated;
GRANT SELECT, UPDATE ON public.company_api_tokens TO service_role;

COMMENT ON TABLE public.company_api_tokens IS 'Stores generated API tokens for external systems to authenticate via the Public API edge function.';
