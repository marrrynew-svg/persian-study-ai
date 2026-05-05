import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getSessionSeconds } from "@/lib/studySession";

interface Props {
  sessions: any[];
  subjects: any[];
  xpData: any;
}

export function GoalTracker({ sessions, subjects, xpData }: Props) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Daily goal: 4 hours
  const dailyGoalMin = 240;
  const todayMin = sessions
    .filter((s: any) => s.started_at?.startsWith(todayStr))
    .reduce((sum: number, s: any) => sum + Math.ceil(getSessionSeconds(s) / 60), 0);
  const dailyPct = Math.min(Math.round((todayMin / dailyGoalMin) * 100), 100);

  // Weekly goal: 24 hours
  const weekGoalMin = 1440;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() - 1); // Saturday
  const weekMin = sessions
    .filter((s: any) => new Date(s.started_at) >= weekStart)
    .reduce((sum: number, s: any) => sum + Math.ceil(getSessionSeconds(s) / 60), 0);
  const weekPct = Math.min(Math.round((weekMin / weekGoalMin) * 100), 100);

  // Subject-level progress
  const subjectProgress = useMemo(() =>
    subjects.slice(0, 5).map((sub: any) => {
      const subMin = sessions
        .filter((s: any) => s.subject_id === sub.id)
        .reduce((sum: number, s: any) => sum + Math.ceil(getSessionSeconds(s) / 60), 0);
      const goal = (sub.importance_weight || 5) * 60; // weight * 60 min
      const pct = Math.min(Math.round((subMin / goal) * 100), 100);
      return { ...sub, minutes: subMin, goal, pct };
    }),
    [subjects, sessions]
  );

  // Productivity score
  const productivityScore = useMemo(() => {
    const streak = xpData?.streak_days || 0;
    const avgDailyFactor = Math.min(todayMin / dailyGoalMin, 1) * 40;
    const weekFactor = Math.min(weekMin / weekGoalMin, 1) * 30;
    const streakFactor = Math.min(streak / 7, 1) * 30;
    return Math.round(avgDailyFactor + weekFactor + streakFactor);
  }, [todayMin, weekMin, xpData]);

  const scoreColor = productivityScore >= 70 ? "hsl(var(--emerald))" : productivityScore >= 40 ? "hsl(var(--accent))" : "hsl(var(--destructive))";
  const scoreLabel = productivityScore >= 70 ? "عالی" : productivityScore >= 40 ? "متوسط" : "نیاز به تلاش بیشتر";

  const ani = (delay: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay } });

  return (
    <div className="space-y-4">
      {/* Productivity Score */}
      <motion.div {...ani(0)}>
        <Card className="glass rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 shrink-0">
              <svg width={80} height={80} className="-rotate-90">
                <circle cx={40} cy={40} r={34} fill="none" stroke="hsl(var(--muted))" strokeWidth={6} />
                <circle
                  cx={40} cy={40} r={34} fill="none"
                  stroke={scoreColor}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={2 * Math.PI * 34 * (1 - productivityScore / 100)}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold" style={{ color: scoreColor }}>{productivityScore}</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-1">⚡ امتیاز بهره‌وری</h3>
              <p className="text-xs" style={{ color: scoreColor }}>{scoreLabel}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                بر اساس مطالعه روزانه، هفتگی و استریک
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Daily & Weekly Goals */}
      <motion.div {...ani(0.05)} className="grid grid-cols-2 gap-3">
        <Card className="glass rounded-2xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold">هدف روزانه</span>
          </div>
          <div className="text-center mb-2">
            <span className="text-2xl font-bold tabular-nums">{dailyPct}%</span>
          </div>
          <Progress value={dailyPct} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            {Math.floor(todayMin / 60)}:{String(todayMin % 60).padStart(2, "0")} از {dailyGoalMin / 60} ساعت
          </p>
        </Card>

        <Card className="glass rounded-2xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald" />
            <span className="text-xs font-semibold">هدف هفتگی</span>
          </div>
          <div className="text-center mb-2">
            <span className="text-2xl font-bold tabular-nums">{weekPct}%</span>
          </div>
          <Progress value={weekPct} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            {Math.floor(weekMin / 60)} از {weekGoalMin / 60} ساعت
          </p>
        </Card>
      </motion.div>

      {/* Warning if behind */}
      {dailyPct < 50 && today.getHours() >= 18 && (
        <motion.div {...ani(0.1)}>
          <Card className="rounded-2xl p-3 border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <div>
                <p className="text-xs font-medium text-destructive">عقب‌افتادگی از برنامه!</p>
                <p className="text-[10px] text-muted-foreground">
                  هنوز {Math.round((dailyGoalMin - todayMin) / 60)} ساعت تا هدف امروز فاصله داری
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Subject progress */}
      {subjectProgress.length > 0 && (
        <motion.div {...ani(0.15)}>
          <Card className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-3">📊 پیشرفت درس‌ها</h3>
            <div className="space-y-3">
              {subjectProgress.map((sub: any, i: number) => (
                <div key={sub.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span>{sub.icon}</span>
                      <span className="text-xs font-medium">{sub.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {sub.pct >= 100 && <CheckCircle2 className="w-3 h-3 text-emerald" />}
                      <span className="text-[10px] text-muted-foreground tabular-nums">{sub.pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${sub.pct}%` }}
                      transition={{ delay: 0.2 + i * 0.05, duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: sub.color || "hsl(var(--accent))" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
