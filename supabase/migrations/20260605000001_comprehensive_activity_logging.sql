-- ============================================================
-- COMPREHENSIVE ACTIVITY LOGGING
-- Expand audit_logs to track ALL user actions
-- ============================================================

-- Ensure audit_logs table has all necessary fields
DO $$
BEGIN
  -- Add module field if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'module'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN module TEXT;
  END IF;
  
  -- Add severity field if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'severity'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN severity TEXT DEFAULT 'info';
  END IF;
  
  -- Add before_state field if not exists (for tracking changes)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'before_state'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN before_state JSONB;
  END IF;
  
  -- Add after_state field if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'after_state'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN after_state JSONB;
  END IF;
END $$;

-- Create index for module filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);

-- ============================================================
-- DATABASE TRIGGERS FOR AUTOMATIC ACTIVITY LOGGING
-- ============================================================

-- Generic trigger function for logging changes
CREATE OR REPLACE FUNCTION public.log_table_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action_type TEXT;
  v_actor_email TEXT;
  v_actor_role TEXT;
  v_company_id UUID;
  v_target_name TEXT;
  v_module TEXT;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'create_' || TG_TABLE_NAME;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action_type := 'update_' || TG_TABLE_NAME;
  ELSIF TG_OP = 'DELETE' THEN
    v_action_type := 'delete_' || TG_TABLE_NAME;
  END IF;

  -- Get actor details
  SELECT email INTO v_actor_email FROM auth.users WHERE id = auth.uid();
  SELECT role INTO v_actor_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
  
  -- Determine module based on table name
  v_module := CASE TG_TABLE_NAME
    WHEN 'employees' THEN 'employees'
    WHEN 'incidents' THEN 'incidents'
    WHEN 'tasks' THEN 'tasks'
    WHEN 'audits' THEN 'audits'
    WHEN 'training_records' THEN 'training'
    WHEN 'risk_assessments' THEN 'risk_assessments'
    WHEN 'hazards' THEN 'hazards'
    WHEN 'documents' THEN 'documents'
    WHEN 'locations' THEN 'locations'
    WHEN 'equipment' THEN 'equipment'
    WHEN 'inspections' THEN 'inspections'
    WHEN 'investigations' THEN 'investigations'
    ELSE TG_TABLE_NAME
  END;

  -- Get company_id based on table structure
  IF TG_OP = 'DELETE' THEN
    v_company_id := COALESCE(OLD.company_id, (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1));
    v_target_name := COALESCE(
      OLD.name,
      OLD.title,
      OLD.full_name,
      OLD.description,
      OLD.incident_number,
      OLD.task_name,
      'Record #' || OLD.id::TEXT
    );
    
    -- Insert audit log for DELETE
    INSERT INTO public.audit_logs (
      actor_id,
      actor_email,
      actor_role,
      action_type,
      target_type,
      target_id,
      target_name,
      company_id,
      module,
      severity,
      before_state,
      details
    ) VALUES (
      auth.uid(),
      v_actor_email,
      v_actor_role,
      v_action_type,
      TG_TABLE_NAME,
      OLD.id,
      v_target_name,
      v_company_id,
      v_module,
      'info',
      to_jsonb(OLD),
      jsonb_build_object('operation', 'delete', 'table', TG_TABLE_NAME)
    );
  ELSE
    v_company_id := COALESCE(NEW.company_id, (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1));
    v_target_name := COALESCE(
      NEW.name,
      NEW.title,
      NEW.full_name,
      NEW.description,
      NEW.incident_number,
      NEW.task_name,
      'Record #' || NEW.id::TEXT
    );
    
    -- Insert audit log for INSERT or UPDATE
    INSERT INTO public.audit_logs (
      actor_id,
      actor_email,
      actor_role,
      action_type,
      target_type,
      target_id,
      target_name,
      company_id,
      module,
      severity,
      before_state,
      after_state,
      details
    ) VALUES (
      auth.uid(),
      v_actor_email,
      v_actor_role,
      v_action_type,
      TG_TABLE_NAME,
      NEW.id,
      v_target_name,
      v_company_id,
      v_module,
      'info',
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      to_jsonb(NEW),
      jsonb_build_object(
        'operation', TG_OP,
        'table', TG_TABLE_NAME,
        'changed_fields', CASE 
          WHEN TG_OP = 'UPDATE' THEN (
            SELECT jsonb_object_agg(key, value)
            FROM jsonb_each(to_jsonb(NEW))
            WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key
          )
          ELSE NULL
        END
      )
    );
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS audit_employees_changes ON public.employees;
DROP TRIGGER IF EXISTS audit_incidents_changes ON public.incidents;
DROP TRIGGER IF EXISTS audit_tasks_changes ON public.tasks;
DROP TRIGGER IF EXISTS audit_audits_changes ON public.audits;
DROP TRIGGER IF EXISTS audit_risk_assessments_changes ON public.risk_assessments;
DROP TRIGGER IF EXISTS audit_hazards_changes ON public.hazards;
DROP TRIGGER IF EXISTS audit_training_records_changes ON public.training_records;

