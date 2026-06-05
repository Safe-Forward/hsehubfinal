-- ============================================================
-- FIX BILLING PORTAL AND INVOICE MANAGEMENT
-- ============================================================

-- Ensure invoices table has all required fields
DO $$
BEGIN
  -- Add sent tracking if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'sent_count'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN sent_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'last_sent_at'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN last_sent_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'last_sent_to'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN last_sent_to TEXT;
  END IF;
END $$;

-- Function to get billing summary for a company
CREATE OR REPLACE FUNCTION public.get_billing_summary(p_company_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_company RECORD;
  v_total_invoiced DECIMAL;
  v_total_paid DECIMAL;
  v_total_pending DECIMAL;
  v_total_overdue DECIMAL;
  v_invoice_count INTEGER;
BEGIN
  -- Get company details
  SELECT * INTO v_company FROM public.companies WHERE id = p_company_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Company not found');
  END IF;
  
  -- Calculate invoice totals
  SELECT 
    COUNT(*),
    COALESCE(SUM(total), 0),
    COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'pending' THEN total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'overdue' THEN total ELSE 0 END), 0)
  INTO 
    v_invoice_count,
    v_total_invoiced,
    v_total_paid,
    v_total_pending,
    v_total_overdue
  FROM public.invoices
  WHERE company_id = p_company_id;
  
  -- Build result
  v_result := jsonb_build_object(
    'company', jsonb_build_object(
      'id', v_company.id,
      'name', v_company.name,
      'subscription_tier', v_company.subscription_tier,
      'subscription_status', v_company.subscription_status,
      'subscription_start_date', v_company.subscription_start_date,
      'subscription_end_date', v_company.subscription_end_date,
      'trial_ends_at', v_company.trial_ends_at,
      'billing_email', v_company.billing_email,
      'subscription_billing_interval', v_company.subscription_billing_interval
    ),
    'billing', jsonb_build_object(
      'stripe_customer_id', v_company.stripe_customer_id,
      'stripe_subscription_id', v_company.stripe_subscription_id
    ),
    'invoices', jsonb_build_object(
      'count', v_invoice_count,
      'total_invoiced', v_total_invoiced,
      'total_paid', v_total_paid,
      'total_pending', v_total_pending,
      'total_overdue', v_total_overdue
    )
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate monthly invoices for active subscriptions
CREATE OR REPLACE FUNCTION public.generate_monthly_invoices()
RETURNS TABLE (
  company_id UUID,
  invoice_number TEXT,
  status TEXT
) AS $$
DECLARE
  v_company RECORD;
  v_invoice_number TEXT;
  v_amount DECIMAL;
  v_tier_prices JSONB := jsonb_build_object(
    'basic', 149,
    'standard', 249,
    'premium', 349
  );
BEGIN
  -- Find companies that need invoices (active subscriptions, billing date is today)
  FOR v_company IN 
    SELECT 
      c.id,
      c.name,
      c.subscription_tier,
      c.subscription_billing_interval,
      c.billing_email
    FROM public.companies c
    WHERE c.subscription_status = 'active'
      AND c.subscription_end_date IS NOT NULL
      AND DATE_TRUNC('day', c.subscription_end_date) = DATE_TRUNC('day', NOW())
  LOOP
    -- Calculate amount based on tier
    v_amount := (v_tier_prices ->> v_company.subscription_tier)::DECIMAL;
    
    IF v_amount IS NULL THEN
      v_amount := 149; -- Default to basic
    END IF;
    
    -- Multiply by 12 if yearly billing
    IF v_company.subscription_billing_interval = 'year' THEN
      v_amount := v_amount * 12;
    END IF;
    
    -- Generate invoice number
    SELECT public.generate_invoice_number(v_company.id) INTO v_invoice_number;
    
    -- Create invoice
    INSERT INTO public.invoices (
      company_id,
      invoice_number,
      status,
      subtotal,
      tax_amount,
      total,
      currency,
      billing_period_start,
      billing_period_end,
      due_date,
      line_items,
      metadata
    ) VALUES (
      v_company.id,
      v_invoice_number,
      'pending',
      v_amount,
      0,
      v_amount,
      'EUR',
      NOW(),
      NOW() + INTERVAL '1 month',
      NOW() + INTERVAL '14 days',
      jsonb_build_array(
        jsonb_build_object(
          'description', 'HSE Management Platform - ' || INITCAP(v_company.subscription_tier) || ' Plan',
          'quantity', 1,
          'unit_price', v_amount,
          'total', v_amount
        )
      ),
      jsonb_build_object(
        'auto_generated', true,
        'generated_at', NOW()
      )
    );
    
    -- Return result
    RETURN QUERY SELECT v_company.id, v_invoice_number, 'created'::TEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark overdue invoices
CREATE OR REPLACE FUNCTION public.mark_overdue_invoices()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.invoices
  SET status = 'overdue'
  WHERE status = 'pending'
    AND due_date < NOW()
    AND due_date IS NOT NULL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_billing_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_monthly_invoices TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_overdue_invoices TO service_role;

COMMENT ON FUNCTION public.get_billing_summary IS 'Returns comprehensive billing summary for a company including subscription details and invoice totals';
COMMENT ON FUNCTION public.generate_monthly_invoices IS 'Automatically generates monthly invoices for active subscriptions. Should be run daily via cron job.';
COMMENT ON FUNCTION public.mark_overdue_invoices IS 'Marks pending invoices as overdue if past due date. Should be run daily via cron job.';
