import type { BehaviorModel } from "./types";

interface SessionLike { duration_minutes: number; started_at: string; }
interface DailyPlanLike { date: string; total_planned_minutes: number; total_done_minutes: number; }

const EMPTY: BehaviorModel = {
  weekday_strength: { "0": 0.5, "1": 0.5, "2": 0.5, "3": 0.5, "4": 0.5, "5": 0.5, "6": 0.5 },
  avg_completion_rate: 0,
  burnout_flag: false,
  overload_streak: 0,
};

export function computeBehavior(
  sessions: SessionLike[],
  dailyPlans: DailyPlanLike[],
): BehaviorModel {
  if (!sessions.length && !dailyPlans.length) return EMPTY;

  // Weekday strength: avg session minutes per weekday, normalised 0..1
  const perWd: Record<string, number[]> = {};
  for (const s of sessions) {
    const wd = String(new Date(s.started_at).getDay());
    (perWd[wd] = perWd[wd] || []).push(s.duration_minutes);
  }
  const wdAvg: Record<string, number> = {};
  let maxAvg = 1;
  for (const k of Object.keys(perWd)) {
    const arr = perWd[k];
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    wdAvg[k] = avg;
    if (avg > maxAvg) maxAvg = avg;
  }
  const weekday_strength: Record<string, number> = { ...EMPTY.weekday_strength };
  for (const k of Object.keys(wdAvg)) {
    weekday_strength[k] = Math.max(0, Math.min(1, wdAvg[k] / maxAvg));
  }

  // Completion rate
  const recent = dailyPlans.slice(-14);
  let planned = 0, done = 0;
  for (const d of recent) { planned += d.total_planned_minutes; done += d.total_done_minutes; }
  const avg_completion_rate = planned > 0 ? Math.min(1, done / planned) : 0;

  // Burnout: 3 consecutive days with planned > 1.2 * done (consistent failure to meet plan)
  let overload_streak = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    const d = recent[i];
    if (d.total_planned_minutes > 1.2 * Math.max(d.total_done_minutes, 1)) overload_streak++;
    else break;
  }
  const burnout_flag = overload_streak >= 3;

  return { weekday_strength, avg_completion_rate, burnout_flag, overload_streak };
}