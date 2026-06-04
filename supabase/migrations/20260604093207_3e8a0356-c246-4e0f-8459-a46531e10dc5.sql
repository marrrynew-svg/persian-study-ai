
-- user_capacity
CREATE TABLE public.user_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  sleep_h numeric NOT NULL DEFAULT 8,
  school_h numeric NOT NULL DEFAULT 0,
  commute_h numeric NOT NULL DEFAULT 0,
  fixed_h numeric NOT NULL DEFAULT 0,
  effective_h numeric NOT NULL DEFAULT 4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, weekday)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_capacity TO authenticated;
GRANT ALL ON public.user_capacity TO service_role;
ALTER TABLE public.user_capacity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own capacity" ON public.user_capacity
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_user_capacity_updated BEFORE UPDATE ON public.user_capacity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- backlog_items
CREATE TABLE public.backlog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid,
  topic_id uuid,
  exam_id uuid,
  title text NOT NULL DEFAULT '',
  remaining_minutes integer NOT NULL DEFAULT 0,
  source_date date NOT NULL DEFAULT CURRENT_DATE,
  priority_score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backlog_items TO authenticated;
GRANT ALL ON public.backlog_items TO service_role;
ALTER TABLE public.backlog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own backlog" ON public.backlog_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_backlog_updated BEFORE UPDATE ON public.backlog_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- daily_plans
CREATE TABLE public.daily_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  total_planned_minutes integer NOT NULL DEFAULT 0,
  total_done_minutes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_plans TO authenticated;
GRANT ALL ON public.daily_plans TO service_role;
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily plans" ON public.daily_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_daily_plans_updated BEFORE UPDATE ON public.daily_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- behavior_model
CREATE TABLE public.behavior_model (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  weekday_strength jsonb NOT NULL DEFAULT '{"0":0.5,"1":0.5,"2":0.5,"3":0.5,"4":0.5,"5":0.5,"6":0.5}'::jsonb,
  avg_completion_rate numeric NOT NULL DEFAULT 0,
  burnout_flag boolean NOT NULL DEFAULT false,
  overload_streak integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.behavior_model TO authenticated;
GRANT ALL ON public.behavior_model TO service_role;
ALTER TABLE public.behavior_model ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own behavior" ON public.behavior_model
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_behavior_updated BEFORE UPDATE ON public.behavior_model
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ai_logs
CREATE TABLE public.ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'analysis',
  message text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_logs TO authenticated;
GRANT ALL ON public.ai_logs TO service_role;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ai logs" ON public.ai_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_backlog_user_status ON public.backlog_items(user_id, status);
CREATE INDEX idx_daily_plans_user_date ON public.daily_plans(user_id, date);
CREATE INDEX idx_ai_logs_user_created ON public.ai_logs(user_id, created_at DESC);
