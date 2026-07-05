# Planino v4 — مشاور و برنامه‌ریز تحصیلی حرفه‌ای

## چشم‌انداز
یک سیستم برنامه‌ریزی که حس یه «مشاور شخصی حرفه‌ای کنکور» رو بده — نه یه لیست ساده تسک. ورودی عمیق از کاربر، الگوریتم چندلایه، و سه نمای بصری خفن.

---

## ۱. ویزارد حرفه‌ای (۱۸ سوال · ۶ مرحله)

فرم چند مرحله‌ای با progress bar، انیمیشن، ذخیره‌ی خودکار در هر مرحله.

**مرحله ۱ — هدف و آزمون** (`plan_exam_setup`)
- نوع کنکور، رشته، تاریخ آزمون، رتبه/تراز هدف، دانشگاه‌های آرزو (۳ اولویت)

**مرحله ۲ — Chronotype و انرژی** (`plan_study_style`)
- ساعت بیداری/خواب واقعی نه ایده‌آل، پیک انرژی روز (صبح/ظهر/عصر/شب)، ساعات مرده (افت انرژی)، خواب نیم‌روز

**مرحله ۳ — مسئولیت‌های زندگی**
- مدرسه/دانشگاه/کار (ساعات دقیق هر روز هفته)، رفت‌وآمد، ورزش، خانواده

**مرحله ۴ — روانشناسی و رفتار**
- تحمل فشار (اسلایدر)، سبک یادگیری (بصری/شنیداری/عملی)، سبک مرور ترجیحی (فلش‌کارت/تست/خلاصه)، واکنش به شکست (اسلایدر ریکاوری)، سطح انگیزه فعلی

**مرحله ۵ — نقشه‌ی دروس** (`plan_subject_inputs`)
- برای هر درس: سطح فعلی (خیلی ضعیف تا مسلط)، اولویت شخصی، درصد کنکورهای آزمایشی اخیر، فصل‌های مشکل‌دار (تگ)، منبع مطالعه، سرعت مطالعه صفحه/دقیقه

**مرحله ۶ — استراتژی**
- نسبت ترجیحی مطالعه/تست/مرور، سبک برنامه (فشرده/متعادل/آرام)، روزهای شبیه‌ساز در هفته، حداقل روز استراحت هفته

---

## ۲. موتور Planino v4 (`src/lib/planino/v4/`)

### فایل‌های جدید
- **`chronotypeEngine.ts`** — نگاشت پیک انرژی → بهترین ساعات برای Deep Focus / Light / Test
- **`phaseArchitect.ts`** — سه فاز پویا: Foundation (۴۰٪) → Mastery (۴۰٪) → Simulation (۲۰٪)، با تنظیم خودکار بر اساس روزهای باقی‌مانده
- **`spacedRepetition.ts`** — بازنویسی با الگوریتم SM-2 واقعی (interval، ease factor، quality response)
- **`fatigueModel.ts`** — مدل خستگی: بار روزانه، امتیاز تراکم هفتگی، تشخیص خطر burnout
- **`balanceEngine.ts`** — تعادل خودکار Study/Review/Test/Simulation
- **`dailyComposer.ts`** — چیدن بلوک‌ها در تایم‌اسلات‌های Chronotype-aware با Pomodoro و ریکاوری
- **`weeklyStrategist.ts`** — توزیع دروس با اولویت‌بندی، milestones، coverage matrix
- **`monthlyForecaster.ts`** — پیش‌بینی آمادگی روزبه‌روز، heatmap، فازبندی
- **`rationaleWriter.ts`** — تولید توضیح فارسی برای هر بلوک/روز/هفته (چرا این؟)
- **`planEngineV4.ts`** — ارکستراتور اصلی

### قواعد کلیدی موتور
- Deep Focus فقط در ساعات پیک انرژی
- تست حداقل ۲ ساعت بعد از شروع مطالعه اون درس
- مرور SM-2 بلاک‌های قبلی به صورت خودکار در روزهای بعد
- روز ریکاوری اجباری بعد از ۶ روز فشرده
- شبیه‌ساز فقط در فاز mastery/simulation

---

## ۳. نماهای بصری Glassmorphism رنگی

