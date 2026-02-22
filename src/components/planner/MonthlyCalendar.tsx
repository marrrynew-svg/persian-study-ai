import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const WEEKDAY_LABELS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const MONTH_NAMES = [
  "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر"
];

interface Props {
  sessions: any[];
}

export function MonthlyCalendar({ sessions }: Props) {
  const [monthOffset, setMonthOffset] = useState(0);

  const { year, month, days, firstDayOffset } = useMemo(() => {
    const now = new Date();
    const current = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = current.getFullYear();
    const month = current.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Saturday = 6, we want Saturday first
    const firstDay = new Date(year, month, 1).getDay();
    const firstDayOffset = (firstDay + 1) % 7; // offset from Saturday

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      const dateStr = date.toISOString().split("T")[0];
      const daySessions = sessions.filter((s: any) => s.started_at?.startsWith(dateStr));
      const totalMin = daySessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
      const isToday = dateStr === new Date().toISOString().split("T")[0];
      return { day: i + 1, date: dateStr, totalMin, sessions: daySessions.length, isToday };
    });

    return { year, month, days, firstDayOffset };
  }, [sessions, monthOffset]);

  const maxMin = Math.max(...days.map(d => d.totalMin), 1);

  const getDayStyle = (d: typeof days[0]) => {
    if (d.isToday) return "gradient-primary text-primary-foreground font-bold shadow-md";
    if (d.totalMin > 0) {
      const intensity = Math.min(d.totalMin / maxMin, 1);
      if (intensity > 0.6) return "bg-emerald/30 text-emerald font-semibold";
      if (intensity > 0.3) return "bg-emerald/15 text-foreground";
      return "bg-emerald/8 text-foreground";
    }
    return "hover:bg-muted text-foreground";
  };

  return (
    <Card className="glass rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() => setMonthOffset(o => o + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <span className="font-semibold text-sm">
          {MONTH_NAMES[month]} {year}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() => setMonthOffset(o => o - 1)}
          disabled={monthOffset <= 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-1">
        {WEEKDAY_LABELS.map(d => (
          <span key={d} className="py-1 font-medium">{d}</span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDayOffset }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map((d) => (
          <Tooltip key={d.day}>
            <TooltipTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.9 }}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative ${getDayStyle(d)}`}
              >
                <span className="text-xs">{d.day}</span>
                {d.totalMin > 0 && !d.isToday && (
                  <div className="w-1 h-1 rounded-full bg-emerald mt-0.5" />
                )}
              </motion.button>
            </TooltipTrigger>
            {d.totalMin > 0 && (
              <TooltipContent side="top" className="text-xs" dir="rtl">
                {d.sessions} جلسه · {Math.round(d.totalMin)} دقیقه
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald/15" />
          <span>کم</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald/40" />
          <span>متوسط</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald" />
          <span>زیاد</span>
        </div>
      </div>
    </Card>
  );
}
