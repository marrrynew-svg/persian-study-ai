
-- ROADMAP NODES
CREATE TABLE public.roadmap_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.roadmap_nodes(id) ON DELETE CASCADE,
  exam_id UUID,
  topic_id UUID,
  subject_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'study' CHECK (type IN ('study','exam','review','milestone','boss')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('locked','available','in_progress','completed')),
  progress NUMERIC NOT NULL DEFAULT 0,
  study_minutes INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 60,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  due_date DATE,
  last_studied_at TIMESTAMPTZ,
  unlock_required_node_ids UUID[] NOT NULL DEFAULT '{}',
  unlock_required_study_minutes INTEGER NOT NULL DEFAULT 0,
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  world_kind TEXT NOT NULL DEFAULT 'island' CHECK (world_kind IN ('island','city','tower','cave','boss_arena')),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_nodes TO authenticated;
GRANT ALL ON public.roadmap_nodes TO service_role;

ALTER TABLE public.roadmap_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own roadmap nodes"
  ON public.roadmap_nodes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_roadmap_nodes_user ON public.roadmap_nodes(user_id);
CREATE INDEX idx_roadmap_nodes_exam ON public.roadmap_nodes(exam_id);
CREATE INDEX idx_roadmap_nodes_topic ON public.roadmap_nodes(topic_id);
CREATE INDEX idx_roadmap_nodes_status ON public.roadmap_nodes(user_id, status);

CREATE TRIGGER trg_roadmap_nodes_updated
  BEFORE UPDATE ON public.roadmap_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- NODE EVENTS
CREATE TABLE public.node_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  node_id UUID NOT NULL REFERENCES public.roadmap_nodes(id) ON DELETE CASCADE,
  session_id UUID,
  event_type TEXT NOT NULL,
  delta_minutes INTEGER NOT NULL DEFAULT 0,
  delta_progress NUMERIC NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.node_events TO authenticated;
GRANT ALL ON public.node_events TO service_role;

ALTER TABLE public.node_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own node events"
  ON public.node_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_node_events_node ON public.node_events(node_id);
CREATE INDEX idx_node_events_user_time ON public.node_events(user_id, created_at DESC);

-- ACHIEVEMENTS
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '🏆',
  xp_reward INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own achievements"
  ON public.achievements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_achievements_user ON public.achievements(user_id);

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_nodes;
