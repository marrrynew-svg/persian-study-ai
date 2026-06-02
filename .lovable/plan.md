# بازسازی کامل سیستم نقشه سفر (Roadmap)

این یک refactor بزرگ است. نقشه سفر از یک "ویترین گرافیکی" به **قلب اپ** تبدیل می‌شود — جایی که هر جلسه‌ی تایمر، هر تسک، هر آزمون، و هر تصمیم AI روی آن اثر واقعی می‌گذارد.

---

## ۱) مدل داده‌ی جدید (DB)

جدول‌های جدید در Supabase (migration):

- **`roadmap_nodes`** — نود واقعی نقشه (به جای صرفاً `roadmap_blocks`):
  - `id, user_id, parent_id, exam_id, topic_id, subject_id`
  - `title, description, type` (`study|exam|review|milestone|boss`)
  - `xp_reward, estimated_minutes, due_date`
  - `progress` (0..100), `study_minutes`, `last_studied_at`
  - `status` (`locked|available|in_progress|completed`)
  - `unlock_required_node_ids uuid[]`, `unlock_required_study_minutes int`
  - `position_x, position_y` (برای adventure map)
  - `world_kind` (`island|city|tower|cave|boss_arena`)
  - `order_index, created_at, updated_at`
- **`node_events`** — لاگ هر اثر روی نود (session/task/exam) برای AI و achievements.
- **`achievements`** — مدال‌های unlock شده per-user (به جای localStorage).

همه با RLS + GRANT استاندارد.

`roadmap_blocks` فعلی نگه داشته می‌شود (برای زمان‌بندی روزانه)، اما **منبع حقیقت پیشرفت** = `roadmap_nodes`.

---

## ۲) موتورها (Pure TS، قابل تست)

- `src/lib/roadmap/nodeEngine.ts`
  - `applySessionToNodes(session, nodes, topics)` → کدام نود/ها متاثرند، چقدر progress، آیا completed.
  - `recomputeUnlocks(nodes)` → باز کردن نودهای جدید بر اساس `unlock_required_*`.
  - `awardForCompletion(node)` → XP/coin/achievement.
- `src/lib/roadmap/aiPlanner.ts`
  - `generateRoadmap(profile, exams, topics, sessionsHistory)` — درخواست به edge function (Lovable AI) برای ساخت کامل نودها/milestoneها/Boss/Review، fallback به planner قطعی موجود (`plannerEngine.ts`).
- `src/lib/roadmap/skillTree.ts`
  - برای هر subject، درخت مهارت با `mastery, studyHours, lastReviewed, strength` از داده‌ی واقعی (sessions + topics).

---

## ۳) Edge Function: `roadmap-ai-planner`

ورودی: `learning_profile`, `exams`, `exam_topics`, آخرین ۳۰ روز `study_sessions`, `performance_logs`.
خروجی (tool-calling structured): لیست نودها با parent/child، milestoneها، Boss، Reviewهای فاصله‌دار، due dateها، xpReward.
نتیجه در `roadmap_nodes` نوشته می‌شود.

---

## ۴) UI

### `AdventureMap.tsx` (بازسازی)
- SVG با worldها: island/city/tower/cave/boss arena (هر نود ظاهر مخصوص خود).
- نودهای locked خاکستری + قفل، available درخشان، completed با تاج/پرچم.
- کلیک روی نود → `NodeDetailDialog`.
- وقتی نود کامل می‌شود: pan/zoom دوربین روی نود بعدی + confetti + sound + floating XP.

### `NodeDetailDialog.tsx` (جدید)
- ویرایش: title, description, estimatedHours, dueDate, subject/topic, status.
- اکشن‌ها: حذف، Duplicate، ساخت زیرنود، شروع تایمر برای این نود.
- پیشرفت زنده، تاریخ آخرین مطالعه، لاگ session‌های متصل.
- realtime save (`useMutation` + invalidate + supabase realtime channel).