-- Create triggers for all important tables
-- Note: Only create triggers for tables that exist

-- Employees
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
    EXECUTE 'CREATE TRIGGER audit_employees_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.employees
      FOR EACH ROW EXECUTE FUNCTION public.log_table_changes()';
  END IF;
END $$;

-- Incidents
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incidents') THEN
    EXECUTE 'CREATE TRIGGER audit_incidents_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.incidents
      FOR EACH ROW EXECUTE FUNCTION public.log_table_changes()';
  END IF;
END $$;

-- Tasks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    EXECUTE 'CREATE TRIGGER audit_tasks_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.tasks
      FOR EACH ROW EXECUTE FUNCTION public.log_table_changes()';
  END IF;
END $$;

-- Audits
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audits') THEN
    EXECUTE 'CREATE TRIGGER audit_audits_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.audits
      FOR EACH ROW EXECUTE FUNCTION public.log_table_changes()';
  END IF;
END $$;

-- Risk Assessments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_assessments') THEN
    EXECUTE 'CREATE TRIGGER audit_risk_assessments_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.risk_assessments
      FOR EACH ROW EXECUTE FUNCTION public.log_table_changes()';
  END IF;
END $$;

-- Hazards
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hazards') THEN
    EXECUTE 'CREATE TRIGGER audit_hazards_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.hazards
      FOR EACH ROW EXECUTE FUNCTION public.log_table_changes()';
  END IF;
END $$;

-- Training Records
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_records') THEN
    EXECUTE 'CREATE TRIGGER audit_training_records_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.training_records
      FOR EACH ROW EXECUTE FUNCTION public.log_table_changes()';
  END IF;
END $$;

-- ============================================================
-- ENHANCED AUDIT LOG FUNCTIONS
-- ============================================================

-- Function to log document uploads/downloads
CREATE OR REPLACE FUNCTION public.log_document_activity(
  p_action_type TEXT, -- 'upload', 'download', 'delete', 'view'
  p_document_id UUID,
  p_document_name TEXT,
  p_file_size BIGINT DEFAULT NULL,
  p_file_type TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_actor_email TEXT;
  v_actor_role TEXT;
  v_company_id UUID;
BEGIN
  -- Get actor details
  SELECT email INTO v_actor_email FROM auth.users WHERE id = auth.uid();
  SELECT role, company_id INTO v_actor_role, v_company_id 
  FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    actor_id,
    actor_email,
    actor_role,
    action_type,
    target_type,
    target_id,
    target_name,
    company_id,
    module,
    severity,
    details
  ) VALUES (
    auth.uid(),
    v_actor_email,
    v_actor_role,
    p_action_type || '_document',
    'document',
    p_document_id,
    p_document_name,
    v_company_id,
    'documents',
    CASE p_action_type
      WHEN 'delete' THEN 'warning'
      ELSE 'info'
    END,
    jsonb_build_object(
      'action', p_action_type,
      'file_size', p_file_size,
      'file_type', p_file_type,
      'timestamp', NOW()
    )
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log report generation
CREATE OR REPLACE FUNCTION public.log_report_generation(
  p_report_type TEXT,
  p_report_name TEXT,
  p_filters JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_actor_email TEXT;
  v_actor_role TEXT;
  v_company_id UUID;
BEGIN
  SELECT email INTO v_actor_email FROM auth.users WHERE id = auth.uid();
  SELECT role, company_id INTO v_actor_role, v_company_id 
  FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO public.audit_logs (
    actor_id,
    actor_email,
    actor_role,
    action_type,
    target_type,
    target_name,
    company_id,
    module,
    severity,
    details
  ) VALUES (
    auth.uid(),
    v_actor_email,
    v_actor_role,
    'generate_report',
    'report',
    p_report_name,
    v_company_id,
    'reports',
    'info',
    jsonb_build_object(
      'report_type', p_report_type,
      'filters', p_filters,
      'generated_at', NOW()
    )
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get activity summary for a company
CREATE OR REPLACE FUNCTION public.get_activity_summary(
  p_company_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  module TEXT,
  action_count BIGINT,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(al.module, 'general') as module,
    COUNT(*) as action_count,
    MAX(al.created_at) as last_activity
  FROM public.audit_logs al
  WHERE al.company_id = p_company_id
    AND al.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY al.module
  ORDER BY action_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.log_document_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_report_generation TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_summary TO authenticated;

COMMENT ON TABLE public.audit_logs IS 'Comprehensive activity logging for all user actions including authentication, CRUD operations, document management, report generation, and system changes.';
