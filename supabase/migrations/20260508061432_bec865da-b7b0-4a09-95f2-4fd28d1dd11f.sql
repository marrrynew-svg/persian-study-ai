
ALTER TABLE public.study_sessions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS quality TEXT;

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_deleted
  ON public.study_sessions(user_id, deleted_at);

CREATE TABLE IF NOT EXISTS public.session_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID,
  action TEXT NOT NULL CHECK (action IN ('create','edit','delete','restore','hard_delete')),
  changed_fields JSONB DEFAULT '[]'::jsonb,
  before JSONB DEFAULT '{}'::jsonb,
  after JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_edits_user_created
  ON public.session_edits(user_id, created_at DESC);

ALTER TABLE public.session_edits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own session edits" ON public.session_edits;
CREATE POLICY "Users manage own session edits"
  ON public.session_edits
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
