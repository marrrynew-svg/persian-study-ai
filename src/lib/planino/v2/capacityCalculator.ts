import type { StudyStyle } from "./types";

export function dailyCapacityMinutes(style: StudyStyle, isWeekend = false): number {
  let h = style.real_focus_hours;
  if (style.has_school) h -= 1.5;
  if (style.has_university) h -= 2;
  if (style.has_work) h -= 2;
  h = Math.max(1, h);
  if (isWeekend && style.weekend_free) h *= 1.4;
  return Math.round(h * 60);
}

export function totalAvailableMinutes(style: StudyStyle, daysLeft: number): number {
  // Approx: 5 weekdays + 2 weekend per 7 days
  const weeks = daysLeft / 7;
  const weekday = dailyCapacityMinutes(style, false) * 5;
  const weekend = dailyCapacityMinutes(style, true) * 2;
  return Math.round(weeks * (weekday + weekend));
}