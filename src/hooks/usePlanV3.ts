import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { runAnalysis } from "@/lib/planino/v2/pressureModel";
import { buildFullPlan } from "@/lib/planino/v3/planEngine";
import { toast } from "sonner";

const sb: any = supabase;
const ymd = (d: Date) => d.toISOString().slice(0, 10);

function isPastExam(date?: string | null) {
  return !!date && date < ymd(new Date());
}

/** Persist a full v3 plan (daily + weekly + monthly). Wipes future rows only. */
async function persistFullPlan(userId: string, examId: string, plan: ReturnType<typeof buildFullPlan>) {
  const today = ymd(new Date());

  // Wipe future daily (blocks cascade via delete-per-day, we do manual)
  const { data: futureDays, error: readFutureErr } = await sb
    .from("plan_daily_v2")
    .select("id")
    .eq("user_id", userId)
    .gte("date", today);
  if (readFutureErr) throw readFutureErr;
  const futureIds = (futureDays || []).map((d: any) => d.id);
  if (futureIds.length) {
    const { error: blockDeleteErr } = await sb.from("plan_block_v2").delete().in("daily_id", futureIds);
    if (blockDeleteErr) throw blockDeleteErr;
    const { error: dayDeleteErr } = await sb.from("plan_daily_v2").delete().in("id", futureIds);
    if (dayDeleteErr) throw dayDeleteErr;
  }
  const { error: weeklyDeleteErr } = await sb.from("plan_weekly_v2").delete().eq("user_id", userId).gte("week_end", today);
  if (weeklyDeleteErr) throw weeklyDeleteErr;
  const { error: monthlyDeleteErr } = await sb.from("plan_monthly_v2").delete().eq("user_id", userId);
  if (monthlyDeleteErr) throw monthlyDeleteErr;

  // Insert daily + blocks
  for (const d of plan.daily) {
    const { data: dayRow, error: dayErr } = await sb
      .from("plan_daily_v2")
      .upsert({
        user_id: userId,
        exam_setup_id: examId,
        date: d.date,
        total_planned_minutes: d.total_planned_minutes,
        total_done_minutes: 0,
        status: "pending",
        phase: d.phase,
        heat_score: d.heat_score,
        is_simulation_day: d.is_simulation_day,
        is_recovery_day: d.is_recovery_day,
        day_goal: d.day_goal,
      }, { onConflict: "user_id,date" })
      .select()
      .single();
    if (dayErr) throw dayErr;
    const { error: oldBlocksErr } = await sb.from("plan_block_v2").delete().eq("daily_id", dayRow.id);
    if (oldBlocksErr) throw oldBlocksErr;
    if (d.blocks.length) {
      const { error: bErr } = await sb.from("plan_block_v2").insert(
        d.blocks.map((b) => ({
          user_id: userId,
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
          block_type: b.block_type,
          suggested_start_time: b.suggested_start_time || null,
          suggested_end_time: b.suggested_end_time || null,
          is_locked: !!b.is_locked,
          rationale: b.rationale || null,
        })),
      );
      if (bErr) throw bErr;
    }
  }

  // Weekly
  if (plan.weekly.length) {
    const { error: weeklyErr } = await sb.from("plan_weekly_v2").insert(
      plan.weekly.map((w) => ({
        user_id: userId,
        exam_setup_id: examId,
        week_start: w.week_start,
        week_end: w.week_end,
        week_index: w.week_index,
        phase: w.phase,
        weekly_goal: w.weekly_goal,
        target_minutes: w.target_minutes,
        coverage: w.coverage,
        milestones: w.milestones,
        rationale: w.rationale,
      })),
    );
    if (weeklyErr) throw weeklyErr;
  }

  // Monthly
  const { error: monthlyErr } = await sb.from("plan_monthly_v2").insert({
    user_id: userId,
    exam_setup_id: examId,
    month_start: plan.monthly.month_start,
    month_end: plan.monthly.month_end,
    total_days: plan.monthly.total_days,
    phases: plan.monthly.phases,
    weekly_milestones: plan.monthly.weekly_milestones,
    heatmap: plan.monthly.heatmap,
    readiness_forecast: plan.monthly.readiness_forecast,
    predicted_readiness_percent: plan.monthly.predicted_readiness_percent,
    rationale: plan.monthly.rationale,
  });
  if (monthlyErr) throw monthlyErr;
}

