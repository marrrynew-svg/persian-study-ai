# Planona — Product Audit (Phase 0)

تاریخ: ۱۴۰۵/۰۳/۱۵ — اسکن کامل وضع موجود قبل از بازسازی.

## ۱. صفحات و روت‌ها

| Route | فایل | در Bottom Nav؟ | وضعیت |
|---|---|---|---|
| `/` | `Dashboard.tsx` | ✅ خانه | شلوغ — همه چیز اینجا انباشته شده |
| `/timer` | `TimerPage.tsx` | ✅ تایمر | کار می‌کند |
| `/roadmap` | `Roadmap.tsx` | ✅ نقشه راه | بازطراحی شده به Command Center |
| `/advisor` | `Advisor.tsx` | ✅ مشاور | فقط Chat — تحلیل واقعی ندارد |
| `/profile` | `Profile.tsx` | ✅ پروفایل | پایه |
| `/subjects` | `Subjects.tsx` | ❌ | **غیرقابل دسترسی از UI** |
| `/planner` | `Planner.tsx` | ❌ | **غیرقابل دسترسی** — موتور Planino جدید فقط در `/roadmap` |
| `/tasks` | `Tasks.tsx` | ❌ | **غیرقابل دسترسی** |
| `/focus` | `FocusMode.tsx` | ❌ | **غیرقابل دسترسی** |
| `/groups` | `Groups.tsx` | ❌ | **غیرقابل دسترسی** |
| `/analytics` | `Analytics.tsx` | ❌ | **غیرقابل دسترسی** |
| `/notes` | `Notes.tsx` | ❌ | **غیرقابل دسترسی** |
| `/exams` | `Exams.tsx` | ❌ | **غیرقابل دسترسی** |
| `/onboarding` | `Onboarding.tsx` | n/a | فقط یک‌بار |

**یافته بحرانی:** ۸ صفحه از ۱۴ صفحه از ناوبری اصلی قابل دسترسی نیستند.

## ۲. Hooks و State

| Hook | جدول | متصل به UI؟ | متصل به AI؟ |
|---|---|---|---|
| `useStudySessions` | `study_sessions` | ✅ | جزئی |
| `useExams` | `exams`, `exam_topics` | ✅ (Roadmap) | ❌ |
| `useTasks` | `tasks` | ✅ | ❌ |
| `useNotes` | `notes` | ✅ (صفحه گم) | ❌ |
| `useSubjects` | `subjects` | ✅ | ❌ |
| `useRoadmap` | `roadmap_nodes` | ✅ | ❌ |
| `useRoadmapNodes` | `roadmap_nodes` | ✅ | ❌ |
| `useGamification` | `user_xp`, `badges` | ✅ | ❌ |
| `useRPGState` | محلی | ✅ | ❌ |
| `useAdvisor` | `ai_conversations` | ✅ | ✅ |
| `usePlanino` | `user_capacity`, `daily_plans`, `backlog_items`, `behavior_model` | ✅ (Roadmap فقط) | ❌ |
| `useLearningProfile` | `learning_profile` | ✅ (Dialog) | ❌ |
| `useGroups` | `study_groups` | ✅ (صفحه گم) | ❌ |
| `useProfile` | `profiles` | ✅ | ❌ |

**یافته:** هیچ Hook ای به Context ساز AI متصل نیست. AI کور است.

## ۳. AI Stack

| بخش | وضعیت |
|---|---|
| Edge function `study-advisor` | ✅ وجود دارد |
| Edge function `refresh-ai-context` | ✅ وجود دارد |
| `src/lib/aiContextDispatcher.ts` | ⚠️ موجود اما به چند فیچر متصل |
| AI Modes (تحلیل امروز، تحلیل هفته، نقاط ضعف، …) | ❌ فقط Chat |
| Memory (`ai_user_memory`) | ⚠️ جدول هست، استفاده محدود |
| Recommendations (`ai_recommendations`) | ⚠️ جدول هست، نوشتن/خواندن ناقص |

## ۴. Planning Engine (Planino)

موجود در `src/lib/planino/`:
- `capacity.ts`, `dailyPlanner.ts`, `priority.ts`, `replanner.ts`, `taskCollector.ts`, `behaviorModel.ts`

