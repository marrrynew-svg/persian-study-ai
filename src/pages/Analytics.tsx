import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useSubjects } from "@/hooks/useSubjects";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import {
  dailyTotals, filterRange, sumSeconds, subjectTotals, hourDistribution,
  consistencyScore, computeStreak, dateKey,
} from "@/lib/analytics";
import { formatStudyDuration } from "@/lib/studySession";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Range = "today" | "week" | "month" | "all";
type Metric = "time" | "sessions";

const RANGE_DAYS: Record<Range, number> = { today: 1, week: 7, month: 30, all: 90 };

const COLORS = ["hsl(263,70%,58%)", "hsl(160,60%,45%)", "hsl(215,55%,45%)", "hsl(25,90%,55%)", "hsl(340,65%,50%)", "hsl(190,70%,45%)"];

export default function Analytics() {
  const navigate = useNavigate();
  const { data: sessions = [] } = useStudySessions(90);
  const { data: subjects = [] } = useSubjects();

  const [range, setRange] = useState<Range>("week");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [metric, setMetric] = useState<Metric>("time");

  const days = RANGE_DAYS[range];
  const from = new Date(Date.now() - days * 86400000);

  const filtered = useMemo(() => {
    let r = filterRange(sessions, from, new Date());
    if (subjectFilter !== "all") r = r.filter((s: any) => s.subject_id === subjectFilter);
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, range, subjectFilter]);

  const totalSeconds = sumSeconds(filtered);
  const totalSessions = filtered.length;
  const avgSession = totalSessions ? totalSeconds / totalSessions : 0;
  const dayTotals = useMemo(() => dailyTotals(filtered, Math.min(days, 30)), [filtered, days]);
  const consistency = useMemo(() => Math.round(consistencyScore(sessions, 14) * 100), [sessions]);
  const streak = useMemo(() => computeStreak(sessions), [sessions]);

  const subjectData = useMemo(
    () => subjectTotals(filtered, subjects).filter((s) => s.seconds > 0),
    [filtered, subjects],
  );

  const hourData = useMemo(() => hourDistribution(filtered).map((h) => ({
    hour: `${h.hour}`,
    minutes: Math.round(h.seconds / 60),
  })), [filtered]);

  // Consistency heatmap (last 84 days = 12 weeks)
  const heatmap = useMemo(() => {
    const arr = dailyTotals(sessions, 84);
    return arr;
  }, [sessions]);
  const heatMax = Math.max(...heatmap.map((d) => d.seconds), 1);

  const chartData = dayTotals.map((d) => ({
    label: d.label,
    value: metric === "time" ? +(d.seconds / 60).toFixed(1) : 0,
  }));
  // sessions per day if metric=sessions
  if (metric === "sessions") {
    const counts = new Map<string, number>();
    filtered.forEach((s: any) => {
      const k = dateKey(s.started_at);
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    chartData.forEach((c, i) => {
      c.value = counts.get(dayTotals[i].date) || 0;
    });
  }

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">آنالیز پیشرفته</h1>
            <p className="text-xs text-muted-foreground">دیتای دقیق مطالعه‌ات</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Filters */}
        <Card className="glass rounded-2xl p-3 space-y-2">
          <div className="flex gap-2">
            {(["today", "week", "month", "all"] as Range[]).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "default" : "outline"}
                onClick={() => setRange(r)}
                className="flex-1 rounded-xl text-xs h-8"
              >
                {r === "today" ? "امروز" : r === "week" ? "هفته" : r === "month" ? "ماه" : "همه"}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="flex-1 h-9 rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه دروس</SelectItem>
                {subjects.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
              <SelectTrigger className="w-32 h-9 rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">زمان</SelectItem>
                <SelectItem value="sessions">جلسات</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="glass rounded-2xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">مجموع</p>
            <p className="text-sm font-bold tabular-nums">{formatStudyDuration(totalSeconds)}</p>
          </Card>
          <Card className="glass rounded-2xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">جلسات</p>
            <p className="text-sm font-bold tabular-nums">{totalSessions}</p>
          </Card>
          <Card className="glass rounded-2xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">میانگین جلسه</p>
            <p className="text-sm font-bold tabular-nums">{formatStudyDuration(avgSession)}</p>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="glass rounded-2xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">ثبات (۱۴ روز)</p>
            <p className="text-base font-bold text-emerald tabular-nums">{consistency}%</p>
          </Card>
          <Card className="glass rounded-2xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">استریک فعلی</p>
            <p className="text-base font-bold tabular-nums">🔥 {streak} روز</p>
          </Card>
        </div>

        {/* Daily chart */}
        <Card className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3">📊 روند روزانه</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                formatter={(v: any) => [metric === "time" ? `${v} دقیقه` : `${v} جلسه`, ""]}
              />
              <Bar dataKey="value" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Trend line */}
        {dayTotals.length > 2 && (
          <Card className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-3">📈 روند تجمعی</h3>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={dayTotals.map((d, i, arr) => ({
                label: d.label,
                cum: +(arr.slice(0, i + 1).reduce((s, x) => s + x.seconds, 0) / 3600).toFixed(2),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                  formatter={(v: any) => [`${v} ساعت`, "تجمعی"]}
                />
                <Line type="monotone" dataKey="cum" stroke="hsl(var(--emerald))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Subject distribution */}
        {subjectData.length > 0 && (
          <Card className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-3">🥧 توزیع دروس</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={subjectData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="seconds">
                    {subjectData.map((entry, i) => (
                      <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {subjectData.slice(0, 6).map((d, i) => (
                  <div key={d.id} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color || COLORS[i % COLORS.length] }} />
                    <span className="flex-1 truncate">{d.name}</span>
                    <span className="text-muted-foreground tabular-nums shrink-0">{formatStudyDuration(d.seconds)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Hour distribution */}
        <Card className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3">⏰ بهره‌وری ساعتی</h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={hourData}>
              <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={2} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                formatter={(v: any) => [`${v} دقیقه`, "ساعت"]}
              />
              <Bar dataKey="minutes" fill="hsl(var(--violet))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* GitHub-style heatmap */}
        <Card className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3">🔥 نقشه ثبات (۱۲ هفته)</h3>
          <div className="grid grid-flow-col grid-rows-7 gap-1" dir="ltr">
            {heatmap.map((d) => {
              const intensity = d.seconds === 0 ? 0 : 0.15 + (d.seconds / heatMax) * 0.85;
              return (
                <div
                  key={d.date}
                  title={`${d.date}: ${formatStudyDuration(d.seconds)}`}
                  className="aspect-square rounded-sm"
                  style={{
                    backgroundColor: d.seconds === 0 ? "hsl(var(--muted))" : `hsl(var(--emerald) / ${intensity})`,
                  }}
                />
              );
            })}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
