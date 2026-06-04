# Planino — موتور برنامه‌ریزی تطبیقی

سیستم را در ۴ لایه می‌سازیم: Data → Planning → Replanning → AI Coach. روی دیتابیس و کدِ موجود (`exams`, `exam_topics`, `study_sessions`, `roadmap_blocks/nodes`, `learning_profile`, `subjects`) سوار می‌شود؛ چیزی دوباره‌کاری نمی‌شود.

## فاز ۱ — Data Layer (Migration)
جدول‌های جدید (RLS + GRANT کامل):
- `user_capacity` — ظرفیت واقعی هر روز هفته: `weekday, sleep_h, school_h, commute_h, fixed_h, effective_h`.
- `backlog_items` — `user_id, subject_id, topic_id, exam_id, remaining_minutes, source_date, priority_score`.
- `daily_plans` — `date, total_planned_minutes, total_done_minutes, status (pending|completed|partial|skipped)`.
- `behavior_model` — per-user: `weekday_strength jsonb` (0..1 per روز)، `avg_completion_rate`, `burnout_flag`, `updated_at`.
- `ai_logs` — `user_id, type (analysis|advice|motivation), message, context jsonb`.
از `roadmap_blocks` به‌عنوان «task روزانه» استفاده می‌کنیم؛ فیلد `status` و `duration_minutes` و `topic_id` کافی است.

## فاز ۲ — Planning Engine (`src/lib/planino/`)
- `capacity.ts` — `effectiveHoursFor(date, profile, capacityRows, fixedEvents)`.
- `priority.ts` — `score(task) = 0.40*deadline + 0.25*weakness + 0.20*examImportance + 0.10*size + 0.05*history` با وزن‌های دقیقاً مطابق اسپک.
- `taskCollector.ts` — از `exam_topics` ناتمام + `tasks` با due + topics ضعیف (`subject.strength_level<60`) + spaced reviews + `backlog_items` لیست تسک می‌سازد.
- `dailyPlanner.ts` — sort by priority، پر کردن ظرفیت روز، split اگر زمان کم بود، overflow → `backlog_items`.
- `weeklyPlanner.ts` — همان روی ۷ روز با weekday_strength.
خروجی → `roadmap_blocks` (نه یک جدول جدید جداگانه).

## فاز ۳ — Replanning Engine
- `src/lib/planino/replanner.ts` — شبانه از `daily_plans` + `study_sessions` واقعی diff می‌گیرد، backlog را در ۳..۷ روز آینده پخش می‌کند **بدون overload** (قانون طلایی: never punitive).
- `behaviorModel.ts` — به‌روزرسانی `weekday_strength`, `avg_completion_rate`.
- `burnout.ts` — اگر ۳ روز پشت سر هم `planned > 1.2×capacity` → flag + کاهش خودکار حجم فردا + تبدیل تسک‌ها به مرور سبک.
- Edge function `planino-nightly-replan` (cron روزانه ساعت ۲۳:۵۹) همه‌ی این‌ها را اجرا می‌کند.

## فاز ۴ — AI Coach Layer (تحلیل، نه تصمیم)
- Edge function `planino-coach` با Lovable AI (`google/gemini-3-flash-preview`) فقط متن تحلیل/توضیح/انگیزه تولید می‌کند و در `ai_logs` می‌نویسد.
- ورودی: snapshot هفته‌ی گذشته (completion%، weak days، backlog size، burnout flag). خروجی: ۱..۳ پیام کوتاه فارسی.
- در `study-advisor` موجود، context جدید (capacity، backlog، behavior) اضافه می‌شود تا چت هم بفهمد.

## فاز ۵ — UI (در صفحه‌ی Roadmap موجود)
- `CapacitySetupDialog` — کاربر یک بار ظرفیت روزهای هفته (خواب/مدرسه/رفت‌وآمد/کلاس ثابت) را پر می‌کند.
- `BacklogDrawer` — نمایش backlog فعلی، چقدر روی روزهای آینده پخش شده.
- `BehaviorInsights` — کارت کوچک با weekday strength + burnout warning + پیام AI Coach.
- دکمه‌ی «بازسازی برنامه» → فراخوانی replanner.

## فایل‌های جدید/تغییریافته
- Migration: `user_capacity`, `backlog_items`, `daily_plans`, `behavior_model`, `ai_logs`.
- جدید: `src/lib/planino/{capacity,priority,taskCollector,dailyPlanner,weeklyPlanner,replanner,behaviorModel,burnout}.ts`, `src/hooks/usePlanino.ts`, `src/components/planino/{CapacitySetupDialog,BacklogDrawer,BehaviorInsights}.tsx`, `supabase/functions/planino-nightly-replan/index.ts`, `supabase/functions/planino-coach/index.ts`.
- ویرایش: `src/pages/Roadmap.tsx`, `supabase/functions/study-advisor/index.ts`, `src/hooks/useStudySessions.ts` (پایان session → daily_plans update + push to backlog if shortfall).

## دامنه
این یک پروژه‌ی بزرگ است. پیشنهاد فازبندی پشت سر هم در همین تسک:
- **A:** Migration + Capacity + Priority + dailyPlanner + UI ظرفیت.
- **B:** Backlog + Replanner + nightly cron + UI backlog.
- **C:** Behavior model + Burnout + AI Coach + اتصال به چت.

با تأیید پلن از فاز A شروع می‌کنم. اگر فقط بخشی را می‌خواهی بگو.
