-- Add organisation type to company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS org_type TEXT NOT NULL DEFAULT 'linie'
    CHECK (org_type IN ('linie', 'matrix'));

-- Add manager fields to team_members (self-referencing via id)
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS line_manager_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS functional_manager_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_line_manager ON public.team_members (line_manager_id);
CREATE INDEX IF NOT EXISTS idx_team_members_functional_manager ON public.team_members (functional_manager_id);
