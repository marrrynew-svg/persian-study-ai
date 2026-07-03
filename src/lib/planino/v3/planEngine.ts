import type { AnalysisResult, StudyStyle } from "../v2/types";
import { rankSubjects } from "../v2/priorityRanker";
import { dailyCapacityMinutes } from "../v2/capacityCalculator";
import { buildDaySlots, allocateBlock } from "./timeSlotEngine";
import { SR_INTERVALS } from "./spacedRepetition";
import type {
  BlockType,
  DailyPlanV3,
  FullPlanV3,
  MonthlyPlanV3,
  Phase,
  SmartBlock,
  WeeklyPlanV3,
} from "./types";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

function phaseForDayIndex(idx: number, total: number): Phase {
  const p = idx / Math.max(1, total);
  if (p < 0.5) return "foundation";
  if (p < 0.8) return "mastery";
  return "simulation";
}

function goalForPhase(phase: Phase): string {
  return phase === "foundation"
    ? "پوشش مباحث پایه و ساخت زیرساخت"
    : phase === "mastery"
    ? "تسلط عمیق + تست‌های تشریحی"
    : "شبیه‌سازی آزمون و مرور نهایی";
}

function pagesFromMinutes(min: number, style: StudyStyle): number {
  const ppm = style.reading_speed === "slow" ? 4 : style.reading_speed === "fast" ? 1.6 : 2.6;
  return Math.max(1, Math.round(min / ppm));
}

export interface BuildOptsV3 {
  horizonDays?: number;
  startDate?: Date;
}

