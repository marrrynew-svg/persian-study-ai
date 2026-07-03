
# Planino v3 — Elite Study Planning System

سیستم فعلی بلوک‌ها را «تخت» تولید می‌کند: بدون ساعت، بدون فاصله‌گذاری تکرار، بدون منطق ماهانه، بدون توضیح AI. بازسازی end-to-end در چهار لایه:

## 1) موتور برنامه‌ریزی (Planino v3 core)

فایل‌های جدید در `src/lib/planino/v3/`:

- `types.ts` — تایپ‌های جدید: `TimeSlot`, `DailyPlan`, `WeeklyPlan`, `MonthlyPlan`, `SpacedItem`, `PlanRationale`
- `timeSlotEngine.ts` — بلوک زمان‌بندی ساعتی: از `wake_time` تا `sleep_time`، حذف بازهٔ مدرسه/دانشگاه/کار، درج بلوک تمرکز ۹۰′ + استراحت ۱۵′ (روش پومودورو بلند)، بلوک ورزش ۳۰′، ۲ بازهٔ تست‌زنی هفتگی
- `spacedRepetition.ts` — الگوریتم SM-2 ساده: هر مبحثی که مطالعه شد در روز +1/+3/+7/+16 دوبار مرور می‌شود (بلوک `review`)
- `dailyPlanner.ts` — روزانه: اولویت‌بندی موضوعات با `priorityRanker` + تزریق مرورها + بلوک تست + ۱ بلوک تمرکز عمیق صبحگاهی
- `weeklyPlanner.ts` — هفتگی: توزیع پوشش دروس بر ۷ روز با قانون تنوع (هیچ درسی ۳ روز پشت هم غالب نباشد)، ۱ روز آزمون شبیه‌ساز، ۱ روز جبرانی نیمه‌سبک
- `monthlyPlanner.ts` — ماهانه: تقسیم روزهای مانده به سه فاز (`foundation` 50%, `mastery` 30%, `simulation` 20%)، تعیین Milestoneهای هفتگی، هیت‌مپ پوشش هر درس، پیش‌بینی درصد آمادگی روز آزمون
- `rationaleBuilder.ts` — برای هر روز/هفته/ماه، لیست دلایل و trade-offها را متنی تولید می‌کند (نمایش در UI و ارسال به AI)
- `planEngine.ts` — orchestrator: `buildFullPlan(analysis, style) → { monthly, weekly, daily[] }`

منطق ترکیبی-هوشمند: هر بلوک `suggested_start_time` دارد ولی `flexible: true` است؛ کاربر می‌تواند drag کند و ساعت را override کند.

## 2) اسکیمای دیتابیس

مایگریشن جدید که به جداول موجود `plan_daily_v2` و `plan_block_v2` این‌ها را اضافه می‌کند:

- `plan_block_v2`: `suggested_start_time TIME`, `suggested_end_time TIME`, `block_type TEXT` (study|review|test|deep_focus|light|simulation|recovery), `is_locked BOOLEAN`, `spaced_from_block UUID`, `rationale TEXT`
- `plan_daily_v2`: `phase TEXT` (foundation|mastery|simulation), `heat_score NUMERIC`, `is_simulation_day BOOLEAN`, `is_recovery_day BOOLEAN`
- جدول جدید `plan_weekly_v2` — هفته‌های محاسبه‌شده با milestone، coverage-per-subject، goal، status
- جدول جدید `plan_monthly_v2` — فاز، پیش‌بینی readiness%، milestoneهای هفتگی، heatmap JSON
- جدول جدید `plan_ai_rationale` — توضیح متنی AI برای هر واحد (day/week/month) با لینک به آی‌دی

همه با GRANT، RLS، سیاست `auth.uid()`.

## 3) نماهای UI جدید (`/plan/*`)

- `/plan/today` — بازطراحی: تایم‌لاین عمودی ۲۴ ساعته + بلوک‌های رنگی با ساعت، drag & drop، دکمه «شروع» روی بلوک فعال، «چرا این بلوک؟» expandable (rationale)
- `/plan/week` — گرید ۷ ستون × slotها (نمای Google Calendar فشرده)، هدف هفته، coverage bar هر درس، milestone هفته
- `/plan/month` **(جدید)** — 
  - نقشه راه ماهانه (فازها با رنگ‌های متفاوت)
  - هیت‌مپ ۳۰×N (روز × درس) با شدت رنگ
  - Readiness Forecast چارت (Recharts area)
  - Milestoneهای هفتگی به‌صورت timeline
- `SectionTabs` در `/plan/*` شامل: امروز | هفته | ماه | مشاور AI | ویزارد

کامپوننت‌های جدید در `src/components/plan/v3/`:
- `DayTimeline.tsx`, `WeekGrid.tsx`, `MonthRoadmap.tsx`, `HeatmapCoverage.tsx`, `ReadinessChart.tsx`, `PhaseBadge.tsx`, `RationaleAccordion.tsx`, `SmartBlockCard.tsx`

## 4) مشاور AI برنامه‌ریز

`/plan/coach` (جدید) + Edge Function جدید `plan-coach`:

- ورودی: `analysis` + `daily/weekly/monthly` + جلسات اخیر + تسک‌های عقب‌مانده
- خروجی streaming: توضیح می‌دهد چرا این برنامه، کجاها ریسک دارد، ۳ سوال شخصی برای بهبود، پیشنهاد replan
- دکمهٔ **«این تغییر را اعمال کن»** روی هر پیشنهاد → tool call به `apply_plan_change` (تغییر بلوک/جابجایی روز)
- به‌روزرسانی `study-advisor` موجود برای شناخت داده‌های v3

مدل: `google/gemini-2.5-flash` از Lovable AI Gateway.

## 5) اتصال به سیستم فعلی

- `useFinalizeWizard` به `buildFullPlan` جدید سوییچ می‌شود و monthly/weekly را هم persist می‌کند
- دکمهٔ «بازسازی» در همه نماها → replan فقط از امروز به بعد، فازها را حفظ می‌کند
- بعد از هر جلسه مطالعه (`useStudySessions`): heat_score روز و coverage درس آپدیت و برای فردا اسپیس‌ری‌پتیشن تزریق می‌شود

## Technical notes

- زبان/فونت: RTL، Vazirmatn، گرادیان‌های موجود پروژه
- react-router routes: افزودن `/plan/month`, `/plan/coach`
- BottomNav: تب "Plan" همان می‌ماند، SectionTabs جدید
- بدون شکستن API فعلی — `usePlanV2` باقی می‌ماند، هوک‌های v3 اضافه می‌شوند (`usePlanV3`)

## نتیجهٔ کاربر می‌بیند

روزانه = تایم‌لاین دقیق ساعتی با «چرا این کار الان». هفتگی = گرید کالندر با هدف هفته. ماهانه = نقشه راه فازبندی‌شده با هیت‌مپ و پیش‌بینی درصد آمادگی. AI = مشاور واقعی که برنامه را توضیح می‌دهد و با یک کلیک تغییر می‌دهد.
