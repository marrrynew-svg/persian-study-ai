import type { BacklogItem, PlannedBlock } from "./types";

/**
 * Distribute a backlog across the next 3..7 days without overload.
 * Golden rule: never punitive — each day gets ≤ 60 minutes from the backlog.
 */
export function distributeBacklog(
  backlog: BacklogItem[],
  startDate: Date,
  perDayLimitMinutes: number = 60,
  spreadDays: number = 5,
): { date: string; items: BacklogItem[] }[] {
  const buckets: { date: string; items: BacklogItem[]; used: number }[] = [];
  for (let i = 1; i <= spreadDays; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    buckets.push({ date: d.toISOString().slice(0, 10), items: [], used: 0 });
  }
  const sorted = [...backlog].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
  for (const item of sorted) {
    let remaining = item.remaining_minutes;
    for (const bucket of buckets) {
      if (remaining <= 0) break;
      const room = perDayLimitMinutes - bucket.used;
      if (room <= 10) continue;
      const chunk = Math.min(remaining, room);
      bucket.items.push({ ...item, remaining_minutes: chunk, source_date: bucket.date });
      bucket.used += chunk;
      remaining -= chunk;
    }
    // Anything that does not fit stays as residual; caller can keep it for next replan.
  }
  return buckets.map(({ date, items }) => ({ date, items }));
}

/**
 * Compute today's shortfall by comparing planned blocks vs. real sessions for the same date.
 * Returns minutes to push to backlog per (subject_id|topic_id).
 */
export function computeShortfall(
  date: string,
  blocks: PlannedBlock[],
  sessions: { duration_minutes: number; subject_id: string | null; started_at: string }[],
): BacklogItem[] {
  const planned = blocks.filter((b) => b.date === date);
  if (!planned.length) return [];
  const done = sessions
    .filter((s) => s.started_at.slice(0, 10) === date)
    .reduce((acc, s) => {
      const k = s.subject_id || "_";
      acc[k] = (acc[k] || 0) + s.duration_minutes;
      return acc;
    }, {} as Record<string, number>);

  const out: BacklogItem[] = [];
  const grouped: Record<string, PlannedBlock[]> = {};
  for (const b of planned) {
    const k = b.subject_id || "_";
    (grouped[k] = grouped[k] || []).push(b);
  }
  for (const k of Object.keys(grouped)) {
    const blks = grouped[k];
    const total = blks.reduce((a, b) => a + b.duration_minutes, 0);
    const doneMin = done[k] || 0;
    const short = total - doneMin;
    if (short < 15) continue;
    const seed = blks[0];
    out.push({
      title: seed.reason || "تسک عقب‌افتاده",
      subject_id: seed.subject_id,
      topic_id: seed.topic_id,
      exam_id: seed.exam_id,
      remaining_minutes: short,
      source_date: date,
      priority_score: 60,
      status: "pending",
    });
  }
  return out;
}