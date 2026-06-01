// XP / Level / Achievement / Quest / Weather engine for the Adventure Roadmap.
// Pure functions — UI layers feed real app state (sessions, tasks, exams).

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  condition:
    | "study_10h"
    | "study_100h"
    | "streak_7"
    | "streak_30"
    | "first_exam"
    | "boss_defeated"
    | "goal_reached"
    | "tasks_50";
}

export interface DailyQuest {
  id: string;
  title: string;
  target: number;
  current: number;
  xpReward: number;
  type: "study_hours" | "tasks" | "review" | "test";
  completed: boolean;
  date: string;
}

export interface WeatherState {
  type: "sunny" | "cloudy" | "rainy" | "stormy" | "lightning";
  reason: string;
}

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2400, 3200, 4200, 5500, 7000, 9000, 12000];
const LEVEL_NAMES = [
  "", "نوآموز", "کاوشگر", "جنگجو", "نخبه",
  "قهرمان", "استاد", "افسانه‌ای", "اسطوره", "خدا",
  "بی‌نهایت", "بی‌نهایت+", "بی‌نهایت++", "بی‌نهایت∞",
];

export function getLevelInfo(totalXP: number) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  const current = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const next = LEVEL_THRESHOLDS[level] ?? current + 2000;
  const percentage = Math.max(0, Math.min(100, Math.round(((totalXP - current) / Math.max(1, next - current)) * 100)));
  const glowColor =
    level <= 2 ? "#10b981" :
    level <= 4 ? "#06b6d4" :
    level <= 6 ? "#7c3aed" :
    level <= 8 ? "#f59e0b" : "#ef4444";
  return {
    level,
    name: LEVEL_NAMES[level] ?? "بی‌نهایت",
    xpInLevel: Math.max(0, totalXP - current),
    xpNeeded: Math.max(1, next - current),
    percentage,
    glowColor,
  };
}

export function getLevelEmoji(level: number): string {
  if (level <= 2) return "🌱";
  if (level <= 4) return "⚔️";
  if (level <= 6) return "🛡️";
  if (level <= 8) return "👑";
  return "✨";
}

export function calculateXPGain(action: {
  type: "study_minute" | "task" | "milestone" | "boss" | "goal" | "review" | "streak_bonus";
  value?: number;
}): number {
  switch (action.type) {
    case "study_minute": return Math.floor((action.value ?? 1) / 6);
    case "task":         return 20;
    case "review":       return 10;
    case "milestone":    return 200;
    case "boss":         return 500;
    case "goal":         return 2000;
    case "streak_bonus": return (action.value ?? 1) * 5;
    default:             return 0;
  }
}

/** Compute total XP from raw app stats. Pure & deterministic. */
export function computeTotalXP(stats: {
  totalStudyMinutes: number;
  completedTasks: number;
  doneExams: number;
  bossesDefeated: number;
  streakDays: number;
}): number {
  return (
    calculateXPGain({ type: "study_minute", value: stats.totalStudyMinutes }) +
    stats.completedTasks * 20 +
    stats.doneExams * 200 +
    stats.bossesDefeated * 500 +
    calculateXPGain({ type: "streak_bonus", value: stats.streakDays })
  );
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "study_10h",    title: "اولین ۱۰ ساعت", description: "۱۰ ساعت مطالعه ثبت کردی", icon: "🏅", xpReward: 50,  condition: "study_10h" },
  { id: "study_100h",   title: "صد ساعت",       description: "۱۰۰ ساعت مطالعه",        icon: "📚", xpReward: 300, condition: "study_100h" },
  { id: "streak_7",     title: "هفت‌تایی",       description: "۷ روز متوالی",           icon: "🔥", xpReward: 100, condition: "streak_7" },
  { id: "streak_30",    title: "ماهانه",         description: "۳۰ روز متوالی",          icon: "⚡", xpReward: 500, condition: "streak_30" },
  { id: "first_exam",   title: "اولین آزمون",    description: "اولین آزمون میانی",       icon: "🎯", xpReward: 100, condition: "first_exam" },
  { id: "boss_defeated", title: "کشتن Boss",     description: "آزمون جامع تموم شد",      icon: "👑", xpReward: 300, condition: "boss_defeated" },
  { id: "goal_reached", title: "فاتح",           description: "به هدف نهایی رسیدی",     icon: "🏆", xpReward: 1000, condition: "goal_reached" },
  { id: "tasks_50",     title: "کارآمد",         description: "۵۰ تسک انجام دادی",       icon: "✅", xpReward: 150, condition: "tasks_50" },
];

export function checkAchievements(
  stats: {
    totalStudyMinutes: number;
    completedTasks: number;
    doneExams: number;
    bossesDefeated: number;
    streakDays: number;
    finishedGoal: boolean;
  },
  unlocked: string[],
): Achievement[] {
  const hours = stats.totalStudyMinutes / 60;
  return ALL_ACHIEVEMENTS.filter((a) => {
    if (unlocked.includes(a.id)) return false;
    switch (a.condition) {
      case "study_10h":    return hours >= 10;
      case "study_100h":   return hours >= 100;
      case "streak_7":     return stats.streakDays >= 7;
      case "streak_30":    return stats.streakDays >= 30;
      case "first_exam":   return stats.doneExams >= 1;
      case "boss_defeated": return stats.bossesDefeated >= 1;
      case "goal_reached": return stats.finishedGoal;
      case "tasks_50":     return stats.completedTasks >= 50;
      default: return false;
    }
  });
}

export function generateDailyQuests(opts: {
  dailyStudyHours: number;
  weakSubject?: string | null;
}): DailyQuest[] {
  const today = new Date().toISOString().split("T")[0];
  const hrs = Math.max(1, opts.dailyStudyHours || 2);
  return [
    { id: `q1-${today}`, title: `${hrs} ساعت مطالعه`,                   target: hrs * 60, current: 0, xpReward: 20, type: "study_hours", completed: false, date: today },
    { id: `q2-${today}`, title: "۳ تسک انجام بده",                       target: 3,        current: 0, xpReward: 15, type: "tasks",       completed: false, date: today },
    { id: `q3-${today}`, title: `مرور ${opts.weakSubject ?? "درس ضعیف"}`, target: 1,        current: 0, xpReward: 10, type: "review",      completed: false, date: today },
  ];
}

export function calculateWeather(opts: {
  streak: number;
  todayMinutes: number;
  daysToExam: number;
}): WeatherState {
  if (opts.daysToExam > 0 && opts.daysToExam <= 7) return { type: "lightning", reason: "آزمون نزدیکه!" };
  if (opts.streak === 0)                            return { type: "rainy",     reason: "چند روزه نخوندی" };
  if (opts.streak < 3)                              return { type: "cloudy",    reason: "استریک ضعیفه" };
  if (opts.todayMinutes === 0)                      return { type: "cloudy",    reason: "امروز هنوز نخوندی" };
  if (opts.streak >= 14)                            return { type: "sunny",     reason: "استریک عالی!" };
  return { type: "sunny", reason: "داری خوب پیش میری" };
}