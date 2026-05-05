ALTER TABLE public.study_sessions
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'timer',
  ADD COLUMN IF NOT EXISTS client_session_id text,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

UPDATE public.study_sessions
SET
  duration_seconds = COALESCE(duration_seconds, GREATEST(COALESCE(duration_minutes, 0) * 60, 0)),
  mode = COALESCE(mode, session_type, 'timer'),
  source = COALESCE(source, 'timer')
WHERE duration_seconds IS NULL OR mode IS NULL OR source IS NULL;

ALTER TABLE public.study_sessions
  ALTER COLUMN duration_seconds SET NOT NULL,
  ALTER COLUMN mode SET DEFAULT 'timer',
  ALTER COLUMN mode SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_sessions_duration_seconds_non_negative'
  ) THEN
    ALTER TABLE public.study_sessions
      ADD CONSTRAINT study_sessions_duration_seconds_non_negative CHECK (duration_seconds >= 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS study_sessions_user_client_session_unique
  ON public.study_sessions (user_id, client_session_id)
  WHERE client_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS study_sessions_user_started_idx
  ON public.study_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS study_sessions_user_ended_idx
  ON public.study_sessions (user_id, ended_at DESC);

CREATE INDEX IF NOT EXISTS study_sessions_user_subject_idx
  ON public.study_sessions (user_id, subject_id);

DROP TRIGGER IF EXISTS update_study_sessions_updated_at ON public.study_sessions;
CREATE TRIGGER update_study_sessions_updated_at
BEFORE UPDATE ON public.study_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.study_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;