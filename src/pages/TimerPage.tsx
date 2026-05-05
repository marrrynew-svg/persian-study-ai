import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSubjects } from "@/hooks/useSubjects";
import { useSaveSession } from "@/hooks/useStudySessions";
import { useAddXP, useAwardBadge, useWeeklyChallenges, useUpdateStreak, useUserXP, BADGE_DEFINITIONS } from "@/hooks/useGamification";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Square, RotateCcw, Maximize2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { createClientSessionId, formatStudyDuration, secondsBetween } from "@/lib/studySession";

type TimerMode = "pomodoro" | "stopwatch";

type PersistedTimer = {
  mode: TimerMode;
  subjectId: string;
  workMin: number;
  breakMin: number;
  totalSeconds: number;
  isRunning: boolean;
  isBreak: boolean;
  startedAt: string | null;
  pausedAt: string | null;
  pausedElapsedSeconds: number;
  sessionsCompleted: number;
};

const TIMER_STORAGE_KEY = "konkur-active-study-timer";

export default function TimerPage() {
  const { data: subjects = [] } = useSubjects();
  const saveSession = useSaveSession();
  const addXP = useAddXP();
  const updateStreak = useUpdateStreak();
  const awardBadge = useAwardBadge();
  const { data: xp } = useUserXP();
  const { updateChallenge } = useWeeklyChallenges();
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
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
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

  const handleSessionComplete = async (durationMin: number, sType: string) => {
    const xpEarned = Math.round(durationMin * 2); // 2 XP per minute
    await saveSession.mutateAsync({
      subject_id: subjectId || null,
      duration_minutes: durationMin,
      session_type: sType,
      started_at: startedAtRef.current!,
      ended_at: new Date().toISOString(),
    });

    // Update streak — checks last_study_date automatically
    const streakResult = await updateStreak.mutateAsync();

    await addXP.mutateAsync(xpEarned);
    await updateChallenge.mutateAsync({ challenge_type: "sessions", increment: 1 });
    await updateChallenge.mutateAsync({ challenge_type: "study_hours", increment: Math.round(durationMin / 60) });

    // Award first session badge
    if (sessionsCompleted === 0) {
      await awardBadge.mutateAsync(BADGE_DEFINITIONS.find(b => b.badge_type === "first_session")!);
    }

    // Streak milestone badges
    const currentStreak = (streakResult as any)?.streak || 0;
    if (currentStreak >= 3) await awardBadge.mutateAsync(BADGE_DEFINITIONS.find(b => b.badge_type === "streak_3")!).catch(() => {});
    if (currentStreak >= 7) await awardBadge.mutateAsync(BADGE_DEFINITIONS.find(b => b.badge_type === "streak_7")!).catch(() => {});

    setSessionsCompleted(prev => prev + 1);

    const streakMsg = (streakResult as any)?.isNewDay && (streakResult as any)?.streak > 1
      ? ` 🔥 استریک ${(streakResult as any).streak} روزه!` : "";
    toast({ title: `🎉 آفرین! +${xpEarned} XP کسب کردی${streakMsg}` });
  };

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
            handleSessionComplete(workMin, "pomodoro");
            setIsBreak(true);
            startedAtRef.current = new Date().toISOString();
            const breakSecs = breakMin * 60;
            setTotalSeconds(breakSecs);
            return breakSecs;
          } else {
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
              handleSessionComplete(Math.round(totalSeconds / 60), "custom");
              startedAtRef.current = null;
            }
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, mode, isBreak, workMin, breakMin, subjectId, totalSeconds]);

  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const size = 240;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  const xpPerMin = 2;
  const minutesElapsed = totalSeconds > 0 ? Math.round((totalSeconds - remainingSeconds) / 60) : 0;

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
          <Button variant={mode === "pomodoro" ? "default" : "ghost"} onClick={() => { setMode("pomodoro"); resetTimer(); }} className="flex-1 rounded-xl">
            🍅 پومودورو
          </Button>
          <Button variant={mode === "custom" ? "default" : "ghost"} onClick={() => { setMode("custom"); setTotalSeconds(30 * 60); setRemainingSeconds(30 * 60); }} className="flex-1 rounded-xl">
            ⏱ آزاد
          </Button>
        </div>

        {/* Subject selector */}
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="انتخاب درس (اختیاری)" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Pomodoro settings */}
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
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
          <div className="relative" style={{ width: size, height: size }}>
            {/* Background glow */}
            {isRunning && !isBreak && (
              <div className="absolute inset-8 rounded-full blur-2xl opacity-20 gradient-primary animate-pulse-gentle" />
            )}
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
              {isBreak ? (
                <span className="text-sm text-emerald mt-1 font-medium">⛅ استراحت</span>
              ) : isRunning ? (
                <div className="flex items-center gap-1 mt-1">
                  <Zap className="w-3 h-3 text-accent" />
                  <span className="text-xs text-accent">+{minutesElapsed * xpPerMin} XP</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground mt-1">{mode === "pomodoro" ? "پومودورو" : "آزاد"}</span>
              )}
              {sessionsCompleted > 0 && (
                <div className="flex gap-1 mt-2">
                  {Array.from({ length: Math.min(sessionsCompleted, 4) }).map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-accent" />
                  ))}
                </div>
              )}
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
            className="rounded-full h-16 w-16 gradient-primary text-primary-foreground shadow-lg shadow-primary/30"
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
                  handleSessionComplete(elapsed, mode);
                }
              }
              resetTimer();
            }}
          >
            <Square className="w-5 h-5" />
          </Button>
        </div>

        {/* XP hint */}
        {!isRunning && (
          <Card className="glass rounded-xl p-3">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Zap className="w-3.5 h-3.5 text-accent" />
              <span>هر دقیقه مطالعه = {xpPerMin} XP کسب می‌کنی</span>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
