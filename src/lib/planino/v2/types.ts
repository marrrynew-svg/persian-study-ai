export type RiskLevel = "green" | "yellow" | "orange" | "red";
export type LevelKey = "very_weak" | "weak" | "medium" | "good" | "strong";
export type ReadingSpeed = "slow" | "medium" | "fast";
export type LearningMode = "book" | "video" | "mixed";

export interface SubjectInput {
  id?: string;
  subject_name: string;
  chapters_total: number;
  pages_left: number;
  tests_left: number;
  notes_left: number;
  video_minutes_left: number;
  current_level: LevelKey;
  importance: number; // 1..5
  coefficient: number;
  target_percent: number; // 0..100
}

export interface StudyStyle {
  daily_hours_available: number;
  real_focus_hours: number;
  wake_time: string; // HH:mm
  sleep_time: string;
  has_school: boolean;
  has_university: boolean;
  has_work: boolean;
  weekend_free: boolean;
  reading_speed: ReadingSpeed;
  learning_mode: LearningMode;
  focus_minutes: number;
  test_days_per_week: number;
  review_count_per_week: number;
}

export interface ExamSetup {
  id?: string;
  exam_name: string;
  exam_type: "test" | "essay" | "mixed";
  exam_date: string; // YYYY-MM-DD
  exam_time?: string | null;
}

export interface SubjectRequired {
  subject_input_id?: string;
  subject_name: string;
  coefficient: number;
  importance: number;
  current_level: LevelKey;
  required_minutes: number;
  breakdown: { read: number; tests: number; video: number; review: number };
}

export interface AnalysisResult {
  total_required_minutes: number;
  total_available_minutes: number;
  days_left: number;
  daily_need_minutes: number;
  daily_capacity_minutes: number;
  pressure_score: number;
  risk_level: RiskLevel;
  per_subject: SubjectRequired[];
  reasoning: string[];
}

export interface PlanBlockV2 {
  subject_input_id?: string;
  subject_name: string;
  topic?: string;
  pages: number;
  tests: number;
  study_minutes: number;
  review_minutes: number;
  recovery_minutes: number;
  block_order: number;
}

export interface PlanDayV2 {
  date: string;
  total_planned_minutes: number;
  blocks: PlanBlockV2[];
}