پالت: `#0f172a` بستر · `#7c3aed` بنفش · `#ec4899` صورتی · `#06b6d4` فیروزه‌ای

هر درس یه گرادیانت اختصاصی داره که در تمام نماها consistent باشه.

### `/plan/today` — Daily Timeline زنده
- تایم‌لاین عمودی ۲۴ ساعته با نشانگر «الان» (خط قرمز متحرک)
- بلوک‌های شیشه‌ای با backdrop-blur + گرادیانت درس
- کنار هر بلوک: آیکن نوع (🎯 Deep / 📖 Study / 🔁 Review / ✍️ Test / 🎮 Simulation / 🌙 Recovery)
- Header: فاز روز، heat score (شعله متحرک)، هدف روز، KPI (بلوک انجام‌شده، دقیقه واقعی/برنامه)
- تعامل: کلیک بلوک → دیالوگ جزئیات + rationale + اکشن‌ها (شروع تایمر، جابجایی، skip، extend)
- Empty state حرفه‌ای

### `/plan/week` — Weekly Grid Notion-style
- گرید ۷ ستون × ۱۸ ردیف (۶ صبح تا ۱۲ شب)
- بلوک‌های شیشه‌ای با تراکم پویا (رنگ گرم = فشرده)
- Sidebar: هدف هفته، milestones، coverage bars هر درس با گرادیانت
- بالای گرید: نوار فاز، توزیع تست/مطالعه/مرور، پیش‌بینی موفقیت هفته
- کلیک روی روز → نمای Daily
- درگ برای جابجایی بلوک بین روزها (اختیاری v1)

### `/plan/month` — Monthly Command Center
- ۳۰ روز × N درس heatmap با شدت رنگ = تراکم
- نوار فازها (Foundation / Mastery / Simulation) با progress
- چارت پیش‌بینی آمادگی (Recharts area chart با گرادیانت)
- کارت milestone هر هفته
- ریسک burnout با warning
- دکمه «چرا این ماه اینطوری چیده شده؟» → توضیح AI

---

## ۴. Database Migration

اضافه شدن ستون‌ها به جداول موجود (بدون تخریب):

**`plan_study_style`** (+ فیلدها):
- `energy_peaks jsonb` (آرایه ساعات پیک)
- `dead_hours jsonb`
- `preferred_review_style text`
- `stress_tolerance int` (1-10)
- `motivation_level int` (1-10)
- `failure_recovery int` (1-10)

**`plan_subject_inputs`** (+ فیلدها):
- `mock_exam_percent numeric`
- `weak_chapters text[]`
- `reading_speed_ppm numeric`
- `preferred_ratio jsonb` (study/test/review)

**`plan_block_v2`** (+ فیلدها):
- `energy_required text` (low/mid/high)
- `spaced_interval_days int`
- `sm2_ease numeric`

---

## ۵. مسیر پیاده‌سازی (به ترتیب)

1. Migration دیتابیس
2. تایپ‌ها و موتور v4 (تمام فایل‌های `src/lib/planino/v4/`)
3. ویزارد ۶ مرحله‌ای جدید (`src/pages/plan/SmartWizard.tsx` بازنویسی + کامپوننت‌های استپ)
4. هوک `usePlanV4` و jack کردن `buildFullPlan` به موتور جدید
5. بازطراحی `/plan/today` با Timeline زنده
6. بازطراحی `/plan/week` با گرید Notion-style
7. بازطراحی `/plan/month` با Command Center
8. کامپوننت‌های مشترک: `GlassBlock`, `PhaseBar`, `EnergyIndicator`, `SubjectGradient`

---

## نکات فنی
- تمام کامپوننت‌ها RTL و Vazirmatn
- استفاده از design tokens موجود (بدون hardcode رنگ)
- Framer Motion برای انیمیشن بلوک‌ها و ترنزیشن‌های فاز
- Recharts برای heatmap و forecast
- `usePlanV2` و `usePlanV3` دست نمی‌خورن (backward compat)
- بدون AI call در موتور — همه چیز deterministic تا سریع باشه؛ AI فقط برای rationale اختیاری در `/plan/coach`

خروجی: یه ابزار مشاوره‌ی تحصیلی که حس «داشتن یه استاد راهنمای شخصی» رو بده، نه یه to-do list.
