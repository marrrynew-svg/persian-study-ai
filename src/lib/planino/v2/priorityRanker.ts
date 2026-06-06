import type { LevelKey, SubjectRequired } from "./types";

const LEVEL_GAP: Record<LevelKey, number> = {
  very_weak: 1.0, weak: 0.8, medium: 0.5, good: 0.3, strong: 0.15,
};

export function priorityScore(s: SubjectRequired, daysLeft: number): number {
  const urgency = 5 / Math.max(1, daysLeft);
  return s.coefficient * s.importance * LEVEL_GAP[s.current_level] * (1 + urgency * 0.1);
}

export function rankSubjects(subs: SubjectRequired[], daysLeft: number): SubjectRequired[] {
  return [...subs].sort((a, b) => priorityScore(b, daysLeft) - priorityScore(a, daysLeft));
}