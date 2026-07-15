-- Add meldepflichtig flag to incidents
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS is_reportable boolean DEFAULT false;

COMMENT ON COLUMN public.incidents.is_reportable IS 'Ob der Vorfall meldepflichtig ist (§ 193 SGB VII, DGUV)';

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_incidents_is_reportable ON public.incidents(company_id, is_reportable) WHERE is_reportable = true;