export function buildFullPlan(
  analysis: AnalysisResult,
  style: StudyStyle,
  opts: BuildOptsV3 = {},
): FullPlanV3 {
  const horizon = Math.min(opts.horizonDays ?? 30, analysis.days_left);
  const start = opts.startDate ?? new Date();
  start.setHours(0, 0, 0, 0);

  // Track remaining minutes per subject
  const ranked = rankSubjects(analysis.per_subject, analysis.days_left);
  const remaining: Record<string, number> = {};
  let cumulative = 0;
  const cap = analysis.total_available_minutes;
  for (const s of ranked) {
    let req = s.required_minutes;
    if (analysis.risk_level === "red" && cumulative + req > cap) {
      req = Math.max(0, cap - cumulative);
    }
    remaining[s.subject_name] = req;
    cumulative += req;
  }

  const focus = Math.max(25, Math.min(90, style.focus_minutes || 60));
  const daily: DailyPlanV3[] = [];
  // scheduled reviews: date → [{subject}]
  const reviews: Record<string, { subject_name: string; subject_input_id?: string; offset: number }[]> = {};

  for (let i = 0; i < horizon; i++) {
    const date = new Date(start.getTime() + i * 86400000);
    const dateStr = ymd(date);
    const dow = date.getDay();
    const isWeekend = dow === 5 || dow === 6;
    const phase: Phase = phaseForDayIndex(i, horizon);

    // Weekly rhythm: every 7th day = simulation, day 4 = light recovery
    const dayInWeek = i % 7;
    const is_simulation_day = phase !== "foundation" && dayInWeek === 6;
    const is_recovery_day = dayInWeek === 3 && analysis.risk_level !== "red";

    let capMin = dailyCapacityMinutes(style, isWeekend);
    if (analysis.risk_level === "orange" || analysis.risk_level === "red") capMin = Math.round(capMin * 1.15);
    if (is_recovery_day) capMin = Math.round(capMin * 0.6);

    const slots = buildDaySlots(style, isWeekend);
    const blocks: SmartBlock[] = [];
    let order = 0;

    // 1) Deep focus block first — morning
    if (!is_recovery_day && capMin >= focus) {
      const topSub = rankSubjects(
        analysis.per_subject.filter((s) => (remaining[s.subject_name] || 0) > 0),
        analysis.days_left,
      )[0];
      if (topSub) {
        const alloc = allocateBlock(slots, focus);
        const block: SmartBlock = {
          subject_input_id: topSub.subject_input_id,
          subject_name: topSub.subject_name,
          block_type: "deep_focus",
          study_minutes: focus,
          review_minutes: 0,
          recovery_minutes: 0,
          pages: pagesFromMinutes(focus, style),
          tests: 0,
          block_order: order++,
          suggested_start_time: alloc?.start,
          suggested_end_time: alloc?.end,
          rationale: `${topSub.subject_name} بالاترین اولویت روزانه — تمرکز عمیق صبحگاهی`,
        };
        blocks.push(block);
        remaining[topSub.subject_name] -= focus;
        capMin -= focus;
        // Schedule spaced reviews
        for (const off of SR_INTERVALS) {
          const revDate = ymd(new Date(date.getTime() + off * 86400000));
          (reviews[revDate] ||= []).push({
            subject_name: topSub.subject_name,
            subject_input_id: topSub.subject_input_id,
            offset: off,
          });
        }
      }
    }

    // 2) Inject scheduled reviews for today
    const todayReviews = reviews[dateStr] || [];
    for (const rv of todayReviews.slice(0, 2)) {
      if (capMin < 20) break;
      const revMin = Math.min(30, capMin);
      const alloc = allocateBlock(slots, revMin);
      blocks.push({
        subject_input_id: rv.subject_input_id,
        subject_name: rv.subject_name,
        block_type: "review",
        study_minutes: 0,
        review_minutes: revMin,
        recovery_minutes: 0,
        pages: 0,
        tests: 0,
        block_order: order++,
        suggested_start_time: alloc?.start,
        suggested_end_time: alloc?.end,
        rationale: `مرور اسپیس‌ری‌پتیشن (${rv.offset} روز بعد از مطالعه)`,
      });
      capMin -= revMin;
    }

    // 3) Simulation day: 1 mock test block ~120min
    if (is_simulation_day && capMin >= 60) {
      const simMin = Math.min(120, capMin);
      const alloc = allocateBlock(slots, simMin);
      blocks.push({
        subject_name: "شبیه‌ساز آزمون",
        block_type: "simulation",
        study_minutes: 0,
        review_minutes: 0,
        recovery_minutes: 0,
        pages: 0,
        tests: Math.round(simMin / 1.5),
        block_order: order++,
        suggested_start_time: alloc?.start,
        suggested_end_time: alloc?.end,
        rationale: "روز آزمون شبیه‌ساز — تمرین شرایط واقعی",
      });
      capMin -= simMin;
    }

    // 4) Fill remaining capacity with next-priority study blocks — with diversity
    let lastSubject: string | null = null;
    while (capMin >= 25) {
      const list = rankSubjects(
        analysis.per_subject.filter(
          (s) => (remaining[s.subject_name] || 0) > 0 && s.subject_name !== lastSubject,
        ),
        analysis.days_left,
      );
      if (!list.length) break;
      const s = list[0];
      const want = Math.min(focus, remaining[s.subject_name], capMin);
      if (want < 20) break;
      const alloc = allocateBlock(slots, want);
      const isTestBlock = order % 3 === 2;
      blocks.push({
        subject_input_id: s.subject_input_id,
        subject_name: s.subject_name,
        block_type: isTestBlock ? "test" : "study",
        study_minutes: isTestBlock ? 0 : want,
        review_minutes: 0,
        recovery_minutes: 0,
        pages: isTestBlock ? 0 : pagesFromMinutes(want, style),
        tests: isTestBlock ? Math.round(want / 2) : 0,
        block_order: order++,
        suggested_start_time: alloc?.start,
        suggested_end_time: alloc?.end,
        rationale: isTestBlock
          ? `${s.subject_name}: بلوک تست‌زنی برای تثبیت`
          : `${s.subject_name}: ادامه پوشش با اولویت متوسط`,
      });
      remaining[s.subject_name] -= want;
      capMin -= want + 10;
      lastSubject = s.subject_name;
    }

    const totalPlanned = blocks.reduce(
      (a, b) => a + b.study_minutes + b.review_minutes + b.recovery_minutes,
      0,
    );
    const heat = Math.min(1, totalPlanned / Math.max(60, dailyCapacityMinutes(style, isWeekend)));

    daily.push({
      date: dateStr,
      phase,
      heat_score: Number(heat.toFixed(2)),
      is_simulation_day,
      is_recovery_day,
      day_goal: is_simulation_day
        ? "شبیه‌ساز آزمون + تحلیل"
        : is_recovery_day
        ? "روز ریکاوری سبک"
        : `${goalForPhase(phase)}`,
      total_planned_minutes: totalPlanned,
      blocks,
      rationale: `فاز ${phase} · ${blocks.length} بلوک · شدت ${(heat * 100).toFixed(0)}٪`,
    });
  }

  // Weekly aggregation
  const weekly: WeeklyPlanV3[] = [];
  const numWeeks = Math.ceil(horizon / 7);
  for (let w = 0; w < numWeeks; w++) {
    const startD = new Date(start.getTime() + w * 7 * 86400000);
    const endD = new Date(start.getTime() + Math.min(horizon - 1, w * 7 + 6) * 86400000);
    const daysInWeek = daily.slice(w * 7, w * 7 + 7);
    const coverage: Record<string, number> = {};
    let target = 0;
    for (const d of daysInWeek) {
      target += d.total_planned_minutes;
      for (const b of d.blocks) {
        const m = b.study_minutes + b.review_minutes;
        coverage[b.subject_name] = (coverage[b.subject_name] || 0) + m;
      }
    }
    const phase = phaseForDayIndex(w * 7, horizon);
    weekly.push({
      week_start: ymd(startD),
      week_end: ymd(endD),
      week_index: w,
      phase,
      weekly_goal: `هفته ${w + 1}: ${goalForPhase(phase)}`,
      target_minutes: target,
      coverage,
      milestones: [
        `پوشش ${Math.round(target / 60)} ساعت مفید`,
        daysInWeek.some((d) => d.is_simulation_day) ? "برگزاری شبیه‌ساز پایان هفته" : "تست‌زنی مستمر",
        "حفظ روتین خواب + مرور اسپیس‌ری‌پتیشن",
      ],
      rationale: `هفته در فاز ${phase} با ${Math.round(target / 60)} ساعت هدف‌گذاری شد.`,
    });
  }

  // Monthly overview
  const heatmap: Record<string, Record<string, number>> = {};
  for (const d of daily) {
    heatmap[d.date] = {};
    for (const b of d.blocks) {
      const m = b.study_minutes + b.review_minutes;
      if (m > 0) heatmap[d.date][b.subject_name] = (heatmap[d.date][b.subject_name] || 0) + m;
    }
  }
  // Readiness forecast (linear from current gap to 100 by exam)
  const totalReq = analysis.total_required_minutes;
  const readiness: { date: string; predicted_percent: number }[] = [];
  let doneApprox = 0;
  for (const d of daily) {
    doneApprox += d.total_planned_minutes;
    const pct = Math.min(100, Math.round((doneApprox / Math.max(1, totalReq)) * 100));
    readiness.push({ date: d.date, predicted_percent: pct });
  }
  const finalReadiness = readiness.length ? readiness[readiness.length - 1].predicted_percent : 0;
  const monthly: MonthlyPlanV3 = {
    month_start: ymd(start),
    month_end: daily.length ? daily[daily.length - 1].date : ymd(start),
    total_days: daily.length,
    phases: [
      { phase: "foundation", start: daily[0]?.date ?? ymd(start), end: daily[Math.floor(daily.length * 0.5) - 1]?.date ?? "", days: Math.floor(daily.length * 0.5), goal: goalForPhase("foundation") },
      { phase: "mastery", start: daily[Math.floor(daily.length * 0.5)]?.date ?? "", end: daily[Math.floor(daily.length * 0.8) - 1]?.date ?? "", days: Math.floor(daily.length * 0.3), goal: goalForPhase("mastery") },
      { phase: "simulation", start: daily[Math.floor(daily.length * 0.8)]?.date ?? "", end: daily[daily.length - 1]?.date ?? "", days: daily.length - Math.floor(daily.length * 0.8), goal: goalForPhase("simulation") },
    ],
    weekly_milestones: weekly.map((w) => ({ week_index: w.week_index, goal: w.weekly_goal, target_minutes: w.target_minutes })),
    heatmap,
    readiness_forecast: readiness,
    predicted_readiness_percent: finalReadiness,
    rationale: `ماه شامل ${daily.length} روز در ۳ فاز · پیش‌بینی آمادگی نهایی ${finalReadiness}٪`,
  };

  return { monthly, weekly, daily };
}

export function blockTypeColor(t: BlockType): string {
  switch (t) {
    case "deep_focus": return "hsl(262 83% 58%)";
    case "study": return "hsl(217 91% 60%)";
    case "review": return "hsl(160 84% 39%)";
    case "test": return "hsl(38 92% 50%)";
    case "simulation": return "hsl(0 84% 60%)";
    case "light": return "hsl(200 20% 60%)";
    case "recovery": return "hsl(180 40% 55%)";
    default: return "hsl(215 20% 65%)";
  }
}

export function blockTypeLabel(t: BlockType): string {
  return {
    deep_focus: "تمرکز عمیق",
    study: "مطالعه",
    review: "مرور",
    test: "تست",
    simulation: "شبیه‌ساز",
    light: "سبک",
    recovery: "ریکاوری",
    break: "استراحت",
  }[t];
}