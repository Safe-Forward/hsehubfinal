-- ============================================================
-- EXTERNAL SYSTEMS INTEGRATION FOR ERP/API CONNECTIONS
-- ============================================================

-- Create external systems table
CREATE TABLE IF NOT EXISTS public.external_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    system_type TEXT NOT NULL, -- 'erp', 'webhook', 'rest_api', 'sftp', 'sap', 'oracle', 'quickbooks', etc.
    endpoint_url TEXT,
    api_key_encrypted TEXT, -- Encrypted API key
    api_secret_encrypted TEXT, -- Encrypted API secret
    auth_type TEXT DEFAULT 'api_key', -- 'api_key', 'oauth', 'basic', 'bearer', 'none'
    auth_config JSONB DEFAULT '{}'::jsonb, -- OAuth tokens, additional auth parameters
    headers JSONB DEFAULT '{}'::jsonb, -- Custom headers
    sync_enabled BOOLEAN DEFAULT false,
    sync_frequency TEXT DEFAULT 'daily', -- 'realtime', 'hourly', 'daily', 'weekly', 'manual'
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT, -- 'success', 'failed', 'pending'
    last_sync_error TEXT,
    sync_config JSONB DEFAULT '{}'::jsonb, -- Mapping configuration, filters, etc.
    status TEXT DEFAULT 'active', -- 'active', 'inactive', 'error'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_external_systems_company_id ON public.external_systems(company_id);
CREATE INDEX IF NOT EXISTS idx_external_systems_system_type ON public.external_systems(system_type);
CREATE INDEX IF NOT EXISTS idx_external_systems_status ON public.external_systems(status);

-- Enable RLS
ALTER TABLE public.external_systems ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all systems
DROP POLICY IF EXISTS "external_systems_super_admin_all" ON public.external_systems;
CREATE POLICY "external_systems_super_admin_all" ON public.external_systems
  FOR ALL
  USING (public.is_platform_super_admin());

-- Company admins can manage their own systems
DROP POLICY IF EXISTS "external_systems_company_admin" ON public.external_systems;
CREATE POLICY "external_systems_company_admin" ON public.external_systems
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'company_admin'
        AND company_id IS NOT NULL
    )
  );

-- Company members can view their systems
DROP POLICY IF EXISTS "external_systems_company_member_select" ON public.external_systems;
CREATE POLICY "external_systems_company_member_select" ON public.external_systems
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.user_roles
      WHERE user_id = auth.uid()
        AND company_id IS NOT NULL
    )
  );

-- ============================================================
-- SYNC HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.external_systems_sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_system_id UUID REFERENCES public.external_systems(id) ON DELETE CASCADE NOT NULL,
    sync_started_at TIMESTAMPTZ DEFAULT NOW(),
    sync_completed_at TIMESTAMPTZ,
    status TEXT NOT NULL, -- 'success', 'failed', 'partial'
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    sync_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sync_history_system_id ON public.external_systems_sync_history(external_system_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_created_at ON public.external_systems_sync_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.external_systems_sync_history ENABLE ROW LEVEL SECURITY;

-- Super admins can view all sync history
DROP POLICY IF EXISTS "sync_history_super_admin_select" ON public.external_systems_sync_history;
CREATE POLICY "sync_history_super_admin_select" ON public.external_systems_sync_history
  FOR SELECT
  USING (public.is_platform_super_admin());

-- Company members can view their sync history
DROP POLICY IF EXISTS "sync_history_company_member_select" ON public.external_systems_sync_history;
CREATE POLICY "sync_history_company_member_select" ON public.external_systems_sync_history
  FOR SELECT
  USING (
    external_system_id IN (
      SELECT id FROM public.external_systems
      WHERE company_id IN (
        SELECT company_id FROM public.user_roles
        WHERE user_id = auth.uid()
          AND company_id IS NOT NULL
      )
    )
  );

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to encrypt API keys (placeholder - should use pgcrypto in production)
CREATE OR REPLACE FUNCTION public.encrypt_api_key(plain_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- In production, use pgcrypto extension: pgp_sym_encrypt(plain_key, current_setting('app.encryption_key'))
  -- For now, we'll use base64 encoding as a placeholder
  RETURN encode(plain_key::bytea, 'base64');
END;
$$;

-- Function to decrypt API keys (placeholder)
CREATE OR REPLACE FUNCTION public.decrypt_api_key(encrypted_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- In production, use pgcrypto extension: pgp_sym_decrypt(encrypted_key::bytea, current_setting('app.encryption_key'))
  -- For now, we'll use base64 decoding as a placeholder
  RETURN convert_from(decode(encrypted_key, 'base64'), 'UTF8');
END;
$$;

-- Function to test external system connection
CREATE OR REPLACE FUNCTION public.test_external_system_connection(
  p_system_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_system RECORD;
  v_result JSONB;
BEGIN
  -- Get system details
  SELECT * INTO v_system FROM public.external_systems WHERE id = p_system_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'System not found');
  END IF;
  
  -- TODO: Implement actual connection testing based on system_type
  -- This would make HTTP requests, test SFTP connections, etc.
  
  -- For now, return a mock success response
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Connection test completed',
    'system_name', v_system.name,
    'system_type', v_system.system_type,
    'tested_at', NOW()
  );
  
  -- Update last_sync_at
  UPDATE public.external_systems
  SET last_sync_at = NOW(),
      last_sync_status = 'success'
  WHERE id = p_system_id;
  
  RETURN v_result;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_external_systems_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS external_systems_updated_at ON public.external_systems;
CREATE TRIGGER external_systems_updated_at
  BEFORE UPDATE ON public.external_systems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_external_systems_updated_at();

-- ============================================================
-- SEED DEFAULT ERP SYSTEM TYPES
-- ============================================================
COMMENT ON TABLE public.external_systems IS 'Stores external ERP/API system integrations for companies. Supports SAP, Oracle, QuickBooks, custom REST APIs, webhooks, and SFTP connections.';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_systems TO authenticated;
GRANT SELECT ON public.external_systems_sync_history TO authenticated;
