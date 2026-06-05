## Planona Full Rebuild — Phased Plan

این یک بازسازی بسیار بزرگ است. اگر همه فازها را یکجا اجرا کنیم، ریسک شکست بالاست و نمی‌توان آن را در یک پاسخ تحویل داد. پیشنهاد می‌کنم به فازهای قابل تحویل تقسیم شود و در هر فاز، نتیجه قابل تست باشد.

### Phase 0 — Audit (این پاسخ)
- اسکن کامل `src/pages`, `src/components`, `src/hooks`, `src/lib`, `src/store`
- ساخت فایل `docs/AUDIT.md` شامل:
  - فهرست همه صفحات + Route ها
  - فهرست همه Feature ها (موجود / ناقص / Disconnected)
  - فهرست همه Hook ها و Store action ها
  - فهرست AI features
  - نقشه Data Flow بین Session / XP / Streak / Skill Tree / Reports / AI Context
- خروجی: گزارش Audit، بدون تغییر کد

### Phase 1 — Information Architecture
- بازسازی Navigation بر اساس ۶ بخش: خانه / برنامه / مطالعه / مربی AI / سفر / من
- ساخت route shell ها: `/home`, `/plan`, `/study`, `/coach`, `/journey`, `/me` با تب‌های زیرمجموعه
- انتقال صفحات موجود به محل صحیح (بدون حذف)
- بازنویسی Bottom Nav / Sidebar

### Phase 2 — Home Dashboard
- خالی‌سازی Home از قابلیت‌های سنگین
- فقط ویجت‌های: Greeting, Daily Briefing, Today Progress, XP, Streak, Countdown, Today Tasks, Quick Start, Weak Subject Alert, Quick Mode, Roadmap Summary, Next Best Action

### Phase 3 — Plan Center
- تب‌ها: هفتگی / آزمون‌ها / مرورها / تقویم / Timeline
- اتصال به Planino engine موجود

### Phase 4 — Study Center
- تب‌ها: تایمر / فلش‌کارت / مرور فعال / اسکنر / جلسات

### Phase 5 — AI Coach
- بازطراحی AI به ۸ زیر صفحه (Chat, تحلیل امروز، تحلیل هفته، …)
- ساخت یک `aiContext` builder در `src/lib/ai/context.ts` که داده واقعی (sessions, tasks, notes, exams, roadmap, xp, streak, flashcards) را به Edge Function می‌فرستد
- Edge function `ai-coach` با system prompt های تخصصی هر mode

### Phase 6 — Smart Planning Engine v2
- توسعه `src/lib/planino/*` موجود
- ورودی‌های جدید (نوع آزمون، صفحات، تست، ویدیو، سختی، سرعت، روزهای آزاد/محدود)
- خروجی: برنامه روزانه/هفتگی/جبرانی/مرور + replanner خودکار

### Phase 7 — Journey & Me
- Journey: Roadmap / Skill Tree / Milestones / Achievements
- Me: Profile / Reports / Dream Board / Future Letters / Notes / Settings

### Phase 8 — Data Flow Validation
- ایجاد یک `eventBus` مرکزی: پایان Session → save + XP + Streak + Skill Tree + Reports + AI Context
- حذف Data Island ها

### Phase 9 — UI/UX Polish
- Spacing، Typography، Component variants
- تست همه روت‌ها

### Phase 10 — QA
- چک همه روت‌ها در preview
- رفع Blank Page / Runtime Error / Dead Button

---

## سوال مهم قبل از شروع

این کار حداقل ۸-۱۲ نوبت پیام جداگانه نیاز دارد. برای شروع کدام مسیر را ترجیح می‌دهی؟

**A) شروع از Phase 0 (Audit)** — اول گزارش کامل از وضع فعلی، بعد بر اساس آن تصمیم بگیریم چه چیزی واقعاً نیاز به بازسازی دارد. (پیشنهاد من)

**B) شروع از Phase 1 (IA + Navigation)** — مستقیم ساختار ۶ بخشی را پیاده کنیم، صفحات موجود را جابجا کنیم.

**C) شروع از Phase 5 (AI Coach)** — اول مغز AI را به داده واقعی وصل کنیم چون بیشترین ارزش را دارد.

**D) شروع از Phase 6 (Smart Planning Engine v2)** — اول موتور برنامه‌ریزی را کامل کنیم.

لطفاً یکی را انتخاب کن یا ترتیب دلخواه خودت را بگو.
