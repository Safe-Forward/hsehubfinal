-- Fires an edge function notification whenever a new company is inserted.
-- Uses pg_net (already enabled) to call the edge function asynchronously
-- so the registration transaction is never delayed by email delivery.

CREATE OR REPLACE FUNCTION public.notify_new_company_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url  TEXT;
  v_key  TEXT;
BEGIN
  SELECT value INTO v_url
    FROM public.system_config
   WHERE key = 'supabase_functions_url'
   LIMIT 1;

  SELECT value INTO v_key
    FROM public.system_config
   WHERE key = 'supabase_anon_key'
   LIMIT 1;

  -- Fallback: hard-coded project URL if system_config not populated
  IF v_url IS NULL THEN
    v_url := 'https://mzqypusyxvyuiesuhjcw.supabase.co/functions/v1';
  END IF;

  PERFORM net.http_post(
    url     := v_url || '/send-new-company-notification',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', COALESCE('Bearer ' || v_key, '')
    ),
    body    := jsonb_build_object(
      'company_name',       NEW.name,
      'company_email',      COALESCE(NEW.billing_email, NEW.email),
      'subscription_tier',  NEW.subscription_tier::text,
      'trial_ends_at',      NEW.trial_ends_at,
      'created_at',         NEW.created_at
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_company_registered_notify ON public.companies;
CREATE TRIGGER on_company_registered_notify
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_company_registration();
