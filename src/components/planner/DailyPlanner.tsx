import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SessionLogDialog } from "./SessionLogDialog";
import { Clock, BookOpen, Play, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  sessions: any[];
  subjects: any[];
}

export function DailyPlanner({ sessions, subjects }: Props) {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const todaySessions = useMemo(() =>
    sessions
      .filter((s: any) => s.started_at?.startsWith(today))
      .sort((a: any, b: any) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()),
    [sessions, today]
  );

  const totalMinutes = todaySessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  };

  const getSessionColor = (s: any) => {
    if (s.subjects?.color) return s.subjects.color;
    return "hsl(var(--accent))";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">📅 برنامه امروز</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {todaySessions.length} جلسه · {Math.floor(totalMinutes / 60)} ساعت {totalMinutes % 60} دقیقه
          </p>
        </div>
        <SessionLogDialog subjects={subjects}>
          <Button size="sm" className="rounded-xl gradient-primary text-primary-foreground gap-1 text-xs h-8">
            <Plus className="w-3.5 h-3.5" />
            ثبت
          </Button>
        </SessionLogDialog>
      </div>

      {/* Timeline */}
      {todaySessions.length > 0 ? (
        <div className="space-y-2 relative">
          {/* Timeline line */}
          <div className="absolute right-[18px] top-3 bottom-3 w-[2px] bg-border/50 rounded-full" />

          {todaySessions.map((s: any, i: number) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative pr-10"
            >
              {/* Timeline dot */}
              <div
                className="absolute right-[13px] top-4 w-3 h-3 rounded-full border-2 border-background z-10"
                style={{ backgroundColor: getSessionColor(s) }}
              />

              <Card className="glass rounded-xl p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{s.subjects?.icon || "📖"}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.subjects?.name || "بدون درس"}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span>{formatTime(s.started_at)}</span>
                        <span>·</span>
                        <span>{s.duration_minutes} دقیقه</span>
                        {s.session_type && (
                          <>
                            <span>·</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-muted text-[9px]">
                              {s.session_type === "pomodoro" ? "🍅" : s.session_type === "manual" ? "✍️" : "⏱"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${getSessionColor(s)}20` }}
                  >
                    <Clock className="w-4 h-4" style={{ color: getSessionColor(s) }} />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="glass rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 gradient-primary/10 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-semibold mb-1">هنوز جلسه‌ای ثبت نشده</p>
          <p className="text-xs text-muted-foreground mb-4">
            با تایمر شروع کن یا جلسه رو دستی ثبت کن
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate("/timer")} className="rounded-xl gradient-primary text-primary-foreground gap-1.5 text-xs">
              <Play className="w-3.5 h-3.5" />
              شروع تایمر
            </Button>
            <SessionLogDialog subjects={subjects}>
              <Button variant="outline" className="rounded-xl gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" />
                ثبت دستی
              </Button>
            </SessionLogDialog>
          </div>
        </Card>
      )}
    </div>
  );
}
