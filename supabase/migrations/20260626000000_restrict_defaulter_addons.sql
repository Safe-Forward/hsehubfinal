-- Migration: Restrict add-on access for payment defaulters (overdue invoices)
-- Created: 2026-06-06

BEGIN;

-- 1. Update company_has_addon to return FALSE if company has overdue invoices or is inactive
CREATE OR REPLACE FUNCTION public.company_has_addon(p_company_id UUID, p_addon_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Restrict use of add-ons if the company has any overdue invoices (defaulter)
    IF EXISTS (
        SELECT 1 FROM public.invoices 
        WHERE company_id = p_company_id AND status = 'overdue'
    ) THEN
        RETURN FALSE;
    END IF;

    -- Also check if their subscription status is active or trial
    IF NOT EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = p_company_id AND subscription_status IN ('active', 'trial')
    ) THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 
        FROM public.company_addons ca
        JOIN public.addon_definitions ad ON ca.addon_id = ad.id
        WHERE ca.company_id = p_company_id 
        AND ad.code = p_addon_code
        AND ca.status = 'active'
        AND (ca.end_date IS NULL OR ca.end_date > now())
    );
END;
$$;

-- 2. Update get_company_subscription_info to not return active add-ons if company has overdue invoices
CREATE OR REPLACE FUNCTION public.get_company_subscription_info(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_has_overdue BOOLEAN;
BEGIN
    -- Check if company has overdue invoices
    SELECT EXISTS (
        SELECT 1 FROM public.invoices 
        WHERE company_id = p_company_id AND status = 'overdue'
    ) INTO v_has_overdue;

    SELECT jsonb_build_object(
        'company_id', c.id,
        'company_name', c.name,
        'subscription_tier', c.subscription_tier,
        'subscription_status', c.subscription_status,
        'max_employees', c.max_employees,
        'storage_used_bytes', c.storage_used_bytes,
        'storage_limit_bytes', c.storage_limit_bytes,
        'subscription_start', c.subscription_start_date,
        'subscription_end', c.subscription_end_date,
        'trial_ends_at', c.trial_ends_at,
        'addons', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', ca.id,
                'addon_code', ad.code,
                'addon_name', ad.name,
                'status', ca.status,
                'quantity', ca.quantity,
                'start_date', ca.start_date,
                'end_date', ca.end_date
            ))
            FROM public.company_addons ca
            JOIN public.addon_definitions ad ON ca.addon_id = ad.id
            WHERE ca.company_id = c.id 
            AND ca.status = 'active'
            -- If company has overdue invoices, do not return active add-ons (restrict access)
            AND NOT v_has_overdue
        ), '[]'::jsonb)
    ) INTO v_result
    FROM public.companies c
    WHERE c.id = p_company_id;
    
    RETURN v_result;
END;
$$;

COMMIT;
