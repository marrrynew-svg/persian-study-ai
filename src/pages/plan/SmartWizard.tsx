import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import type { ExamSetup, SubjectInput, StudyStyle, LevelKey, ReadingSpeed, LearningMode } from "@/lib/planino/v2/types";
import { runAnalysis } from "@/lib/planino/v2/pressureModel";
import { DiagnosisCard } from "@/components/plan/v2/DiagnosisCard";
import { useFinalizeWizard, useWizardState, useSaveWizardState } from "@/hooks/usePlanV2";
import { useNavigate } from "react-router-dom";

const LEVELS: { key: LevelKey; label: string }[] = [
  { key: "very_weak", label: "خیلی ضعیف" },
  { key: "weak", label: "ضعیف" },
  { key: "medium", label: "متوسط" },
  { key: "good", label: "خوب" },
  { key: "strong", label: "قوی" },
];

const EMPTY_SUBJECT: SubjectInput = {
  subject_name: "", chapters_total: 0, pages_left: 0, tests_left: 0,
  notes_left: 0, video_minutes_left: 0, current_level: "medium",
  importance: 3, coefficient: 1, target_percent: 70,
};

const DEFAULT_STYLE: StudyStyle = {
  daily_hours_available: 6, real_focus_hours: 4,
  wake_time: "07:00", sleep_time: "23:30",
  has_school: false, has_university: false, has_work: false, weekend_free: true,
  reading_speed: "medium", learning_mode: "mixed", focus_minutes: 45,
  test_days_per_week: 3, review_count_per_week: 2,
};

