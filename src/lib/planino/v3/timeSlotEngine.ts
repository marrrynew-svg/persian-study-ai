import type { StudyStyle } from "../v2/types";
import type { TimeSlot } from "./types";

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}
function fromMin(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Generate available study time-slots for a given day. */
export function buildDaySlots(style: StudyStyle, isWeekend: boolean): TimeSlot[] {
  const wake = toMin(style.wake_time || "07:00");
  const sleep = toMin(style.sleep_time || "23:30");
  const slots: TimeSlot[] = [];

  // Reserved busy blocks
  const busy: Array<[number, number]> = [];
  if (!isWeekend && style.has_school) busy.push([toMin("07:30"), toMin("13:30")]);
  if (!isWeekend && style.has_university) busy.push([toMin("08:00"), toMin("14:00")]);
  if (!isWeekend && style.has_work) busy.push([toMin("09:00"), toMin("17:00")]);

  // Meals: breakfast 30min after wake, lunch 13:30, dinner 20:30
  busy.push([wake, wake + 30]);
  busy.push([toMin("13:30"), toMin("14:15")]);
  busy.push([toMin("20:30"), toMin("21:15")]);

  // Sort and merge busy
  busy.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const b of busy) {
    if (!merged.length || b[0] > merged[merged.length - 1][1]) merged.push([...b] as [number, number]);
    else merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], b[1]);
  }

  // Free slots
  let cursor = wake;
  for (const [s, e] of merged) {
    if (s > cursor && s <= sleep) slots.push({ start: fromMin(cursor), end: fromMin(Math.min(s, sleep)), minutes: Math.min(s, sleep) - cursor });
    cursor = Math.max(cursor, e);
    if (cursor >= sleep) break;
  }
  if (cursor < sleep) slots.push({ start: fromMin(cursor), end: fromMin(sleep), minutes: sleep - cursor });

  return slots.filter((s) => s.minutes >= 20);
}

/** Place a study block into slots — returns start/end time and consumes slot. */
export function allocateBlock(slots: TimeSlot[], minutes: number): { start: string; end: string } | null {
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].minutes >= minutes) {
      const start = slots[i].start;
      const startMin = toMin(start);
      const endMin = startMin + minutes;
      slots[i] = { start: fromMin(endMin + 10), end: slots[i].end, minutes: slots[i].minutes - minutes - 10 };
      return { start, end: fromMin(endMin) };
    }
  }
  return null;
}

/** Try to allocate a block starting near a preferred hour; falls back to null so caller can try allocateBlock. */
export function allocateBlockNearHour(
  slots: TimeSlot[],
  minutes: number,
  preferredHour?: number,
): { start: string; end: string } | null {
  if (preferredHour == null) return null;
  const targetMin = preferredHour * 60;
  // Find slot containing the preferred hour with enough room
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const sMin = toMin(s.start);
    const eMin = toMin(s.end);
    if (s.minutes < minutes) continue;
    const startMin = Math.max(sMin, Math.min(targetMin, eMin - minutes));
    if (startMin >= sMin && startMin + minutes <= eMin) {
      const start = fromMin(startMin);
      const end = fromMin(startMin + minutes);
      // Split slot into before + after
      const before = startMin - sMin;
      const after = eMin - (startMin + minutes) - 10;
      if (after > 0) {
        slots[i] = { start: fromMin(startMin + minutes + 10), end: s.end, minutes: after };
      } else {
        slots.splice(i, 1);
      }
      if (before >= 30) slots.splice(i, 0, { start: s.start, end: fromMin(startMin - 10), minutes: before - 10 });
      return { start, end };
    }
  }
  return null;
}