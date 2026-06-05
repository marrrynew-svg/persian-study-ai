import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { dispatchAIContextRefresh } from "@/lib/aiContextDispatcher";

export type Exam = {
  id: string;
  user_id: string;
  title: string;
  exam_type: "test" | "descriptive" | "mixed";
  exam_date: string;
  priority: number;
  difficulty: number;
  target_score: number | null;
  importance: number;
  status: "upcoming" | "active" | "done";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ExamTopic = {
  id: string;
  exam_id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  total_pages: number;
  total_video_minutes: number;
  difficulty: number;
  revisions_needed: number;
  needs_practice_tests: boolean;
  estimated_minutes: number;
  completed_minutes: number;
  status: "pending" | "in_progress" | "done";
  order_index: number;
};

export function useExams() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`exams-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "exams", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["exams"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_topics", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["exam_topics"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, user]);

  return useQuery({
    queryKey: ["exams", user?.id],
    queryFn: async () => {
      if (!user) return [] as Exam[];
      const { data, error } = await (supabase as any)
        .from("exams").select("*").eq("user_id", user.id).order("exam_date");
      if (error) throw error;
      return (data || []) as Exam[];
    },
    enabled: !!user,
  });
}

export function useExamTopics(examId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["exam_topics", user?.id, examId || "all"],
    queryFn: async () => {
      if (!user) return [] as ExamTopic[];
      let q = (supabase as any).from("exam_topics").select("*").eq("user_id", user.id).order("order_index");
      if (examId) q = q.eq("exam_id", examId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ExamTopic[];
    },
    enabled: !!user,
  });
}

export function useUpsertExam() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (exam: Partial<Exam> & { id?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const payload: any = { ...exam, user_id: user.id };
      const { data, error } = await (supabase as any).from("exams").upsert(payload).select().single();
      if (error) throw error;
      return data as Exam;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams"] });
      dispatchAIContextRefresh("exam_updated");
    },
  });
}

export function useDeleteExam() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).from("exams").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams"] });
      qc.invalidateQueries({ queryKey: ["exam_topics"] });
      dispatchAIContextRefresh("exam_deleted");
    },
  });
}

export function useUpsertTopics() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (topics: (Partial<ExamTopic> & { exam_id: string })[]) => {
      if (!user) throw new Error("Not authenticated");
      const payload = topics.map((t) => ({ ...t, user_id: user.id }));
      const { data, error } = await (supabase as any).from("exam_topics").upsert(payload).select();
      if (error) throw error;
      return data as ExamTopic[];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exam_topics"] });
      dispatchAIContextRefresh("topics_updated");
    },
  });
}

export function useDeleteTopic() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).from("exam_topics").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exam_topics"] }),
  });
}

export function useUpdateTopicProgress() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed_minutes, status }: { id: string; completed_minutes?: number; status?: ExamTopic["status"] }) => {
      if (!user) throw new Error("Not authenticated");
      const patch: any = {};
      if (completed_minutes !== undefined) patch.completed_minutes = completed_minutes;
      if (status) patch.status = status;
      const { error } = await (supabase as any).from("exam_topics").update(patch).eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exam_topics"] });
      dispatchAIContextRefresh("topic_progress");
    },
  });
}