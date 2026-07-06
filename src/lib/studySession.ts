export type StudySessionMode = "timer" | "pomodoro" | "stopwatch" | "manual" | "focus" | "custom";

export type StudySessionInput = {
  subject_id?: string | null;
  started_at: string;
  ended_at: string;
  duration_seconds?: number;
  duration_minutes?: number;
  mode?: StudySessionMode | string;
  session_type?: string;
  source?: "timer" | "manual" | string;
  client_session_id?: string;
  completed?: boolean;
  quality?: string | null;
  notes?: string | null;
};

export const secondsBetween = (startedAt: string, endedAt: string) => {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 1000));
};

export const minutesFromSeconds = (seconds: number) => Math.max(0, Math.ceil(seconds / 60));

export const createClientSessionId = () => {
  const cryptoId = globalThis.crypto?.randomUUID?.();
  return cryptoId || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const normalizeStudySession = (session: StudySessionInput) => {
  const durationSeconds = Math.max(
    0,
    Math.round(session.duration_seconds ?? secondsBetween(session.started_at, session.ended_at)),
  );
  const mode = session.mode || session.session_type || "timer";
  const rawSessionType = session.session_type || mode;
  const sessionType = ["pomodoro", "custom", "focus"].includes(rawSessionType)
    ? rawSessionType
    : mode === "focus"
    ? "focus"
    : mode === "pomodoro"
    ? "pomodoro"
    : "custom";

  return {
    subject_id: session.subject_id || null,
    started_at: session.started_at,
    ended_at: session.ended_at,
    duration_seconds: durationSeconds,
    duration_minutes: session.duration_minutes ?? minutesFromSeconds(durationSeconds),
    mode,
    session_type: sessionType,
    source: session.source || (mode === "manual" ? "manual" : "timer"),
    client_session_id: session.client_session_id || createClientSessionId(),
    completed: session.completed ?? true,
    quality: session.quality ?? null,
    notes: session.notes ?? null,
  };
};

export const getSessionSeconds = (session: any) => Math.max(0, Number(session?.duration_seconds ?? (session?.duration_minutes || 0) * 60));

export const getSessionMinutes = (session: any) => minutesFromSeconds(getSessionSeconds(session));

export const formatStudyDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  if (minutes > 0) return `${minutes}:${String(secs).padStart(2, "0")}`;
  return `${secs} ثانیه`;
};

export const sumSessionSeconds = (sessions: any[]) => sessions.reduce((sum, session) => sum + getSessionSeconds(session), 0);