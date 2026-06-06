import type { SubjectInput, SubjectRequired, StudyStyle, LevelKey } from "./types";

const READ_SPEED_PPM: Record<string, number> = { slow: 4.0, medium: 2.6, fast: 1.6 };
const LEVEL_MULTIPLIER: Record<LevelKey, number> = {
  very_weak: 1.5, weak: 1.25, medium: 1.0, good: 0.8, strong: 0.65,
};
const PER_TEST_MIN = 1.5; // minutes per test on average
const VIDEO_SPEED = 1.25;
const REVIEW_RATIO = 0.35; // total review = 35% of first study

export function calcSubjectRequired(s: SubjectInput, style: StudyStyle): SubjectRequired {
  const ppm = READ_SPEED_PPM[style.reading_speed] || READ_SPEED_PPM.medium;
  const levelMul = LEVEL_MULTIPLIER[s.current_level] || 1;
  const targetMul = Math.max(0.4, s.target_percent / 100);

  const read = Math.round(s.pages_left * ppm * levelMul * targetMul);
  const tests = Math.round(s.tests_left * PER_TEST_MIN * levelMul);
  const video = Math.round((s.video_minutes_left / VIDEO_SPEED) * (style.learning_mode === "video" ? 1.1 : 1));
  const base = read + tests + video;
  const review = Math.round(base * REVIEW_RATIO * (style.review_count_per_week >= 3 ? 1.1 : 1));

  const required = base + review;
  return {
    subject_input_id: s.id,
    subject_name: s.subject_name,
    coefficient: s.coefficient,
    importance: s.importance,
    current_level: s.current_level,
    required_minutes: required,
    breakdown: { read, tests, video, review },
  };
}

export function calcTotalRequired(subjects: SubjectInput[], style: StudyStyle): SubjectRequired[] {
  return subjects.map((s) => calcSubjectRequired(s, style));
}