import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { formatStudyDuration, getSessionSeconds } from "@/lib/studySession";

interface Props {
  sessions: any[];
}

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

export function StudyTimeline({ sessions }: Props) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  );

  return (
    <Card className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">📍 جلسات امروز</h3>
        <span className="text-[10px] text-muted-foreground">{sorted.length} جلسه</span>
      </div>
      {sorted.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          هنوز جلسه‌ای ثبت نکردی — تایمر رو شروع کن ⏱️
        </div>
      ) : (
        <div className="relative pr-3">
          <div className="absolute right-1.5 top-1 bottom-1 w-px bg-border" />
          <div className="space-y-3">
            {sorted.map((s, i) => {
              const subject = s.subjects;
              const color = subject?.color || "hsl(var(--accent))";
              const seconds = getSessionSeconds(s);
              return (
                <motion.div
                  key={s.id || i}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative flex items-center gap-3"
                >
                  <div
                    className="absolute right-0 w-3 h-3 rounded-full border-2 border-background z-10"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 mr-5 flex items-center justify-between gap-2 bg-muted/40 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{subject?.icon || "📘"}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{subject?.name || "بدون درس"}</p>
                        <p className="text-[10px] text-muted-foreground" dir="ltr">
                          {fmtTime(s.started_at)} · {s.mode === "pomodoro" ? "پومودورو" : s.mode === "manual" ? "دستی" : "تایمر"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold tabular-nums shrink-0">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      {formatStudyDuration(seconds)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
