# Product Rebuild Plan — Sessions, AI Memory, Notes, Tasks, Home

This is a large multi-system rebuild. I'll ship it in one cohesive update, in the order below, so every layer (DB → hooks → UI → AI) stays in sync.

## 1. Database Migrations

New tables + columns to support the full product:

- **`notes`** table: `id, user_id, title, content (markdown), pinned bool, folder text, tags text[], subject_id, session_id (nullable link), created_at, updated_at`. RLS: users manage own.
- **`tasks`** — add columns: `tags text[]`, `category text`, `recurrence text` (none|daily|weekly), `parent_task_id uuid` (subtasks), `position int`, `completed_at timestamptz`.
- **`study_sessions`** — add `tags text[]`, `productivity_rating int (1–5)`, `focus_quality text` (already have `quality`, will reuse). Confirm `notes`, `deleted_at`, `edited_at` exist (they do).
- Indexes for `notes(user_id, updated_at)`, `tasks(user_id, parent_task_id)`.

## 2. Session CRUD — Make Actions Visible & Powerful

Replace the hidden popover-only menu with **inline visible action buttons** on every session card:

- New component `SessionCard` with always-visible icon buttons: ✏️ Edit · 📋 Duplicate · 🗒️ Add Note · 🗑️ Delete, plus a "Details" tap target.
- Used in `DailyPlanner`, `StudyTimeline`, and a new "Today's Sessions" home block.
- Enhance `SessionEditDialog`: subject, date, start time, end time (auto-compute duration), duration override, mode, productivity rating (1–5 stars), tags, notes — all in one elegant modal.
- New hook `useDuplicateSession` (creates a copy now-shifted).
- New hook `useAddSessionNote` (creates a `notes` row linked via `session_id` and refreshes AI context).
- New `SessionDetailsSheet` (slide-over): full info, edit timeline from `session_edits`, linked notes, tags, AI insight (local heuristic).
- Trash/Restore: keep on Analytics page (already exists), add a quick-link from Home when trash > 0.

## 3. Notes System

- Routes: `/notes` (list + editor split view) + quick-note widget on Home.
- `NotesList`: search, folder filter, tag filter, pinned-first.
- `NoteEditor`: markdown textarea with live preview (use existing `react-markdown` if present, else simple textarea + preview). Pin/unpin, folder, tags, link-to-subject/session.
- Hooks: `useNotes`, `useUpsertNote`, `useDeleteNote`, `useTogglePin` — all dispatch AI context refresh.
- Add nav entry in `BottomNav`.

## 4. Task Manager Upgrade

- Enhance `/tasks` page: filters (today / upcoming / overdue / completed), priority pill, drag-to-reorder (using `@dnd-kit/core` if installed, else simple up/down arrows), subtask expand, tags chips, due-date picker.
- Quick-add input on Home with priority + due-date inline.
- New hooks: `useReorderTasks`, `useAddSubtask`. Existing `useToggleTask` already dispatches AI refresh.

## 5. Home Redesign

Single composed `Dashboard.tsx` with these stacked blocks (mobile-first, RTL):

1. **Hero**: greeting + streak + XP + today progress ring + one-line motivational AI insight.
2. **Quick Actions row**: Start Timer · Add Session · Add Task · Add Note (chip buttons).
3. **Today's Sessions**: new `SessionCard` list with visible CRUD.
4. **Today's Tasks**: compact task list + quick-add.
5. **Quick Notes**: 3 most-recent + pinned, "+ note" button.
6. **Smart AI Panel**: weak subject warning, recommended next subject, productivity trend (local computation from `analytics.ts`).
7. **Subjects Grid** (existing).

Keep the existing premium glass theme. Improve spacing, typography hierarchy, larger tap targets.

## 6. AI Memory Engine — Real, Not Generic

Server-side (`supabase/functions/study-advisor/index.ts`):

Extend the live `📌 امروز` block and add new authoritative blocks the model **must quote**:

- **TODAY**: every session today (subject, exact start time, duration mm:ss, mode, productivity, tags, notes excerpt). Total per subject + grand total.
- **YESTERDAY**: same compact summary.
- **NOT STUDIED**: subjects with zero minutes in last 7 days.
- **PENDING TASKS**: title, due date, priority, overdue flag.
- **COMPLETED TODAY**: tasks closed today.
- **RECENT EDITS** (24h): from `session_edits` — "Biology session changed from 20m → 45m at 14:32".
- **DELETED TODAY**: list (so AI never counts them).
- **NOTES** (5 most recent + all pinned): title + first 200 chars.
- **WEAK / STRONG**: by 7-day minutes vs `subjects.importance_weight`.
- **STREAK + CONSISTENCY**: from `user_xp` + last 14 days.

System-prompt rules (append):
- Never say "اطلاعاتی ندارم" — quote the blocks.
- For "امروز چی خوندم" → enumerate TODAY block exactly.
- For "چی تموم نکردم" → enumerate PENDING TASKS.
- For "چی تغییر کرد" → quote RECENT EDITS.
- Never reference deleted sessions in totals.
- Always reply in Persian, friendly, concise.

Client (`aiContextDispatcher.ts`): already wired. Add dispatch calls from new note hooks.

## 7. State Management & Realtime

- All mutations use React Query optimistic updates + `invalidateQueries` + `dispatchAIContextRefresh(reason)`.
- Add Supabase realtime subscription for `notes` and existing `tasks`/`study_sessions` (sessions already have one in queue sync). This guarantees instant cross-device + cross-tab refresh.

## 8. Polish

- Loading skeletons for each Home block.
- Empty states with single primary CTA.
- Framer-motion enter/exit on session/task/note add+remove.
- Larger 40px+ tap targets for primary actions.

## Out of Scope (explicit)

- Theme engine rebuild (already done).
- Onboarding rewrite (already done).
- Timer logic changes.
- Calendar sync to external calendars (mentioned but heavy; will add a placeholder-free local calendar view only if time).

## Technical Notes

- New files: `src/components/sessions/SessionCard.tsx`, `SessionDetailsSheet.tsx`; `src/components/notes/{NotesList,NoteEditor,QuickNotes}.tsx`; `src/hooks/useNotes.ts`, `useDuplicateSession` (added to `useStudySessions.ts`); `src/pages/Notes.tsx`; new migration file.
- Edited: `Dashboard.tsx`, `Tasks.tsx`, `DailyPlanner.tsx`, `StudyTimeline.tsx`, `SessionEditDialog.tsx`, `BottomNav.tsx`, `App.tsx`, `study-advisor/index.ts`, `refresh-ai-context/index.ts`.
- Migration is the first step; after approval I'll implement everything else in one pass.

Approve to proceed.