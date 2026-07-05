import type { AnalysisResult, StudyStyle, SubjectRequired } from "../v2/types";

export type BlockType =
  | "deep_focus"
  | "study"
  | "review"
  | "test"
  | "simulation"
  | "light"
  | "recovery"
  | "break";

export type Phase = "foundation" | "mastery" | "simulation";

export interface TimeSlot {
  start: string; // HH:mm
  end: string;
  minutes: number;
}

export interface SmartBlock {
  subject_input_id?: string;
  subject_name: string;
  topic?: string;
  block_type: BlockType;
  study_minutes: number;
  review_minutes: number;
  recovery_minutes: number;
  pages: number;
  tests: number;
  block_order: number;
  suggested_start_time?: string; // HH:mm
  suggested_end_time?: string;
  is_locked?: boolean;
  spaced_from_block?: string | null;
  rationale?: string;
}

export interface DailyPlanV3 {
  date: string; // YYYY-MM-DD
  phase: Phase;
  heat_score: number; // 0..1 intensity
  is_simulation_day: boolean;
  is_recovery_day: boolean;
  day_goal: string;
  total_planned_minutes: number;
  blocks: SmartBlock[];
  rationale: string;
}

export interface WeeklyPlanV3 {
  week_start: string;
  week_end: string;
  week_index: number;
  phase: Phase;
  weekly_goal: string;
  target_minutes: number;
  coverage: Record<string, number>; // subject → minutes
  milestones: string[];
  rationale: string;
}

export interface MonthlyPlanV3 {
  month_start: string;
  month_end: string;
  total_days: number;
  phases: { phase: Phase; start: string; end: string; days: number; goal: string }[];
  weekly_milestones: { week_index: number; goal: string; target_minutes: number }[];
  heatmap: Record<string, Record<string, number>>; // date → subject → minutes
  readiness_forecast: { date: string; predicted_percent: number }[];
  predicted_readiness_percent: number;
  rationale: string;
}

export interface FullPlanV3 {
  monthly: MonthlyPlanV3;
  weekly: WeeklyPlanV3[];
  daily: DailyPlanV3[];
}

export type { AnalysisResult, StudyStyle, SubjectRequired };

/** Advanced preferences captured by the pro wizard (kept in wizard_state.answers.styleExt). */
export type Chronotype = "morning_lark" | "afternoon" | "night_owl" | "flexible";
export type LearningPref = "visual" | "audio" | "kinesthetic" | "reading";
export type ReviewPref = "flashcards" | "tests" | "summary" | "teach_back";
export type PlanIntensity = "intense" | "balanced" | "relaxed";

export interface StudyStyleExt {
  chronotype?: Chronotype;
  energy_peaks?: string[]; // e.g. ["morning","evening"]
  dead_hours?: string[]; // e.g. ["14:00-16:00"]
  nap_minutes?: number;
  stress_tolerance?: number; // 1..10
  motivation_level?: number; // 1..10
  failure_recovery?: number; // 1..10
  learning_pref?: LearningPref;
  review_pref?: ReviewPref;
  plan_intensity?: PlanIntensity;
  study_test_review_ratio?: { study: number; test: number; review: number };
  simulation_days_per_week?: number;
  min_rest_days_per_week?: number;
  commute_minutes_per_day?: number;
  exercise_days_per_week?: number;
  target_rank?: number;
  dream_universities?: string[];
}