// Deterministic study-time estimation engine.
// Pure functions, no side effects, fully unit-testable.

export type ReadingSpeed = "slow" | "medium" | "fast";
export type StudyDepth = "deep" | "balanced" | "fast";

export interface LearningProfileLite {
  reading_speed: ReadingSpeed;
  study_depth: StudyDepth;
  focus_minutes: number;
  methods: string[];
  video_speed: number;
  pause_frequency: number; // 0..5
  notes_intensity: number; // 1..5
  memorization_strength: number; // 1..5
  analytical_strength: number; // 1..5
}

export interface TopicLite {
  total_pages: number;
  total_video_minutes: number;
  difficulty: number; // 1..5
  revisions_needed: number;
  needs_practice_tests: boolean;
}

export interface Estimate {
  studyMin: number;
  reviewMin: number;
  testMin: number;
  totalMin: number;
  breakdown: { label: string; minutes: number }[];
}

function pageMinutes(speed: ReadingSpeed, depth: StudyDepth): number {
  const base = speed === "slow" ? 4.0 : speed === "fast" ? 1.6 : 2.6;
  const depthMul = depth === "deep" ? 1.5 : depth === "fast" ? 0.75 : 1.0;
  return base * depthMul;
}

export function estimateTopic(topic: TopicLite, p: LearningProfileLite): Estimate {
  const ppm = pageMinutes(p.reading_speed, p.study_depth);
  const readMin = topic.total_pages * ppm;
  const speed = Math.max(0.75, p.video_speed || 1);
  const pauseFactor = 1 + (p.pause_frequency || 0) * 0.12;
  const noteFactor = 1 + (p.notes_intensity - 3) * 0.08;
  const videoMin = (topic.total_video_minutes / speed) * pauseFactor * noteFactor;

  const base = readMin + videoMin;
  const difficultyFactor = 0.7 + Math.max(1, Math.min(5, topic.difficulty)) * 0.15;
  const methodFactor = p.methods?.includes("video") ? 1.08 : 1.0;
  const memoryWeak = (5 - p.memorization_strength) * 0.06;
  const analyticalWeak = (5 - p.analytical_strength) * 0.04;
  const cognitiveFactor = 1 + memoryWeak + analyticalWeak;

  const studyMin = base * difficultyFactor * methodFactor * cognitiveFactor;
  // Spaced repetition: each revision ≈ 35% of first study cost
  const reviewMin = studyMin * 0.35 * Math.max(0, topic.revisions_needed);
  const testMin = topic.needs_practice_tests ? studyMin * 0.25 : 0;

  const totalMin = studyMin + reviewMin + testMin;

  return {
    studyMin: Math.round(studyMin),
    reviewMin: Math.round(reviewMin),
    testMin: Math.round(testMin),
    totalMin: Math.round(totalMin),
    breakdown: [
      { label: "📖 مطالعه اول", minutes: Math.round(studyMin) },
      { label: "🔁 مرور‌ها", minutes: Math.round(reviewMin) },
      { label: "📝 تست‌زنی", minutes: Math.round(testMin) },
    ],
  };
}

export function feasibilityVerdict(totalMin: number, daysLeft: number, dailyCapacityMin: number): {
  status: "ok" | "tight" | "impossible";
  needPerDay: number;
  message: string;
} {
  if (daysLeft <= 0) {
    return { status: "impossible", needPerDay: totalMin, message: "تاریخ آزمون گذشته یا امروز است." };
  }
  const needPerDay = Math.ceil(totalMin / daysLeft);
  if (needPerDay <= dailyCapacityMin * 0.7) {
    return { status: "ok", needPerDay, message: `روزی ~${needPerDay} دقیقه کافیه. کاملاً منطقی ✅` };
  }
  if (needPerDay <= dailyCapacityMin * 1.05) {
    return { status: "tight", needPerDay, message: `روزی ~${needPerDay} دقیقه نیازه. فشرده ولی ممکن ⚠️` };
  }
  return {
    status: "impossible",
    needPerDay,
    message: `روزی ~${needPerDay} دقیقه لازمه — بیشتر از ظرفیتت. تاریخ یا حجم رو کم کن ❌`,
  };
}