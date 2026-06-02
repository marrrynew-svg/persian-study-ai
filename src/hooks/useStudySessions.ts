import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { enqueueStudySession, getQueuedStudySessions, markQueuedStudySessionFailed, removeQueuedStudySession } from "@/lib/sessionQueue";
import { normalizeStudySession, type StudySessionInput } from "@/lib/studySession";
import { dispatchAIContextRefresh } from "@/lib/aiContextDispatcher";
import { applySessionEffect } from "./useRoadmapNodes";
import { toast } from "sonner";

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
        .is("deleted_at", null)
        .gte("started_at", since.toISOString())
        .order("started_at", { ascending: false });
      const queued = await getQueuedStudySessions(user.id).catch(() => []);
      const queuedRows = queued
        .filter((session) => new Date(session.started_at) >= since)
        .map((session) => ({ ...session, id: session.client_session_id, subjects: null, __queued: true }));
      if (error) {
        if (queuedRows.length > 0) return queuedRows;
        throw error;
      }
      const syncedIds = new Set((data || []).map((session: any) => session.client_session_id));
      return [...queuedRows.filter((session) => !syncedIds.has(session.client_session_id)), ...(data || [])];
    },
    enabled: !!user,
  });
}

export function useDeletedSessions(days = 30) {
  const { user } = useAuth();
  const since = new Date();
  since.setDate(since.getDate() - days);
  return useQuery({
    queryKey: ["study_sessions_deleted", user?.id, days],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*, subjects(name, icon, color)")
        .eq("user_id", user.id)
        .not("deleted_at", "is", null)
        .gte("started_at", since.toISOString())
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

async function logSessionEdit(userId: string, payload: {
  session_id: string | null;
  action: "create" | "edit" | "delete" | "restore" | "hard_delete";
  changed_fields?: string[];
  before?: any;
  after?: any;
}) {
  try {
    await supabase.from("session_edits").insert({
      user_id: userId,
      session_id: payload.session_id,
      action: payload.action,
      changed_fields: payload.changed_fields || [],
      before: payload.before || {},
      after: payload.after || {},
    });
  } catch (e) {
    console.warn("session_edits log failed", e);
  }
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
      await enqueueStudySession(user.id, normalized).catch((error) => console.warn("local session queue failed", error));
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
        await markQueuedStudySessionFailed({ ...payload, retry_count: 0, queued_at: new Date().toISOString() }, error).catch(() => {});
        return { ...payload, id: normalized.client_session_id, subjects: null, __queued: true };
      }
      await removeQueuedStudySession(normalized.client_session_id);
      // Apply effect to roadmap nodes (best-effort, non-blocking failure)
      try {
        if (data && data.duration_minutes > 0) {
          const effect = await applySessionEffect(user.id, {
            id: data.id,
            subject_id: data.subject_id,
            duration_minutes: data.duration_minutes,
            started_at: data.started_at,
            notes: data.notes,
          });
          if (effect.completedNodeIds.length > 0) {
            toast.success(`🎉 ${effect.completedNodeIds.length} نود کامل شد! +${effect.xpAwarded} XP`);
          } else if (effect.unlockedNodeIds.length > 0) {
            toast.message(`✨ ${effect.unlockedNodeIds.length} نود جدید باز شد`);
          }
        }
      } catch (e) {
        console.warn("[roadmap] applySessionEffect failed", e);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study_sessions"] });
      qc.invalidateQueries({ queryKey: ["user_xp"] });
      qc.invalidateQueries({ queryKey: ["weekly_challenges"] });
      qc.invalidateQueries({ queryKey: ["roadmap_nodes"] });
      dispatchAIContextRefresh("session_saved");
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

export function useUpdateSession() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch, before }: { id: string; patch: Record<string, any>; before?: any }) => {
      if (!user) throw new Error("Not authenticated");
      const next: any = { ...patch, edited_at: new Date().toISOString() };
      if (patch.started_at && patch.ended_at) {
        const sec = Math.max(0, Math.round((new Date(patch.ended_at).getTime() - new Date(patch.started_at).getTime()) / 1000));
        next.duration_seconds = sec;
        next.duration_minutes = Math.ceil(sec / 60);
      } else if (typeof patch.duration_minutes === "number") {
        next.duration_seconds = patch.duration_minutes * 60;
      }
      const { data, error } = await supabase
        .from("study_sessions")
        .update(next)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("*, subjects(name, icon, color)")
        .single();
      if (error) throw error;
      await logSessionEdit(user.id, {
        session_id: id,
        action: "edit",
        changed_fields: Object.keys(patch),
        before: before || {},
        after: next,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study_sessions"] });
      qc.invalidateQueries({ queryKey: ["user_xp"] });
      dispatchAIContextRefresh("session_edited");
    },
  });
}

export function useDeleteSession() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, before }: { id: string; before?: any }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("study_sessions")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      await logSessionEdit(user.id, { session_id: id, action: "delete", before: before || {} });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study_sessions"] });
      qc.invalidateQueries({ queryKey: ["study_sessions_deleted"] });
      qc.invalidateQueries({ queryKey: ["user_xp"] });
      dispatchAIContextRefresh("session_deleted");
    },
  });
}

export function useRestoreSession() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("study_sessions")
        .update({ deleted_at: null })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      await logSessionEdit(user.id, { session_id: id, action: "restore" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study_sessions"] });
      qc.invalidateQueries({ queryKey: ["study_sessions_deleted"] });
      dispatchAIContextRefresh("session_restored");
    },
  });
}

export function useDuplicateSession() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (session: any) => {
      if (!user) throw new Error("Not authenticated");
      const now = new Date();
      const seconds = session.duration_seconds || (session.duration_minutes || 0) * 60;
      const ended = new Date(now.getTime());
      const started = new Date(now.getTime() - seconds * 1000);
      const payload: any = {
        user_id: user.id,
        subject_id: session.subject_id || null,
        started_at: started.toISOString(),
        ended_at: ended.toISOString(),
        duration_seconds: seconds,
        duration_minutes: Math.ceil(seconds / 60),
        mode: session.mode || "manual",
        source: "manual",
        session_type: session.session_type || "manual",
        quality: session.quality || null,
        notes: session.notes || null,
        completed: true,
        client_session_id: `dup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };
      const { data, error } = await supabase.from("study_sessions").insert(payload).select().single();
      if (error) throw error;
      await logSessionEdit(user.id, { session_id: data.id, action: "create", after: payload });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study_sessions"] });
      qc.invalidateQueries({ queryKey: ["user_xp"] });
      dispatchAIContextRefresh("session_duplicated");
    },
  });
}
