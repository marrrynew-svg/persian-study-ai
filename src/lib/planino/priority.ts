import type { PlanTask } from "./types";

/** Days between today and due (>=0). */
function daysUntil(due: string | null, today: Date): number {
  if (!due) return 30;
  const d = new Date(due + "T00:00:00");
  return Math.max(0, Math.ceil((+d - +today) / 86400000));
}

function deadlineWeight(due: string | null, today: Date): number {
  const d = daysUntil(due, today);
  if (d <= 0) return 100;
  if (d === 1) return 90;
  if (d <= 3) return 75;
  if (d <= 7) return 55;
  if (d <= 14) return 35;
  return 15;
}

function weaknessWeight(mastery0to100: number): number {
  if (mastery0to100 <= 30) return 100;
  if (mastery0to100 <= 60) return 60;
  return 20;
}

function examImportanceWeight(importance1to5: number, source: PlanTask["source"]): number {
  // konkur-like exams have importance 5 → 100. Tasks default 60.
  if (source === "task") return 60;
  if (source === "backlog") return Math.max(60, importance1to5 * 20);
  return Math.min(100, importance1to5 * 20);
}

function sizeWeight(minutes: number): number {
  // Smaller tasks slightly favored (easier wins). 0..100.
  if (minutes <= 30) return 90;
  if (minutes <= 60) return 70;
  if (minutes <= 120) return 50;
  return 25;
}

function historyWeight(history0to1: number): number {
  return Math.round(history0to1 * 100);
}

/** Combined 0..100 priority score per the spec weights. */
export function priorityScore(task: PlanTask, today: Date = new Date()): number {
  const d = deadlineWeight(task.due_date, today) * 0.40;
  const w = weaknessWeight(task.weakness) * 0.25;
  const e = examImportanceWeight(task.exam_importance, task.source) * 0.20;
  const s = sizeWeight(task.size_minutes) * 0.10;
  const h = historyWeight(task.history_factor) * 0.05;
  return Math.round(d + w + e + s + h);
}

export function rankTasks(tasks: PlanTask[], today: Date = new Date()): PlanTask[] {
  return tasks
    .map((t) => ({ ...t, priority_score: priorityScore(t, today) }))
    .sort((a, b) => (b.priority_score! - a.priority_score!));
}