import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useSubjects } from "@/hooks/useSubjects";
import { useUserXP, getLevelInfo } from "@/hooks/useGamification";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Flame, Target, BookOpen, Moon, Sun, Zap, Star, Users, Activity, BarChart3, Hash } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { formatStudyDuration } from "@/lib/studySession";
import {
  dailyTotals,
  dateKey,
  filterByDate,
  filterRange,
  sumSeconds,
  subjectTotals,
  computeStreak,
  generateInsights,
  dynamicGreeting,
  trendVsPrevious,
} from "@/lib/analytics";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StudyTimeline } from "@/components/dashboard/StudyTimeline";
import { SubjectGrid } from "@/components/dashboard/SubjectGrid";
import { SmartInsights } from "@/components/dashboard/SmartInsights";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { InteractiveCalendar } from "@/components/dashboard/InteractiveCalendar";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { QuickNotes } from "@/components/dashboard/QuickNotes";
import { TodayTasks } from "@/components/dashboard/TodayTasks";

export default function Dashboard() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const { data: sessions = [] } = useStudySessions(31);
  const { data: subjects = [] } = useSubjects();
  const { data: xpData } = useUserXP();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!profileLoading && profile && !profile.onboarding_completed) {
      navigate("/onboarding", { replace: true });
    }
  }, [profile, profileLoading, navigate]);

  const examDate = profile?.exam_date ? new Date(profile.exam_date) : null;
  const daysLeft = examDate ? Math.max(0, Math.ceil((examDate.getTime() - Date.now()) / 86400000)) : null;
  const urgency = daysLeft !== null ? (daysLeft < 30 ? "high" : daysLeft < 60 ? "medium" : "low") : "low";

  const todayKey = dateKey(new Date());
  const todaySessions = useMemo(() => filterByDate(sessions, todayKey), [sessions, todayKey]);
  const weekSessions = useMemo(
    () => filterRange(sessions, new Date(Date.now() - 7 * 86400000), new Date()),
    [sessions],
  );
  const todaySeconds = sumSeconds(todaySessions);
  const weekSeconds = sumSeconds(weekSessions);
  const monthSeconds = sumSeconds(sessions);

  const week7 = useMemo(() => dailyTotals(sessions, 7), [sessions]);
  const todayTrend = useMemo(() => trendVsPrevious(sessions, 1), [sessions]);
  const weekTrend = useMemo(() => trendVsPrevious(sessions, 7), [sessions]);
  const streak = useMemo(() => computeStreak(sessions), [sessions]) || (xpData?.streak_days || 0);

  const subjectStats = useMemo(
    () => subjectTotals(weekSessions, subjects).filter((s) => s.seconds > 0),
    [weekSessions, subjects],
  );
  const insights = useMemo(() => generateInsights(sessions, subjects), [sessions, subjects]);
  const greeting = dynamicGreeting(todaySeconds);

  const xp = xpData?.xp_points || 0;
  const { level, progress: xpProgress } = getLevelInfo(xp);

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              سلام {profile?.display_name?.split(" ")[0] || "دانش‌آموز"} 👋
            </h1>
            <p className="text-xs text-muted-foreground">{greeting}</p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeSwitcher />
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl hover-lift">
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
          </div>
        </motion.div>

        {/* XP Level Bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="glass rounded-2xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">سطح {level}</span>
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-accent" />
                    <span className="text-xs font-bold text-accent">{xp} XP</span>
                    {streak > 0 && (
                      <span className="text-xs text-orange-500 mr-1">🔥 {streak}</span>
                    )}
                  </div>
                </div>
                <Progress value={xpProgress} className="h-1.5" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Exam countdown */}
        {daysLeft !== null && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass rounded-2xl overflow-hidden">
              <div className={`p-4 ${urgency === "high" ? "bg-destructive/80" : "gradient-primary"}`}>
                <div className="flex items-center justify-between text-primary-foreground">
                  <div>
                    <p className="text-sm opacity-80">{urgency === "high" ? "⚠️ فاصله تا آزمون" : "روز تا آزمون"}</p>
                    <p className="text-4xl font-bold mt-1 tabular-nums" dir="ltr">{daysLeft}</p>
                    {profile?.target_rank && (
                      <p className="text-xs opacity-70 mt-1">هدف: رتبه {profile.target_rank}</p>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="w-14 h-14 rounded-2xl bg-primary-foreground/15 backdrop-blur flex items-center justify-center">
                      <Target className="w-7 h-7 text-primary-foreground" />
                    </div>
                    {profile?.field_of_study && (
                      <p className="text-[10px] opacity-70 mt-2 text-center">{profile.field_of_study}</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Key Metric Cards */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={Clock}
            label="مطالعه امروز"
            value={todaySeconds}
            format={(n) => formatStudyDuration(n)}
            trend={todayTrend}
            spark={week7.map((d) => d.seconds)}
            color="hsl(263, 70%, 58%)"
            delay={0.12}
          />
          <MetricCard
            icon={Activity}
            label="این هفته"
            value={weekSeconds}
            format={(n) => formatStudyDuration(n)}
            trend={weekTrend}
            spark={week7.map((d) => d.seconds)}
            color="hsl(160, 60%, 45%)"
            delay={0.16}
          />
          <MetricCard
            icon={Flame}
            label="استریک روزانه"
            value={streak}
            format={(n) => `${Math.round(n)} روز`}
            spark={week7.map((d) => (d.seconds > 0 ? 1 : 0))}
            color="hsl(25, 90%, 55%)"
            delay={0.2}
          />
          <MetricCard
            icon={Hash}
            label="جلسات امروز"
            value={todaySessions.length}
            format={(n) => `${Math.round(n)} جلسه`}
            color="hsl(215, 55%, 45%)"
            delay={0.24}
          />
        </div>

        {/* Today's timeline */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          <StudyTimeline sessions={todaySessions} />
        </motion.div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.29 }}>
          <QuickActions />
        </motion.div>

        {/* Today's tasks */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <TodayTasks />
        </motion.div>

        {/* Quick notes */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.31 }}>
          <QuickNotes />
        </motion.div>

        {/* Subject grid (this week) */}
        {subjectStats.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <SubjectGrid subjects={subjectStats} totalSeconds={weekSeconds} onSelect={() => navigate("/analytics")} />
          </motion.div>
        )}

        {/* Smart Insights */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
          <SmartInsights insights={insights} />
        </motion.div>

        {/* Goal progress */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
          <GoalProgress
            monthSeconds={monthSeconds}
            goalHours={profile?.daily_hours ? Math.round(Number(profile.daily_hours) * 30) : 100}
          />
        </motion.div>

        {/* Interactive calendar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
          <InteractiveCalendar sessions={sessions} subjects={subjects} />
        </motion.div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => navigate("/timer")} className="h-14 rounded-2xl gradient-primary text-primary-foreground flex items-center gap-2">
            <Clock className="w-5 h-5" />
            شروع مطالعه
          </Button>
          <Button onClick={() => navigate("/analytics")} variant="outline" className="h-14 rounded-2xl flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            آنالیز کامل
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => navigate("/subjects")} variant="outline" className="h-12 rounded-2xl flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4" />
            مدیریت دروس
          </Button>
          <Button onClick={() => navigate("/groups")} variant="outline" className="h-12 rounded-2xl flex items-center gap-2 text-sm">
            <Users className="w-4 h-4" />
            گروه‌ها
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
