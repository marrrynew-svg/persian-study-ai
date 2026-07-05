import type { StudyStyleExt, BlockType } from "./types";
import type { StudyStyle } from "../v2/types";

/** Return an energy score 0..1 for a given hour of day (0..23). */
export function energyAtHour(hour: number, style: StudyStyle, ext?: StudyStyleExt): number {
  const chrono = ext?.chronotype;
  // Base curve: cosine peaks
  let base = 0.4;
  if (chrono === "morning_lark") {
    base = 0.4 + 0.55 * Math.max(0, Math.cos(((hour - 9) / 6) * Math.PI));
  } else if (chrono === "afternoon") {
    base = 0.4 + 0.55 * Math.max(0, Math.cos(((hour - 15) / 6) * Math.PI));
  } else if (chrono === "night_owl") {
    base = 0.4 + 0.55 * Math.max(0, Math.cos(((hour - 21) / 6) * Math.PI));
  } else {
    base = 0.5 + 0.35 * Math.max(0, Math.cos(((hour - 11) / 6) * Math.PI));
  }
  // Peak boosts
  const peaks = ext?.energy_peaks || [];
  if (peaks.includes("morning") && hour >= 7 && hour <= 11) base = Math.min(1, base + 0.2);
  if (peaks.includes("afternoon") && hour >= 13 && hour <= 17) base = Math.min(1, base + 0.2);
  if (peaks.includes("evening") && hour >= 18 && hour <= 22) base = Math.min(1, base + 0.2);
  if (peaks.includes("late_night") && (hour >= 22 || hour <= 1)) base = Math.min(1, base + 0.2);
  // Dead hours penalty
  for (const d of ext?.dead_hours || []) {
    const [s, e] = d.split("-").map((h) => parseInt(h, 10));
    if (!isNaN(s) && !isNaN(e) && hour >= s && hour < e) base *= 0.4;
  }
  // Sleep window penalty
  const wake = parseInt((style.wake_time || "07:00").split(":")[0], 10);
  const sleep = parseInt((style.sleep_time || "23:30").split(":")[0], 10);
  if (hour < wake || hour >= sleep) base = 0;
  return Math.max(0, Math.min(1, base));
}

/** Best block type suggestion for a given energy level. */
export function blockTypeForEnergy(e: number): BlockType {
  if (e >= 0.75) return "deep_focus";
  if (e >= 0.55) return "study";
  if (e >= 0.35) return "test";
  if (e >= 0.2) return "review";
  return "light";
}

/** Rank free slots by energy (high → low). Returns hour-buckets. */
export function rankHoursByEnergy(style: StudyStyle, ext?: StudyStyleExt): { hour: number; energy: number }[] {
  const wake = parseInt((style.wake_time || "07:00").split(":")[0], 10);
  const sleep = parseInt((style.sleep_time || "23:30").split(":")[0], 10);
  const arr: { hour: number; energy: number }[] = [];
  for (let h = wake; h < sleep; h++) {
    arr.push({ hour: h, energy: energyAtHour(h, style, ext) });
  }
  return arr.sort((a, b) => b.energy - a.energy);
}