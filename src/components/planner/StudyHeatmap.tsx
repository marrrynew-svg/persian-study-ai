import { useMemo } from "react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface StudyHeatmapProps {
  sessions: any[];
  days?: number;
}

export function StudyHeatmap({ sessions, days = 90 }: StudyHeatmapProps) {
  const heatmapData = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach((s: any) => {
      const date = s.started_at?.split("T")[0];
      if (date) map[date] = (map[date] || 0) + (s.duration_minutes || 0);
    });

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      result.push({ date: dateStr, minutes: map[dateStr] || 0, day: d.getDay() });
    }
    return result;
  }, [sessions, days]);

  const maxMinutes = Math.max(...heatmapData.map(d => d.minutes), 1);

  const getColor = (minutes: number) => {
    if (minutes === 0) return "hsl(var(--muted))";
    const intensity = Math.min(minutes / maxMinutes, 1);
    if (intensity < 0.25) return "hsl(var(--emerald) / 0.3)";
    if (intensity < 0.5) return "hsl(var(--emerald) / 0.5)";
    if (intensity < 0.75) return "hsl(var(--emerald) / 0.75)";
    return "hsl(var(--emerald))";
  };

  const weeks: typeof heatmapData[] = [];
  let currentWeek: typeof heatmapData = [];
  heatmapData.forEach((d, i) => {
    currentWeek.push(d);
    if (d.day === 6 || i === heatmapData.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const persianMonths = ["فرو", "ارد", "خرد", "تیر", "مرد", "شهر", "مهر", "آبان", "آذر", "دی", "بهم", "اسف"];

  return (
    <div className="space-y-2">
      <div className="flex gap-[3px] justify-end overflow-x-auto pb-1" dir="ltr">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <Tooltip key={day.date}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: wi * 0.01 }}
                    className="w-[11px] h-[11px] rounded-[2px] cursor-pointer transition-colors hover:ring-1 hover:ring-foreground/20"
                    style={{ backgroundColor: getColor(day.minutes) }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <span dir="rtl">{day.date} — {day.minutes} دقیقه</span>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 justify-end text-[10px] text-muted-foreground" dir="ltr">
        <span>کم</span>
        {[0, 0.3, 0.5, 0.75, 1].map((v, i) => (
          <div
            key={i}
            className="w-[11px] h-[11px] rounded-[2px]"
            style={{
              backgroundColor: v === 0 ? "hsl(var(--muted))" : `hsl(var(--emerald) / ${v})`,
            }}
          />
        ))}
        <span>زیاد</span>
      </div>
    </div>
  );
}
