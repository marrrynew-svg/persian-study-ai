import type { AnalysisResult, PlanDayV2, PlanBlockV2, StudyStyle, RiskLevel } from "./types";
import { rankSubjects } from "./priorityRanker";
import { dailyCapacityMinutes } from "./capacityCalculator";

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

export interface BuildOpts {
  startDate?: Date;
  horizonDays?: number;
}

/** Builds plan for next N days, distributing remaining minutes per subject by priority. */
export function buildPlan(
  analysis: AnalysisResult,
  style: StudyStyle,
  opts: BuildOpts = {},
): PlanDayV2[] {
  const horizon = Math.min(opts.horizonDays ?? 14, analysis.days_left);
  const start = opts.startDate ?? new Date();
  start.setHours(0, 0, 0, 0);

  // Compute capacity-aware allocation: if risk is red, drop low priority subjects beyond capacity.
  const ranked = rankSubjects(analysis.per_subject, analysis.days_left);
  const remaining: Record<string, number> = {};
  let cumulative = 0;
  const totalCapacity = ranked.reduce((a) => a, 0); // placeholder
  const capacityCap = analysis.total_available_minutes;

  for (const s of ranked) {
    let req = s.required_minutes;
    if (analysis.risk_level === "red" && cumulative + req > capacityCap) {
      req = Math.max(0, capacityCap - cumulative);
    }
    remaining[s.subject_name] = req;
    cumulative += req;
  }

  const focusBlock = Math.max(25, Math.min(90, style.focus_minutes));
  const days: PlanDayV2[] = [];

  for (let i = 0; i < horizon; i++) {
    const date = new Date(start.getTime() + i * 86400000);
    const dow = date.getDay();
    const isWeekend = dow === 5 || dow === 6;
    let cap = dailyCapacityMinutes(style, isWeekend);
    if (analysis.risk_level === "orange" || analysis.risk_level === "red") cap = Math.round(cap * 1.15);

    const blocks: PlanBlockV2[] = [];
    let order = 0;
    // Distribute by priority for this day
    const sortedToday = rankSubjects(
      analysis.per_subject.filter((s) => (remaining[s.subject_name] || 0) > 0),
      analysis.days_left,
    );
    for (const s of sortedToday) {
      if (cap < 20) break;
      const want = Math.min(focusBlock, remaining[s.subject_name], cap);
      if (want < 15) continue;
      const reviewMin = order > 0 && order % 3 === 0 ? Math.round(want * 0.3) : 0;
      const recoveryMin = analysis.risk_level === "red" ? 5 : 0;
      blocks.push({
        subject_name: s.subject_name,
        topic: undefined,
        pages: estimatePagesFromMinutes(want, style),
        tests: Math.round(want / 25),
        study_minutes: want,
        review_minutes: reviewMin,
        recovery_minutes: recoveryMin,
        block_order: order++,
      });
      remaining[s.subject_name] -= want;
      cap -= want + reviewMin + recoveryMin + 10; // 10min break
    }

    days.push({
      date: ymd(date),
      total_planned_minutes: blocks.reduce((a, b) => a + b.study_minutes + b.review_minutes + b.recovery_minutes, 0),
      blocks,
    });
  }

  return days;
}

function estimatePagesFromMinutes(min: number, style: StudyStyle): number {
  const ppm = style.reading_speed === "slow" ? 4 : style.reading_speed === "fast" ? 1.6 : 2.6;
  return Math.max(1, Math.round(min / ppm));
}

export function recommendedActions(risk: RiskLevel): string[] {
  switch (risk) {
    case "green": return ["برنامه طبیعی کافیه — ادامه بده"];
    case "yellow": return ["برنامه فشرده‌تر شد", "تست‌زنی منظم را قطع نکن"];
    case "orange": return ["مباحث کم‌اهمیت‌تر حذف شد", "ساعات روزانه ۱۵٪ بالاتر رفت"];
    case "red": return ["اولویت‌بندی شدید اعمال شد", "برخی مباحث کم‌بازده حذف شد", "زمان جبرانی روزانه اضافه شد"];
  }
}