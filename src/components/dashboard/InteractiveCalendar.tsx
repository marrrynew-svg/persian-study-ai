import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, X, Clock } from "lucide-react";
import { dateKey, filterByDate, sumSeconds, subjectTotals } from "@/lib/analytics";
import { formatStudyDuration } from "@/lib/studySession";

const WEEKDAY_LABELS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const MONTH_NAMES = [
  "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر",
];

interface Props {
  sessions: any[];
  subjects: any[];
}

export function InteractiveCalendar({ sessions, subjects }: Props) {
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const { year, month, days, firstOffset } = useMemo(() => {
    const now = new Date();
    const cur = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = cur.getFullYear();
    const month = cur.getMonth();
    const dim = new Date(year, month + 1, 0).getDate();
    const firstOffset = (new Date(year, month, 1).getDay() + 1) % 7;
    const todayKey = dateKey(new Date());
    const days = Array.from({ length: dim }, (_, i) => {
      const d = new Date(year, month, i + 1);
      const key = dateKey(d);
      const seconds = sumSeconds(filterByDate(sessions, key));
      return { day: i + 1, key, seconds, isToday: key === todayKey, isFuture: d > now };
    });
    return { year, month, days, firstOffset };
  }, [sessions, offset]);

  const max = Math.max(...days.map((d) => d.seconds), 1);

  // streak detection
  const streakSet = new Set<string>();
  let run: string[] = [];
  for (const d of days) {
    if (d.seconds > 0) run.push(d.key);
    else {
      if (run.length >= 2) run.forEach((k) => streakSet.add(k));
      run = [];
    }
  }
  if (run.length >= 2) run.forEach((k) => streakSet.add(k));

  const dayStyle = (d: typeof days[0]) => {
    if (d.isToday) return { className: "gradient-primary text-primary-foreground font-bold", style: {} };
    if (d.seconds > 0) {
      const intensity = 0.15 + (d.seconds / max) * 0.85;
      return {
        className: "text-foreground font-medium",
        style: { backgroundColor: `hsl(var(--emerald) / ${intensity})` },
      };
    }
    if (d.isFuture) return { className: "text-muted-foreground/40", style: {} };
    return { className: "hover:bg-muted text-muted-foreground", style: {} };
  };

  const selectedSessions = selected ? filterByDate(sessions, selected) : [];
  const selectedTotals = subjectTotals(selectedSessions, subjects).filter((s) => s.seconds > 0);
  const selectedTotal = sumSeconds(selectedSessions);

  return (
    <Card className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setOffset((o) => o + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <h3 className="text-sm font-semibold">📅 {MONTH_NAMES[month]} {year}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setOffset((o) => o - 1)} disabled={offset <= 0}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-1">
        {WEEKDAY_LABELS.map((d) => <span key={d} className="py-1 font-medium">{d}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {Array.from({ length: firstOffset }).map((_, i) => <div key={`e${i}`} />)}
        {days.map((d) => {
          const s = dayStyle(d);
          const inStreak = streakSet.has(d.key);
          return (
            <motion.button
              key={d.key}
              whileTap={{ scale: 0.92 }}
              onClick={() => setSelected(d.key)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative ${s.className} ${selected === d.key ? "ring-2 ring-accent" : ""}`}
              style={s.style}
            >
              <span>{d.day}</span>
              {inStreak && !d.isToday && (
                <span className="absolute top-0 left-0 text-[8px]">🔥</span>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald/20" />کم</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald/50" />متوسط</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald" />زیاد</div>
        <div className="flex items-center gap-1">🔥 streak</div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold" dir="ltr">{selected}</p>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSelected(null)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
              {selectedSessions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">این روز مطالعه‌ای ثبت نشده</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-3 h-3 text-accent" />
                    <span className="font-semibold">{formatStudyDuration(selectedTotal)}</span>
                    <span className="text-muted-foreground">· {selectedSessions.length} جلسه</span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedTotals.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-xs bg-muted/40 rounded-lg px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span>{t.icon || "📘"}</span>
                          <span>{t.name}</span>
                        </div>
                        <span className="tabular-nums text-muted-foreground">{formatStudyDuration(t.seconds)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
