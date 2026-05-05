import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { enqueueStudySession, getQueuedStudySessions, markQueuedStudySessionFailed, removeQueuedStudySession } from "@/lib/sessionQueue";
import { normalizeStudySession, type StudySessionInput } from "@/lib/studySession";

async function syncQueuedStudySessions(userId: string) {
  const queued = await getQueuedStudySessions(userId);
  for (const session of queued) {
    const { retry_count, queued_at, last_error, ...payload } = session;
    const { error } = await supabase.from("study_sessions").insert(payload);
    if (error) {
      if (error.code === "23505") {
        await removeQueuedStudySession(session.client_session_id);
        continue;
      }
      await markQueuedStudySessionFailed(session, error);
      throw error;
    }
    await removeQueuedStudySession(session.client_session_id);
  }
}

export function useStudySessions(days = 7) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      qc.invalidateQueries({ queryKey: ["study_sessions"] });
      qc.invalidateQueries({ queryKey: ["user_xp"] });
    };
    const channel = supabase
      .channel(`study-sessions-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "study_sessions", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    window.addEventListener("online", refresh);
    syncQueuedStudySessions(user.id).then(refresh).catch((error) => console.warn("study session sync failed", error));
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("online", refresh);
    };
  }, [qc, user]);

  return useQuery({
    queryKey: ["study_sessions", user?.id, days],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*, subjects(name, icon, color)")
        .eq("user_id", user.id)
        .gte("started_at", since.toISOString())
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSaveSession() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (session: StudySessionInput) => {
      if (!user) throw new Error("Not authenticated");
      const normalized = normalizeStudySession(session);
      if (!normalized.started_at || !normalized.ended_at || normalized.duration_seconds < 0) {
        throw new Error("Invalid study session");
      }
      await enqueueStudySession(user.id, normalized);
      const payload = { ...normalized, user_id: user.id };
      const { data, error } = await supabase
        .from("study_sessions")
        .insert(payload)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") {
          await removeQueuedStudySession(normalized.client_session_id);
          const { data: existing, error: readError } = await supabase
            .from("study_sessions")
            .select("*, subjects(name, icon, color)")
            .eq("user_id", user.id)
            .eq("client_session_id", normalized.client_session_id)
            .maybeSingle();
          if (readError) throw readError;
          return existing;
        }
        await markQueuedStudySessionFailed({ ...payload, retry_count: 0, queued_at: new Date().toISOString() }, error);
        return { ...payload, id: normalized.client_session_id, subjects: null, __queued: true };
      }
      await removeQueuedStudySession(normalized.client_session_id);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study_sessions"] });
      qc.invalidateQueries({ queryKey: ["user_xp"] });
      qc.invalidateQueries({ queryKey: ["weekly_challenges"] });
    },
  });
}

export function useStudySessionQueueSync() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const run = () => syncQueuedStudySessions(user.id)
      .then(() => qc.invalidateQueries({ queryKey: ["study_sessions"] }))
      .catch((error) => console.warn("queued session retry failed", error));
    run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, [qc, user]);
}
