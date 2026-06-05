-- ============================================================
-- WEBHOOK TRIGGERS USING PG_NET
-- ============================================================

-- Enable pg_net extension for async HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a configuration table for internal settings like the edge function URL
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT
);

-- Note: You should update these values with your actual Supabase Project URL and Anon Key
-- For local development, it might be http://host.docker.internal:54321/functions/v1/
INSERT INTO public.system_config (key, value, description)
VALUES 
    ('webhook_dispatcher_url', 'https://zczaicsmeazucvsihick.supabase.co/functions/v1/webhook-dispatcher', 'URL of the webhook dispatcher edge function'),
    ('webhook_dispatcher_auth', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjemFpY3NtZWF6dWN2c2loaWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzA1ODEsImV4cCI6MjA3ODcwNjU4MX0.kF4gELeabRcFkVGuFeA0gHjvm-in2O-eM36EGrJNM64', 'Authorization header for the edge function')
ON CONFLICT (key) DO NOTHING;

-- Create generic trigger function to dispatch webhooks
CREATE OR REPLACE FUNCTION public.dispatch_webhook_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_payload JSONB;
  v_url TEXT;
  v_auth TEXT;
  v_request_id BIGINT;
BEGIN
  -- Attempt to get company_id from the record
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_company_id := OLD.company_id;
    ELSE
      v_company_id := NEW.company_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If company_id doesn't exist on this table, we can't route the webhook
    RETURN NULL;
  END;

  -- Only proceed if we have a company_id
  IF v_company_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check if this company actually has any active external systems configured
  -- to avoid unnecessary HTTP calls
  IF NOT EXISTS (
    SELECT 1 FROM public.external_systems 
    WHERE company_id = v_company_id 
      AND status = 'active'
  ) THEN
    RETURN NULL;
  END IF;

  -- Build payload
  v_payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    'company_id', v_company_id,
    'timestamp', NOW()
  );

  -- Get configuration
  SELECT value INTO v_url FROM public.system_config WHERE key = 'webhook_dispatcher_url';
  SELECT value INTO v_auth FROM public.system_config WHERE key = 'webhook_dispatcher_auth';

  IF v_url IS NULL OR v_url LIKE '%YOUR_PROJECT_REF%' THEN
    -- Configuration is missing or not updated, log a warning and exit
    RAISE WARNING 'Webhook dispatcher URL is not configured properly in system_config';
    RETURN NULL;
  END IF;

  -- Send async HTTP POST request to the Edge Function
  SELECT net.http_post(
      url := v_url,
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', COALESCE(v_auth, '')
      ),
      body := v_payload
  ) INTO v_request_id;

  RETURN NULL; -- AFTER trigger doesn't need to return NEW/OLD
END;
$$;

-- Create triggers on important tables

-- Incidents
DROP TRIGGER IF EXISTS on_incident_change_dispatch_webhook ON public.incidents;
CREATE TRIGGER on_incident_change_dispatch_webhook
  AFTER INSERT OR UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_webhook_event();

-- Audits
DROP TRIGGER IF EXISTS on_audit_change_dispatch_webhook ON public.audits;
CREATE TRIGGER on_audit_change_dispatch_webhook
  AFTER INSERT OR UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_webhook_event();

-- Employees
DROP TRIGGER IF EXISTS on_employee_change_dispatch_webhook ON public.employees;
CREATE TRIGGER on_employee_change_dispatch_webhook
  AFTER INSERT OR UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_webhook_event();

-- Risk Assessments
DROP TRIGGER IF EXISTS on_risk_assessment_change_dispatch_webhook ON public.risk_assessments;
CREATE TRIGGER on_risk_assessment_change_dispatch_webhook
  AFTER INSERT OR UPDATE ON public.risk_assessments
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_webhook_event();

COMMENT ON FUNCTION public.dispatch_webhook_event IS 'Dispatches table changes to the webhook-dispatcher edge function via pg_net.';
