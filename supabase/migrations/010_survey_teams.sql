-- Survey Teams: team grouping for survey responses
-- Migration for AUT-56

-- ============================================
-- SURVEY_TEAMS
-- ============================================
CREATE TABLE IF NOT EXISTS public.survey_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_survey_teams_survey_id ON public.survey_teams(survey_id);

-- ============================================
-- ADD team_id TO RESPONSES
-- ============================================
ALTER TABLE public.responses
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.survey_teams(id) ON DELETE SET NULL;

CREATE INDEX idx_responses_team_id ON public.responses(team_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.survey_teams ENABLE ROW LEVEL SECURITY;

-- Survey owners can CRUD teams
CREATE POLICY "Survey owners can manage teams" ON public.survey_teams
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.surveys WHERE id = survey_id AND user_id = auth.uid())
  );

-- Respondents can read teams for surveys they respond to
CREATE POLICY "Respondents can read teams for their surveys" ON public.survey_teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.responses r
      WHERE r.survey_id = survey_teams.survey_id
        AND r.respondent_id = auth.uid()
    )
  );

-- Anyone can read teams for active public surveys (needed to select team when responding)
CREATE POLICY "Teams readable for active public surveys" ON public.survey_teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.surveys
      WHERE id = survey_id AND is_public = true AND status = 'active'
    )
  );
