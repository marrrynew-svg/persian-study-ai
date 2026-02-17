import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSubjects } from "@/hooks/useSubjects";
import { useSaveSession } from "@/hooks/useStudySessions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Square, RotateCcw, Maximize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type TimerMode = "pomodoro" | "custom";

export default function TimerPage() {
  const { data: subjects = [] } = useSubjects();
  const saveSession = useSaveSession();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [subjectId, setSubjectId] = useState<string>("");
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const startedAtRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setIsBreak(false);
    const secs = workMin * 60;
    setTotalSeconds(secs);
    setRemainingSeconds(secs);
    startedAtRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [workMin]);

  useEffect(() => {
    if (mode === "pomodoro") {
      const secs = workMin * 60;
      setTotalSeconds(secs);
      setRemainingSeconds(secs);
    }
  }, [workMin, mode]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    if (!startedAtRef.current) {
      startedAtRef.current = new Date().toISOString();
    }

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (mode === "pomodoro" && !isBreak) {
            // Save work session then start break
            saveSession.mutate({
              subject_id: subjectId || null,
              duration_minutes: workMin,
              session_type: "pomodoro",
              started_at: startedAtRef.current!,
              ended_at: new Date().toISOString(),
            });
            toast({ title: "🎉 آفرین! زمان استراحت" });
            setIsBreak(true);
            startedAtRef.current = new Date().toISOString();
            const breakSecs = breakMin * 60;
            setTotalSeconds(breakSecs);
            return breakSecs;
          } else {
            // Break finished or custom mode done
            setIsRunning(false);
            if (isBreak) {
              toast({ title: "استراحت تمام شد! ادامه بده 💪" });
              setIsBreak(false);
              const workSecs = workMin * 60;
              setTotalSeconds(workSecs);
              startedAtRef.current = null;
              return workSecs;
            }
            if (mode === "custom") {
              saveSession.mutate({
                subject_id: subjectId || null,
                duration_minutes: Math.round(totalSeconds / 60),
                session_type: "custom",
                started_at: startedAtRef.current!,
                ended_at: new Date().toISOString(),
              });
              toast({ title: "جلسه ذخیره شد ✅" });
              startedAtRef.current = null;
            }
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, isBreak, workMin, breakMin, subjectId, totalSeconds]);

  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  // Circle dimensions
  const size = 240;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">تایمر مطالعه</h1>
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate("/focus")}>
            <Maximize2 className="w-5 h-5" />
          </Button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === "pomodoro" ? "default" : "ghost"}
            onClick={() => { setMode("pomodoro"); resetTimer(); }}
            className="flex-1 rounded-xl"
          >
            پومودورو
          </Button>
          <Button
            variant={mode === "custom" ? "default" : "ghost"}
            onClick={() => { setMode("custom"); setTotalSeconds(30 * 60); setRemainingSeconds(30 * 60); }}
            className="flex-1 rounded-xl"
          >
            آزاد
          </Button>
        </div>

        {/* Subject selector */}
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="انتخاب درس (اختیاری)" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>
                {s.icon} {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Timer settings */}
        {mode === "pomodoro" && !isRunning && (
          <div className="flex gap-3">
            <Card className="glass rounded-xl p-3 flex-1 text-center">
              <p className="text-xs text-muted-foreground mb-1">مطالعه (دقیقه)</p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWorkMin(Math.max(5, workMin - 5))}>-</Button>
                <span className="text-lg font-bold w-8">{workMin}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWorkMin(Math.min(90, workMin + 5))}>+</Button>
              </div>
            </Card>
            <Card className="glass rounded-xl p-3 flex-1 text-center">
              <p className="text-xs text-muted-foreground mb-1">استراحت (دقیقه)</p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBreakMin(Math.max(1, breakMin - 1))}>-</Button>
                <span className="text-lg font-bold w-8">{breakMin}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBreakMin(Math.min(30, breakMin + 1))}>+</Button>
              </div>
            </Card>
          </div>
        )}

        {/* Circular timer */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={isBreak ? "hsl(var(--emerald))" : "hsl(var(--accent))"}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold tabular-nums" dir="ltr">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
              {isBreak && <span className="text-xs text-secondary mt-1">استراحت</span>}
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12" onClick={resetTimer}>
            <RotateCcw className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            className="rounded-full h-16 w-16 gradient-primary text-primary-foreground shadow-lg"
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 mr-0.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl h-12 w-12"
            onClick={() => {
              if (isRunning && startedAtRef.current) {
                const elapsed = Math.round((Date.now() - new Date(startedAtRef.current).getTime()) / 60000);
                if (elapsed > 0) {
                  saveSession.mutate({
                    subject_id: subjectId || null,
                    duration_minutes: elapsed,
                    session_type: mode,
                    started_at: startedAtRef.current,
                    ended_at: new Date().toISOString(),
                  });
                  toast({ title: "جلسه ذخیره شد ✅" });
                }
              }
              resetTimer();
            }}
          >
            <Square className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
