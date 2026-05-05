import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSubjects } from "@/hooks/useSubjects";
import { useSaveSession } from "@/hooks/useStudySessions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Play, Pause, X, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { createClientSessionId, secondsBetween } from "@/lib/studySession";

const QUOTES = [
  "موفقیت نتیجه عادت‌های روزانه است، نه تغییرات ناگهانی.",
  "هر روز یک قدم کوچک، بهتر از ایستادن است.",
  "تمرکز یعنی نه گفتن به هزار چیز دیگر.",
  "امروز درد می‌کشی، فردا قوی‌تر می‌شوی.",
  "بزرگ‌ترین سفر با یک قدم شروع می‌شود.",
  "تنها راه شکست، دست کشیدن است.",
  "مطالعه بهترین سرمایه‌گذاری است.",
];

export default function FocusMode() {
  const { data: subjects = [] } = useSubjects();
  const saveSession = useSaveSession();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [subjectId, setSubjectId] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [pausedElapsedSeconds, setPausedElapsedSeconds] = useState(0);
  const [nowMs, setNowMs] = useState(Date.now());
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  const seconds = pausedElapsedSeconds + (isRunning && startedAt ? secondsBetween(startedAt, new Date(nowMs).toISOString()) : 0);

  const start = () => {
    setStartedAt(new Date().toISOString());
    setIsRunning(true);
    setNowMs(Date.now());
  };

  const pause = () => {
    if (startedAt) setPausedElapsedSeconds((prev) => prev + secondsBetween(startedAt, new Date().toISOString()));
    setStartedAt(null);
    setIsRunning(false);
  };

  const handleStop = async () => {
    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(1, pausedElapsedSeconds + (startedAt ? secondsBetween(startedAt, endedAt) : 0));
    setIsRunning(false);
    try {
      await saveSession.mutateAsync({
        subject_id: subjectId || null,
        duration_seconds: durationSeconds,
        mode: "focus",
        session_type: "focus",
        source: "timer",
        started_at: startedAt || new Date(Date.now() - durationSeconds * 1000).toISOString(),
        ended_at: endedAt,
        client_session_id: createClientSessionId(),
      });
      toast({ title: `${durationSeconds < 60 ? `${durationSeconds} ثانیه` : `${Math.ceil(durationSeconds / 60)} دقیقه`} مطالعه ذخیره شد ✅` });
    } catch (error) {
      console.error("focus session save failed", error);
      toast({ title: "جلسه محلی ذخیره شد و بعداً همگام می‌شود", variant: "destructive" });
    }
    setPausedElapsedSeconds(0);
    setStartedAt(null);
  };

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const selectedSubject = subjects.find((s: any) => s.id === subjectId);

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col items-center justify-center p-6">
      <Button variant="ghost" size="icon" className="absolute top-4 left-4 rounded-xl" onClick={() => { if (seconds > 0) handleStop(); navigate(-1); }}>
        <X className="w-5 h-5" />
      </Button>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground text-center max-w-xs mb-12 leading-relaxed">
        «{quote}»
      </motion.p>

      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center mb-8">
        <p className="text-6xl font-bold tabular-nums tracking-wider" dir="ltr">
          {hours > 0 && `${String(hours).padStart(2, "0")}:`}
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </p>
        {selectedSubject && <p className="text-sm text-muted-foreground mt-3">{selectedSubject.icon} {selectedSubject.name}</p>}
      </motion.div>

      {!isRunning && seconds === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs mb-6">
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="انتخاب درس" /></SelectTrigger>
            <SelectContent>
              {subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </motion.div>
      )}

      <div className="flex items-center gap-4">
        {isRunning ? (
          <>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl" onClick={pause}><Pause className="w-5 h-5" /></Button>
            <Button size="icon" className="h-16 w-16 rounded-full bg-destructive text-destructive-foreground shadow-lg" onClick={handleStop}><Square className="w-6 h-6" /></Button>
          </>
        ) : (
          <Button size="icon" className="h-16 w-16 rounded-full gradient-primary text-primary-foreground shadow-lg" onClick={start}>
            <Play className="w-6 h-6 mr-0.5" />
          </Button>
        )}
      </div>

      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-3xl animate-pulse-gentle" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full bg-secondary/5 blur-3xl animate-pulse-gentle" style={{ animationDelay: "1s" }} />
      </div>
    </div>
  );
}