### `SkillTreeDialog.tsx` (بازسازی)
- per-subject tab، نود hex با mastery از داده‌ی واقعی، توصیه AI inline.

### `RoadmapHeader`
- دکمه‌ی **«ساخت نقشه با AI»** → اجرای `roadmap-ai-planner`.
- دکمه‌ی **«افزودن نود دستی»**.

---

## ۵) اتصال تایمر ↔ نقشه

در `useStudySessions` (پایان session):
1. `applySessionToNodes` صدا زده شود.
2. نودهای متاثر در DB آپدیت (progress, study_minutes, last_studied_at).
3. اگر progress=100 → `status=completed`, XP، unlock نودهای بعدی، achievement check، event emit.
4. `dispatchAIContextRefresh('node_progress')` تا چت AI بداند.

برای session بدون topic مشخص: نزدیک‌ترین نود `in_progress` همان subject انتخاب می‌شود؛ اگر نبود، اولین `available`.

---

## ۶) Exam → Roadmap خودکار

در `useExams` بعد از ساخت Exam + topics:
- یک `boss` node برای امتحان + یک `milestone` به ازای هر topic + یک `review` قبل از تاریخ امتحان ساخته می‌شود.
- وابسته به ترتیب topicها unlockها وصل می‌شوند.

---

## ۷) AI Chat باید نقشه را بفهمد

`buildLiveContext()` گسترش پیدا می‌کند: علاوه بر sessions/tasks، نودهای فعلی (current, next 3, blocked, weakest mastery) به prompt اضافه می‌شوند.
Edge function `study-advisor` این context را با هر پیام دریافت می‌کند.

---

## ۸) سیستم پاداش

- `awardForCompletion` → XP در `user_xp`, badge در `achievements`, toast + confetti + sound (`/public/sfx/level-up.mp3`).
- Floating XP component روی نود تکمیل‌شده.

---

## ۹) فایل‌های جدید/تغییریافته

**جدید**
- `supabase/migrations/<ts>_roadmap_nodes.sql`
- `supabase/functions/roadmap-ai-planner/index.ts`
- `src/lib/roadmap/nodeEngine.ts`
- `src/lib/roadmap/aiPlanner.ts`
- `src/lib/roadmap/skillTree.ts`
- `src/hooks/useRoadmapNodes.ts`
- `src/components/roadmap/NodeDetailDialog.tsx`
- `src/components/roadmap/RewardOverlay.tsx`
- `public/sfx/level-up.mp3`, `public/sfx/unlock.mp3`

**بازنویسی**
- `src/components/roadmap/AdventureMap.tsx`
- `src/components/roadmap/SkillTreeDialog.tsx`
- `src/pages/Roadmap.tsx`
- `src/hooks/useStudySessions.ts` (هوک پایان session)
- `src/hooks/useExams.ts` (auto-generate nodes)
- `supabase/functions/study-advisor/index.ts` (context نود)

---

## ۱۰) دامنه‌ی این مرحله

این یک ریفکتور بسیار بزرگ است. برای آنکه چیزی نیمه‌کاره نشود، پیشنهاد می‌کنم در **سه فاز پشت سر هم** ارسال شود — همگی در همین تسک:

- **فاز A:** DB + nodeEngine + `useRoadmapNodes` + اتصال تایمر + auto-generate از Exam (هسته‌ی منطق و داده).
- **فاز B:** بازنویسی AdventureMap + NodeDetailDialog + RewardOverlay (UI تعاملی + پاداش).
- **فاز C:** Edge function `roadmap-ai-planner` + بازسازی SkillTree از داده‌ی واقعی + گسترش context چت AI.

با تأیید پلن، از فاز A شروع می‌کنم و تا فاز C جلو می‌روم. اگر می‌خواهی فقط بخشی اجرا شود (مثلاً فقط فاز A) همان را بگو.
