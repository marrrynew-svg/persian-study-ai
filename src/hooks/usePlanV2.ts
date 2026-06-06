import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ExamSetup, SubjectInput, StudyStyle, AnalysisResult } from "@/lib/planino/v2/types";
import { runAnalysis } from "@/lib/planino/v2/pressureModel";
import { buildPlan } from "@/lib/planino/v2/planBuilder";
import { toast } from "sonner";

const sb: any = supabase;

/* ---------------- Wizard state ---------------- */
export function useWizardState() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plan_wizard_state", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await sb.from("plan_wizard_state").select("*").eq("user_id", user!.id).maybeSingle();
      return data || null;
    },
  });
}

export function useSaveWizardState() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { current_step: number; answers: any; completed?: boolean }) => {
      if (!user) throw new Error("no auth");
      const { error } = await sb.from("plan_wizard_state").upsert(
        { user_id: user.id, ...payload },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan_wizard_state"] }),
  });
}

/* ---------------- Active exam ---------------- */
export function useActiveExamSetup() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plan_exam_setup_active", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await sb
        .from("plan_exam_setup")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data || null;
    },
  });
}

export function useSubjectInputs(examId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plan_subject_inputs", user?.id, examId],
    enabled: !!user && !!examId,
    queryFn: async () => {
      const { data } = await sb.from("plan_subject_inputs").select("*")
        .eq("user_id", user!.id).eq("exam_setup_id", examId!).order("order_index");
      return data || [];
    },
  });
}

export function useStudyStyle() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plan_study_style", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await sb.from("plan_study_style").select("*").eq("user_id", user!.id).maybeSingle();
      return data || null;
    },
  });
}

/* ---------------- Save full wizard ---------------- */
export function useFinalizeWizard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { exam: ExamSetup; subjects: SubjectInput[]; style: StudyStyle }) => {
      if (!user) throw new Error("no auth");
      // Deactivate previous
      await sb.from("plan_exam_setup").update({ is_active: false }).eq("user_id", user.id);
      const { data: examRow, error: examErr } = await sb
        .from("plan_exam_setup")
        .insert({
          user_id: user.id,
          exam_name: input.exam.exam_name,
          exam_type: input.exam.exam_type,
          exam_date: input.exam.exam_date,
          exam_time: input.exam.exam_time || null,
          is_active: true,
        })
        .select()
        .single();
      if (examErr) throw examErr;

      // Subjects
      const subsPayload = input.subjects.map((s, idx) => ({
        user_id: user.id,
        exam_setup_id: examRow.id,
        subject_name: s.subject_name,
        chapters_total: s.chapters_total,
        pages_left: s.pages_left,
        tests_left: s.tests_left,
        notes_left: s.notes_left,
        video_minutes_left: s.video_minutes_left,
        current_level: s.current_level,
        importance: s.importance,
        coefficient: s.coefficient,
        target_percent: s.target_percent,
        order_index: idx,
      }));
      if (subsPayload.length) {
        const { error } = await sb.from("plan_subject_inputs").insert(subsPayload);
        if (error) throw error;
      }

      // Style
      await sb.from("plan_study_style").upsert(
        { user_id: user.id, ...input.style },
        { onConflict: "user_id" },
      );

      // Analyze
      const analysis = runAnalysis(
        { ...input.exam, id: examRow.id },
        input.subjects,
        input.style,
      );
      await sb.from("plan_analysis").insert({
        user_id: user.id,
        exam_setup_id: examRow.id,
        total_required_minutes: analysis.total_required_minutes,
        total_available_minutes: analysis.total_available_minutes,
        days_left: analysis.days_left,
        pressure_score: analysis.pressure_score,
        risk_level: analysis.risk_level,
        reasoning: analysis as any,
      });

      // Build plan for next 14 days and persist
      const days = buildPlan(analysis, input.style, { horizonDays: 14 });
      // Wipe future plans for this exam
      const todayStr = new Date().toISOString().slice(0, 10);
      await sb.from("plan_daily_v2").delete().eq("user_id", user.id).gte("date", todayStr);

      for (const d of days) {
        const { data: dayRow, error: dayErr } = await sb
          .from("plan_daily_v2")
          .insert({
            user_id: user.id,
            exam_setup_id: examRow.id,
            date: d.date,
            total_planned_minutes: d.total_planned_minutes,
            total_done_minutes: 0,
            status: "pending",
          })
          .select()
          .single();
        if (dayErr) throw dayErr;
        if (d.blocks.length) {
          await sb.from("plan_block_v2").insert(
            d.blocks.map((b) => ({
              user_id: user.id,
              daily_id: dayRow.id,
              subject_name: b.subject_name,
              topic: b.topic || null,
              pages: b.pages,
              tests: b.tests,
              study_minutes: b.study_minutes,
              review_minutes: b.review_minutes,
              recovery_minutes: b.recovery_minutes,
              block_order: b.block_order,
              status: "pending",
            })),
          );
        }
      }

      await sb.from("plan_wizard_state").upsert(
        { user_id: user.id, completed: true, current_step: 99, answers: {} },
        { onConflict: "user_id" },
      );

      return { analysis, days: days.length };
    },
    onSuccess: (r) => {
      qc.invalidateQueries();
      toast.success(`برنامه ساخته شد · ${r.days} روز`);
    },
    onError: (e: any) => toast.error(e?.message || "خطا در ساخت برنامه"),
  });
}

