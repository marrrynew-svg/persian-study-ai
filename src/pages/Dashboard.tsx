import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useSubjects } from "@/hooks/useSubjects";
import { useTasks } from "@/hooks/useTasks";
import { useUserXP, getLevelInfo } from "@/hooks/useGamification";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, Flame, Target, TrendingUp, BookOpen, Moon, Sun, ChevronLeft, Zap, Star, Users } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const CHART_COLORS = ["hsl(263,70%,58%)", "hsl(160,60%,45%)", "hsl(215,55%,25%)", "hsl(30,80%,55%)", "hsl(340,65%,50%)"];

export default function Dashboard() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const { data: sessions = [] } = useStudySessions(7);
  const { data: subjects = [] } = useSubjects();
  const { data: tasks = [] } = useTasks();
  const { data: xpData } = useUserXP();
  const { theme, toggleTheme } = useTheme();

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!profileLoading && profile && !profile.onboarding_completed) {
      navigate("/onboarding", { replace: true });
    }
  }, [profile, profileLoading, navigate]);


  // Exam countdown
  const examDate = profile?.exam_date ? new Date(profile.exam_date) : null;
  const daysLeft = examDate ? Math.max(0, Math.ceil((examDate.getTime() - Date.now()) / 86400000)) : null;

  // Today's stats
  const today = new Date().toISOString().split("T")[0];
  const todaySessions = sessions.filter((s: any) => s.started_at?.startsWith(today));
  const todayMinutes = todaySessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
  const completedTasks = tasks.filter((t: any) => t.completed).length;
  const totalTasks = tasks.length;

  // XP
  const xp = xpData?.xp_points || 0;
  const streak = xpData?.streak_days || 0;
  const { level, progress: xpProgress } = getLevelInfo(xp);

  // Weekly chart data
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayNames = ["یک", "دو", "سه", "چهار", "پنج", "جمعه", "شنبه"];
    const shortNames = ["ی", "د", "س", "چ", "پ", "ج", "ش"];
    const mins = sessions
      .filter((s: any) => s.started_at?.startsWith(dateStr))
      .reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
    return { day: shortNames[d.getDay()], hours: +(mins / 60).toFixed(1) };
  });

  // Subject distribution
  const subjectData = subjects.map((sub: any) => {
    const mins = sessions
      .filter((s: any) => s.subject_id === sub.id)
      .reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
    return { name: sub.name, value: mins, color: sub.color };
  }).filter((d: any) => d.value > 0);

  const urgency = daysLeft !== null ? (daysLeft < 30 ? "high" : daysLeft < 60 ? "medium" : "low") : "low";

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              سلام {profile?.display_name?.split(" ")[0] || "دانش‌آموز"} 👋
            </h1>
            <p className="text-xs text-muted-foreground">امروز چقدر مطالعه کردی؟</p>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl">
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>
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

        {/* Quick stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-3 gap-3">
          <Card className="glass rounded-2xl p-3 text-center">
            <Clock className="w-5 h-5 mx-auto text-accent mb-1" />
            <p className="text-lg font-bold tabular-nums">{Math.floor(todayMinutes / 60)}:{String(todayMinutes % 60).padStart(2, "0")}</p>
            <p className="text-[10px] text-muted-foreground">مطالعه امروز</p>
          </Card>
          <Card className="glass rounded-2xl p-3 text-center">
            <Flame className="w-5 h-5 mx-auto text-orange-500 mb-1" />
            <p className="text-lg font-bold">{sessions.length}</p>
            <p className="text-[10px] text-muted-foreground">جلسه هفته</p>
          </Card>
          <Card className="glass rounded-2xl p-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-emerald mb-1" />
            <p className="text-lg font-bold">{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</p>
            <p className="text-[10px] text-muted-foreground">پیشرفت</p>
          </Card>
        </motion.div>

        {/* Weekly chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-3">📊 ساعات مطالعه هفتگی</h3>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={weekData} barCategoryGap="30%">
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: any) => [`${v} ساعت`, "مطالعه"]}
                  contentStyle={{ borderRadius: 12, fontSize: 12, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="hours" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Subject distribution */}
        {subjectData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold mb-3">📚 توزیع مطالعه دروس</h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={110} height={110}>
                  <PieChart>
                    <Pie data={subjectData} cx="50%" cy="50%" innerRadius={28} outerRadius={52} paddingAngle={3} dataKey="value">
                      {subjectData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {subjectData.slice(0, 5).map((d: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="flex-1 truncate">{d.name}</span>
                      <span className="text-muted-foreground shrink-0">{Math.round(d.value / 60)} ساعت</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Strength heatmap */}
        {subjects.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold mb-3">💪 نقشه تسلط دروس</h3>
              <div className="space-y-2">
                {subjects.slice(0, 6).map((sub: any) => {
                  const strength = sub.strength_level || 50;
                  const color = strength <= 33 ? "hsl(var(--destructive))" : strength <= 66 ? "hsl(var(--accent))" : "hsl(var(--emerald))";
                  const label = strength <= 33 ? "ضعیف" : strength <= 66 ? "متوسط" : "قوی";
                  return (
                    <div key={sub.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{sub.icon}</span>
                          <span className="text-xs font-medium">{sub.name}</span>
                        </div>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
                          {label}
                        </span>
                      </div>
                      <Progress value={strength} className="h-1.5" style={{ "--tw-bg": color } as any} />
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-2 gap-3">
          <Button onClick={() => navigate("/timer")} className="h-14 rounded-2xl gradient-primary text-primary-foreground flex items-center gap-2">
            <Clock className="w-5 h-5" />
            شروع مطالعه
          </Button>
          <Button onClick={() => navigate("/groups")} variant="outline" className="h-14 rounded-2xl flex items-center gap-2">
            <Users className="w-5 h-5" />
            گروه‌ها
          </Button>
        </motion.div>
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => navigate("/subjects")} variant="outline" className="h-12 rounded-2xl flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4" />
            مدیریت دروس
          </Button>
          <Button onClick={() => navigate("/advisor")} variant="outline" className="h-12 rounded-2xl flex items-center gap-2 text-sm gradient-accent text-accent-foreground border-0">
            <span>🤖</span>
            مشاور AI
          </Button>
        </div>

        {/* Onboarding prompt */}
        {profile && !profile.onboarding_completed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            <Card className="glass rounded-2xl p-4 border-accent/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-emerald flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">اطلاعات آزمون را تکمیل کنید</p>
                  <p className="text-xs text-muted-foreground">برای دریافت برنامه هوشمند +50 XP</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate("/profile")} className="rounded-xl">
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
