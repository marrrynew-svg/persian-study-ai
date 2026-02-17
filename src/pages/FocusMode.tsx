import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubjects } from "@/hooks/useSubjects";
import { useSaveSession } from "@/hooks/useStudySessions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Play, Pause, X, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

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
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startedAtRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    if (!startedAtRef.current) startedAtRef.current = new Date().toISOString();
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const handleStop = () => {
    setIsRunning(false);
    const mins = Math.round(seconds / 60);
    if (mins > 0 && startedAtRef.current) {
      saveSession.mutate({
        subject_id: subjectId || null,
        duration_minutes: mins,
        session_type: "focus",
        started_at: startedAtRef.current,
        ended_at: new Date().toISOString(),
      });
      toast({ title: `${mins} دقیقه مطالعه ذخیره شد ✅` });
    }
    setSeconds(0);
    startedAtRef.current = null;
  };

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const selectedSubject = subjects.find((s: any) => s.id === subjectId);

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col items-center justify-center p-6">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 rounded-xl"
        onClick={() => { if (isRunning) handleStop(); navigate(-1); }}
      >
        <X className="w-5 h-5" />
      </Button>

      {/* Quote */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-muted-foreground text-center max-w-xs mb-12 leading-relaxed"
      >
        «{quote}»
      </motion.p>

      {/* Timer display */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center mb-8"
      >
        <p className="text-6xl font-bold tabular-nums tracking-wider" dir="ltr">
          {hours > 0 && `${String(hours).padStart(2, "0")}:`}
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </p>
        {selectedSubject && (
          <p className="text-sm text-muted-foreground mt-3">
            {selectedSubject.icon} {selectedSubject.name}
          </p>
        )}
      </motion.div>

      {/* Subject selector (before starting) */}
      {!isRunning && seconds === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs mb-6">
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="انتخاب درس" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        {isRunning ? (
          <>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl" onClick={() => setIsRunning(false)}>
              <Pause className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              className="h-16 w-16 rounded-full bg-destructive text-destructive-foreground shadow-lg"
              onClick={handleStop}
            >
              <Square className="w-6 h-6" />
            </Button>
          </>
        ) : (
          <Button
            size="icon"
            className="h-16 w-16 rounded-full gradient-primary text-primary-foreground shadow-lg"
            onClick={() => setIsRunning(true)}
          >
            <Play className="w-6 h-6 mr-0.5" />
          </Button>
        )}
      </div>

      {/* Ambient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-3xl animate-pulse-gentle" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full bg-secondary/5 blur-3xl animate-pulse-gentle" style={{ animationDelay: "1s" }} />
      </div>
    </div>
  );
}
