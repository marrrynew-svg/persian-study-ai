import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { SessionCard } from "@/components/sessions/SessionCard";

interface Props { sessions: any[]; }

export function StudyTimeline({ sessions }: Props) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">📍 جلسات امروز</h3>
        <span className="text-[10px] text-muted-foreground">{sorted.length} جلسه</span>
      </div>
      {sorted.length === 0 ? (
        <Card className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">
          هنوز جلسه‌ای ثبت نکردی — تایمر رو شروع کن ⏱️
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {sorted.map((s, i) => (
              <SessionCard key={s.id || i} session={s} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
