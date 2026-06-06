
-- helper: updated_at trigger function already exists (public.update_updated_at_column)

-- 1. plan_wizard_state
CREATE TABLE public.plan_wizard_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  current_step integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_wizard_state TO authenticated;
GRANT ALL ON public.plan_wizard_state TO service_role;
ALTER TABLE public.plan_wizard_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wizard state" ON public.plan_wizard_state FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_plan_wizard_state_uat BEFORE UPDATE ON public.plan_wizard_state FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. plan_exam_setup
CREATE TABLE public.plan_exam_setup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_name text NOT NULL,
  exam_type text NOT NULL DEFAULT 'mixed', -- test | essay | mixed
  exam_date date NOT NULL,
  exam_time time,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_exam_setup TO authenticated;
GRANT ALL ON public.plan_exam_setup TO service_role;
ALTER TABLE public.plan_exam_setup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exam setup" ON public.plan_exam_setup FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_plan_exam_setup_uat BEFORE UPDATE ON public.plan_exam_setup FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_plan_exam_setup_user ON public.plan_exam_setup(user_id, is_active);

-- 3. plan_subject_inputs
CREATE TABLE public.plan_subject_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_setup_id uuid NOT NULL REFERENCES public.plan_exam_setup(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  chapters_total integer NOT NULL DEFAULT 0,
  pages_left integer NOT NULL DEFAULT 0,
  tests_left integer NOT NULL DEFAULT 0,
  notes_left integer NOT NULL DEFAULT 0,
  video_minutes_left integer NOT NULL DEFAULT 0,
  current_level text NOT NULL DEFAULT 'medium', -- very_weak | weak | medium | good | strong
  importance integer NOT NULL DEFAULT 3, -- 1..5
  coefficient numeric NOT NULL DEFAULT 1,
  target_percent integer NOT NULL DEFAULT 70,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_subject_inputs TO authenticated;
GRANT ALL ON public.plan_subject_inputs TO service_role;
ALTER TABLE public.plan_subject_inputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subject inputs" ON public.plan_subject_inputs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_plan_subject_inputs_uat BEFORE UPDATE ON public.plan_subject_inputs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_plan_subject_inputs_exam ON public.plan_subject_inputs(exam_setup_id);

-- 4. plan_study_style
CREATE TABLE public.plan_study_style (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  daily_hours_available numeric NOT NULL DEFAULT 6,
  real_focus_hours numeric NOT NULL DEFAULT 4,
  wake_time time NOT NULL DEFAULT '07:00',
  sleep_time time NOT NULL DEFAULT '23:30',
  has_school boolean NOT NULL DEFAULT false,
  has_university boolean NOT NULL DEFAULT false,
  has_work boolean NOT NULL DEFAULT false,
  weekend_free boolean NOT NULL DEFAULT true,
  reading_speed text NOT NULL DEFAULT 'medium', -- slow | medium | fast
  learning_mode text NOT NULL DEFAULT 'mixed', -- book | video | mixed
  focus_minutes integer NOT NULL DEFAULT 45,
  test_days_per_week integer NOT NULL DEFAULT 3,
  review_count_per_week integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_study_style TO authenticated;
GRANT ALL ON public.plan_study_style TO service_role;
ALTER TABLE public.plan_study_style ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own study style" ON public.plan_study_style FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_plan_study_style_uat BEFORE UPDATE ON public.plan_study_style FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. plan_analysis
CREATE TABLE public.plan_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_setup_id uuid REFERENCES public.plan_exam_setup(id) ON DELETE CASCADE,
  total_required_minutes integer NOT NULL DEFAULT 0,
  total_available_minutes integer NOT NULL DEFAULT 0,
  days_left integer NOT NULL DEFAULT 0,
  pressure_score numeric NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'green', -- green | yellow | orange | red
  reasoning jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_analysis TO authenticated;
GRANT ALL ON public.plan_analysis TO service_role;
ALTER TABLE public.plan_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own analysis" ON public.plan_analysis FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_plan_analysis_user ON public.plan_analysis(user_id, created_at DESC);

-- 6. plan_daily_v2
CREATE TABLE public.plan_daily_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_setup_id uuid REFERENCES public.plan_exam_setup(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_planned_minutes integer NOT NULL DEFAULT 0,
  total_done_minutes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending | in_progress | done | missed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_daily_v2 TO authenticated;
GRANT ALL ON public.plan_daily_v2 TO service_role;
ALTER TABLE public.plan_daily_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily v2" ON public.plan_daily_v2 FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_plan_daily_v2_uat BEFORE UPDATE ON public.plan_daily_v2 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_plan_daily_v2_user_date ON public.plan_daily_v2(user_id, date);

-- 7. plan_block_v2
CREATE TABLE public.plan_block_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  daily_id uuid NOT NULL REFERENCES public.plan_daily_v2(id) ON DELETE CASCADE,
  subject_input_id uuid REFERENCES public.plan_subject_inputs(id) ON DELETE SET NULL,
  subject_name text NOT NULL,
  topic text,
  pages integer NOT NULL DEFAULT 0,
  tests integer NOT NULL DEFAULT 0,
  study_minutes integer NOT NULL DEFAULT 0,
  review_minutes integer NOT NULL DEFAULT 0,
  recovery_minutes integer NOT NULL DEFAULT 0,
  block_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending | done | skipped | postponed
  done_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_block_v2 TO authenticated;
GRANT ALL ON public.plan_block_v2 TO service_role;
ALTER TABLE public.plan_block_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own block v2" ON public.plan_block_v2 FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_plan_block_v2_uat BEFORE UPDATE ON public.plan_block_v2 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_plan_block_v2_daily ON public.plan_block_v2(daily_id, block_order);

-- 8. plan_replan_log
CREATE TABLE public.plan_replan_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  for_date date NOT NULL,
  done_minutes integer NOT NULL DEFAULT 0,
  missed_minutes integer NOT NULL DEFAULT 0,
  deferred_minutes integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_replan_log TO authenticated;
GRANT ALL ON public.plan_replan_log TO service_role;
ALTER TABLE public.plan_replan_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own replan log" ON public.plan_replan_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_plan_replan_log_user_date ON public.plan_replan_log(user_id, for_date DESC);
