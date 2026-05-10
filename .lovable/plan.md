# AI Academic Operating System — Build Plan

A production-grade exam-driven study planner with real time estimation, adaptive scheduling, deep profiling, cinematic timeline, and full AI chatbot awareness.

This is large. I'll ship it in 4 sequenced phases, each compiling and usable on its own. After you approve the plan, I'll start with Phase 1 (DB + estimation engine), then continue straight through Phases 2–4 in the same loop.

---

## Phase 1 — Data model + estimation engine (foundation)

### New tables
- `exams` — `id, user_id, title, exam_type (test|descriptive|mixed), exam_date, priority (1-5), difficulty (1-5), target_score, importance, status (upcoming|active|done), notes, created_at, updated_at`
- `exam_topics` — `id, exam_id, user_id, subject_id, title, total_pages, total_video_minutes, difficulty (1-5), revisions_needed (default 2), needs_practice_tests bool, estimated_minutes (computed by engine), completed_minutes, status (pending|in_progress|done), order_index`
- `learning_profile` (1 row per user) — covers everything the deep interview captures: `reading_speed (slow|medium|fast)`, `study_depth (deep|balanced|fast)`, `focus_minutes`, `break_minutes`, `peak_window (morning|afternoon|evening|night)`, `consistency (1-5)`, `distractibility (1-5)`, `fatigue_curve (1-5)`, `methods text[]` (video/book/teacher/summary/flashcards/tests/problems), `video_speed`, `pause_frequency`, `notes_intensity (1-5)`, `memorization_strength (1-5)`, `analytical_strength (1-5)`, `weekly_available_hours`, `weekend_multiplier`, `prefers_practice_tests bool`, `created_at`, `updated_at`
- `roadmap_blocks` — generated study blocks: `id, user_id, exam_id (nullable), topic_id (nullable), subject_id (nullable), date, start_time, end_time, duration_minutes, block_type (study|review|test|buffer|recovery), priority, status (planned|done|skipped|moved), auto_generated bool, notes`
- `roadmap_runs` — audit of generations: `id, user_id, generated_at, strategy text, summary jsonb`

All RLS: `auth.uid() = user_id`. Indexes on `(user_id, date)` and `(exam_id)`.

### Estimation engine (`src/lib/estimationEngine.ts`)
Pure TS, deterministic, fully unit-testable. Inputs: topic + learning profile. Output: realistic minutes.

```
base = pages * pageMinutes(reading_speed, depth)
     + video_minutes / video_speed * (1 + pause_frequency * 0.15)
difficultyFactor   = 0.7 + difficulty * 0.15           // 1-5 → 0.85..1.45
methodFactor       = video ? 1.1 : book ? 1.0 : ...
revisionFactor     = 1 + revisions * 0.35
practiceFactor     = needs_tests ? 1.25 : 1
fatigueFactor      = 1 + (6 - focus_minutes/15) * 0.05
total = base * difficultyFactor * methodFactor * revisionFactor * practiceFactor * fatigueFactor
```
Returns `{ studyMin, reviewMin, testMin, totalMin, breakdown }`.

### Planner engine (`src/lib/plannerEngine.ts`)
Given exams + topics + profile + existing sessions:
1. Compute remaining minutes per topic (estimated − completed).
2. Score urgency = `(daysUntilExam ↓) * priority * importance / sqrt(remainingMin)`.
3. Allocate daily capacity = `weekly_available_hours/7` (×weekend_multiplier on Fri/Sat).
4. Pack blocks per day: highest-urgency topic first, cap per-subject per-day to avoid overload, insert review every N study sessions (spaced repetition: 1d, 3d, 7d, 14d), insert one buffer day per week, recovery day if streak fatigue high.
5. Respect peak window (morning/evening) for hard topics.
6. Write `roadmap_blocks` rows in a single transaction; record run summary.

Adaptation: if any block status flips to `skipped` or actual study < planned for 2+ days, the engine reruns and shifts unfinished work forward, never piling more than 130% capacity into any day.

---

## Phase 2 — Deep onboarding interview + exam wizard

