import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSaveSession } from "@/hooks/useStudySessions";
import { useAddXP, useUpdateStreak } from "@/hooks/useGamification";
import { useToast } from "@/hooks/use-toast";
import { Plus, Clock, BookOpen, Zap } from "lucide-react";

interface Props {
  subjects: any[];
  children?: React.ReactNode;
}

const DURATIONS = [15, 25, 30, 45, 60, 90, 120];
const QUALITY_OPTIONS = [
  { value: "excellent", label: "عالی 🔥", emoji: "🔥" },
  { value: "good", label: "خوب 👍", emoji: "👍" },
  { value: "average", label: "متوسط 😐", emoji: "😐" },
  { value: "weak", label: "ضعیف 😓", emoji: "😓" },
];
const TAGS = ["مرور", "آزمون", "یادگیری", "جمع‌بندی"];

export function SessionLogDialog({ subjects, children }: Props) {
  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [duration, setDuration] = useState(25);
  const [quality, setQuality] = useState("good");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const saveSession = useSaveSession();
  const addXP = useAddXP();
  const updateStreak = useUpdateStreak();
  const { toast } = useToast();

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const started = new Date(now.getTime() - duration * 60000);

      await saveSession.mutateAsync({
        subject_id: subjectId || null,
        duration_minutes: duration,
        session_type: selectedTags[0] || "manual",
        started_at: started.toISOString(),
        ended_at: now.toISOString(),
      });

      const xpEarned = Math.round(duration * 2);
      await addXP.mutateAsync(xpEarned);
      await updateStreak.mutateAsync();

      toast({ title: `✅ جلسه ثبت شد! +${xpEarned} XP` });
      setOpen(false);
      setSubjectId("");
      setDuration(25);
      setQuality("good");
      setSelectedTags([]);
      setNotes("");
    } catch (e) {
      toast({ title: "خطا در ثبت جلسه", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="rounded-2xl gradient-primary text-primary-foreground gap-2 shadow-lg">
            <Plus className="w-4 h-4" />
            ثبت جلسه مطالعه
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[380px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">📝 ثبت جلسه مطالعه</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              <BookOpen className="w-3.5 h-3.5 inline ml-1" />
              درس
            </label>
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
          </div>

          {/* Duration */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              <Clock className="w-3.5 h-3.5 inline ml-1" />
              مدت (دقیقه)
            </label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    duration === d
                      ? "gradient-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              <Zap className="w-3.5 h-3.5 inline ml-1" />
              کیفیت جلسه
            </label>
            <div className="grid grid-cols-4 gap-2">
              {QUALITY_OPTIONS.map(q => (
                <button
                  key={q.value}
                  onClick={() => setQuality(q.value)}
                  className={`py-2 rounded-xl text-xs font-medium transition-all text-center ${
                    quality === q.value
                      ? "gradient-accent text-accent-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <div className="text-lg mb-0.5">{q.emoji}</div>
                  {q.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">🏷️ برچسب</label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedTags.includes(tag)
                      ? "gradient-emerald text-emerald-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">📌 یادداشت</label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثلاً: فصل ۳ ریاضی رو مرور کردم..."
              className="rounded-xl resize-none h-16 text-xs"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full rounded-xl gradient-primary text-primary-foreground h-11"
          >
            {loading ? "در حال ثبت..." : `ثبت جلسه (+${duration * 2} XP)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
