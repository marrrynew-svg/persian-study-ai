import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StudyHeatmap } from "./StudyHeatmap";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { Clock, Flame, TrendingUp, Target, Zap } from "lucide-react";
import { formatStudyDuration, getSessionSeconds, sumSessionSeconds } from "@/lib/studySession";

const COLORS = ["hsl(263,70%,58%)", "hsl(160,60%,45%)", "hsl(215,55%,40%)", "hsl(30,80%,55%)", "hsl(340,65%,50%)", "hsl(190,70%,45%)"];

interface Props {
  sessions: any[];
  subjects: any[];
  xpData: any;
}

export function PlannerDashboard({ sessions, subjects, xpData }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const todaySessions = sessions.filter((s: any) => s.started_at?.startsWith(today));
  const todaySeconds = sumSessionSeconds(todaySessions);
  const todayMinutes = Math.ceil(todaySeconds / 60);
  const totalSeconds = sumSessionSeconds(sessions);
  const totalMinutes = Math.ceil(totalSeconds / 60);
  const avgDaily = sessions.length > 0 ? Math.round(totalMinutes / 7) : 0;

  // Weekly bar chart
  const weekData = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayNames = ["ی", "د", "س", "چ", "پ", "ج", "ش"];
    const mins = sessions
      .filter((s: any) => s.started_at?.startsWith(dateStr))
      .reduce((sum: number, s: any) => sum + getSessionSeconds(s), 0);
    const mins = Math.ceil(mins / 60);
    return { day: dayNames[d.getDay()], hours: +(mins / 60).toFixed(1), minutes: mins };
  }), [sessions]);

  // Subject pie chart
  const subjectData = useMemo(() => subjects.map((sub: any) => {
    const mins = Math.ceil(sessions
      .filter((s: any) => s.subject_id === sub.id)
      .reduce((sum: number, s: any) => sum + getSessionSeconds(s), 0) / 60);
    return { name: sub.name, value: mins, color: sub.color, icon: sub.icon };
  }).filter((d: any) => d.value > 0), [sessions, subjects]);

  // Monthly trend line
  const trendData = useMemo(() => Array.from({ length: 4 }, (_, i) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (3 - i) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const mins = sessions.filter((s: any) => {
      const d = new Date(s.started_at);
      return d >= weekStart && d < weekEnd;
    }).reduce((sum: number, s: any) => sum + getSessionSeconds(s), 0) / 60;
    return { week: `هفته ${i + 1}`, hours: +(mins / 60).toFixed(1) };
  }), [sessions]);

  // Subject progress toward daily goal (4 hours = 240 min)
  const dailyGoal = 240;

  const ani = (delay: number) => ({ initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 }, transition: { delay } });

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <motion.div {...ani(0)} className="grid grid-cols-3 gap-3">
        <Card className="glass rounded-2xl p-3 text-center">
          <Clock className="w-5 h-5 mx-auto text-accent mb-1" />
          <p className="text-lg font-bold tabular-nums">{formatStudyDuration(todaySeconds)}</p>
          <p className="text-[10px] text-muted-foreground">مطالعه امروز</p>
        </Card>
        <Card className="glass rounded-2xl p-3 text-center">
          <Flame className="w-5 h-5 mx-auto text-orange-500 mb-1" />
          <p className="text-lg font-bold">{xpData?.streak_days || 0}</p>
          <p className="text-[10px] text-muted-foreground">روز پشت‌سرهم</p>
        </Card>
        <Card className="glass rounded-2xl p-3 text-center">
          <TrendingUp className="w-5 h-5 mx-auto text-emerald mb-1" />
          <p className="text-lg font-bold">{Math.floor(avgDaily / 60)}:{String(avgDaily % 60).padStart(2, "0")}</p>
          <p className="text-[10px] text-muted-foreground">میانگین روزانه</p>
        </Card>
      </motion.div>

      {/* Daily progress ring */}
      <motion.div {...ani(0.05)}>
        <Card className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">🎯 پیشرفت امروز</h3>
            <span className="text-xs text-muted-foreground">{Math.round(todayMinutes / 60 * 10) / 10} از {dailyGoal / 60} ساعت</span>
          </div>
          <Progress value={Math.min((todayMinutes / dailyGoal) * 100, 100)} className="h-2.5 rounded-full" />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">۰٪</span>
            <span className="text-[10px] font-medium text-accent">{Math.min(Math.round((todayMinutes / dailyGoal) * 100), 100)}٪</span>
          </div>
        </Card>
      </motion.div>

      {/* Weekly bar chart */}
      <motion.div {...ani(0.1)}>
        <Card className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3">📊 عملکرد هفتگی</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weekData} barCategoryGap="25%">
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis hide />
              <Tooltip
                formatter={(v: any) => [`${v} ساعت`, "مطالعه"]}
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", direction: "rtl" }}
              />
              <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
                {weekData.map((_, i) => (
                  <Cell key={i} fill={i === 6 ? "hsl(var(--accent))" : "hsl(var(--accent) / 0.4)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* Subject distribution */}
      {subjectData.length > 0 && (
        <motion.div {...ani(0.15)}>
          <Card className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-3">📚 توزیع مطالعه دروس</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={subjectData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                    {subjectData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => [`${Math.round(v / 60 * 10) / 10} ساعت`]}
                    contentStyle={{ borderRadius: 12, fontSize: 11, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", direction: "rtl" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {subjectData.slice(0, 6).map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color || COLORS[i % COLORS.length] }} />
                    <span className="flex-1 truncate">{d.icon} {d.name}</span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">{Math.round(d.value / 60 * 10) / 10}h</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Trend line */}
      <motion.div {...ani(0.2)}>
        <Card className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3">📈 روند ماهانه</h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis hide />
              <Tooltip
                formatter={(v: any) => [`${v} ساعت`]}
                contentStyle={{ borderRadius: 12, fontSize: 11, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", direction: "rtl" }}
              />
              <Line type="monotone" dataKey="hours" stroke="hsl(var(--emerald))" strokeWidth={2.5} dot={{ fill: "hsl(var(--emerald))", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* Heatmap */}
      <motion.div {...ani(0.25)}>
        <Card className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3">🔥 نقشه حرارتی مطالعه</h3>
          <StudyHeatmap sessions={sessions} days={84} />
        </Card>
      </motion.div>
    </div>
  );
}
