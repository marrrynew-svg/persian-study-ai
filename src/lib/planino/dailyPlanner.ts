import type { PlanTask, PlannedBlock, CapacityRow, BehaviorModel, BacklogItem } from "./types";
import { rankTasks } from "./priority";
import { effectiveMinutesFor } from "./capacity";

const MIN_SLICE = 25;
const MAX_SLICE = 90;

function fmt(h: number, m: number) {
  return `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.floor(m)).padStart(2, "0")}:00`;
}

export interface DailyPlanResult {
  date: string;
  capacity_minutes: number;
  blocks: PlannedBlock[];
  overflow: BacklogItem[];
}

/**
 * Build a single day's plan honoring effective capacity (never overload).
 * Tasks longer than MAX_SLICE are split — leftover goes to backlog.
 */
export function buildDailyPlan(
  date: Date,
  tasks: PlanTask[],
  capacity: CapacityRow[],
  behavior: BehaviorModel | null,
): DailyPlanResult {
  const dateStr = date.toISOString().slice(0, 10);
  const ranked = rankTasks(tasks, date);
  const capacityMin = effectiveMinutesFor(date, capacity, behavior);

  let remainingCap = capacityMin;
  let cursor = 17 * 60; // 17:00 default start
  const blocks: PlannedBlock[] = [];
  const overflow: BacklogItem[] = [];
  let blockCount = 0;

  for (const t of ranked) {
    if (remainingCap < MIN_SLICE) break;
    if (blockCount >= 6) {
      // beyond reasonable daily blocks → backlog
      overflow.push({
        title: t.title, subject_id: t.subject_id, topic_id: t.topic_id, exam_id: t.exam_id,
        remaining_minutes: t.duration_minutes, source_date: dateStr,
        priority_score: t.priority_score ?? 0, status: "pending",
      });
      continue;
    }
    const slice = Math.min(t.duration_minutes, MAX_SLICE, remainingCap);
    if (slice < MIN_SLICE) {
      overflow.push({
        title: t.title, subject_id: t.subject_id, topic_id: t.topic_id, exam_id: t.exam_id,
        remaining_minutes: t.duration_minutes, source_date: dateStr,
        priority_score: t.priority_score ?? 0, status: "pending",
      });
      continue;
    }
    const startH = Math.floor(cursor / 60), startM = cursor % 60;
    const endTotal = cursor + slice;
    const endH = Math.floor(endTotal / 60), endM = endTotal % 60;
    blocks.push({
      date: dateStr,
      start_time: fmt(startH, startM),
      end_time: fmt(endH, endM),
      duration_minutes: slice,
      block_type: t.source === "review" || t.source === "weak_subject" ? "review" : "study",
      exam_id: t.exam_id,
      topic_id: t.topic_id,
      subject_id: t.subject_id,
      priority: Math.min(5, Math.max(1, Math.round((t.priority_score ?? 50) / 20))),
      reason: t.title,
      status: "planned",
      auto_generated: true,
    });

    // If task was bigger than slice → put leftover to backlog
    if (t.duration_minutes > slice) {
      overflow.push({
        title: t.title, subject_id: t.subject_id, topic_id: t.topic_id, exam_id: t.exam_id,
        remaining_minutes: t.duration_minutes - slice, source_date: dateStr,
        priority_score: t.priority_score ?? 0, status: "pending",
      });
    }

    remainingCap -= slice + 10; // 10 min break
    cursor = endTotal + 10;
    blockCount++;
  }

  return { date: dateStr, capacity_minutes: capacityMin, blocks, overflow };
}

/** Weekly plan: builds days[] and aggregates overflow into backlog for replanner. */
export function buildWeeklyPlan(
  startDate: Date,
  tasks: PlanTask[],
  capacity: CapacityRow[],
  behavior: BehaviorModel | null,
  days: number = 7,
): DailyPlanResult[] {
  const out: DailyPlanResult[] = [];
  // Greedy: each day re-collects unplaced tasks (previous day's overflow rolls forward)
  let pool = [...tasks];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    const result = buildDailyPlan(d, pool, capacity, behavior);
    out.push(result);
    // Remove placed/exhausted items from pool
    const placedIds = new Set(
      result.blocks
        .map((b) => b.topic_id ? `topic:${b.topic_id}` : (b.subject_id ? `weak:${b.subject_id}` : null))
        .filter(Boolean) as string[],
    );
    pool = pool.filter((t) => !placedIds.has(t.id));
    // Add overflow back as fresh tasks for next day
    for (const o of result.overflow) {
      pool.push({
        id: `bl:${o.topic_id || o.subject_id || Math.random()}`,
        source: "backlog",
        title: o.title,
        subject_id: o.subject_id || null,
        topic_id: o.topic_id || null,
        exam_id: o.exam_id || null,
        duration_minutes: o.remaining_minutes,
        due_date: null,
        exam_importance: 3,
        weakness: 50,
        size_minutes: o.remaining_minutes,
        history_factor: 0.5,
        priority_score: o.priority_score,
      });
    }
  }
  return out;
}