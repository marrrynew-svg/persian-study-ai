import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, ChevronRight, ChevronLeft, Sparkles, Target, Brain, Sun, Moon, Zap, Coffee } from "lucide-react";
import type { ExamSetup, SubjectInput, StudyStyle, LevelKey, ReadingSpeed } from "@/lib/planino/v2/types";
import { runAnalysis } from "@/lib/planino/v2/pressureModel";
import { DiagnosisCard } from "@/components/plan/v2/DiagnosisCard";
import { useFinalizeWizard, useWizardState, useSaveWizardState } from "@/hooks/usePlanV2";
import type { StudyStyleExt, Chronotype, LearningPref, ReviewPref, PlanIntensity } from "@/lib/planino/v3/types";
import { useNavigate } from "react-router-dom";

const LEVELS: { key: LevelKey; label: string }[] = [
  { key: "very_weak", label: "خیلی ضعیف" }, { key: "weak", label: "ضعیف" },
  { key: "medium", label: "متوسط" }, { key: "good", label: "خوب" }, { key: "strong", label: "قوی" },
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

const DEFAULT_EXT: StudyStyleExt = {
  chronotype: "flexible", energy_peaks: ["morning"], dead_hours: [], nap_minutes: 0,
  stress_tolerance: 6, motivation_level: 7, failure_recovery: 6,
  learning_pref: "reading", review_pref: "tests", plan_intensity: "balanced",
  study_test_review_ratio: { study: 60, test: 25, review: 15 },
  simulation_days_per_week: 1, min_rest_days_per_week: 1,
  commute_minutes_per_day: 0, exercise_days_per_week: 2, target_rank: 3000, dream_universities: [],
};

const STEPS_META = [
  { icon: Target, label: "هدف و آزمون" },
  { icon: Sun, label: "کرونوتایپ و انرژی" },
  { icon: Coffee, label: "مسئولیت‌ها" },
  { icon: Brain, label: "روانشناسی یادگیری" },
  { icon: Zap, label: "نقشه دروس" },
  { icon: Sparkles, label: "استراتژی" },
  { icon: Moon, label: "تحلیل نهایی" },
];
const TOTAL = STEPS_META.length;

export default function SmartWizard() {
  const navigate = useNavigate();
  const finalize = useFinalizeWizard();
  const { data: saved } = useWizardState();
  const saveState = useSaveWizardState();

  const [step, setStep] = useState(0);
  const [exam, setExam] = useState<ExamSetup>({ exam_name: "", exam_type: "mixed", exam_date: "", exam_time: "" });
  const [subjects, setSubjects] = useState<SubjectInput[]>([{ ...EMPTY_SUBJECT, subject_name: "ریاضی" }]);
  const [style, setStyle] = useState<StudyStyle>(DEFAULT_STYLE);
  const [ext, setExt] = useState<StudyStyleExt>(DEFAULT_EXT);

  useEffect(() => {
    if (saved?.answers) {
      const a = saved.answers as any;
      if (a.exam) setExam(a.exam);
      if (a.subjects?.length) setSubjects(a.subjects);
      if (a.style) setStyle(a.style);
      if (a.styleExt) setExt({ ...DEFAULT_EXT, ...a.styleExt });
      if (typeof saved.current_step === "number" && !saved.completed) setStep(Math.min(saved.current_step, TOTAL - 1));
    }
  }, [saved]);

  useEffect(() => {
    saveState.mutate({ current_step: step, answers: { exam, subjects, style, styleExt: ext } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const previewAnalysis = exam.exam_date && subjects.length ? runAnalysis(exam, subjects, style) : null;
  const StepIcon = STEPS_META[step].icon;

  const updateSubject = (idx: number, patch: Partial<SubjectInput>) =>
    setSubjects(subjects.map((s, i) => i === idx ? { ...s, ...patch } : s));

  return (
    <AppLayout>
      <div className="px-4 pt-5 pb-8 max-w-lg mx-auto space-y-4" dir="rtl">
        <header>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <StepIcon className="w-5 h-5 text-primary" /> {STEPS_META[step].label}
          </h1>
          <p className="text-xs text-muted-foreground">مرحله {step + 1} از {TOTAL} · مشاور حرفه‌ای</p>
        </header>

        <div className="flex gap-1">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition ${
              i < step ? "bg-primary" : i === step ? "bg-gradient-to-r from-primary to-accent" : "bg-muted"
            }`} />
          ))}
        </div>

        {step === 0 && (
          <Card className="p-4 space-y-4 rounded-2xl backdrop-blur-xl bg-card/60 border-primary/20">
            <p className="text-xs text-muted-foreground">اطلاعات آزمون و اهدافت — پایه‌ی همه محاسبات.</p>
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
              <div><Label>تاریخ</Label><Input type="date" value={exam.exam_date} onChange={(e) => setExam({ ...exam, exam_date: e.target.value })} /></div>
              <div><Label>ساعت</Label><Input type="time" value={exam.exam_time || ""} onChange={(e) => setExam({ ...exam, exam_time: e.target.value })} /></div>
            </div>
            <NumField label="رتبه هدف" value={ext.target_rank || 0} onChange={(v) => setExt({ ...ext, target_rank: v })} />
            <div className="space-y-1">
              <Label>دانشگاه‌های آرزو (با ویرگول)</Label>
              <Input value={(ext.dream_universities || []).join("، ")}
                onChange={(e) => setExt({ ...ext, dream_universities: e.target.value.split(/[،,]/).map((x) => x.trim()).filter(Boolean).slice(0, 3) })}
                placeholder="شریف، تهران، بهشتی" />
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card className="p-4 space-y-4 rounded-2xl backdrop-blur-xl bg-card/60 border-accent/20">
            <p className="text-xs text-muted-foreground">مغزت چه ریتمی داره؟ برنامه دقیقاً بر اساس پیک انرژی تو چیده میشه.</p>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>بیداری واقعی</Label><Input type="time" value={style.wake_time} onChange={(e) => setStyle({ ...style, wake_time: e.target.value })} /></div>
              <div><Label>خواب واقعی</Label><Input type="time" value={style.sleep_time} onChange={(e) => setStyle({ ...style, sleep_time: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>کرونوتایپ (تیپ زمانی)</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["morning_lark","afternoon","night_owl","flexible"] as Chronotype[]).map((c) => (
                  <button key={c} onClick={() => setExt({ ...ext, chronotype: c })}
                    className={`text-xs py-2 rounded-xl border ${ext.chronotype === c ? "bg-primary/15 border-primary" : "bg-muted/30 border-border"}`}>
                    {c === "morning_lark" ? "🌅 چکاوک صبح" : c === "afternoon" ? "☀️ نیمروزی" : c === "night_owl" ? "🌙 جغد شب" : "🔀 منعطف"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>پیک‌های انرژیت (چندتایی)</Label>
              <div className="grid grid-cols-2 gap-2">
                {[{k:"morning",l:"🌅 صبح ۷-۱۱"},{k:"afternoon",l:"☀️ ظهر ۱۳-۱۷"},{k:"evening",l:"🌆 عصر ۱۸-۲۲"},{k:"late_night",l:"🌙 نیمه‌شب"}].map((p) => {
                  const on = (ext.energy_peaks || []).includes(p.k);
                  return (
                    <button key={p.k} onClick={() => {
                      const cur = new Set(ext.energy_peaks || []);
                      on ? cur.delete(p.k) : cur.add(p.k);
                      setExt({ ...ext, energy_peaks: Array.from(cur) });
                    }} className={`text-xs py-2 rounded-xl border ${on ? "bg-accent/20 border-accent" : "bg-muted/30 border-border"}`}>
                      {p.l}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs"><span>خواب نیم‌روز</span><span className="font-mono">{ext.nap_minutes} د</span></div>
              <Slider min={0} max={90} step={15} value={[ext.nap_minutes || 0]} onValueChange={(v) => setExt({ ...ext, nap_minutes: v[0] })} />
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-4 rounded-2xl space-y-4 backdrop-blur-xl bg-card/60">
            <p className="text-xs text-muted-foreground">مسئولیت‌های واقعی روزت رو بگو تا برنامه با زندگی‌ات جفت شه.</p>
            <div className="grid grid-cols-2 gap-2">
              <NumField label="ساعت روزانه در دسترس" value={style.daily_hours_available} step={0.5} onChange={(v) => setStyle({ ...style, daily_hours_available: v })} />
              <NumField label="ساعات تمرکز واقعی" value={style.real_focus_hours} step={0.5} onChange={(v) => setStyle({ ...style, real_focus_hours: v })} />
            </div>
            <ToggleRow label="مدرسه می‌روم" checked={style.has_school} onChange={(v) => setStyle({ ...style, has_school: v })} />
            <ToggleRow label="دانشگاه می‌روم" checked={style.has_university} onChange={(v) => setStyle({ ...style, has_university: v })} />
            <ToggleRow label="شاغل هستم" checked={style.has_work} onChange={(v) => setStyle({ ...style, has_work: v })} />
            <ToggleRow label="آخر هفته آزادم" checked={style.weekend_free} onChange={(v) => setStyle({ ...style, weekend_free: v })} />
            <div className="grid grid-cols-2 gap-2">
              <NumField label="رفت‌وآمد (دقیقه)" value={ext.commute_minutes_per_day || 0} onChange={(v) => setExt({ ...ext, commute_minutes_per_day: v })} />
              <NumField label="روزهای ورزش/هفته" value={ext.exercise_days_per_week || 0} onChange={(v) => setExt({ ...ext, exercise_days_per_week: v })} />
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-4 rounded-2xl space-y-4 backdrop-blur-xl bg-card/60">
            <p className="text-xs text-muted-foreground">روحیه و شیوه‌ی یادگیریت — تا برنامه با تو سازگار باشه.</p>
            <div className="space-y-2">
              <Label>یادگیری بهتر با</Label>
              <div className="grid grid-cols-4 gap-1">
                {([{k:"visual",l:"👁️ بصری"},{k:"audio",l:"🎧 شنیداری"},{k:"kinesthetic",l:"✋ عملی"},{k:"reading",l:"📖 خواندنی"}] as {k:LearningPref;l:string}[]).map((o) => (
                  <button key={o.k} onClick={() => setExt({ ...ext, learning_pref: o.k })}
                    className={`text-[11px] py-2 rounded-lg border ${ext.learning_pref === o.k ? "bg-primary/15 border-primary" : "bg-muted/30 border-border"}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>سبک مرور ترجیحی</Label>
              <div className="grid grid-cols-4 gap-1">
                {([{k:"flashcards",l:"🃏 فلش"},{k:"tests",l:"📝 تست"},{k:"summary",l:"📔 خلاصه"},{k:"teach_back",l:"🗣️ تدریس"}] as {k:ReviewPref;l:string}[]).map((o) => (
                  <button key={o.k} onClick={() => setExt({ ...ext, review_pref: o.k })}
                    className={`text-[11px] py-2 rounded-lg border ${ext.review_pref === o.k ? "bg-accent/20 border-accent" : "bg-muted/30 border-border"}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <ScaleSlider label="تحمل فشار" value={ext.stress_tolerance || 6} onChange={(v) => setExt({ ...ext, stress_tolerance: v })} lo="کم" hi="زیاد" />
            <ScaleSlider label="سطح انگیزه فعلی" value={ext.motivation_level || 7} onChange={(v) => setExt({ ...ext, motivation_level: v })} lo="پایین" hi="بالا" />
            <ScaleSlider label="ریکاوری بعد شکست" value={ext.failure_recovery || 6} onChange={(v) => setExt({ ...ext, failure_recovery: v })} lo="کند" hi="سریع" />
          </Card>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground px-1">برای هر درس: سطح، اهمیت، هدف و حجم باقی‌مانده رو دقیق وارد کن.</p>
            {subjects.map((s, idx) => (
              <Card key={idx} className="p-4 rounded-2xl space-y-3 backdrop-blur-xl bg-card/60">
                <div className="flex items-center justify-between">
                  <Input className="font-bold" value={s.subject_name}
                    onChange={(e) => updateSubject(idx, { subject_name: e.target.value })} placeholder="نام درس" />
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
                  <NumField label="جزوه" value={s.notes_left} onChange={(v) => updateSubject(idx, { notes_left: v })} />
                  <NumField label="ویدیو (د)" value={s.video_minutes_left} onChange={(v) => updateSubject(idx, { video_minutes_left: v })} />
                  <NumField label="ضریب" value={s.coefficient} step={0.5} onChange={(v) => updateSubject(idx, { coefficient: v })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">سطح فعلی</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {LEVELS.map((l) => (
                      <button key={l.key} onClick={() => updateSubject(idx, { current_level: l.key })}
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

        {step === 5 && (
          <Card className="p-4 rounded-2xl space-y-4 backdrop-blur-xl bg-card/60">
            <p className="text-xs text-muted-foreground">ریتم و استراتژی برنامه رو خودت تنظیم کن.</p>
            <div className="space-y-2">
              <Label>شدت برنامه</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["intense","balanced","relaxed"] as PlanIntensity[]).map((p) => (
                  <button key={p} onClick={() => setExt({ ...ext, plan_intensity: p })}
                    className={`text-xs py-2 rounded-xl border ${ext.plan_intensity === p ? "bg-primary/15 border-primary" : "bg-muted/30 border-border"}`}>
                    {p === "intense" ? "🔥 فشرده" : p === "balanced" ? "⚖️ متعادل" : "🌱 آرام"}
                  </button>
                ))}
              </div>
            </div>
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
            <div className="space-y-1">
              <div className="flex justify-between text-xs"><span>دقیقه تمرکز پیوسته</span><span className="font-mono">{style.focus_minutes}m</span></div>
              <Slider min={15} max={120} step={5} value={[style.focus_minutes]} onValueChange={(v) => setStyle({ ...style, focus_minutes: v[0] })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumField label="شبیه‌ساز/هفته" value={ext.simulation_days_per_week || 1} onChange={(v) => setExt({ ...ext, simulation_days_per_week: Math.max(0, Math.min(3, v)) })} />
              <NumField label="روز استراحت/هفته" value={ext.min_rest_days_per_week || 1} onChange={(v) => setExt({ ...ext, min_rest_days_per_week: Math.max(0, Math.min(3, v)) })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">نسبت مطالعه / تست / مرور</Label>
              <RatioSlider ratio={ext.study_test_review_ratio || { study: 60, test: 25, review: 15 }}
                onChange={(r) => setExt({ ...ext, study_test_review_ratio: r })} />
            </div>
          </Card>
        )}

        {step === 6 && previewAnalysis && (
          <div className="space-y-3">
            <DiagnosisCard risk={previewAnalysis.risk_level} daysLeft={previewAnalysis.days_left}
              dailyNeed={previewAnalysis.daily_need_minutes} dailyCap={previewAnalysis.daily_capacity_minutes}
              totalRequired={previewAnalysis.total_required_minutes} totalAvailable={previewAnalysis.total_available_minutes} />
            <Card className="p-4 rounded-2xl backdrop-blur-xl bg-card/60">
              <h3 className="font-bold mb-2">جزئیات تحلیل</h3>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {previewAnalysis.reasoning.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
              <div className="mt-3 text-xs">
                <div className="font-bold mb-1">نیاز هر درس:</div>
                {previewAnalysis.per_subject.map((p) => (
                  <div key={p.subject_name} className="flex justify-between py-1 border-b border-border/30">
                    <span>{p.subject_name}</span><span>{Math.round(p.required_minutes / 60)}h</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4 rounded-2xl bg-gradient-to-l from-primary/10 to-accent/10 border-primary/20">
              <div className="text-xs font-bold mb-1">پروفایل شخصیت مطالعه</div>
              <div className="text-[11px] text-muted-foreground leading-relaxed">
                کرونوتایپ <b className="text-primary">{ext.chronotype}</b> · انگیزه {ext.motivation_level}/10 · تحمل فشار {ext.stress_tolerance}/10 ·
                برنامه‌ی <b>{ext.plan_intensity}</b> · نسبت {ext.study_test_review_ratio?.study}/{ext.study_test_review_ratio?.test}/{ext.study_test_review_ratio?.review} ·
                {" "}{ext.simulation_days_per_week} شبیه‌ساز و {ext.min_rest_days_per_week} روز استراحت در هفته
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
          {step < TOTAL - 1 && (
            <Button className="flex-1" disabled={step === 0 && (!exam.exam_name || !exam.exam_date)} onClick={() => setStep(step + 1)}>
              بعدی <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
          )}
          {step === TOTAL - 1 && (
            <Button className="flex-1 gradient-primary text-primary-foreground" disabled={finalize.isPending}
              onClick={async () => {
                await finalize.mutateAsync({ exam, subjects, style, ext });
                navigate("/plan/today");
              }}>
              ساخت برنامه هوشمند ✨
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
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

function ScaleSlider({ label, value, onChange, lo, hi }: { label: string; value: number; onChange: (v: number) => void; lo: string; hi: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs"><span>{label}</span><span className="font-mono">{value}/10</span></div>
      <Slider min={1} max={10} step={1} value={[value]} onValueChange={(v) => onChange(v[0])} />
      <div className="flex justify-between text-[10px] text-muted-foreground"><span>{lo}</span><span>{hi}</span></div>
    </div>
  );
}

function RatioSlider({ ratio, onChange }: { ratio: { study: number; test: number; review: number }; onChange: (r: { study: number; test: number; review: number }) => void }) {
  const update = (key: "study" | "test" | "review", val: number) => {
    const others = (["study","test","review"] as const).filter((k) => k !== key);
    const remain = 100 - val;
    const cur = ratio[others[0]] + ratio[others[1]] || 1;
    const a = Math.round((ratio[others[0]] / cur) * remain);
    const b = remain - a;
    onChange({ ...ratio, [key]: val, [others[0]]: a, [others[1]]: b } as any);
  };
  return (
    <div className="space-y-3">
      {(["study","test","review"] as const).map((k) => (
        <div key={k} className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span>{k === "study" ? "📖 مطالعه" : k === "test" ? "📝 تست" : "🔁 مرور"}</span>
            <span className="font-mono">{ratio[k]}٪</span>
          </div>
          <Slider min={5} max={80} step={5} value={[ratio[k]]} onValueChange={(v) => update(k, v[0])} />
        </div>
      ))}
      <div className="h-2 rounded-full overflow-hidden flex">
        <div className="bg-blue-500" style={{ width: `${ratio.study}%` }} />
        <div className="bg-orange-500" style={{ width: `${ratio.test}%` }} />
        <div className="bg-emerald-500" style={{ width: `${ratio.review}%` }} />
      </div>
    </div>
  );
}