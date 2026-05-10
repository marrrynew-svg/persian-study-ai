// Deterministic adaptive planner. Generates roadmap_blocks for the next N days
// from exams + topics + learning profile + done sessions.

import type { LearningProfileLite } from "./estimationEngine";

export interface ExamLite {
  id: string;
  title: string;
  exam_date: string;
  priority: number; // 1..5
  difficulty: number;
  importance: number; // 1..5
}

export interface TopicWithExam {
  id: string;
  exam_id: string;
  subject_id: string | null;
  title: string;
  estimated_minutes: number;
  completed_minutes: number;
  status: string;
  difficulty: number;
  needs_practice_tests: boolean;
  revisions_needed: number;
}

export interface PlanBlock {
  date: string; // YYYY-MM-DD
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  block_type: "study" | "review" | "test" | "buffer" | "recovery";
  exam_id: string | null;
  topic_id: string | null;
  subject_id: string | null;
  priority: number;
  reason: string;
  status: "planned";
  auto_generated: true;
}

function dateKey(d: Date) {
  return d.toISOString().split("T")[0];
}

function daysBetween(a: Date, b: Date) {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

function startTimeForWindow(window: string): { start: number; end: number } {
  switch (window) {
    case "morning":   return { start: 7,  end: 12 };
    case "afternoon": return { start: 13, end: 17 };
    case "night":     return { start: 21, end: 24 };
    default:          return { start: 17, end: 22 }; // evening
  }
}

function fmtTime(h: number, m: number) {
  const hh = String(Math.floor(h)).padStart(2, "0");
  const mm = String(Math.floor(m)).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

export interface GenerateInput {
  exams: ExamLite[];
  topics: TopicWithExam[];
  profile: LearningProfileLite & {
    weekly_available_hours: number;
    weekend_multiplier: number;
    peak_window: string;
    break_minutes: number;
  };
  daysHorizon?: number;
}

export interface GenerateResult {
  blocks: PlanBlock[];
  summary: {
    totalBlocks: number;
    totalMinutes: number;
    perExam: { exam_id: string; title: string; minutes: number; coverage: number }[];
    warnings: string[];
  };
}

/**
 * Build a roadmap of blocks across the next horizon days.
 * Strategy:
 *  - Compute remaining minutes per topic.
 *  - Score urgency = priority * importance * (5 / max(1, daysLeft)).
 *  - Per day, pack a primary study block from highest-urgency topic + a review
 *    block (spaced) + optional test block on weekends.
 *  - One buffer per week (Friday) and one recovery if all days previous filled.
 */
export function generateRoadmap(input: GenerateInput): GenerateResult {
  const horizon = input.daysHorizon ?? 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Per-topic remaining
  const remaining = new Map<string, number>();
  for (const t of input.topics) {
    if (t.status === "done") continue;
    const rem = Math.max(0, (t.estimated_minutes || 0) - (t.completed_minutes || 0));
    if (rem > 0) remaining.set(t.id, rem);
  }

  const examById = new Map(input.exams.map((e) => [e.id, e]));
  const topicById = new Map(input.topics.map((t) => [t.id, t]));

  const dailyCapacity = (input.profile.weekly_available_hours / 7) * 60;
  const weekendCapacity = dailyCapacity * (input.profile.weekend_multiplier || 1);
  const sessionLen = Math.max(25, Math.min(90, input.profile.focus_minutes || 45));
  const win = startTimeForWindow(input.profile.peak_window || "evening");

  const blocks: PlanBlock[] = [];
  const warnings: string[] = [];
  const perExam = new Map<string, number>();

  // Round-robin across topics by urgency, day by day
  for (let i = 0; i < horizon; i++) {
    const day = new Date(today.getTime() + i * 86400000);
    const dKey = dateKey(day);
    const dow = day.getDay(); // 0 sun .. 6 sat (Friday = 5)
    const isWeekend = dow === 5 || dow === 6;
    let capacity = isWeekend ? weekendCapacity : dailyCapacity;

    // Friday → buffer day if we have backlog
    if (dow === 5 && remaining.size > 0) {
      blocks.push({
        date: dKey, start_time: fmtTime(win.start, 0), end_time: fmtTime(win.start + 1, 0),
        duration_minutes: 60, block_type: "buffer", exam_id: null, topic_id: null,
        subject_id: null, priority: 2, reason: "روز جبران هفتگی",
        status: "planned", auto_generated: true,
      });
      capacity -= 60;
    }

    // Score topics for this day
    const scored: { topic: TopicWithExam; score: number; daysLeft: number }[] = [];
    for (const [tid, rem] of remaining.entries()) {
      if (rem <= 0) continue;
      const topic = topicById.get(tid)!;
      const exam = examById.get(topic.exam_id);
      if (!exam) continue;
      const examDate = new Date(exam.exam_date);
      const dl = Math.max(1, daysBetween(day, examDate));
      if (dl <= 0) continue;
      const score = exam.priority * exam.importance * (5 / dl) * (1 + topic.difficulty * 0.1);
      scored.push({ topic, score, daysLeft: dl });
    }
    scored.sort((a, b) => b.score - a.score);

    let cursorMin = win.start * 60;
    let blocksThisDay = 0;
    for (const { topic, daysLeft } of scored) {
      if (capacity < 25) break;
      if (blocksThisDay >= 4) break;
      const rem = remaining.get(topic.id) || 0;
      if (rem <= 0) continue;

      const dur = Math.min(sessionLen, rem, capacity);
      const startH = Math.floor(cursorMin / 60);
      const startM = cursorMin % 60;
      const endTotal = cursorMin + dur;
      const endH = Math.floor(endTotal / 60);
      const endM = endTotal % 60;

      // Insert review every 3rd block
      const isReviewSlot = blocksThisDay > 0 && blocksThisDay % 3 === 0;
      blocks.push({
        date: dKey,
        start_time: fmtTime(startH, startM),
        end_time: fmtTime(endH, endM),
        duration_minutes: dur,
        block_type: isReviewSlot ? "review" : "study",
        exam_id: topic.exam_id,
        topic_id: topic.id,
        subject_id: topic.subject_id,
        priority: Math.min(5, Math.ceil(5 / daysLeft) + 2),
        reason: isReviewSlot
          ? `مرور فاصله‌دار ${topic.title}`
          : `${topic.title} — ${daysLeft} روز تا آزمون`,
        status: "planned",
        auto_generated: true,
      });

      remaining.set(topic.id, rem - dur);
      perExam.set(topic.exam_id, (perExam.get(topic.exam_id) || 0) + dur);
      capacity -= dur + (input.profile.break_minutes || 10);
      cursorMin = endTotal + (input.profile.break_minutes || 10);
      blocksThisDay++;
    }

    // Weekend test block if practice topics remain
    if (isWeekend && capacity > 30 && blocksThisDay < 4) {
      const practice = scored.find(({ topic }) => topic.needs_practice_tests);
      if (practice) {
        blocks.push({
          date: dKey, start_time: fmtTime(Math.floor(cursorMin / 60), cursorMin % 60),
          end_time: fmtTime(Math.floor((cursorMin + 30) / 60), (cursorMin + 30) % 60),
          duration_minutes: 30, block_type: "test",
          exam_id: practice.topic.exam_id, topic_id: practice.topic.id,
          subject_id: practice.topic.subject_id,
          priority: 4, reason: `تست‌زنی هفتگی ${practice.topic.title}`,
          status: "planned", auto_generated: true,
        });
      }
    }
  }

  // Warnings: any topic with remaining > 0 by exam date
  for (const [tid, rem] of remaining.entries()) {
    if (rem > 0) {
      const t = topicById.get(tid)!;
      const e = examById.get(t.exam_id);
      if (e) warnings.push(`${t.title} (${e.title}): ${rem} دقیقه باقی مونده — به آزمون نمی‌رسه با این پلن.`);
    }
  }

  const perExamArr = input.exams.map((e) => {
    const total = input.topics
      .filter((t) => t.exam_id === e.id)
      .reduce((a, t) => a + (t.estimated_minutes || 0), 0);
    const planned = perExam.get(e.id) || 0;
    return {
      exam_id: e.id, title: e.title, minutes: planned,
      coverage: total > 0 ? Math.min(1, planned / total) : 0,
    };
  });

  return {
    blocks,
    summary: {
      totalBlocks: blocks.length,
      totalMinutes: blocks.reduce((a, b) => a + b.duration_minutes, 0),
      perExam: perExamArr,
      warnings,
    },
  };
}