import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { CapacityRow, BacklogItem, DailyPlan, BehaviorModel } from "@/lib/planino/types";
import { defaultCapacityGrid } from "@/lib/planino/capacity";
import { collectTasks } from "@/lib/planino/taskCollector";
import { buildWeeklyPlan } from "@/lib/planino/dailyPlanner";
import { computeBehavior } from "@/lib/planino/behaviorModel";
import { distributeBacklog } from "@/lib/planino/replanner";
import { useExams, useExamTopics } from "@/hooks/useExams";
import { useTasks } from "@/hooks/useTasks";
import { useSubjects } from "@/hooks/useSubjects";
import { useStudySessions } from "@/hooks/useStudySessions";
import { toast } from "sonner";

const sb: any = supabase;

export function useCapacity() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const ch = sb
      .channel(`capacity-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_capacity", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["planino_capacity"] }))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [qc, user]);

  return useQuery({
    queryKey: ["planino_capacity", user?.id],
    queryFn: async (): Promise<CapacityRow[]> => {
      if (!user) return [];
      const { data, error } = await sb.from("user_capacity").select("*").eq("user_id", user.id).order("weekday");
      if (error) throw error;
      if (!data?.length) return defaultCapacityGrid();
      return data as CapacityRow[];
    },
    enabled: !!user,
  });
}

export function useSaveCapacity() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: CapacityRow[]) => {
      if (!user) throw new Error("Not authenticated");
      const payload = rows.map((r) => ({ ...r, user_id: user.id }));
      const { error } = await sb.from("user_capacity").upsert(payload, { onConflict: "user_id,weekday" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planino_capacity"] }),
  });
}

export function useBacklog() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["planino_backlog", user?.id],
    queryFn: async (): Promise<BacklogItem[]> => {
      if (!user) return [];
      const { data, error } = await sb.from("backlog_items").select("*")
        .eq("user_id", user.id).eq("status", "pending").order("priority_score", { ascending: false });
      if (error) throw error;
      return (data || []) as BacklogItem[];
    },
    enabled: !!user,
  });
}

export function useDailyPlans(days = 14) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["planino_daily_plans", user?.id, days],
    queryFn: async (): Promise<DailyPlan[]> => {
      if (!user) return [];
      const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const { data, error } = await sb.from("daily_plans").select("*")
        .eq("user_id", user.id).gte("date", from).order("date");
      if (error) throw error;
      return (data || []) as DailyPlan[];
    },
    enabled: !!user,
  });
}

export function useBehavior(): { data: BehaviorModel | null } {
  const { data: sessions = [] } = useStudySessions(60);
  const { data: plans = [] } = useDailyPlans(30);
  return {
    data: computeBehavior(
      sessions.map((s: any) => ({ duration_minutes: s.duration_minutes, started_at: s.started_at })),
      plans,
    ),
  };
}

/** Generate a 7-day plan and persist as roadmap_blocks + daily_plans + backlog overflow. */
export function useGeneratePlan() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: exams = [] } = useExams();
  const { data: topics = [] } = useExamTopics();
  const { data: tasks = [] } = useTasks();
  const { data: subjects = [] } = useSubjects();
  const { data: capacity = [] } = useCapacity();
  const { data: backlog = [] } = useBacklog();
  const { data: behavior } = useBehavior();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const collected = collectTasks({
        exams: exams as any, topics: topics as any,
        tasks: tasks.map((t: any) => ({
          id: t.id, subject_id: t.subject_id, title: t.title,
          due_date: t.due_date, completed: t.completed,
        })),
        subjects: subjects as any, backlog,
        historyByWeekday: behavior?.weekday_strength,
      });

      const start = new Date(); start.setHours(0, 0, 0, 0);
      const week = buildWeeklyPlan(start, collected, capacity, behavior, 7);

      // Wipe future auto-generated blocks for the window
      const endStr = new Date(start.getTime() + 6 * 86400000).toISOString().slice(0, 10);
      await sb.from("roadmap_blocks").delete()
        .eq("user_id", user.id).eq("auto_generated", true)
        .gte("date", start.toISOString().slice(0, 10)).lte("date", endStr);

      // Insert blocks
      const allBlocks = week.flatMap((d) => d.blocks).map((b) => ({ ...b, user_id: user.id }));
      if (allBlocks.length) {
        const { error } = await sb.from("roadmap_blocks").insert(allBlocks);
        if (error) throw error;
      }

      // Upsert daily_plans
      const plansPayload = week.map((d) => ({
        user_id: user.id, date: d.date,
        total_planned_minutes: d.blocks.reduce((a, b) => a + b.duration_minutes, 0),
        total_done_minutes: 0, status: "pending",
      }));
      await sb.from("daily_plans").upsert(plansPayload, { onConflict: "user_id,date" });

      // Overflow → backlog, distributed across next days
      const overflow = week.flatMap((d) => d.overflow);
      if (overflow.length) {
        const distributed = distributeBacklog(overflow, start, 60, 5).flatMap((bucket) =>
          bucket.items.map((it) => ({ ...it, user_id: user.id, source_date: bucket.date })),
        );
        if (distributed.length) {
          await sb.from("backlog_items").insert(distributed);
        }
      }

      return { blocks: allBlocks.length, overflow: overflow.length };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["roadmap_blocks"] });
      qc.invalidateQueries({ queryKey: ["planino_daily_plans"] });
      qc.invalidateQueries({ queryKey: ["planino_backlog"] });
      toast.success(`${r.blocks} بلوک ساخته شد` + (r.overflow ? ` · ${r.overflow} مورد به backlog منتقل شد` : ""));
    },
    onError: (e: any) => toast.error(e?.message || "خطا در ساخت برنامه"),
  });
}