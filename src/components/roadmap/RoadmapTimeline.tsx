import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Flag } from "lucide-react";
import type { Exam } from "@/hooks/useExams";
import type { RoadmapBlock } from "@/hooks/useRoadmap";

function classifyPhase(daysToNext: number): { label: string; color: string } {
  if (daysToNext <= 7)  return { label: "اسپرینت نهایی", color: "bg-destructive/70" };
  if (daysToNext <= 21) return { label: "مرور و جمع‌بندی", color: "bg-amber-500/70" };
  if (daysToNext <= 60) return { label: "تثبیت", color: "bg-blue-500/70" };
  return { label: "پایه‌سازی", color: "bg-emerald-500/70" };
}

export function RoadmapTimeline({ exams, blocks, dailyCapacityMin }: {
  exams: Exam[]; blocks: RoadmapBlock[]; dailyCapacityMin: number;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const days = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of blocks) {
      if (b.status === "skipped") continue;
      map.set(b.date, (map.get(b.date) || 0) + b.duration_minutes);
    }
    const arr: { date: string; mins: number; pct: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today.getTime() + i * 86400000);
      const k = d.toISOString().split("T")[0];
      const mins = map.get(k) || 0;
      arr.push({ date: k, mins, pct: Math.min(1.5, mins / Math.max(1, dailyCapacityMin)) });
    }
    return arr;
  }, [blocks, dailyCapacityMin]);

  const examsSorted = useMemo(
    () => [...exams].filter((e) => new Date(e.exam_date) >= today)
      .sort((a, b) => +new Date(a.exam_date) - +new Date(b.exam_date)),
    [exams]
  );

  return (
    <Card className="glass rounded-2xl p-3 overflow-hidden">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold">🗺️ نقشه راه ۳۰ روزه</h3>
        <span className="text-[10px] text-muted-foreground">امروز ← روز ۳۰</span>
      </div>

      <div className="relative overflow-x-auto pb-4">
        <div className="flex gap-1 min-w-max" style={{ direction: "ltr" }}>
          {days.map((d, i) => {
            const date = new Date(d.date);
            const exam = examsSorted.find((e) => e.exam_date === d.date);
            const dl = Math.ceil((+date - +today) / 86400000);
            const phase = classifyPhase(dl);
            const intensity = Math.min(1, d.pct);
            const color = d.mins === 0
              ? "bg-muted/40"
              : intensity < 0.5 ? "bg-emerald-500" : intensity < 0.9 ? "bg-amber-500" : "bg-destructive";

            return (
              <motion.div
                key={d.date}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.01 }}
                className="relative flex flex-col items-center gap-1 w-9"
              >
                {exam && (
                  <div className="absolute -top-2 z-10 flex flex-col items-center">
                    <Flag className="w-3 h-3 text-destructive" />
                  </div>
                )}
                <div className="text-[8px] text-muted-foreground mt-2">{date.getDate()}</div>
                <div
                  className={`w-7 rounded ${color}`}
                  style={{ height: `${20 + intensity * 50}px`, opacity: d.mins === 0 ? 0.4 : 0.7 + intensity * 0.3 }}
                  title={`${d.date} — ${d.mins} دقیقه`}
                />
                <div className="text-[7px] text-muted-foreground tabular-nums">{d.mins || ""}</div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {examsSorted.length > 0 && (
        <div className="border-t pt-2 mt-1 space-y-1">
          {examsSorted.slice(0, 3).map((e) => {
            const dl = Math.max(0, Math.ceil((+new Date(e.exam_date) - +today) / 86400000));
            const phase = classifyPhase(dl);
            return (
              <div key={e.id} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${phase.color}`} />{e.title}</span>
                <span className="text-muted-foreground tabular-nums">{dl} روز · {phase.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}