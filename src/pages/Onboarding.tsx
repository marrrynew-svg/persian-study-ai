import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft, ChevronRight, SkipForward, User, GraduationCap,
  Target, BarChart3, Brain, CalendarDays, Heart, Palette, Sparkles,
  Check, Rocket, Moon, Sun
} from "lucide-react";

const TOTAL_STEPS = 9;

const STEP_ICONS = [User, GraduationCap, Target, BarChart3, Brain, CalendarDays, Heart, Palette, Sparkles];
const STEP_TITLES = [
  "آشنایی اولیه",
  "وضعیت تحصیلی",
  "اهداف تو",
  "ارزیابی وضعیت فعلی",
  "سبک یادگیری",
  "برنامه هفتگی",
  "انگیزه و چالش‌ها",
  "شخصی‌سازی ظاهری",
  "خلاصه هوشمند",
];
const STEP_SUBTITLES = [
  "بذار یکم باهم آشنا بشیم 😊",
  "بگو الان تو چه مرحله‌ای هستی",
  "هدفت چیه و کجا می‌خوای برسی؟ 🎯",
  "بذار ببینم الان وضعیت مطالعه‌ات چطوریه",
  "هرکسی یه جور یاد می‌گیره، تو چطوری؟ 🧠",
  "بذار برنامه هفتگی‌ات رو بشناسم 📅",
  "انگیزه‌ات چیه و از چی نگرانی؟ 💪",
  "اپلیکیشن رو به سلیقه خودت دربیار 🎨",
  "خلاصه‌ای از همه چیز ✨",
];

const EDUCATION_LEVELS = [
  { value: "elementary", label: "دبستان", emoji: "📗" },
  { value: "middle_school", label: "متوسطه اول", emoji: "📘" },
  { value: "high_school", label: "دبیرستان", emoji: "📙" },
  { value: "konkur", label: "داوطلب کنکور", emoji: "🎯" },
  { value: "university", label: "دانشجوی دانشگاه", emoji: "🎓" },
  { value: "graduate", label: "فارغ‌التحصیل", emoji: "🏅" },
];

const FIELDS_OF_STUDY = [
  { value: "تجربی", label: "تجربی", emoji: "🔬" },
  { value: "ریاضی", label: "ریاضی", emoji: "🧮" },
  { value: "انسانی", label: "انسانی", emoji: "📖" },
  { value: "هنر", label: "هنر", emoji: "🎨" },
];

const CHALLENGES = [
  { value: "focus", label: "تمرکز", emoji: "🧠" },
  { value: "time_management", label: "مدیریت زمان", emoji: "⏰" },
  { value: "motivation", label: "انگیزه", emoji: "💪" },
  { value: "heavy_workload", label: "حجم زیاد مطالب", emoji: "📚" },
  { value: "understanding", label: "فهم مطالب", emoji: "🤔" },
];

const STUDY_TIMES = [
  { value: "morning", label: "صبح زود", emoji: "🌅" },
  { value: "late_morning", label: "اواسط صبح", emoji: "☀️" },
  { value: "afternoon", label: "بعد از ظهر", emoji: "🌤" },
  { value: "evening", label: "عصر", emoji: "🌆" },
  { value: "night", label: "شب", emoji: "🌙" },
  { value: "late_night", label: "آخر شب", emoji: "🦉" },
];

const LEARNING_STYLES = [
  { value: "visual", label: "دیداری (ویدیو و تصویر)", emoji: "👁" },
  { value: "auditory", label: "شنیداری (پادکست و کلاس)", emoji: "👂" },
  { value: "reading", label: "خواندنی (کتاب و جزوه)", emoji: "📖" },
  { value: "kinesthetic", label: "عملی (حل تمرین و تست)", emoji: "✍️" },
];

const STUDY_ENVIRONMENTS = [
  { value: "home", label: "خونه", emoji: "🏠" },
  { value: "library", label: "کتابخانه", emoji: "📚" },
  { value: "cafe", label: "کافه", emoji: "☕" },
  { value: "study_hall", label: "سالن مطالعه", emoji: "🏫" },
];

