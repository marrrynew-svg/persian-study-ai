
-- Extend plan_block_v2
ALTER TABLE public.plan_block_v2
  ADD COLUMN IF NOT EXISTS suggested_start_time TIME,
  ADD COLUMN IF NOT EXISTS suggested_end_time TIME,
  ADD COLUMN IF NOT EXISTS block_type TEXT NOT NULL DEFAULT 'study',
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS spaced_from_block UUID,
  ADD COLUMN IF NOT EXISTS rationale TEXT;

-- Extend plan_daily_v2
ALTER TABLE public.plan_daily_v2
  ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'foundation',
  ADD COLUMN IF NOT EXISTS heat_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_simulation_day BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_recovery_day BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS day_goal TEXT;

-- Weekly plans
CREATE TABLE IF NOT EXISTS public.plan_weekly_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exam_setup_id UUID,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  week_index INTEGER NOT NULL DEFAULT 0,
  phase TEXT NOT NULL DEFAULT 'foundation',
  weekly_goal TEXT,
  target_minutes INTEGER NOT NULL DEFAULT 0,
  done_minutes INTEGER NOT NULL DEFAULT 0,
  coverage JSONB NOT NULL DEFAULT '{}'::jsonb,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_weekly_v2 TO authenticated;
GRANT ALL ON public.plan_weekly_v2 TO service_role;
ALTER TABLE public.plan_weekly_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weekly" ON public.plan_weekly_v2 FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_plan_weekly_v2_updated BEFORE UPDATE ON public.plan_weekly_v2 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Monthly plans
CREATE TABLE IF NOT EXISTS public.plan_monthly_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exam_setup_id UUID,
  month_start DATE NOT NULL,
  month_end DATE NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 30,
  phases JSONB NOT NULL DEFAULT '[]'::jsonb,
  weekly_milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  heatmap JSONB NOT NULL DEFAULT '{}'::jsonb,
  readiness_forecast JSONB NOT NULL DEFAULT '[]'::jsonb,
  predicted_readiness_percent NUMERIC DEFAULT 0,
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_monthly_v2 TO authenticated;
GRANT ALL ON public.plan_monthly_v2 TO service_role;
ALTER TABLE public.plan_monthly_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own monthly" ON public.plan_monthly_v2 FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_plan_monthly_v2_updated BEFORE UPDATE ON public.plan_monthly_v2 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AI rationale log
CREATE TABLE IF NOT EXISTS public.plan_ai_rationale (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scope TEXT NOT NULL, -- 'day' | 'week' | 'month' | 'plan'
  target_id UUID,
  target_date DATE,
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_ai_rationale TO authenticated;
GRANT ALL ON public.plan_ai_rationale TO service_role;
ALTER TABLE public.plan_ai_rationale ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rationale" ON public.plan_ai_rationale FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_plan_weekly_user_start ON public.plan_weekly_v2(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_plan_monthly_user_start ON public.plan_monthly_v2(user_id, month_start);
CREATE INDEX IF NOT EXISTS idx_plan_rationale_user_scope ON public.plan_ai_rationale(user_id, scope, target_date);