**وضعیت:** هسته آماده اما:
- فقط در `/roadmap` نمایش داده می‌شود (BacklogDrawer، CapacitySetupDialog)
- خروجی به `daily_plans` می‌نویسد ولی هیچ صفحه‌ای آن را به‌عنوان «برنامه امروز» نشان نمی‌دهد
- ورودی‌های پیشرفته (تعداد صفحات/تست/ویدیو/سختی/سرعت) جزئی پشتیبانی می‌شوند
- Replanner خودکار trigger ندارد

## ۵. Data Flow — Session Lifecycle

وقتی Session تمام می‌شود الان چه می‌شود:

- ✅ ذخیره در `study_sessions`
- ✅ XP/Streak از طریق `useGamification`
- ⚠️ `performance_logs` — جزئی
- ❌ `node_events` (Roadmap progress) — متصل نیست
- ❌ Skill Tree آپدیت نمی‌شود
- ❌ AI Context آپدیت نمی‌شود
- ❌ Behavioral snapshot ساخته نمی‌شود

**یافته:** Event Bus مرکزی وجود ندارد. هر کامپوننت مستقیم به Supabase می‌نویسد و بقیه را خبر نمی‌کند → Data Island ها زیاد.

## ۶. Information Architecture فعلی vs پیشنهادی

**الان:** ۵ تب پایین، ۸ صفحه ناپیدا.
**هدف:** ۶ بخش (خانه/برنامه/مطالعه/مربی AI/سفر/من) با تب‌های داخلی.

| بخش هدف | شامل صفحات/تب‌های فعلی |
|---|---|
| 🏠 خانه | `/` (سبک شود) |
| 📅 برنامه | `/planner` + `/exams` + `/tasks` + تقویم + Timeline |
| 📚 مطالعه | `/timer` + `/focus` + (فلش‌کارت جدید) + (اسکنر جدید) + Sessions |
| 🤖 مربی AI | `/advisor` (با ۸ زیر صفحه) |
| 🗺 سفر | `/roadmap` + Skill Tree + Milestones + Achievements |
| 👤 من | `/profile` + `/analytics` + `/notes` + `/groups` + Dream Board + Future Letters + Settings |

## ۷. قابلیت‌های گم‌شده / ناتمام

- **Skill Tree** — Dialog وجود دارد (`SkillTreeDialog`) ولی صفحه ندارد
- **Achievements** — Panel وجود دارد ولی فقط در Roadmap
- **Flashcards** — وجود ندارد
- **Smart Scanner** — وجود ندارد
- **Active Recall / Feynman Mode** — وجود ندارد
- **Dream Board / Vision Board** — وجود ندارد
- **Future Letters** — وجود ندارد
- **Reports/Analytics مرکزی** — `/analytics` گم است
- **Calendar مرکزی** — `MonthlyCalendar` کامپوننت هست ولی روت ندارد
- **Settings** — صفحه اختصاصی ندارد

## ۸. مشکلات فنی شناسایی شده

- Realtime channel naming در ۶+ hook قبلاً باگ داشت (الان رفع شده با random suffix)
- `useAdvisor` فقط mode=`chat` می‌فرستد؛ پارامتر mode به edge function استفاده‌ای ندارد
- `aiContextDispatcher` با dispatchهای پراکنده فراخوانی می‌شود بدون event bus

## ۹. اولویت‌های پیشنهادی بازسازی

بر اساس ROI:

1. **Phase 1 — IA + Navigation** — بزرگ‌ترین برد فوری (۸ صفحه گم برمی‌گردند)
2. **Phase 5 — AI Coach v2** — هسته ارزش محصول
3. **Phase 8 — Event Bus** — رفع Data Island
4. **Phase 6 — Planning Engine v2** — اتمام موتور Planino
5. **Phase 2-4, 7** — صفحات اختصاصی
6. **Phase 9-10** — صیقل و QA

---

## سوال برای ادامه

Audit کامل شد. الان به ترتیب چه فازی شروع شود؟

پیشنهاد من: **Phase 1 (IA + Navigation)** — چون با یک تغییر، ۸ صفحه گم‌شده برمی‌گردند و ساختار ۶ بخشی پایه بقیه فازها می‌شود.