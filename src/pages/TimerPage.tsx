import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSubjects } from "@/hooks/useSubjects";
import { useSaveSession } from "@/hooks/useStudySessions";
import { useAddXP, useAwardBadge, useWeeklyChallenges, useUpdateStreak, BADGE_DEFINITIONS } from "@/hooks/useGamification";
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
const DEFAULT_WORK_SECONDS = 25 * 60;

export default function TimerPage() {
  const { data: subjects = [] } = useSubjects();
  const saveSession = useSaveSession();
  const addXP = useAddXP();
  const updateStreak = useUpdateStreak();
  const awardBadge = useAwardBadge();
  const { updateChallenge } = useWeeklyChallenges();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [subjectId, setSubjectId] = useState("");
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [totalSeconds, setTotalSeconds] = useState(DEFAULT_WORK_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [pausedAt, setPausedAt] = useState<string | null>(null);
  const [pausedElapsedSeconds, setPausedElapsedSeconds] = useState(0);
  const [nowMs, setNowMs] = useState(Date.now());
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [saving, setSaving] = useState(false);

  const elapsedSeconds = Math.max(
    0,
    pausedElapsedSeconds + (isRunning && startedAt ? secondsBetween(startedAt, new Date(nowMs).toISOString()) : 0),
  );
  const remainingSeconds = mode === "pomodoro" ? Math.max(totalSeconds - elapsedSeconds, 0) : elapsedSeconds;

  const persistTimer = useCallback((override: Partial<PersistedTimer> = {}) => {
    const state: PersistedTimer = {
      mode,
      subjectId,
      workMin,
      breakMin,
      totalSeconds,
      isRunning,
      isBreak,
      startedAt,
      pausedAt,
      pausedElapsedSeconds,
      sessionsCompleted,
      ...override,
    };
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  }, [breakMin, isBreak, isRunning, mode, pausedAt, pausedElapsedSeconds, sessionsCompleted, startedAt, subjectId, totalSeconds, workMin]);

  useEffect(() => {
    const saved = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!saved) return;
    try {
      const state = JSON.parse(saved) as PersistedTimer;
      setMode(state.mode || "pomodoro");
      setSubjectId(state.subjectId || "");
      setWorkMin(state.workMin || 25);
      setBreakMin(state.breakMin || 5);
      setTotalSeconds(state.totalSeconds || DEFAULT_WORK_SECONDS);
      setIsRunning(Boolean(state.isRunning));
      setIsBreak(Boolean(state.isBreak));
      setStartedAt(state.startedAt || null);
      setPausedAt(state.pausedAt || null);
      setPausedElapsedSeconds(Math.max(0, state.pausedElapsedSeconds || 0));
      setSessionsCompleted(state.sessionsCompleted || 0);
    } catch {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    persistTimer();
  }, [persistTimer]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  const rewardSession = async (durationSeconds: number) => {
    const xpEarned = Math.max(1, Math.round(durationSeconds / 30));
    const streakResult = await updateStreak.mutateAsync();
    await addXP.mutateAsync(xpEarned);
    await updateChallenge.mutateAsync({ challenge_type: "sessions", increment: 1 });
    await updateChallenge.mutateAsync({ challenge_type: "study_hours", increment: Math.max(1, Math.round(durationSeconds / 3600)) });

    if (sessionsCompleted === 0) {
      await awardBadge.mutateAsync(BADGE_DEFINITIONS.find((b) => b.badge_type === "first_session")!).catch(() => {});
    }

    const currentStreak = (streakResult as any)?.streak || 0;
    if (currentStreak >= 3) await awardBadge.mutateAsync(BADGE_DEFINITIONS.find((b) => b.badge_type === "streak_3")!).catch(() => {});
    if (currentStreak >= 7) await awardBadge.mutateAsync(BADGE_DEFINITIONS.find((b) => b.badge_type === "streak_7")!).catch(() => {});
    return xpEarned;
  };

  const saveCurrentSession = async (reason: "stop" | "complete" | "interrupt" = "stop") => {
    if (saving || isBreak || !startedAt) return false;
    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(1, secondsBetween(startedAt, endedAt) + pausedElapsedSeconds);
    setSaving(true);
    try {
      await saveSession.mutateAsync({
        subject_id: subjectId || null,
        started_at: startedAt,
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        mode,
        session_type: mode,
        source: "timer",
        client_session_id: createClientSessionId(),
        completed: reason === "complete" || reason === "stop",
      });
      const xpEarned = await rewardSession(durationSeconds);
      setSessionsCompleted((prev) => prev + 1);
      toast({ title: `✅ ${formatStudyDuration(durationSeconds)} ذخیره شد · +${xpEarned} XP` });
      return true;
    } catch (error) {
      console.error("timer session save failed", error);
      toast({ title: "جلسه محلی ذخیره شد؛ با برگشت اینترنت همگام می‌شود", variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isRunning || mode !== "pomodoro" || isBreak || elapsedSeconds < totalSeconds) return;
    const complete = async () => {
      await saveCurrentSession("complete");
      const breakSecs = breakMin * 60;
      setIsBreak(true);
      setPausedElapsedSeconds(0);
      setStartedAt(new Date().toISOString());
      setTotalSeconds(breakSecs);
    };
    complete();
  }, [breakMin, elapsedSeconds, isBreak, isRunning, mode, totalSeconds]);

  useEffect(() => {
    if (!isRunning || mode !== "pomodoro" || !isBreak || elapsedSeconds < totalSeconds) return;
    toast({ title: "استراحت تموم شد؛ آماده دور بعدی؟ 💪" });
    setIsRunning(false);
    setIsBreak(false);
    setStartedAt(null);
    setPausedAt(null);
    setPausedElapsedSeconds(0);
    setTotalSeconds(workMin * 60);
  }, [elapsedSeconds, isBreak, isRunning, mode, toast, totalSeconds, workMin]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isRunning && startedAt && !isBreak) persistTimer({ isRunning: true });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isBreak, isRunning, persistTimer, startedAt]);

  const startTimer = () => {
    const now = new Date().toISOString();
    setStartedAt(now);
    setPausedAt(null);
    setIsRunning(true);
    setNowMs(Date.now());
  };

  const pauseTimer = () => {
    if (!startedAt) return;
    const now = new Date().toISOString();
    setPausedElapsedSeconds((prev) => prev + secondsBetween(startedAt, now));
    setPausedAt(now);
    setStartedAt(null);
    setIsRunning(false);
  };

  const resumeTimer = () => {
    setStartedAt(new Date().toISOString());
    setPausedAt(null);
    setIsRunning(true);
  };

  const resetTimer = useCallback(async () => {
    if ((isRunning || pausedElapsedSeconds > 0) && startedAt && !isBreak) await saveCurrentSession("interrupt");
    setIsRunning(false);
    setIsBreak(false);
    setStartedAt(null);
    setPausedAt(null);
    setPausedElapsedSeconds(0);
    setTotalSeconds(mode === "pomodoro" ? workMin * 60 : 0);
    localStorage.removeItem(TIMER_STORAGE_KEY);
  }, [isBreak, isRunning, mode, pausedElapsedSeconds, startedAt, workMin]);

  const handleStop = async () => {
    await saveCurrentSession("stop");
    setIsRunning(false);
    setIsBreak(false);
    setStartedAt(null);
    setPausedAt(null);
    setPausedElapsedSeconds(0);
    setTotalSeconds(mode === "pomodoro" ? workMin * 60 : 0);
    localStorage.removeItem(TIMER_STORAGE_KEY);
  };

  const switchMode = (nextMode: TimerMode) => {
    if (isRunning || elapsedSeconds > 0) return;
    setMode(nextMode);
    setIsBreak(false);
    setPausedElapsedSeconds(0);
    setStartedAt(null);
    setPausedAt(null);
    setTotalSeconds(nextMode === "pomodoro" ? workMin * 60 : 0);
  };

  useEffect(() => {
    if (mode === "pomodoro" && !isRunning && !startedAt && pausedElapsedSeconds === 0 && !isBreak) {
      setTotalSeconds(workMin * 60);
    }
  }, [isBreak, isRunning, mode, pausedElapsedSeconds, startedAt, workMin]);

  const progress = mode === "pomodoro" && totalSeconds > 0 ? Math.min((elapsedSeconds / totalSeconds) * 100, 100) : 100;
  const displaySeconds = mode === "pomodoro" ? remainingSeconds : elapsedSeconds;
  const minutes = Math.floor(displaySeconds / 60);
  const seconds = displaySeconds % 60;
  const size = 240;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;
  const xpPreview = Math.max(0, Math.round(elapsedSeconds / 30));

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">تایمر مطالعه</h1>
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate("/focus")}> 
            <Maximize2 className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant={mode === "pomodoro" ? "default" : "ghost"} onClick={() => switchMode("pomodoro")} disabled={isRunning || elapsedSeconds > 0} className="flex-1 rounded-xl">
            🍅 پومودورو
          </Button>
          <Button variant={mode === "stopwatch" ? "default" : "ghost"} onClick={() => switchMode("stopwatch")} disabled={isRunning || elapsedSeconds > 0} className="flex-1 rounded-xl">
            ⏱ آزاد
          </Button>
        </div>

        <Select value={subjectId} onValueChange={setSubjectId} disabled={isRunning}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="انتخاب درس (اختیاری)" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {mode === "pomodoro" && !isRunning && elapsedSeconds === 0 && (
          <div className="flex gap-3">
            <Card className="glass rounded-xl p-3 flex-1 text-center">
              <p className="text-xs text-muted-foreground mb-1">مطالعه (دقیقه)</p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWorkMin(Math.max(1, workMin - 5))}>-</Button>
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

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
          <div className="relative" style={{ width: size, height: size }}>
            {isRunning && !isBreak && <div className="absolute inset-8 rounded-full blur-2xl opacity-20 gradient-primary animate-pulse-gentle" />}
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
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold tabular-nums" dir="ltr">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
              {isBreak ? (
                <span className="text-sm text-emerald mt-1 font-medium">⛅ استراحت</span>
              ) : isRunning || elapsedSeconds > 0 ? (
                <div className="flex items-center gap-1 mt-1">
                  <Zap className="w-3 h-3 text-accent" />
                  <span className="text-xs text-accent">+{xpPreview} XP</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground mt-1">{mode === "pomodoro" ? "پومودورو" : "آزاد"}</span>
              )}
              {sessionsCompleted > 0 && (
                <div className="flex gap-1 mt-2">
                  {Array.from({ length: Math.min(sessionsCompleted, 4) }).map((_, i) => <div key={i} className="w-2 h-2 rounded-full bg-accent" />)}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12" onClick={resetTimer} disabled={saving}>
            <RotateCcw className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            className="rounded-full h-16 w-16 gradient-primary text-primary-foreground shadow-lg shadow-primary/30"
            onClick={() => (isRunning ? pauseTimer() : elapsedSeconds > 0 ? resumeTimer() : startTimer())}
            disabled={saving || isBreak}
          >
            {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 mr-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12" onClick={handleStop} disabled={saving || (!isRunning && elapsedSeconds === 0)}>
            <Square className="w-5 h-5" />
          </Button>
        </div>

        {!isRunning && (
          <Card className="glass rounded-xl p-3">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Zap className="w-3.5 h-3.5 text-accent" />
              <span>{pausedAt ? "تایمر متوقفه؛ ادامه بده یا ذخیره کن" : "حتی ۱ ثانیه مطالعه هم ذخیره می‌شود"}</span>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
