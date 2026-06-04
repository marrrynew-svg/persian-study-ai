import type { CapacityRow, Weekday, BehaviorModel } from "./types";

export const DEFAULT_CAPACITY: Omit<CapacityRow, "weekday">[] = [
  // sat..fri (we use JS weekday 0=Sun..6=Sat)
];

/** Build a 7-row default capacity grid for a new user. */
export function defaultCapacityGrid(): CapacityRow[] {
  return ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((w) => {
    const isWeekend = w === 5 || w === 6; // Fri/Sat (PER calendar weekend)
    return {
      weekday: w,
      sleep_h: 8,
      school_h: isWeekend ? 0 : 6,
      commute_h: isWeekend ? 0 : 1,
      fixed_h: isWeekend ? 1 : 0.5,
      effective_h: isWeekend ? 8 : 4,
    };
  });
}

export function computeEffectiveHours(row: Omit<CapacityRow, "effective_h" | "weekday">): number {
  const total = 24;
  const eff = total - (row.sleep_h + row.school_h + row.commute_h + row.fixed_h);
  return Math.max(0, Math.min(14, Math.round(eff * 10) / 10));
}

/**
 * Effective minutes for a given date, optionally scaled by behavior (weak days lower, strong days slightly higher).
 */
export function effectiveMinutesFor(
  date: Date,
  capacity: CapacityRow[],
  behavior?: BehaviorModel | null,
): number {
  const wd = date.getDay() as Weekday;
  const row = capacity.find((c) => c.weekday === wd);
  const baseHours = row?.effective_h ?? 4;
  let mins = baseHours * 60;
  if (behavior?.weekday_strength) {
    const s = Number(behavior.weekday_strength[String(wd)] ?? 0.5);
    // strength 0.5 = neutral, 1 = +20%, 0 = -40%
    const factor = 0.6 + s * 0.6; // 0..1 -> 0.6..1.2
    mins = mins * factor;
  }
  if (behavior?.burnout_flag) mins *= 0.7;
  return Math.max(0, Math.round(mins));
}

export function weekdayLabel(w: Weekday): string {
  // Persian week starts Saturday
  const map: Record<number, string> = { 6: "شنبه", 0: "یکشنبه", 1: "دوشنبه", 2: "سه‌شنبه", 3: "چهارشنبه", 4: "پنجشنبه", 5: "جمعه" };
  return map[w];
}