-- Surve: Survey App Schema
-- Run this against the Supabase SQL editor for project pfardxvzeatcaezfiqah

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
  surveys_created INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SURVEYS
-- ============================================
CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  theme JSONB DEFAULT '{"primaryColor": "#6C5CE7", "backgroundColor": "#F8F9FA", "fontFamily": "system"}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'archived')),
  is_public BOOLEAN DEFAULT false,
  share_code TEXT UNIQUE,
  allow_anonymous BOOLEAN DEFAULT true,
  max_responses INTEGER,
  close_at TIMESTAMPTZ,
  welcome_message TEXT,
  thank_you_message TEXT DEFAULT 'Thank you for your response!',
  total_responses INTEGER DEFAULT 0,
  avg_completion_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_surveys_user_id ON public.surveys(user_id);
CREATE INDEX idx_surveys_status ON public.surveys(status);
CREATE INDEX idx_surveys_share_code ON public.surveys(share_code);

-- ============================================
-- QUESTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'rating', 'text', 'nps', 'yes_no', 'scale', 'dropdown', 'date', 'email', 'number')),
  text TEXT NOT NULL,
  description TEXT,
  options JSONB DEFAULT '[]',
  required BOOLEAN DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_questions_survey_id ON public.questions(survey_id);

-- ============================================
-- RESPONSES (one per respondent per survey)
-- ============================================
CREATE TABLE IF NOT EXISTS public.responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  respondent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  respondent_email TEXT,
  respondent_name TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  answers JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  completion_time_seconds INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_responses_survey_id ON public.responses(survey_id);
CREATE INDEX idx_responses_respondent_id ON public.responses(respondent_id);

-- ============================================
-- SURVEY ANALYTICS (materialized view-like table, updated on response)
-- ============================================
CREATE TABLE IF NOT EXISTS public.survey_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE UNIQUE,
  total_responses INTEGER DEFAULT 0,
  completed_responses INTEGER DEFAULT 0,
  avg_completion_time_seconds NUMERIC DEFAULT 0,
  completion_rate NUMERIC DEFAULT 0,
  daily_responses JSONB DEFAULT '{}',
  question_stats JSONB DEFAULT '{}',
  last_response_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_survey_analytics_survey_id ON public.survey_analytics(survey_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Users: can read/update own profile
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Surveys: owners can CRUD, public surveys readable by all
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own surveys" ON public.surveys
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public active surveys readable by all" ON public.surveys
  FOR SELECT USING (is_public = true AND status = 'active');

-- Questions: readable if survey is accessible
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Survey owners can manage questions" ON public.questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.surveys WHERE id = survey_id AND user_id = auth.uid())
  );

CREATE POLICY "Questions readable for active surveys" ON public.questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.surveys WHERE id = survey_id AND (is_public = true AND status = 'active'))
  );

-- Responses: respondent can insert, survey owner can read
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit response to active survey" ON public.responses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.surveys WHERE id = survey_id AND status = 'active')
  );

CREATE POLICY "Survey owners can view responses" ON public.responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.surveys WHERE id = survey_id AND user_id = auth.uid())
  );

CREATE POLICY "Respondents can view own responses" ON public.responses
  FOR SELECT USING (respondent_id = auth.uid());

-- Analytics: survey owners only
ALTER TABLE public.survey_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Survey owners can view analytics" ON public.survey_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.surveys WHERE id = survey_id AND user_id = auth.uid())
  );

CREATE POLICY "System can update analytics" ON public.survey_analytics
  FOR ALL USING (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generate unique share code for surveys
CREATE OR REPLACE FUNCTION public.generate_share_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_code IS NULL THEN
    NEW.share_code := substr(md5(random()::text), 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_share_code ON public.surveys;
CREATE TRIGGER set_share_code
  BEFORE INSERT ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.generate_share_code();

-- Update survey response count on new response
CREATE OR REPLACE FUNCTION public.update_survey_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.surveys
  SET total_responses = total_responses + 1,
      updated_at = now()
  WHERE id = NEW.survey_id;

  -- Upsert analytics
  INSERT INTO public.survey_analytics (survey_id, total_responses, last_response_at)
  VALUES (NEW.survey_id, 1, now())
  ON CONFLICT (survey_id) DO UPDATE
  SET total_responses = survey_analytics.total_responses + 1,
      completed_responses = CASE WHEN NEW.completed_at IS NOT NULL
        THEN survey_analytics.completed_responses + 1
        ELSE survey_analytics.completed_responses END,
      last_response_at = now(),
      updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_response_created ON public.responses;
CREATE TRIGGER on_response_created
  AFTER INSERT ON public.responses
  FOR EACH ROW EXECUTE FUNCTION public.update_survey_stats();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
