import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { dispatchAIContextRefresh } from "@/lib/aiContextDispatcher";
import { generateRoadmap, type PlanBlock } from "@/lib/plannerEngine";
import type { LearningProfile } from "./useLearningProfile";
import type { Exam, ExamTopic } from "./useExams";

export type RoadmapBlock = {
  id: string;
  user_id: string;
  exam_id: string | null;
  topic_id: string | null;
  subject_id: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  block_type: "study" | "review" | "test" | "buffer" | "recovery";
  priority: number;
  status: "planned" | "done" | "skipped" | "moved";
  auto_generated: boolean;
  notes: string | null;
  reason: string | null;
};

export function useRoadmapBlocks(daysAhead = 30) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`roadmap-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "roadmap_blocks", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["roadmap_blocks"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, user]);

  return useQuery({
    queryKey: ["roadmap_blocks", user?.id, daysAhead],
    queryFn: async () => {
      if (!user) return [] as RoadmapBlock[];
      const today = new Date().toISOString().split("T")[0];
      const end = new Date(Date.now() + daysAhead * 86400000).toISOString().split("T")[0];
      const { data, error } = await (supabase as any)
        .from("roadmap_blocks").select("*")
        .eq("user_id", user.id)
        .gte("date", today).lte("date", end)
        .order("date").order("start_time");
      if (error) throw error;
      return (data || []) as RoadmapBlock[];
    },
    enabled: !!user,
  });
}

export function useRegenerateRoadmap() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      exams, topics, profile, daysHorizon = 30,
    }: {
      exams: Exam[]; topics: ExamTopic[]; profile: LearningProfile; daysHorizon?: number;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const result = generateRoadmap({
        exams: exams.map((e) => ({ id: e.id, title: e.title, exam_date: e.exam_date, priority: e.priority, difficulty: e.difficulty, importance: e.importance })),
        topics: topics.map((t) => ({
          id: t.id, exam_id: t.exam_id, subject_id: t.subject_id, title: t.title,
          estimated_minutes: t.estimated_minutes, completed_minutes: t.completed_minutes,
          status: t.status, difficulty: t.difficulty,
          needs_practice_tests: t.needs_practice_tests, revisions_needed: t.revisions_needed,
        })),
        profile,
        daysHorizon,
      });

      // Wipe existing auto-generated future blocks
      const today = new Date().toISOString().split("T")[0];
      await (supabase as any).from("roadmap_blocks").delete()
        .eq("user_id", user.id).eq("auto_generated", true).gte("date", today);

      // Insert in batches of 200
      if (result.blocks.length > 0) {
        const rows = result.blocks.map((b: PlanBlock) => ({ ...b, user_id: user.id }));
        for (let i = 0; i < rows.length; i += 200) {
          const slice = rows.slice(i, i + 200);
          const { error } = await (supabase as any).from("roadmap_blocks").insert(slice);
          if (error) throw error;
        }
      }

      // Audit
      await (supabase as any).from("roadmap_runs").insert({
        user_id: user.id, strategy: "auto", summary: result.summary,
      });

      return result.summary;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap_blocks"] });
      dispatchAIContextRefresh("roadmap_generated");
    },
  });
}

export function useUpdateBlockStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RoadmapBlock["status"] }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any)
        .from("roadmap_blocks").update({ status }).eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap_blocks"] });
      dispatchAIContextRefresh("block_status");
    },
  });
}