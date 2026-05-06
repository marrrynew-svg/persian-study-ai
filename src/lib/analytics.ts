import { getSessionSeconds } from "@/lib/studySession";

export type Session = any;
export type Subject = any;

export const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const dateKey = (d: Date | string) => {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toISOString().split("T")[0];
};

export const filterByDate = (sessions: Session[], date: string) =>
  sessions.filter((s) => dateKey(s.started_at) === date);

export const filterRange = (sessions: Session[], from: Date, to: Date) =>
  sessions.filter((s) => {
    const t = new Date(s.started_at).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });

export const sumSeconds = (sessions: Session[]) =>
  sessions.reduce((sum, s) => sum + getSessionSeconds(s), 0);

/** Build day-by-day totals for the last N days (oldest first). */
export const dailyTotals = (sessions: Session[], days: number) => {
  const out: { date: string; seconds: number; label: string }[] = [];
  const weekdayLabels = ["ی", "د", "س", "چ", "پ", "ج", "ش"];
  const today = startOfDay(new Date());
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const seconds = sumSeconds(filterByDate(sessions, key));
    out.push({ date: key, seconds, label: weekdayLabels[d.getDay()] });
  }
  return out;
};

/** Per-subject totals (filtered sessions). */
export const subjectTotals = (sessions: Session[], subjects: Subject[]) =>
  subjects
    .map((sub) => {
      const subSessions = sessions.filter((s) => s.subject_id === sub.id);
      return {
        id: sub.id,
        name: sub.name,
        icon: sub.icon,
        color: sub.color,
        seconds: sumSeconds(subSessions),
        sessions: subSessions.length,
      };
    })
    .sort((a, b) => b.seconds - a.seconds);

/** Hour-of-day distribution (0-23) over the given sessions. */
export const hourDistribution = (sessions: Session[]) => {
  const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, seconds: 0 }));
  sessions.forEach((s) => {
    const h = new Date(s.started_at).getHours();
    buckets[h].seconds += getSessionSeconds(s);
  });
  return buckets;
};

/** Streak based on consecutive days containing at least one session. */
export const computeStreak = (sessions: Session[]) => {
  const set = new Set(sessions.map((s) => dateKey(s.started_at)));
  let streak = 0;
  const cur = startOfDay(new Date());
  // If no session today, streak still valid if yesterday has one
  if (!set.has(dateKey(cur))) cur.setDate(cur.getDate() - 1);
  while (set.has(dateKey(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
};

/** Consistency 0-1: proportion of last N days with study. */
export const consistencyScore = (sessions: Session[], days = 14) => {
  const totals = dailyTotals(sessions, days);
  const active = totals.filter((d) => d.seconds > 0).length;
  return active / days;
};

/** Rolling change vs previous period (percent). */
export const trendVsPrevious = (sessions: Session[], days: number) => {
  const now = new Date();
  const cur = filterRange(sessions, new Date(now.getTime() - days * 86400000), now);
  const prev = filterRange(
    sessions,
    new Date(now.getTime() - 2 * days * 86400000),
    new Date(now.getTime() - days * 86400000),
  );
  const c = sumSeconds(cur);
  const p = sumSeconds(prev);
  if (p === 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 100);
};

/** Generate Persian smart insights from real session data. */
export const generateInsights = (sessions: Session[], subjects: Subject[]): string[] => {
  const insights: string[] = [];
  if (!sessions.length) {
    insights.push("هنوز جلسه‌ای ثبت نشده — اولین جلسه‌ات رو شروع کن 🚀");
    return insights;
  }

  const last7 = filterRange(sessions, new Date(Date.now() - 7 * 86400000), new Date());
  const subTotals = subjectTotals(last7, subjects).filter((s) => s.seconds > 0);

  if (subTotals.length) {
    const top = subTotals[0];
    insights.push(`بیشترین تمرکزت این هفته روی ${top.name} بوده (${Math.round(top.seconds / 60)} دقیقه)`);
  }

  // Drop subject (week vs prev week)
  const prev7 = filterRange(
    sessions,
    new Date(Date.now() - 14 * 86400000),
    new Date(Date.now() - 7 * 86400000),
  );
  const prevTotals = subjectTotals(prev7, subjects);
  for (const s of subTotals) {
    const p = prevTotals.find((x) => x.id === s.id);
    if (p && p.seconds > 600 && s.seconds < p.seconds * 0.6) {
      insights.push(`${s.name} این هفته افت داشته — یه برنامه جبرانی بذار`);
      break;
    }
  }

  // Best hour
  const hours = hourDistribution(sessions);
  const best = hours.reduce((a, b) => (b.seconds > a.seconds ? b : a));
  if (best.seconds > 0) {
    insights.push(`بهترین ساعت مطالعه‌ات ${best.hour}:00 بوده`);
  }

  // Streak praise
  const streak = computeStreak(sessions);
  if (streak >= 3) insights.push(`${streak} روز پشت سر هم مطالعه کردی 🔥`);

  // Consistency
  const consistency = consistencyScore(sessions, 14);
  if (consistency >= 0.7) insights.push("ثبات‌ت توی دو هفته اخیر فوق‌العادست 💎");
  else if (consistency < 0.3) insights.push("ثبات‌ت پایینه — هر روز حتی ۲۰ دقیقه کمک می‌کنه");

  // Trend
  const trend = trendVsPrevious(sessions, 7);
  if (trend >= 20) insights.push(`نسبت به هفته قبل ${trend}٪ بیشتر مطالعه کردی 📈`);
  else if (trend <= -20) insights.push(`نسبت به هفته قبل ${Math.abs(trend)}٪ کمتر مطالعه کردی`);

  return insights.slice(0, 5);
};

/** Motivational dynamic greeting message. */
export const dynamicGreeting = (todaySeconds: number) => {
  const h = new Date().getHours();
  const part = h < 5 ? "شب بخیر" : h < 12 ? "صبح بخیر" : h < 17 ? "ظهر بخیر" : h < 20 ? "عصر بخیر" : "شب بخیر";
  if (todaySeconds === 0) return `${part}! آماده‌ای امروز رو بترکونی؟ ✨`;
  if (todaySeconds < 1800) return `${part}! شروع خوبی داشتی، ادامه بده 💪`;
  if (todaySeconds < 7200) return `${part}! امروز عالی پیش رفتی 🔥`;
  return `${part}! یه قهرمان واقعی 👑`;
};
