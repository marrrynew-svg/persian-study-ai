import { useState } from "react";
import { motion } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useSubjects } from "@/hooks/useSubjects";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Flame, Target, TrendingUp, BookOpen, Moon, Sun, ChevronLeft } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CHART_COLORS = ["hsl(263,70%,58%)", "hsl(160,60%,45%)", "hsl(215,55%,25%)", "hsl(30,80%,55%)", "hsl(340,65%,50%)"];

export default function Dashboard() {
  const { data: profile } = useProfile();
  const { data: sessions = [] } = useStudySessions(7);
  const { data: subjects = [] } = useSubjects();
  const { data: tasks = [] } = useTasks();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Exam countdown
  const examDate = profile?.exam_date ? new Date(profile.exam_date) : null;
  const daysLeft = examDate ? Math.max(0, Math.ceil((examDate.getTime() - Date.now()) / 86400000)) : null;

  // Today's stats
  const today = new Date().toISOString().split("T")[0];
  const todaySessions = sessions.filter((s: any) => s.started_at?.startsWith(today));
  const todayMinutes = todaySessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
  const completedTasks = tasks.filter((t: any) => t.completed).length;
  const totalTasks = tasks.length;

  // Weekly chart data
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayNames = ["ی", "د", "س", "چ", "پ", "ج", "ش"];
    const mins = sessions
      .filter((s: any) => s.started_at?.startsWith(dateStr))
      .reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
    return { day: dayNames[d.getDay()], hours: +(mins / 60).toFixed(1) };
  });

  // Subject distribution
  const subjectData = subjects.map((sub: any) => {
    const mins = sessions
      .filter((s: any) => s.subject_id === sub.id)
      .reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
    return { name: sub.name, value: mins, color: sub.color };
  }).filter((d: any) => d.value > 0);

  const fadeUp = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
  };

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
        {/* Header */}
        <motion.div {...fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              سلام {profile?.display_name?.split(" ")[0] || "دانش‌آموز"} 👋
            </h1>
            <p className="text-sm text-muted-foreground">امروز چقدر مطالعه کردی؟</p>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl">
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>
        </motion.div>

        {/* Exam countdown */}
        {daysLeft !== null && (
          <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
            <Card className="glass rounded-2xl overflow-hidden">
              <div className="gradient-primary p-4">
                <div className="flex items-center justify-between text-primary-foreground">
                  <div>
                    <p className="text-sm opacity-80">روز تا آزمون</p>
                    <p className="text-4xl font-bold mt-1">{daysLeft}</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
                    <Target className="w-7 h-7" />
                  </div>
                </div>
                {profile?.field_of_study && (
                  <p className="text-xs opacity-70 mt-2">رشته: {profile.field_of_study}</p>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Quick stats */}
        <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="grid grid-cols-3 gap-3">
          <Card className="glass rounded-2xl p-3 text-center">
            <Clock className="w-5 h-5 mx-auto text-accent mb-1" />
            <p className="text-lg font-bold">{Math.floor(todayMinutes / 60)}:{String(todayMinutes % 60).padStart(2, "0")}</p>
            <p className="text-[10px] text-muted-foreground">مطالعه امروز</p>
          </Card>
          <Card className="glass rounded-2xl p-3 text-center">
            <Flame className="w-5 h-5 mx-auto text-secondary mb-1" />
            <p className="text-lg font-bold">{sessions.length}</p>
            <p className="text-[10px] text-muted-foreground">جلسه هفته</p>
          </Card>
          <Card className="glass rounded-2xl p-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</p>
            <p className="text-[10px] text-muted-foreground">پیشرفت</p>
          </Card>
        </motion.div>

        {/* Weekly chart */}
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <Card className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-3">ساعات مطالعه هفتگی</h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={weekData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis hide />
                <Bar dataKey="hours" fill="hsl(263,70%,58%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Subject distribution */}
        {subjectData.length > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
            <Card className="glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold mb-3">توزیع مطالعه دروس</h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={subjectData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {subjectData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {subjectData.slice(0, 5).map((d: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="flex-1 truncate">{d.name}</span>
                      <span className="text-muted-foreground">{Math.round(d.value / 60)} ساعت</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Quick actions */}
        <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => navigate("/timer")}
            className="h-14 rounded-2xl gradient-primary text-primary-foreground flex items-center gap-2"
          >
            <Clock className="w-5 h-5" />
            شروع مطالعه
          </Button>
          <Button
            onClick={() => navigate("/subjects")}
            variant="outline"
            className="h-14 rounded-2xl flex items-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            مدیریت دروس
          </Button>
        </motion.div>

        {/* Onboarding prompt if not completed */}
        {profile && !profile.onboarding_completed && (
          <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
            <Card className="glass rounded-2xl p-4 border-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-emerald flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">اطلاعات آزمون را تکمیل کنید</p>
                  <p className="text-xs text-muted-foreground">برای دریافت برنامه هوشمند</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate("/profile")} className="rounded-xl">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
