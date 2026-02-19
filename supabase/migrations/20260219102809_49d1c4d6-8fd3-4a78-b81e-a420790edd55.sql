
-- AI Conversations table (Short-Term Memory)
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  mode TEXT DEFAULT 'chat',
  session_id UUID DEFAULT gen_random_uuid(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversations"
  ON public.ai_conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ai_conversations_user_created ON public.ai_conversations (user_id, created_at DESC);

-- AI User Memory table (Mid & Long-Term Memory)
CREATE TABLE public.ai_user_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'long_term', -- 'short_term' | 'mid_term' | 'long_term'
  category TEXT NOT NULL, -- 'personality' | 'burnout' | 'behavior' | 'performance' | 'goals' | 'emotional'
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT DEFAULT 'ai_inferred', -- 'user_stated' | 'ai_inferred' | 'behavioral_data'
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, memory_type, key)
);

ALTER TABLE public.ai_user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own memory"
  ON public.ai_user_memory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ai_memory_user_type ON public.ai_user_memory (user_id, memory_type, category);

-- Behavioral Snapshots table (analytics feed for AI)
CREATE TABLE public.behavioral_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  study_minutes INTEGER DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,
  sessions_skipped INTEGER DEFAULT 0,
  avg_session_length NUMERIC DEFAULT 0,
  subjects_studied JSONB DEFAULT '[]',
  burnout_risk NUMERIC DEFAULT 0 CHECK (burnout_risk >= 0 AND burnout_risk <= 1),
  motivation_score NUMERIC DEFAULT 0.5 CHECK (motivation_score >= 0 AND motivation_score <= 1),
  consistency_score NUMERIC DEFAULT 0.5 CHECK (consistency_score >= 0 AND consistency_score <= 1),
  emotional_signals JSONB DEFAULT '{}',
  ai_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE public.behavioral_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own snapshots"
  ON public.behavioral_snapshots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_behavioral_snapshots_user_date ON public.behavioral_snapshots (user_id, snapshot_date DESC);