export function useBuildPlanV3() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opts: { horizonDays?: number } = {}) => {
      if (!user) throw new Error("no auth");
      const { data: exam } = await sb
        .from("plan_exam_setup")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!exam) {
        const err: any = new Error("هنوز آزمونی ثبت نکردی — بریم مشاور هوشمند");
        err.code = "NO_EXAM";
        throw err;
      }
      if (isPastExam(exam.exam_date)) {
        const err: any = new Error("تاریخ آزمون قبلی گذشته؛ اول تاریخ هدف جدید رو در مشاور هوشمند ثبت کن");
        err.code = "EXAM_EXPIRED";
        throw err;
      }
      const [{ data: subs }, { data: style }, { data: wiz }] = await Promise.all([
        sb.from("plan_subject_inputs").select("*").eq("user_id", user.id).eq("exam_setup_id", exam.id),
        sb.from("plan_study_style").select("*").eq("user_id", user.id).maybeSingle(),
        sb.from("plan_wizard_state").select("answers").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!subs?.length || !style) {
        const err: any = new Error(
          !subs?.length
            ? "دروسی برای این آزمون ثبت نشده — بریم مشاور هوشمند"
            : "سبک مطالعه‌ات ثبت نشده — بریم مشاور هوشمند",
        );
        err.code = "INCOMPLETE_WIZARD";
        throw err;
      }
      const analysis = runAnalysis(
        { id: exam.id, exam_name: exam.exam_name, exam_type: exam.exam_type, exam_date: exam.exam_date, exam_time: exam.exam_time },
        subs as any,
        style as any,
      );
      const ext = (wiz?.answers as any)?.styleExt || undefined;
      const plan = buildFullPlan(analysis, style as any, { horizonDays: opts.horizonDays ?? 30, ext });
      await persistFullPlan(user.id, exam.id, plan);
      await sb.from("plan_analysis").insert({
        user_id: user.id, exam_setup_id: exam.id,
        total_required_minutes: analysis.total_required_minutes,
        total_available_minutes: analysis.total_available_minutes,
        days_left: analysis.days_left, pressure_score: analysis.pressure_score,
        risk_level: analysis.risk_level, reasoning: analysis as any,
      });
      return { plan, analysis };
    },
    onSuccess: (r) => {
      qc.invalidateQueries();
      toast.success(`برنامه ${r.plan.daily.length} روزه ساخته شد`);
    },
    onError: (e: any) => toast.error(e?.message || "خطا در ساخت برنامه"),
  });
}

export function useDailyV3(date?: string) {
  const { user } = useAuth();
  const d = date ?? ymd(new Date());
  return useQuery({
    queryKey: ["plan_daily_v3", user?.id, d],
    enabled: !!user,
    queryFn: async () => {
      const { data: day } = await sb
        .from("plan_daily_v2")
        .select("*")
        .eq("user_id", user!.id)
        .eq("date", d)
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

export function useWeeklyV3() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plan_weekly_v3", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = ymd(new Date());
      const [{ data: weeks }, { data: days }] = await Promise.all([
        sb.from("plan_weekly_v2").select("*").eq("user_id", user!.id).gte("week_end", today).order("week_start"),
        sb.from("plan_daily_v2").select("*, plan_block_v2(*)").eq("user_id", user!.id)
          .gte("date", today).lte("date", ymd(new Date(Date.now() + 30 * 86400000))).order("date"),
      ]);
      return { weeks: weeks || [], days: days || [] };
    },
  });
}

export function useMonthlyV3() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plan_monthly_v3", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await sb
        .from("plan_monthly_v2")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data || null;
    },
  });
}

export function useApplyPlanChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { blockId: string; patch: Record<string, any> }) => {
      const { error } = await sb.from("plan_block_v2").update(input.patch).eq("id", input.blockId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan_daily_v3"] });
      qc.invalidateQueries({ queryKey: ["plan_weekly_v3"] });
      toast.success("تغییر اعمال شد");
    },
    onError: (e: any) => toast.error(e?.message || "خطا"),
  });
}