
-- LEARNING PROFILE
CREATE TABLE public.learning_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  reading_speed TEXT NOT NULL DEFAULT 'medium',
  study_depth TEXT NOT NULL DEFAULT 'balanced',
  focus_minutes INT NOT NULL DEFAULT 45,
  break_minutes INT NOT NULL DEFAULT 10,
  peak_window TEXT NOT NULL DEFAULT 'evening',
  consistency INT NOT NULL DEFAULT 3,
  distractibility INT NOT NULL DEFAULT 3,
  fatigue_curve INT NOT NULL DEFAULT 3,
  methods TEXT[] NOT NULL DEFAULT ARRAY['book']::TEXT[],
  video_speed NUMERIC NOT NULL DEFAULT 1.25,
  pause_frequency INT NOT NULL DEFAULT 2,
  notes_intensity INT NOT NULL DEFAULT 3,
  memorization_strength INT NOT NULL DEFAULT 3,
  analytical_strength INT NOT NULL DEFAULT 3,
  weekly_available_hours NUMERIC NOT NULL DEFAULT 28,
  weekend_multiplier NUMERIC NOT NULL DEFAULT 1.3,
  prefers_practice_tests BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.learning_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own learning profile" ON public.learning_profile FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_learning_profile_updated_at BEFORE UPDATE ON public.learning_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- EXAMS
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'mixed',
  exam_date DATE NOT NULL,
  priority INT NOT NULL DEFAULT 3,
  difficulty INT NOT NULL DEFAULT 3,
  target_score NUMERIC,
  importance INT NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'upcoming',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own exams" ON public.exams FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_exams_user_date ON public.exams(user_id, exam_date);
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- EXAM TOPICS
CREATE TABLE public.exam_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_id UUID,
  title TEXT NOT NULL,
  total_pages INT NOT NULL DEFAULT 0,
  total_video_minutes INT NOT NULL DEFAULT 0,
  difficulty INT NOT NULL DEFAULT 3,
  revisions_needed INT NOT NULL DEFAULT 2,
  needs_practice_tests BOOLEAN NOT NULL DEFAULT true,
  estimated_minutes INT NOT NULL DEFAULT 0,
  completed_minutes INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own exam topics" ON public.exam_topics FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_exam_topics_exam ON public.exam_topics(exam_id);
CREATE INDEX idx_exam_topics_user ON public.exam_topics(user_id);
CREATE TRIGGER update_exam_topics_updated_at BEFORE UPDATE ON public.exam_topics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ROADMAP BLOCKS
CREATE TABLE public.roadmap_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
  subject_id UUID,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_minutes INT NOT NULL DEFAULT 30,
  block_type TEXT NOT NULL DEFAULT 'study',
  priority INT NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'planned',
  auto_generated BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.roadmap_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own roadmap blocks" ON public.roadmap_blocks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_roadmap_blocks_user_date ON public.roadmap_blocks(user_id, date);
CREATE TRIGGER update_roadmap_blocks_updated_at BEFORE UPDATE ON public.roadmap_blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ROADMAP RUNS
CREATE TABLE public.roadmap_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  strategy TEXT NOT NULL DEFAULT 'auto',
  summary JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.roadmap_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own roadmap runs" ON public.roadmap_runs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_roadmap_runs_user ON public.roadmap_runs(user_id, generated_at DESC);