const TONES = [
  { value: "strict", label: "جدی و سخت‌گیر", emoji: "💼" },
  { value: "friendly", label: "دوستانه و مهربون", emoji: "😊" },
  { value: "calm", label: "آرام و صبور", emoji: "🧘" },
];

const DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];

type OnboardingData = {
  display_name: string;
  age: string;
  gender: string;
  city: string;
  education_level: string;
  // Academic
  field_of_study: string;
  konkur_year: string;
  target_rank: string;
  last_exam_rank: string;
  daily_hours: string;
  university_major: string;
  current_semester: string;
  current_gpa: string;
  target_gpa: string;
  semester_credits: string;
  grade_level: string;
  average_grades: string;
  // Goals
  main_goal: string;
  goal_timeline: string;
  // Assessment
  avg_daily_study_hours: string;
  plan_adherence: string;
  biggest_challenge: string;
  // Learning style
  best_study_time: string;
  learning_style: string;
  study_environment: string;
  // Schedule
  weekly_schedule: Record<string, { wake: string; sleep: string; free: string }>;
  // Motivation
  motivation_reason: string;
  biggest_fear: string;
  planning_experience: string;
  preferred_tone: string;
  // Visual
  color_theme: string;
  dark_mode: boolean;
  reminder_intensity: string;
  reminder_type: string;
};

const defaultSchedule = () => {
  const s: Record<string, { wake: string; sleep: string; free: string }> = {};
  DAYS.forEach(d => { s[d] = { wake: "07:00", sleep: "23:00", free: "4" }; });
  return s;
};

