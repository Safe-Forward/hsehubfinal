-- Add result fields to health_checkups
ALTER TABLE public.health_checkups
  ADD COLUMN IF NOT EXISTS result text CHECK (result IN ('passed', 'conditionally_passed', 'failed')),
  ADD COLUMN IF NOT EXISTS result_notes text;

COMMENT ON COLUMN public.health_checkups.result IS 'Examination result: passed=Bestanden, conditionally_passed=Bedingt tauglich, failed=Untauglich';
COMMENT ON COLUMN public.health_checkups.result_notes IS 'Notes required when result is conditionally_passed or failed';
