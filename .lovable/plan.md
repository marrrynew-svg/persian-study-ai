
# Smart Planning System v2 — "AI Study Advisor"

Scope is locked to the planning system only. No other module (Dashboard layout, Tasks page, Roadmap engine, AI chat UI, gamification, social) will be redesigned — only **connected** to the new plan output.

---

## 1. Database (new tables, additive only)

````text
plan_wizard_state         current/last wizard answers (resume support)
plan_exam_setup           exam-level inputs (name, type, date, time)
plan_subject_inputs       per-subject volume: chapters, pages_left, tests_left,
                          notes_left, video_minutes_left, level, importance,
                          coefficient, target_percent
plan_study_style          daily hours, real focus hours, wake/sleep,
                          school/uni/work, weekend free, reading speed,
                          learning mode, focus minutes, test days/wk, reviews/wk
plan_analysis             computed: total_volume, required_minutes, days_left,
                          available_minutes, pressure_score, risk_level
                          (green|yellow|orange|red), reasoning jsonb
plan_daily_v2             per-day plan with rich blocks
plan_block_v2             subject, topic, pages, tests, study_min, review_min,
                          recovery_min, status
plan_weekly_goal          per-week per-subject budget + target progress %
plan_replan_log           nightly diff: done/missed/deferred, new plan id
````

All with `user_id`, RLS `auth.uid() = user_id`, proper GRANTs.

## 2. Wizard (intake UI)

Route: `/plan/wizard` (replaces current capacity dialog as entry point).
Steps:
1. Exam basics (name, type tabs: تستی/تشریحی/ترکیبی, date, time)
2. Subjects loop — one card per subject with all volume fields + level slider + coefficient + target %
3. Daily life — sleep/wake, school/uni/work toggles, weekend free
4. Study style — reading speed, learning mode, focus minutes, tests/wk, reviews/wk
5. Review & confirm

State persisted per step in `plan_wizard_state` (resume anywhere).

## 3. Analysis engine (`src/lib/planino/v2/`)

Pure TS modules:
- `volumeCalculator.ts` — per-subject required_minutes from pages × speed-factor + tests × per-test-time + videos / speed + reviews
- `capacityCalculator.ts` — daily available minutes from study_style + weekend multiplier
- `pressureModel.ts` — `pressure = required / available`, classify green/yellow/orange/red with thresholds
- `priorityRanker.ts` — score = coefficient × importance × (1 − current_level) × urgency
- `planBuilder.ts` — packs blocks per day respecting focus window, breaks, and review cadence (1-3-7-14 spaced)
- `pressureResponder.ts` — for orange/red: drop low-priority topics, raise daily minutes, inject recovery slots
- `replanner.ts` — nightly: read done blocks, compute deficit, regenerate next 7 days

All deterministic, unit-testable, no AI call required for core math.

## 4. Status diagnosis screen

After analysis, show a **diagnosis card** with verdict, numeric facts ("روزی ۴۸۰ دقیقه نیاز داری، ظرفیت ۳۶۰") and recommended action button: «برنامه فشرده», «حذف هوشمند مباحث», «افزایش ساعت مطالعه».

## 5. Daily / Weekly plan UI

Route: `/plan/today` and `/plan/week`.
Each block shows: subject · topic · pages · tests · study_min · review_min, with check/skip/postpone actions that feed the replanner.

## 6. Nightly replanner

Edge function `replan-tomorrow` (cron 23:30 local):
- read today's `plan_block_v2` results
- compute completion %, deferred minutes
- call `replanner.ts` logic server-side
- write new `plan_daily_v2` + `plan_block_v2` for next 7 days
- append `plan_replan_log` entry

Also exposed as a manual `POST /replan` button.

## 7. Dashboard integration (read-only hook)

Add a single new hook `useTodaySmartPlan()` consumed by the existing Home widget area:
- "امروز باید بخوانی" list
- progress ring (done_min / planned_min)
- next block CTA → `/study/timer?block=<id>`

No other Home component touched.

## 8. AI Chat integration

Extend `src/lib/aiContextDispatcher.ts` to include a `smartPlan` slice:
- today_blocks, week_goals, risk_level, deficit_minutes, weakest_subjects (lowest level × highest coefficient), feasibility_verdict
- Edge function `study-advisor` system prompt extended with this slice so questions like «امروز چی بخونم؟», «به آزمون می‌رسم؟», «ضعیف‌ترین درسم؟», «اگه ۲ ساعت بیشتر بخونم؟» are answered from real data (scenario question uses a pure-TS `simulateExtraMinutes()` helper).

## 9. Connections to Tasks / Exams / Roadmap / Reports

- **Exams**: wizard reads/writes existing `exams` + `exam_topics` (additive fields stored in new tables, not overwriting).
- **Tasks**: each generated block also surfaced as a virtual task in the Tasks list via a view-layer adapter — no schema change to `tasks`.
- **Roadmap**: completion events from blocks emit `node_events` (already exists) so the skill tree keeps updating.
- **Reports / Analytics**: existing analytics page reads `plan_daily_v2.total_done_minutes` via the same hook.

## 10. Out of scope (explicitly untouched)

Bottom nav, ComingSoon pages, Roadmap visual engine, Gamification logic, Groups, Notes, Onboarding, Focus mode UI, Theme.

---

## Technical notes

- All new files under `src/lib/planino/v2/`, `src/components/plan/v2/`, `src/pages/plan/`, `src/hooks/usePlanV2*.ts`.
- New edge function: `supabase/functions/replan-tomorrow/index.ts` (cron via `pg_cron` + `pg_net`, scheduled by a separate SQL the user approves).
- Realtime channels use the unique-name pattern already adopted to avoid the prior `postgres_changes after subscribe()` crash.

---

## Suggested build order

1. Migrations for the 8 new tables (one approval)
2. Analysis engine + unit tests (pure TS, no UI)
3. Wizard UI + persistence
4. Diagnosis screen
5. Daily/Weekly plan UI + block actions
6. Nightly replanner edge function + cron
7. Dashboard widget hook
8. AI context slice + advisor prompt update

Confirm and I'll start with **step 1 (migrations)**. If you want a smaller first slice (e.g. only engine + wizard, defer replanner) say so and I'll narrow scope.
