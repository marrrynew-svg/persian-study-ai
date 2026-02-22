import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";

const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

interface Props {
  sessions: any[];
  subjects: any[];
}

export function WeeklyPlanner({ sessions, subjects }: Props) {
  const weekDays = useMemo(() => {
    const today = new Date();
    // Get start of current week (Saturday)
    const dayOfWeek = today.getDay();
    const saturdayOffset = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - saturdayOffset);

    return WEEKDAYS.map((name, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const isToday = dateStr === today.toISOString().split("T")[0];

      const daySessions = sessions.filter((s: any) => s.started_at?.startsWith(dateStr));
      const totalMin = daySessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);

      // Group by subject
      const subjectMap: Record<string, { name: string; icon: string; color: string; minutes: number }> = {};
      daySessions.forEach((s: any) => {
        const id = s.subject_id || "none";
        if (!subjectMap[id]) {
          subjectMap[id] = {
            name: s.subjects?.name || "بدون درس",
            icon: s.subjects?.icon || "📖",
            color: s.subjects?.color || "hsl(var(--accent))",
            minutes: 0,
          };
        }
        subjectMap[id].minutes += s.duration_minutes || 0;
      });

      return {
        name,
        date: dateStr,
        isToday,
        isPast: date < today && !isToday,
        totalMin,
        sessions: daySessions.length,
        subjects: Object.values(subjectMap),
        dayNum: date.getDate(),
      };
    });
  }, [sessions]);

  const dailyGoal = 240; // 4 hours

  return (
    <div className="space-y-2">
      {weekDays.map((day, i) => (
        <motion.div
          key={day.date}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <Card
            className={`glass rounded-xl p-3 transition-all ${
              day.isToday ? "ring-2 ring-accent/50 shadow-lg" : ""
            }`}
          >
            {/* Day header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    day.isToday
                      ? "gradient-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {day.dayNum}
                </div>
                <div>
                  <p className={`text-sm font-medium ${day.isToday ? "text-accent" : ""}`}>
                    {day.name}
                    {day.isToday && <span className="text-[10px] mr-1 text-accent">· امروز</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span className="tabular-nums">{Math.floor(day.totalMin / 60)}:{String(day.totalMin % 60).padStart(2, "0")}</span>
              </div>
            </div>

            {/* Progress */}
            <Progress
              value={Math.min((day.totalMin / dailyGoal) * 100, 100)}
              className="h-1.5 mb-2"
            />

            {/* Subject blocks */}
            {day.subjects.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {day.subjects.map((sub, si) => (
                  <div
                    key={si}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium"
                    style={{
                      backgroundColor: `${sub.color}15`,
                      color: sub.color,
                    }}
                  >
                    <span>{sub.icon}</span>
                    <span>{sub.minutes}d</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                {day.isPast ? "بدون مطالعه" : "برنامه‌ای ثبت نشده"}
              </p>
            )}
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