export default function Onboarding() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    display_name: "", age: "", gender: "", city: "", education_level: "",
    field_of_study: "", konkur_year: "", target_rank: "", last_exam_rank: "", daily_hours: "4",
    university_major: "", current_semester: "", current_gpa: "", target_gpa: "", semester_credits: "",
    grade_level: "", average_grades: "",
    main_goal: "", goal_timeline: "",
    avg_daily_study_hours: "4", plan_adherence: "50", biggest_challenge: "",
    best_study_time: "", learning_style: "", study_environment: "",
    weekly_schedule: defaultSchedule(),
    motivation_reason: "", biggest_fear: "", planning_experience: "", preferred_tone: "friendly",
    color_theme: "default", dark_mode: false, reminder_intensity: "medium", reminder_type: "notification",
  });

  // Pre-fill from profile
  useEffect(() => {
    if (profile) {
      setData(prev => ({
        ...prev,
        display_name: profile.display_name || "",
        field_of_study: profile.field_of_study || "",
        daily_hours: String(profile.daily_hours || 4),
        target_rank: profile.target_rank ? String(profile.target_rank) : "",
        education_level: (profile as any).education_level || "",
        age: (profile as any).age ? String((profile as any).age) : "",
        gender: (profile as any).gender || "",
        city: (profile as any).city || "",
      }));
      if ((profile as any).onboarding_step) {
        setStep(Math.min((profile as any).onboarding_step, TOTAL_STEPS));
      }
    }
  }, [profile]);

  const set = (key: keyof OnboardingData, value: any) =>
    setData(prev => ({ ...prev, [key]: value }));

  const saveProgress = async (nextStep: number) => {
    if (!user) return;
    try {
      const updates: any = {
        display_name: data.display_name || null,
        age: data.age ? Number(data.age) : null,
        gender: data.gender || null,
        city: data.city || null,
        education_level: data.education_level || null,
        field_of_study: data.field_of_study || null,
        konkur_year: data.konkur_year ? Number(data.konkur_year) : null,
        target_rank: data.target_rank ? Number(data.target_rank) : null,
        last_exam_rank: data.last_exam_rank ? Number(data.last_exam_rank) : null,
        daily_hours: Number(data.daily_hours) || 4,
        university_major: data.university_major || null,
        current_semester: data.current_semester ? Number(data.current_semester) : null,
        current_gpa: data.current_gpa ? Number(data.current_gpa) : null,
        target_gpa: data.target_gpa ? Number(data.target_gpa) : null,
        semester_credits: data.semester_credits ? Number(data.semester_credits) : null,
        grade_level: data.grade_level || null,
        average_grades: data.average_grades ? Number(data.average_grades) : null,
        main_goal: data.main_goal || null,
        goal_timeline: data.goal_timeline || null,
        avg_daily_study_hours: data.avg_daily_study_hours ? Number(data.avg_daily_study_hours) : null,
        plan_adherence: data.plan_adherence ? Number(data.plan_adherence) : null,
        biggest_challenge: data.biggest_challenge || null,
        best_study_time: data.best_study_time || null,
        learning_style: data.learning_style || null,
        study_environment: data.study_environment || null,
        weekly_schedule: data.weekly_schedule,
        motivation_reason: data.motivation_reason || null,
        biggest_fear: data.biggest_fear || null,
        planning_experience: data.planning_experience || null,
        preferred_tone: data.preferred_tone || null,
        color_theme: data.color_theme || null,
        reminder_intensity: data.reminder_intensity || null,
        reminder_type: data.reminder_type || null,
        onboarding_step: nextStep,
      };
      await supabase.from("profiles").update(updates).eq("user_id", user.id);
    } catch (e) {
      console.error("Auto-save error:", e);
    }
  };

  const goNext = async () => {
    if (step < TOTAL_STEPS) {
      const next = step + 1;
      setDirection(1);
      setStep(next);
      await saveProgress(next);
      if (next === TOTAL_STEPS) generateSummary();
    }
  };

  const goPrev = () => {
    if (step > 1) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const skipStep = async () => {
    await goNext();
  };

  const finishOnboarding = async () => {
    setSaving(true);
    try {
      await supabase.from("profiles").update({
        onboarding_completed: true,
        onboarding_step: TOTAL_STEPS,
      }).eq("user_id", user!.id);
      toast({ title: "🎉 خوش اومدی!", description: "حالا بریم یه برنامه درست و حسابی بچینیم!" });
      navigate("/");
    } catch {
      toast({ title: "خطا", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const generateSummary = async () => {
    setLoadingSummary(true);
    try {
      const prompt = `تو یه مشاور تحصیلی هوشمند هستی. بر اساس اطلاعات زیر، یه خلاصه تحلیلی ۴-۵ خطی به فارسی عامیانه و انگیزشی بنویس:
      نام: ${data.display_name}
      سن: ${data.age}
      مقطع: ${data.education_level}
      رشته: ${data.field_of_study}
      هدف رتبه: ${data.target_rank}
      ساعت مطالعه روزانه: ${data.daily_hours}
      بزرگترین چالش: ${data.biggest_challenge}
      بهترین زمان مطالعه: ${data.best_study_time}
      سبک یادگیری: ${data.learning_style}
      انگیزه: ${data.motivation_reason}
      بزرگترین ترس: ${data.biggest_fear}
      لحن مورد علاقه: ${data.preferred_tone}
      
      خلاصه باید شامل: وضعیت فعلی، نقاط قوت، چالش‌ها، و یه جمله انگیزشی باشه.`;

      const { data: fnData, error } = await supabase.functions.invoke("study-advisor", {
        body: { message: prompt, userId: user!.id, mode: "strategy" },
      });
      if (error) throw error;
      setAiSummary(fnData?.reply || "آماده‌ایم که با هم شروع کنیم! 🚀");
    } catch {
      setAiSummary(`سلام ${data.display_name || "رفیق"}! 🎉\n\nبر اساس اطلاعاتی که دادی، یه برنامه اختصاصی برات آماده می‌کنم. بزرگترین چالشت ${data.biggest_challenge === "focus" ? "تمرکز" : data.biggest_challenge === "motivation" ? "انگیزه" : "مدیریت زمان"} هست و بهترین زمان مطالعه‌ات ${data.best_study_time === "night" ? "شبه" : "صبحه"}. با هم می‌تونیم بهش برسیم! 💪`);
    } finally {
      setLoadingSummary(false);
    }
  };

  const OptionCard = ({ selected, onClick, emoji, label, subtitle }: { selected: boolean; onClick: () => void; emoji: string; label: string; subtitle?: string }) => (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`w-full p-3 rounded-2xl border-2 text-right transition-all ${
        selected
          ? "border-primary bg-primary/10 shadow-md"
          : "border-border bg-card hover:border-primary/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1">
          <p className="font-medium text-sm">{label}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {selected && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-primary-foreground" />
          </motion.div>
        )}
      </div>
    </motion.button>
  );

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسمت چیه؟ 😊</Label>
              <Input value={data.display_name} onChange={e => set("display_name", e.target.value)} placeholder="مثلاً علی" className="rounded-xl text-lg h-12" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>چند سالته؟</Label>
                <Input type="number" value={data.age} onChange={e => set("age", e.target.value)} placeholder="مثلاً ۱۷" className="rounded-xl" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>شهر</Label>
                <Input value={data.city} onChange={e => set("city", e.target.value)} placeholder="مثلاً تهران" className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>جنسیت</Label>
              <div className="grid grid-cols-3 gap-2">
                <OptionCard selected={data.gender === "male"} onClick={() => set("gender", "male")} emoji="👦" label="پسر" />
                <OptionCard selected={data.gender === "female"} onClick={() => set("gender", "female")} emoji="👧" label="دختر" />
                <OptionCard selected={data.gender === "other"} onClick={() => set("gender", "other")} emoji="🙂" label="ترجیح نمیدم" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>مقطع تحصیلی</Label>
              <div className="grid grid-cols-2 gap-2">
                {EDUCATION_LEVELS.map(l => (
                  <OptionCard key={l.value} selected={data.education_level === l.value} onClick={() => set("education_level", l.value)} emoji={l.emoji} label={l.label} />
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        if (data.education_level === "konkur") {
          return (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>رشته کنکور</Label>
                <div className="grid grid-cols-2 gap-2">
                  {FIELDS_OF_STUDY.map(f => (
                    <OptionCard key={f.value} selected={data.field_of_study === f.value} onClick={() => set("field_of_study", f.value)} emoji={f.emoji} label={f.label} />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>سال کنکور</Label>
                  <Input type="number" value={data.konkur_year} onChange={e => set("konkur_year", e.target.value)} placeholder="۱۴۰۴" className="rounded-xl" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>رتبه هدف</Label>
                  <Input type="number" value={data.target_rank} onChange={e => set("target_rank", e.target.value)} placeholder="مثلاً ۵۰۰" className="rounded-xl" dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>آخرین رتبه آزمون</Label>
                  <Input type="number" value={data.last_exam_rank} onChange={e => set("last_exam_rank", e.target.value)} placeholder="اختیاری" className="rounded-xl" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>ساعت مطالعه روزانه</Label>
                  <Input type="number" value={data.daily_hours} onChange={e => set("daily_hours", e.target.value)} placeholder="۶" className="rounded-xl" dir="ltr" min={1} max={16} />
                </div>
              </div>
            </div>
          );
        }
        if (data.education_level === "university") {
          return (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>رشته دانشگاهی</Label>
                <Input value={data.university_major} onChange={e => set("university_major", e.target.value)} placeholder="مثلاً مهندسی کامپیوتر" className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>ترم چندمی؟</Label>
                  <Input type="number" value={data.current_semester} onChange={e => set("current_semester", e.target.value)} placeholder="مثلاً ۳" className="rounded-xl" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>تعداد واحد</Label>
                  <Input type="number" value={data.semester_credits} onChange={e => set("semester_credits", e.target.value)} placeholder="مثلاً ۱۸" className="rounded-xl" dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>معدل فعلی</Label>
                  <Input type="number" step="0.1" value={data.current_gpa} onChange={e => set("current_gpa", e.target.value)} placeholder="مثلاً ۱۶.۵" className="rounded-xl" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>معدل هدف</Label>
                  <Input type="number" step="0.1" value={data.target_gpa} onChange={e => set("target_gpa", e.target.value)} placeholder="مثلاً ۱۸" className="rounded-xl" dir="ltr" />
                </div>
              </div>
            </div>
          );
        }
        // School students
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>پایه تحصیلی</Label>
              <Select value={data.grade_level} onValueChange={v => set("grade_level", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="انتخاب کن" /></SelectTrigger>
                <SelectContent>
                  {["هفتم", "هشتم", "نهم", "دهم", "یازدهم", "دوازدهم"].map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>معدل تقریبی</Label>
              <Input type="number" step="0.1" value={data.average_grades} onChange={e => set("average_grades", e.target.value)} placeholder="مثلاً ۱۸.۵" className="rounded-xl" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>ساعت مطالعه روزانه</Label>
              <Input type="number" value={data.daily_hours} onChange={e => set("daily_hours", e.target.value)} placeholder="مثلاً ۳" className="rounded-xl" dir="ltr" min={1} max={16} />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>هدف اصلیت چیه؟ 🎯</Label>
              <Textarea value={data.main_goal} onChange={e => set("main_goal", e.target.value)} placeholder="مثلاً قبولی در رشته پزشکی دانشگاه تهران..." className="rounded-xl min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <Label>چه مدت وقت داری به هدفت برسی؟</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "3_months", label: "۳ ماه", emoji: "⚡" },
                  { value: "6_months", label: "۶ ماه", emoji: "📅" },
                  { value: "1_year", label: "یک سال", emoji: "🗓" },
                  { value: "more", label: "بیشتر", emoji: "🔮" },
                ].map(t => (
                  <OptionCard key={t.value} selected={data.goal_timeline === t.value} onClick={() => set("goal_timeline", t.value)} emoji={t.emoji} label={t.label} />
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>به طور میانگین روزی چند ساعت مطالعه می‌کنی؟</Label>
              <div className="flex items-center gap-3">
                <Input type="range" min={0} max={16} step={0.5} value={data.avg_daily_study_hours} onChange={e => set("avg_daily_study_hours", e.target.value)} className="flex-1" />
                <span className="text-lg font-bold w-12 text-center" dir="ltr">{data.avg_daily_study_hours}h</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>چقدر به برنامه‌ات پایبندی؟</Label>
              <div className="flex items-center gap-3">
                <Input type="range" min={0} max={100} step={5} value={data.plan_adherence} onChange={e => set("plan_adherence", e.target.value)} className="flex-1" />
                <span className="text-lg font-bold w-12 text-center" dir="ltr">{data.plan_adherence}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>بزرگترین چالشت چیه؟</Label>
              <div className="grid grid-cols-1 gap-2">
                {CHALLENGES.map(c => (
                  <OptionCard key={c.value} selected={data.biggest_challenge === c.value} onClick={() => set("biggest_challenge", c.value)} emoji={c.emoji} label={c.label} />
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>بهترین زمان مطالعه‌ات کیه؟</Label>
              <div className="grid grid-cols-2 gap-2">
                {STUDY_TIMES.map(t => (
                  <OptionCard key={t.value} selected={data.best_study_time === t.value} onClick={() => set("best_study_time", t.value)} emoji={t.emoji} label={t.label} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>چه جوری بهتر یاد می‌گیری؟</Label>
              <div className="grid grid-cols-1 gap-2">
                {LEARNING_STYLES.map(s => (
                  <OptionCard key={s.value} selected={data.learning_style === s.value} onClick={() => set("learning_style", s.value)} emoji={s.emoji} label={s.label} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>کجا بهتر مطالعه می‌کنی؟</Label>
              <div className="grid grid-cols-2 gap-2">
                {STUDY_ENVIRONMENTS.map(e => (
                  <OptionCard key={e.value} selected={data.study_environment === e.value} onClick={() => set("study_environment", e.value)} emoji={e.emoji} label={e.label} />
                ))}
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">برای هر روز هفته ساعت بیداری، خواب و ساعت آزاد مطالعه رو وارد کن:</p>
            <div className="space-y-3">
              {DAYS.map(day => (
                <Card key={day} className="rounded-2xl p-3 bg-card">
                  <p className="font-medium text-sm mb-2">{day}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px]">بیداری</Label>
                      <Input
                        type="time"
                        value={data.weekly_schedule[day]?.wake || "07:00"}
                        onChange={e => {
                          const s = { ...data.weekly_schedule };
                          s[day] = { ...s[day], wake: e.target.value };
                          set("weekly_schedule", s);
                        }}
                        className="rounded-lg h-8 text-xs"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">خواب</Label>
                      <Input
                        type="time"
                        value={data.weekly_schedule[day]?.sleep || "23:00"}
                        onChange={e => {
                          const s = { ...data.weekly_schedule };
                          s[day] = { ...s[day], sleep: e.target.value };
                          set("weekly_schedule", s);
                        }}
                        className="rounded-lg h-8 text-xs"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">ساعت آزاد</Label>
                      <Input
                        type="number"
                        value={data.weekly_schedule[day]?.free || "4"}
                        onChange={e => {
                          const s = { ...data.weekly_schedule };
                          s[day] = { ...s[day], free: e.target.value };
                          set("weekly_schedule", s);
                        }}
                        className="rounded-lg h-8 text-xs"
                        dir="ltr"
                        min={0}
                        max={16}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>چرا می‌خوای موفق بشی؟ 💪</Label>
              <Textarea value={data.motivation_reason} onChange={e => set("motivation_reason", e.target.value)} placeholder="دلیل اصلیت رو بنویس..." className="rounded-xl min-h-[70px]" />
            </div>
            <div className="space-y-2">
              <Label>بزرگترین ترست چیه؟ 😰</Label>
              <Textarea value={data.biggest_fear} onChange={e => set("biggest_fear", e.target.value)} placeholder="مثلاً قبول نشدن..." className="rounded-xl min-h-[70px]" />
            </div>
            <div className="space-y-2">
              <Label>قبلاً برنامه‌ریزی تحصیلی داشتی؟</Label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: "none", label: "نه، تازه شروع می‌کنم", emoji: "🌱" },
                  { value: "some", label: "یکم، ولی جدی نبوده", emoji: "📝" },
                  { value: "experienced", label: "آره، باتجربه‌ام", emoji: "⭐" },
                ].map(p => (
                  <OptionCard key={p.value} selected={data.planning_experience === p.value} onClick={() => set("planning_experience", p.value)} emoji={p.emoji} label={p.label} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>دوست داری AI چه لحنی باهات حرف بزنه؟</Label>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map(t => (
                  <OptionCard key={t.value} selected={data.preferred_tone === t.value} onClick={() => set("preferred_tone", t.value)} emoji={t.emoji} label={t.label} />
                ))}
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>حالت نمایش</Label>
              <div className="grid grid-cols-2 gap-2">
                <OptionCard selected={!data.dark_mode} onClick={() => { set("dark_mode", false); if (theme === "dark") toggleTheme(); }} emoji="☀️" label="روشن" />
                <OptionCard selected={data.dark_mode} onClick={() => { set("dark_mode", true); if (theme === "light") toggleTheme(); }} emoji="🌙" label="تاریک" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>شدت یادآوری‌ها</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "low", label: "کم", emoji: "🔕" },
                  { value: "medium", label: "متوسط", emoji: "🔔" },
                  { value: "high", label: "زیاد", emoji: "🔊" },
                ].map(r => (
                  <OptionCard key={r.value} selected={data.reminder_intensity === r.value} onClick={() => set("reminder_intensity", r.value)} emoji={r.emoji} label={r.label} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>نوع یادآوری</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "notification", label: "نوتیفیکیشن", emoji: "📱" },
                  { value: "sound", label: "صدا", emoji: "🔊" },
                  { value: "vibration", label: "لرزش", emoji: "📳" },
                  { value: "silent", label: "بی‌صدا", emoji: "🔇" },
                ].map(r => (
                  <OptionCard key={r.value} selected={data.reminder_type === r.value} onClick={() => set("reminder_type", r.value)} emoji={r.emoji} label={r.label} />
                ))}
              </div>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-4">
            {loadingSummary ? (
              <div className="flex flex-col items-center justify-center py-10 gap-4">
                <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">در حال تحلیل اطلاعاتت... 🧠</p>
              </div>
            ) : (
              <>
                <Card className="rounded-2xl p-5 gradient-primary text-primary-foreground">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="font-bold">تحلیل هوشمند</h3>
                  </div>
                  <p className="text-sm leading-7 whitespace-pre-line opacity-90">{aiSummary}</p>
                </Card>

                {/* Quick summary cards */}
                <div className="grid grid-cols-2 gap-3">
                  {data.display_name && (
                    <Card className="rounded-2xl p-3 bg-card">
                      <p className="text-[10px] text-muted-foreground">نام</p>
                      <p className="font-semibold text-sm">{data.display_name}</p>
                    </Card>
                  )}
                  {data.education_level && (
                    <Card className="rounded-2xl p-3 bg-card">
                      <p className="text-[10px] text-muted-foreground">مقطع</p>
                      <p className="font-semibold text-sm">{EDUCATION_LEVELS.find(e => e.value === data.education_level)?.label}</p>
                    </Card>
                  )}
                  {data.field_of_study && (
                    <Card className="rounded-2xl p-3 bg-card">
                      <p className="text-[10px] text-muted-foreground">رشته</p>
                      <p className="font-semibold text-sm">{data.field_of_study}</p>
                    </Card>
                  )}
                  {data.target_rank && (
                    <Card className="rounded-2xl p-3 bg-card">
                      <p className="text-[10px] text-muted-foreground">رتبه هدف</p>
                      <p className="font-semibold text-sm">{data.target_rank}</p>
                    </Card>
                  )}
                  {data.daily_hours && (
                    <Card className="rounded-2xl p-3 bg-card">
                      <p className="text-[10px] text-muted-foreground">ساعت مطالعه</p>
                      <p className="font-semibold text-sm">{data.daily_hours} ساعت</p>
                    </Card>
                  )}
                  {data.biggest_challenge && (
                    <Card className="rounded-2xl p-3 bg-card">
                      <p className="text-[10px] text-muted-foreground">بزرگترین چالش</p>
                      <p className="font-semibold text-sm">{CHALLENGES.find(c => c.value === data.biggest_challenge)?.label}</p>
                    </Card>
                  )}
                </div>

                <Card className="rounded-2xl p-4 border-primary/30 bg-primary/5 text-center">
                  <Rocket className="w-8 h-8 mx-auto text-primary mb-2" />
                  <p className="font-bold">آماده‌ای شروع کنی؟ 🚀</p>
                  <p className="text-xs text-muted-foreground mt-1">همه اطلاعاتت ذخیره شده و می‌تونی بعداً از تنظیمات تغییرش بدی</p>
                </Card>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const StepIcon = STEP_ICONS[step - 1];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Ambient bg */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-10 right-10 w-80 h-80 rounded-full bg-accent/8 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-emerald/8 blur-3xl" />
      </div>

      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          {step > 1 ? (
            <Button variant="ghost" size="icon" onClick={goPrev} className="rounded-xl">
              <ChevronRight className="w-5 h-5" />
            </Button>
          ) : <div className="w-10" />}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{step} از {TOTAL_STEPS}</p>
          </div>
          {step < TOTAL_STEPS ? (
            <Button variant="ghost" size="sm" onClick={skipStep} className="rounded-xl text-xs text-muted-foreground">
              <SkipForward className="w-4 h-4 ml-1" />
              رد کن
            </Button>
          ) : <div className="w-16" />}
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="h-1.5 mb-4" />
      </div>

      {/* Step header */}
      <div className="px-4 mb-4">
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
            <StepIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{STEP_TITLES[step - 1]}</h1>
            <p className="text-xs text-muted-foreground">{STEP_SUBTITLES[step - 1]}</p>
          </div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-4 pb-6 pt-2">
        {step < TOTAL_STEPS ? (
          <Button onClick={goNext} className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground text-base shadow-lg">
            ادامه
            <ChevronLeft className="w-5 h-5 mr-1" />
          </Button>
        ) : (
          <Button onClick={finishOnboarding} disabled={saving || loadingSummary} className="w-full h-12 rounded-2xl gradient-emerald text-primary-foreground text-base shadow-lg">
            {saving ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                بزن بریم! 🚀
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