/* ---------------- Today / Week ---------------- */
export function useTodaySmartPlan() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plan_today_v2", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: day } = await sb
        .from("plan_daily_v2")
        .select("*")
        .eq("user_id", user!.id)
        .eq("date", today)
        .maybeSingle();
      if (!day) return { day: null, blocks: [] as any[] };
      const { data: blocks } = await sb
        .from("plan_block_v2")
        .select("*")
        .eq("daily_id", day.id)
        .order("block_order");
      return { day, blocks: blocks || [] };
    },
    refetchInterval: 60000,
  });
}

export function useWeekSmartPlan() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plan_week_v2", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const end = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const { data: days } = await sb
        .from("plan_daily_v2")
        .select("*, plan_block_v2(*)")
        .eq("user_id", user!.id)
        .gte("date", today)
        .lte("date", end)
        .order("date");
      return days || [];
    },
  });
}

export function useLatestAnalysis() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plan_analysis_latest", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await sb
        .from("plan_analysis")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data || null;
    },
  });
}

/* ---------------- Block actions ---------------- */
export function useUpdateBlockStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { blockId: string; status: "pending" | "done" | "skipped" | "postponed"; doneMinutes?: number }) => {
      const patch: any = { status: input.status };
      if (typeof input.doneMinutes === "number") patch.done_minutes = input.doneMinutes;
      const { error } = await sb.from("plan_block_v2").update(patch).eq("id", input.blockId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan_today_v2"] });
      qc.invalidateQueries({ queryKey: ["plan_week_v2"] });
    },
  });
}

/* ---------------- Replan (client-side) ---------------- */
export function useReplan() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("no auth");
      const { data: exam } = await sb
        .from("plan_exam_setup")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!exam) throw new Error("هیچ آزمون فعالی نیست");
      const [{ data: subs }, { data: style }] = await Promise.all([
        sb.from("plan_subject_inputs").select("*").eq("user_id", user.id).eq("exam_setup_id", exam.id),
        sb.from("plan_study_style").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!subs?.length || !style) throw new Error("اطلاعات ناقص است");
      const analysis = runAnalysis(
        { id: exam.id, exam_name: exam.exam_name, exam_type: exam.exam_type, exam_date: exam.exam_date, exam_time: exam.exam_time },
        subs as any,
        style as any,
      );
      const days = buildPlan(analysis, style as any, { horizonDays: 14 });
      const todayStr = new Date().toISOString().slice(0, 10);
      await sb.from("plan_daily_v2").delete().eq("user_id", user.id).gte("date", todayStr);
      for (const d of days) {
        const { data: dayRow } = await sb.from("plan_daily_v2").insert({
          user_id: user.id, exam_setup_id: exam.id, date: d.date,
          total_planned_minutes: d.total_planned_minutes, status: "pending",
        }).select().single();
        if (d.blocks.length) {
          await sb.from("plan_block_v2").insert(d.blocks.map((b) => ({
            user_id: user.id, daily_id: dayRow.id, subject_name: b.subject_name,
            topic: b.topic || null, pages: b.pages, tests: b.tests,
            study_minutes: b.study_minutes, review_minutes: b.review_minutes,
            recovery_minutes: b.recovery_minutes, block_order: b.block_order, status: "pending",
          })));
        }
      }
      await sb.from("plan_analysis").insert({
        user_id: user.id, exam_setup_id: exam.id,
        total_required_minutes: analysis.total_required_minutes,
        total_available_minutes: analysis.total_available_minutes,
        days_left: analysis.days_left, pressure_score: analysis.pressure_score,
        risk_level: analysis.risk_level, reasoning: analysis as any,
      });
      return analysis;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("برنامه بازسازی شد");
    },
    onError: (e: any) => toast.error(e?.message || "خطا"),
  });
}