export default function SmartWizard() {
  const navigate = useNavigate();
  const finalize = useFinalizeWizard();
  const { data: saved } = useWizardState();
  const saveState = useSaveWizardState();

  const [step, setStep] = useState(0);
  const [exam, setExam] = useState<ExamSetup>({ exam_name: "", exam_type: "mixed", exam_date: "", exam_time: "" });
  const [subjects, setSubjects] = useState<SubjectInput[]>([{ ...EMPTY_SUBJECT, subject_name: "ریاضی" }]);
  const [style, setStyle] = useState<StudyStyle>(DEFAULT_STYLE);

  // Restore
  useEffect(() => {
    if (saved?.answers) {
      const a = saved.answers as any;
      if (a.exam) setExam(a.exam);
      if (a.subjects?.length) setSubjects(a.subjects);
      if (a.style) setStyle(a.style);
      if (typeof saved.current_step === "number" && !saved.completed) setStep(saved.current_step);
    }
  }, [saved]);

  // Autosave per step change
  useEffect(() => {
    saveState.mutate({ current_step: step, answers: { exam, subjects, style } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const previewAnalysis = exam.exam_date && subjects.length
    ? runAnalysis(exam, subjects, style)
    : null;

  return (
    <AppLayout>
      <div className="px-4 pt-5 pb-8 max-w-lg mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> مشاور هوشمند
            </h1>
            <p className="text-xs text-muted-foreground">مرحله {step + 1} از 5</p>
          </div>
        </header>

        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 0 && (
          <Card className="p-4 space-y-4 rounded-2xl">
            <h2 className="font-bold">اطلاعات آزمون</h2>
            <div className="space-y-2">
              <Label>نام آزمون</Label>
              <Input value={exam.exam_name} onChange={(e) => setExam({ ...exam, exam_name: e.target.value })} placeholder="مثلا کنکور ۱۴۰۵" />
            </div>
            <div className="space-y-2">
              <Label>نوع آزمون</Label>
              <Tabs value={exam.exam_type} onValueChange={(v) => setExam({ ...exam, exam_type: v as any })}>
                <TabsList className="w-full">
                  <TabsTrigger className="flex-1" value="test">تستی</TabsTrigger>
                  <TabsTrigger className="flex-1" value="essay">تشریحی</TabsTrigger>
                  <TabsTrigger className="flex-1" value="mixed">ترکیبی</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>تاریخ آزمون</Label>
                <Input type="date" value={exam.exam_date} onChange={(e) => setExam({ ...exam, exam_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>ساعت آزمون</Label>
                <Input type="time" value={exam.exam_time || ""} onChange={(e) => setExam({ ...exam, exam_time: e.target.value })} />
              </div>
            </div>
          </Card>
        )}

        {step === 1 && (
          <div className="space-y-3">
            {subjects.map((s, idx) => (
              <Card key={idx} className="p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <Input className="font-bold" value={s.subject_name}
                    onChange={(e) => updateSubject(idx, { subject_name: e.target.value })}
                    placeholder="نام درس" />
                  {subjects.length > 1 && (
                    <Button size="icon" variant="ghost" onClick={() => setSubjects(subjects.filter((_, i) => i !== idx))}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumField label="فصل‌ها" value={s.chapters_total} onChange={(v) => updateSubject(idx, { chapters_total: v })} />
                  <NumField label="صفحات باقی" value={s.pages_left} onChange={(v) => updateSubject(idx, { pages_left: v })} />
                  <NumField label="تست باقی" value={s.tests_left} onChange={(v) => updateSubject(idx, { tests_left: v })} />
                  <NumField label="جزوه باقی" value={s.notes_left} onChange={(v) => updateSubject(idx, { notes_left: v })} />
                  <NumField label="ویدیو (دقیقه)" value={s.video_minutes_left} onChange={(v) => updateSubject(idx, { video_minutes_left: v })} />
                  <NumField label="ضریب" value={s.coefficient} step={0.5} onChange={(v) => updateSubject(idx, { coefficient: v })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">سطح فعلی</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {LEVELS.map((l) => (
                      <button key={l.key}
                        onClick={() => updateSubject(idx, { current_level: l.key })}
                        className={`text-[10px] py-1.5 rounded-lg border ${s.current_level === l.key ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border"}`}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>اهمیت</span><span>{s.importance}/5</span></div>
                  <Slider min={1} max={5} step={1} value={[s.importance]} onValueChange={(v) => updateSubject(idx, { importance: v[0] })} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>درصد هدف</span><span>{s.target_percent}%</span></div>
                  <Slider min={20} max={100} step={5} value={[s.target_percent]} onValueChange={(v) => updateSubject(idx, { target_percent: v[0] })} />
                </div>
              </Card>
            ))}
            <Button variant="outline" className="w-full" onClick={() => setSubjects([...subjects, { ...EMPTY_SUBJECT }])}>
              <Plus className="w-4 h-4 ml-1" /> افزودن درس
            </Button>
          </div>
        )}

        {step === 2 && (
          <Card className="p-4 rounded-2xl space-y-4">
            <h2 className="font-bold">سبک زندگی</h2>
            <div className="grid grid-cols-2 gap-2">
              <NumField label="ساعت روزانه قابل‌دسترس" value={style.daily_hours_available} step={0.5} onChange={(v) => setStyle({ ...style, daily_hours_available: v })} />
              <NumField label="ساعات تمرکز واقعی" value={style.real_focus_hours} step={0.5} onChange={(v) => setStyle({ ...style, real_focus_hours: v })} />
              <div><Label>بیداری</Label><Input type="time" value={style.wake_time} onChange={(e) => setStyle({ ...style, wake_time: e.target.value })} /></div>
              <div><Label>خواب</Label><Input type="time" value={style.sleep_time} onChange={(e) => setStyle({ ...style, sleep_time: e.target.value })} /></div>
            </div>
            <ToggleRow label="مدرسه می‌روم" checked={style.has_school} onChange={(v) => setStyle({ ...style, has_school: v })} />
            <ToggleRow label="دانشگاه می‌روم" checked={style.has_university} onChange={(v) => setStyle({ ...style, has_university: v })} />
            <ToggleRow label="شاغل هستم" checked={style.has_work} onChange={(v) => setStyle({ ...style, has_work: v })} />
            <ToggleRow label="آخر هفته آزادم" checked={style.weekend_free} onChange={(v) => setStyle({ ...style, weekend_free: v })} />
          </Card>
        )}

        {step === 3 && (
          <Card className="p-4 rounded-2xl space-y-4">
            <h2 className="font-bold">سبک مطالعه</h2>
            <div className="space-y-2">
              <Label>سرعت مطالعه</Label>
              <Tabs value={style.reading_speed} onValueChange={(v) => setStyle({ ...style, reading_speed: v as ReadingSpeed })}>
                <TabsList className="w-full">
                  <TabsTrigger className="flex-1" value="slow">کند</TabsTrigger>
                  <TabsTrigger className="flex-1" value="medium">متوسط</TabsTrigger>
                  <TabsTrigger className="flex-1" value="fast">سریع</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-2">
              <Label>یادگیری بهتر با</Label>
              <Tabs value={style.learning_mode} onValueChange={(v) => setStyle({ ...style, learning_mode: v as LearningMode })}>
                <TabsList className="w-full">
                  <TabsTrigger className="flex-1" value="book">کتاب</TabsTrigger>
                  <TabsTrigger className="flex-1" value="video">ویدیو</TabsTrigger>
                  <TabsTrigger className="flex-1" value="mixed">ترکیبی</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs"><span>دقیقه تمرکز بدون حواس‌پرتی</span><span>{style.focus_minutes}m</span></div>
              <Slider min={15} max={120} step={5} value={[style.focus_minutes]} onValueChange={(v) => setStyle({ ...style, focus_minutes: v[0] })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumField label="روزهای تست در هفته" value={style.test_days_per_week} onChange={(v) => setStyle({ ...style, test_days_per_week: v })} />
              <NumField label="دفعات مرور در هفته" value={style.review_count_per_week} onChange={(v) => setStyle({ ...style, review_count_per_week: v })} />
            </div>
          </Card>
        )}

        {step === 4 && previewAnalysis && (
          <div className="space-y-3">
            <DiagnosisCard
              risk={previewAnalysis.risk_level}
              daysLeft={previewAnalysis.days_left}
              dailyNeed={previewAnalysis.daily_need_minutes}
              dailyCap={previewAnalysis.daily_capacity_minutes}
              totalRequired={previewAnalysis.total_required_minutes}
              totalAvailable={previewAnalysis.total_available_minutes}
            />
            <Card className="p-4 rounded-2xl">
              <h3 className="font-bold mb-2">جزئیات تحلیل</h3>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {previewAnalysis.reasoning.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
              <div className="mt-3 text-xs">
                <div className="font-bold mb-1">نیاز هر درس:</div>
                {previewAnalysis.per_subject.map((p) => (
                  <div key={p.subject_name} className="flex justify-between py-1 border-b border-border/30">
                    <span>{p.subject_name}</span>
                    <span>{Math.round(p.required_minutes / 60)}h</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
              <ChevronRight className="w-4 h-4 ml-1" /> قبلی
            </Button>
          )}
          {step < 4 && (
            <Button className="flex-1" disabled={step === 0 && (!exam.exam_name || !exam.exam_date)} onClick={() => setStep(step + 1)}>
              بعدی <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
          )}
          {step === 4 && (
            <Button className="flex-1 gradient-primary text-primary-foreground" disabled={finalize.isPending}
              onClick={async () => {
                await finalize.mutateAsync({ exam, subjects, style });
                navigate("/plan/today");
              }}>
              ساخت برنامه هوشمند ✨
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );

  function updateSubject(idx: number, patch: Partial<SubjectInput>) {
    setSubjects(subjects.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }
}

function NumField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}