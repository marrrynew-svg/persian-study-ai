import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useUpsertExam, useUpsertTopics } from "@/hooks/useExams";
import { useLearningProfile, DEFAULT_PROFILE } from "@/hooks/useLearningProfile";
import { useSubjects } from "@/hooks/useSubjects";
import { estimateTopic, feasibilityVerdict } from "@/lib/estimationEngine";
import { toast } from "sonner";

type DraftTopic = {
  title: string;
  subject_id: string | null;
  total_pages: number;
  total_video_minutes: number;
  difficulty: number;
  revisions_needed: number;
  needs_practice_tests: boolean;
};

const emptyTopic = (): DraftTopic => ({
  title: "", subject_id: null, total_pages: 0, total_video_minutes: 0,
  difficulty: 3, revisions_needed: 2, needs_practice_tests: true,
});

export function ExamWizard({ open, onOpenChange, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; onSaved?: () => void;
}) {
  const upsertExam = useUpsertExam();
  const upsertTopics = useUpsertTopics();
  const { data: profile } = useLearningProfile();
  const { data: subjects = [] } = useSubjects();

  const [step, setStep] = useState(1);
  const [exam, setExam] = useState({
    title: "", exam_type: "mixed" as const,
    exam_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    priority: 3, difficulty: 3, importance: 3, target_score: null as number | null,
  });
  const [topics, setTopics] = useState<DraftTopic[]>([emptyTopic()]);

  const p = profile || (DEFAULT_PROFILE as any);

  const estimates = useMemo(() => topics.map((t) => estimateTopic(t, p)), [topics, p]);
  const totalMin = estimates.reduce((a, e) => a + e.totalMin, 0);
  const daysLeft = Math.max(1, Math.ceil((new Date(exam.exam_date).getTime() - Date.now()) / 86400000));
  const dailyCap = (p.weekly_available_hours / 7) * 60;
  const verdict = feasibilityVerdict(totalMin, daysLeft, dailyCap);

  const reset = () => {
    setStep(1);
    setExam({ title: "", exam_type: "mixed", exam_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0], priority: 3, difficulty: 3, importance: 3, target_score: null });
    setTopics([emptyTopic()]);
  };

  const save = async () => {
    if (!exam.title.trim()) return toast.error("عنوان آزمون رو وارد کن");
    if (topics.every((t) => !t.title.trim())) return toast.error("حداقل یک سرفصل اضافه کن");
    try {
      const savedExam = await upsertExam.mutateAsync({ ...exam } as any);
      const validTopics = topics
        .filter((t) => t.title.trim())
        .map((t, idx) => ({
          ...t,
          exam_id: savedExam.id,
          estimated_minutes: estimates[idx].totalMin,
          order_index: idx,
        }));
      if (validTopics.length) await upsertTopics.mutateAsync(validTopics as any);
      toast.success("آزمون اضافه شد ✅");
      onSaved?.();
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast.error(e.message || "خطا در ذخیره");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ساخت آزمون · مرحله {step} از ۳</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3 text-sm">
            <div>
              <Label>عنوان آزمون</Label>
              <Input value={exam.title} onChange={(e) => setExam({ ...exam, title: e.target.value })} placeholder="مثلاً: امتحان نهایی زیست" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>نوع آزمون</Label>
                <Select value={exam.exam_type} onValueChange={(v: any) => setExam({ ...exam, exam_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">تستی</SelectItem>
                    <SelectItem value="descriptive">تشریحی</SelectItem>
                    <SelectItem value="mixed">ترکیبی</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>تاریخ آزمون</Label>
                <Input type="date" value={exam.exam_date} onChange={(e) => setExam({ ...exam, exam_date: e.target.value })} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1"><Label>اولویت</Label><span className="text-xs">{exam.priority}/5</span></div>
              <Slider value={[exam.priority]} min={1} max={5} step={1} onValueChange={(v) => setExam({ ...exam, priority: v[0] })} />
            </div>
            <div>
              <div className="flex justify-between mb-1"><Label>سختی</Label><span className="text-xs">{exam.difficulty}/5</span></div>
              <Slider value={[exam.difficulty]} min={1} max={5} step={1} onValueChange={(v) => setExam({ ...exam, difficulty: v[0] })} />
            </div>
            <div>
              <div className="flex justify-between mb-1"><Label>اهمیت</Label><span className="text-xs">{exam.importance}/5</span></div>
              <Slider value={[exam.importance]} min={1} max={5} step={1} onValueChange={(v) => setExam({ ...exam, importance: v[0] })} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">سرفصل‌ها رو اضافه کن. تخمین زمان به صورت زنده محاسبه میشه.</p>
            {topics.map((t, idx) => (
              <Card key={idx} className="p-3 space-y-2">
                <div className="flex gap-2">
                  <Input className="flex-1" placeholder={`سرفصل ${idx + 1}`} value={t.title}
                    onChange={(e) => setTopics(topics.map((x, i) => i === idx ? { ...x, title: e.target.value } : x))} />
                  {topics.length > 1 && (
                    <Button size="icon" variant="ghost" onClick={() => setTopics(topics.filter((_, i) => i !== idx))}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <Select value={t.subject_id ?? "_none"} onValueChange={(v) => setTopics(topics.map((x, i) => i === idx ? { ...x, subject_id: v === "_none" ? null : v } : x))}>
                  <SelectTrigger><SelectValue placeholder="درس مرتبط" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— بدون درس —</SelectItem>
                    {subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">صفحات</Label>
                    <Input type="number" min={0} value={t.total_pages} onChange={(e) => setTopics(topics.map((x, i) => i === idx ? { ...x, total_pages: Number(e.target.value) || 0 } : x))} />
                  </div>
                  <div>
                    <Label className="text-[10px]">دقیقه ویدیو</Label>
                    <Input type="number" min={0} value={t.total_video_minutes} onChange={(e) => setTopics(topics.map((x, i) => i === idx ? { ...x, total_video_minutes: Number(e.target.value) || 0 } : x))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between"><Label className="text-[10px]">سختی</Label><span className="text-[10px]">{t.difficulty}/5</span></div>
                    <Slider value={[t.difficulty]} min={1} max={5} step={1} onValueChange={(v) => setTopics(topics.map((x, i) => i === idx ? { ...x, difficulty: v[0] } : x))} />
                  </div>
                  <div>
                    <div className="flex justify-between"><Label className="text-[10px]">دفعات مرور</Label><span className="text-[10px]">{t.revisions_needed}</span></div>
                    <Slider value={[t.revisions_needed]} min={0} max={5} step={1} onValueChange={(v) => setTopics(topics.map((x, i) => i === idx ? { ...x, revisions_needed: v[0] } : x))} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>تست‌زنی نیاز داره؟</span>
                  <Switch checked={t.needs_practice_tests} onCheckedChange={(v) => setTopics(topics.map((x, i) => i === idx ? { ...x, needs_practice_tests: v } : x))} />
                </div>
                <div className="text-xs bg-muted/50 rounded-lg p-2">
                  ⏱️ تخمین: <strong>{estimates[idx].totalMin} دقیقه</strong>
                  <span className="text-muted-foreground"> (مطالعه {estimates[idx].studyMin} + مرور {estimates[idx].reviewMin} + تست {estimates[idx].testMin})</span>
                </div>
              </Card>
            ))}
            <Button variant="outline" className="w-full gap-1.5 rounded-xl" onClick={() => setTopics([...topics, emptyTopic()])}>
              <Plus className="w-4 h-4" /> سرفصل جدید
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <Card className="p-4 gradient-primary text-primary-foreground">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5" /><span className="font-semibold">پیش‌نمایش هوشمند</span>
              </div>
              <div className="text-xs opacity-90 space-y-1">
                <div>📚 سرفصل‌ها: {topics.filter(t => t.title.trim()).length}</div>
                <div>⏱️ کل زمان مورد نیاز: <strong>{Math.round(totalMin / 60)} ساعت {totalMin % 60} دقیقه</strong></div>
                <div>📅 روز تا آزمون: {daysLeft}</div>
                <div>🎯 ظرفیت روزانه شما: ~{Math.round(dailyCap)} دقیقه</div>
              </div>
            </Card>
            <Card className={`p-3 ${verdict.status === "ok" ? "bg-emerald-500/10" : verdict.status === "tight" ? "bg-amber-500/10" : "bg-destructive/10"}`}>
              <div className="text-sm font-medium">{verdict.message}</div>
            </Card>
            <div className="text-xs text-muted-foreground">
              بعد از ذخیره، روی نقشه راه «بازسازی برنامه» رو بزن تا بلوک‌های روزانه ساخته بشن.
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && <Button variant="ghost" onClick={() => setStep(step - 1)} className="gap-1"><ArrowRight className="w-4 h-4" />قبلی</Button>}
          {step < 3 && <Button onClick={() => setStep(step + 1)} className="gap-1 gradient-primary text-primary-foreground">بعدی<ArrowLeft className="w-4 h-4" /></Button>}
          {step === 3 && (
            <Button onClick={save} disabled={upsertExam.isPending || upsertTopics.isPending} className="gradient-primary text-primary-foreground">
              {upsertExam.isPending || upsertTopics.isPending ? "در حال ذخیره…" : "ذخیره آزمون"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}