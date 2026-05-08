import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateSession } from "@/hooks/useStudySessions";
import { useSubjects } from "@/hooks/useSubjects";
import { useToast } from "@/hooks/use-toast";
import { getSessionMinutes } from "@/lib/studySession";

interface Props {
  session: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUALITIES = [
  { v: "excellent", l: "عالی 🔥" },
  { v: "good", l: "خوب 👍" },
  { v: "average", l: "متوسط 😐" },
  { v: "weak", l: "ضعیف 😓" },
];

function toLocalInput(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SessionEditDialog({ session, open, onOpenChange }: Props) {
  const { data: subjects = [] } = useSubjects();
  const update = useUpdateSession();
  const { toast } = useToast();

  const [subjectId, setSubjectId] = useState<string>(session?.subject_id || "");
  const [startedAt, setStartedAt] = useState(toLocalInput(session?.started_at));
  const [minutes, setMinutes] = useState<number>(getSessionMinutes(session) || 25);
  const [sessionType, setSessionType] = useState<string>(session?.session_type || "timer");
  const [quality, setQuality] = useState<string>(session?.quality || "good");
  const [notes, setNotes] = useState<string>(session?.notes || "");

  useEffect(() => {
    if (!session) return;
    setSubjectId(session.subject_id || "");
    setStartedAt(toLocalInput(session.started_at));
    setMinutes(getSessionMinutes(session) || 25);
    setSessionType(session.session_type || "timer");
    setQuality(session.quality || "good");
    setNotes(session.notes || "");
  }, [session?.id]);

  const handleSave = async () => {
    if (!session) return;
    const startISO = new Date(startedAt).toISOString();
    const endISO = new Date(new Date(startedAt).getTime() + minutes * 60000).toISOString();
    try {
      await update.mutateAsync({
        id: session.id,
        before: {
          subject_id: session.subject_id,
          started_at: session.started_at,
          duration_minutes: getSessionMinutes(session),
          session_type: session.session_type,
          quality: session.quality,
          notes: session.notes,
        },
        patch: {
          subject_id: subjectId || null,
          started_at: startISO,
          ended_at: endISO,
          duration_minutes: minutes,
          session_type: sessionType,
          quality,
          notes,
        },
      });
      toast({ title: "✅ جلسه ویرایش شد" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "خطا در ویرایش", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">✏️ ویرایش جلسه</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">درس</label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="انتخاب درس" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">تاریخ و ساعت شروع</label>
              <Input type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} className="rounded-xl text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">مدت (دقیقه)</label>
              <Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value)))} className="rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">نوع جلسه</label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="timer">⏱ تایمر</SelectItem>
                  <SelectItem value="pomodoro">🍅 پومودورو</SelectItem>
                  <SelectItem value="manual">✍️ دستی</SelectItem>
                  <SelectItem value="مرور">🔁 مرور</SelectItem>
                  <SelectItem value="آزمون">📝 آزمون</SelectItem>
                  <SelectItem value="یادگیری">📖 یادگیری</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">کیفیت</label>
              <Select value={quality} onValueChange={setQuality}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUALITIES.map((q) => <SelectItem key={q.v} value={q.v}>{q.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">یادداشت</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl resize-none h-16 text-xs" placeholder="اختیاری..." />
          </div>
          <Button onClick={handleSave} disabled={update.isPending} className="w-full rounded-xl gradient-primary text-primary-foreground h-10">
            {update.isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
