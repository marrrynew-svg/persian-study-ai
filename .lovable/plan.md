## Goal
Rebuild study sessions to be fully editable/deletable/restorable, and make the AI chatbot always aware of the live state (including edits, deletes, and pending tasks).

## Scope

### 1. Database (migration)
- Add `deleted_at TIMESTAMPTZ NULL`, `notes TEXT`, `quality TEXT`, `edited_at TIMESTAMPTZ` to `study_sessions` for soft-delete + edit tracking.
- Add `session_edits` table (session_id, user_id, changed_fields jsonb, before jsonb, after jsonb, action: edit|delete|restore|create, created_at) for audit/AI memory.
- Update RLS so users can manage their own edits.
- Existing session queries filter `deleted_at IS NULL` by default.

### 2. Hooks: `useStudySessions`
- Add `useUpdateSession`, `useDeleteSession` (soft delete), `useRestoreSession`, `useHardDeleteSession`.
- Each mutation: writes to `session_edits`, invalidates queries, calls `dispatchAIContextRefresh` immediately.
- Default list filters out soft-deleted; expose `useDeletedSessions` for the trash/restore UI.

### 3. UI: Session edit/delete
- New `SessionEditDialog` component (subject, started_at, duration in minutes, session_type, quality, notes).
- Each session row in `DailyPlanner`, `StudyTimeline`, and Analytics list gets a popover menu: Edit / Delete / (Restore for deleted).
- Add a "سطل بازیافت" section on Analytics page listing recently deleted with one-click restore.

### 4. AI context: live + edits-aware
- Extend `study-advisor` edge function `📌 امروز` block to also include:
  - Today's edits (last 24h from `session_edits`)
  - Today's deletions
  - Pending tasks (incomplete, due today/overdue)
  - Week summary (per subject totals)
  - Planned vs actual (plan_items vs sessions) for today
- Include explicit rules: never count deleted sessions; quote edited durations as the new value.

### 5. Event-driven sync
- All mutations (create/edit/delete/restore + tasks) call `dispatchAIContextRefresh(reason)` which is already wired to the refresh function.
- Update `refresh-ai-context` to include edit/delete counts in the structured profile.

## Technical notes
- Soft delete via `deleted_at`; restore = set `deleted_at = NULL`.
- `session_edits` is append-only audit log — gives AI memory of changes.
- Quality/notes were collected in manual log dialog but never persisted; this fixes that too.
- Realtime channel already invalidates on `*` events — covers edits/deletes for free.
- Keep all UI in Persian, RTL, glassmorphism style per memory.

## Out of scope
- No redesign of dashboard/analytics layout (already shipped).
- No changes to timer logic.
- No rewrite of chatbot UI (already has slash commands).