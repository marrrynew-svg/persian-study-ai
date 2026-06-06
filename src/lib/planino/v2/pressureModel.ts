import type { AnalysisResult, RiskLevel, SubjectInput, StudyStyle, ExamSetup } from "./types";
import { calcTotalRequired } from "./volumeCalculator";
import { dailyCapacityMinutes, totalAvailableMinutes } from "./capacityCalculator";

export function classify(pressure: number): RiskLevel {
  if (pressure <= 0.7) return "green";
  if (pressure <= 1.0) return "yellow";
  if (pressure <= 1.3) return "orange";
  return "red";
}

export function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}

export function runAnalysis(exam: ExamSetup, subjects: SubjectInput[], style: StudyStyle): AnalysisResult {
  const per = calcTotalRequired(subjects, style);
  const total_required = per.reduce((a, x) => a + x.required_minutes, 0);
  const days = Math.max(1, daysUntil(exam.exam_date));
  const available = totalAvailableMinutes(style, days);
  const pressure = available > 0 ? total_required / available : Infinity;
  const risk = classify(pressure);
  const daily_need = Math.ceil(total_required / days);
  const daily_cap = dailyCapacityMinutes(style, false);

  const reasoning: string[] = [];
  reasoning.push(`کل حجم باقیمانده: ${Math.round(total_required / 60)} ساعت`);
  reasoning.push(`ظرفیت کل تا آزمون: ${Math.round(available / 60)} ساعت`);
  reasoning.push(`نیاز روزانه: ${daily_need} دقیقه — ظرفیت روزانه: ${daily_cap} دقیقه`);
  if (risk === "green") reasoning.push("✅ کاملاً به برنامه می‌رسی.");
  else if (risk === "yellow") reasoning.push("⚠️ برنامه فشرده‌ای لازم داری.");
  else if (risk === "orange") reasoning.push("🟠 باید مباحث کم‌اهمیت حذف شوند.");
  else reasoning.push("🔴 رسیدن کامل غیرممکن است — اولویت‌بندی لازم است.");

  return {
    total_required_minutes: total_required,
    total_available_minutes: available,
    days_left: days,
    daily_need_minutes: daily_need,
    daily_capacity_minutes: daily_cap,
    pressure_score: Number(pressure.toFixed(2)),
    risk_level: risk,
    per_subject: per,
    reasoning,
  };
}