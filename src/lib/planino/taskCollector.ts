import type { PlanTask, BacklogItem } from "./types";

interface Subject { id: string; name: string; strength_level?: number | null; importance_weight?: number | null; }
interface Exam { id: string; title: string; exam_date: string; importance: number; }
interface ExamTopic {
  id: string; exam_id: string; subject_id: string | null; title: string;
  estimated_minutes: number; completed_minutes: number; status: string;
}
interface Task { id: string; subject_id: string | null; title: string; due_date: string | null; completed: boolean; priority?: string; }

function strengthOf(subjectId: string | null, subjects: Subject[]): number {
  if (!subjectId) return 50;
  const s = subjects.find((x) => x.id === subjectId);
  return s?.strength_level ?? 50;
}

function importanceOf(examId: string | null, exams: Exam[]): number {
  if (!examId) return 3;
  const e = exams.find((x) => x.id === examId);
  return e?.importance ?? 3;
}

function dueOf(examId: string | null, exams: Exam[]): string | null {
  if (!examId) return null;
  return exams.find((x) => x.id === examId)?.exam_date ?? null;
}

export interface CollectorInput {
  exams: Exam[];
  topics: ExamTopic[];
  tasks: Task[];
  subjects: Subject[];
  backlog: BacklogItem[];
  historyByWeekday?: Record<string, number>;
}

export function collectTasks(input: CollectorInput, today: Date = new Date()): PlanTask[] {
  const out: PlanTask[] = [];
  const wd = String(today.getDay());
  const historyFactor = input.historyByWeekday?.[wd] ?? 0.5;

  // 1) Exam topics not done
  for (const t of input.topics) {
    if (t.status === "done") continue;
    const remaining = Math.max(0, (t.estimated_minutes || 0) - (t.completed_minutes || 0));
    if (remaining <= 0) continue;
    out.push({
      id: `topic:${t.id}`,
      source: "exam_topic",
      title: t.title,
      subject_id: t.subject_id,
      topic_id: t.id,
      exam_id: t.exam_id,
      duration_minutes: Math.min(remaining, 90),
      due_date: dueOf(t.exam_id, input.exams),
      exam_importance: importanceOf(t.exam_id, input.exams),
      weakness: strengthOf(t.subject_id, input.subjects),
      size_minutes: remaining,
      history_factor: historyFactor,
    });
  }

  // 2) Tasks with due
  for (const tk of input.tasks) {
    if (tk.completed) continue;
    out.push({
      id: `task:${tk.id}`,
      source: "task",
      title: tk.title,
      subject_id: tk.subject_id,
      topic_id: null,
      exam_id: null,
      duration_minutes: 30,
      due_date: tk.due_date,
      exam_importance: 3,
      weakness: strengthOf(tk.subject_id, input.subjects),
      size_minutes: 30,
      history_factor: historyFactor,
    });
  }

  // 3) Backlog
  for (const b of input.backlog) {
    if (b.status && b.status !== "pending") continue;
    out.push({
      id: `backlog:${b.id}`,
      source: "backlog",
      title: b.title || "تسک عقب‌افتاده",
      subject_id: b.subject_id || null,
      topic_id: b.topic_id || null,
      exam_id: b.exam_id || null,
      duration_minutes: Math.min(b.remaining_minutes, 60),
      due_date: dueOf(b.exam_id || null, input.exams),
      exam_importance: importanceOf(b.exam_id || null, input.exams),
      weakness: strengthOf(b.subject_id || null, input.subjects),
      size_minutes: b.remaining_minutes,
      history_factor: historyFactor,
    });
  }

  // 4) Weak subjects without explicit task → light review
  for (const s of input.subjects) {
    if ((s.strength_level ?? 100) >= 60) continue;
    const hasCoverage = out.some((t) => t.subject_id === s.id);
    if (hasCoverage) continue;
    out.push({
      id: `weak:${s.id}`,
      source: "weak_subject",
      title: `تقویت ${s.name}`,
      subject_id: s.id, topic_id: null, exam_id: null,
      duration_minutes: 30,
      due_date: null,
      exam_importance: 3,
      weakness: s.strength_level ?? 30,
      size_minutes: 30,
      history_factor: historyFactor,
    });
  }

  return out;
}