### Adaptive interview (`src/pages/LearningProfileWizard.tsx`)
- Multi-step (10–12 screens), conditional branching (video/book paths), emoji-led answers, progress bar.
- Captures every field in `learning_profile`. Uses `useLearningProfile` hook (RQ + realtime).
- Final screen runs `estimationEngine` on a sample topic so the user *sees* the realism.

### Exam wizard (`src/pages/ExamWizard.tsx` + `/exams` list page)
- Step 1: title, type, date, priority, difficulty, target score.
- Step 2: pick subjects + add topics (title, pages, video min, difficulty, revisions, practice toggle).
- Step 3: live preview — engine shows estimated total hours, days needed, suggested daily load, feasibility verdict ("✅ feasible" / "⚠️ tight" / "❌ unrealistic — extend date or cut topics").
- Saves `exams` + `exam_topics`, then triggers planner regeneration.

---

## Phase 3 — Cinematic timeline + smart daily plan UI

### Timeline (`src/components/roadmap/RoadmapTimeline.tsx`)
- Horizontal scroll, weeks as columns, exams as vertical milestone pillars with countdown.
- Phase bands: Foundation → Build → Review → Final Sprint (computed from exam date proximity).
- Urgency color gradient (green→amber→red) per day based on packed minutes vs capacity.
- Drag a block to reschedule (writes back to `roadmap_blocks`, triggers re-validate).
- Framer-motion enter/zoom; tap a day → opens day detail sheet.

### Daily plan (`src/components/roadmap/SmartDailyPlan.tsx`)
- Replaces the existing simple daily list on Dashboard.
- Shows ordered blocks with type icon (📖 study, 🔁 review, 📝 test, ☕ buffer), exact start/end, subject, topic, "why this now" reason chip.
- One-tap: "Start in Timer" / "Mark done" / "Skip → reschedule".

### Insights (`src/components/roadmap/SmartInsightsPanel.tsx`)
Computed locally from sessions + roadmap:
- "You're 3.2h behind on Biology this week."
- "At current pace, Physics finishes 4 days after exam — increase by 25 min/day."
- "Focus drops after ~`focus_minutes` — 2 of 5 sessions yesterday exceeded this."
- "Practice-test sessions correlate with +12% productivity for you."

---

## Phase 4 — AI chatbot full awareness

Extend `supabase/functions/study-advisor/index.ts` context with new authoritative blocks the model must quote:
- **EXAMS** — title, days left, type, priority, % topics completed, projected on-time bool.
- **TOPICS PENDING** — top 8 by urgency with estimated remaining minutes.
- **TODAY'S ROADMAP** — exact blocks (type, subject, time, status).
- **LEARNING PROFILE SUMMARY** — speed/depth/focus/peak window in one line.
- **ADAPTATION EVENTS (7d)** — which exams were rebalanced and why.

System-prompt rules added:
- "What should I study tonight?" → quote TODAY'S ROADMAP blocks for evening window.
- "Am I on track for X?" → quote EXAMS row for X with projected date.
- Never invent topics; only reference rows from blocks above.

Client `aiContextDispatcher` fires on: exam create/update, topic complete, roadmap regenerate, profile change.

---

## Out of scope (this build)
- LLM-driven roadmap generation (engine is deterministic + fast; AI advises, doesn't plan). Adding LLM planner is an easy follow-up once the deterministic engine is solid.
- External calendar sync.
- Mobile push notifications.
- Mock-exam grading.

## Technical notes
- New files: 2 migrations, `estimationEngine.ts`, `plannerEngine.ts`, `useLearningProfile.ts`, `useExams.ts`, `useRoadmap.ts`, `LearningProfileWizard.tsx`, `ExamWizard.tsx`, `Exams.tsx`, `RoadmapTimeline.tsx`, `SmartDailyPlan.tsx`, `SmartInsightsPanel.tsx`, plus engine unit tests.
- Edited: `Dashboard.tsx` (swap planner block for `SmartDailyPlan` + add timeline strip), `BottomNav.tsx` (add Roadmap tab), `study-advisor/index.ts`, `App.tsx` (routes), `aiContextDispatcher.ts`.
- All mutations: optimistic RQ + invalidate + `dispatchAIContextRefresh`.
- Realtime subscriptions on `exams`, `exam_topics`, `roadmap_blocks`.

Approve to proceed — I'll start with the Phase 1 migration, then build straight through.
