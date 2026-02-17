

# برنامه‌ریزی درسی با هوش مصنوعی
## AI-Powered Study Planner — Premium Persian EdTech App

---

### 🎨 Design Foundation

- **Color palette**: Deep blue (`#1e3a5f`), emerald (`#10b981`), soft violet (`#8b5cf6`) with calm gradients
- **UI style**: Glassmorphism cards with soft shadows, micro-animations (framer-motion), RTL layout throughout
- **Typography**: Vazirmatn from Google Fonts for beautiful Persian rendering
- **Theme**: Dark mode + light mode with smooth transitions
- **Inspiration**: Notion's clarity + Headspace's calm + premium startup dashboard polish

---

### Phase 1 — MVP (Core Structure)

#### 1. Authentication & Onboarding
- Email/password signup & login via Lovable Cloud
- Beautiful onboarding flow collecting:
  - رشته (Field of study: تجربی / ریاضی / انسانی)
  - تاریخ آزمون (Target exam date)
  - ساعات مطالعه روزانه (Daily available hours)
  - رتبه هدف (Target rank)
- User profile page with editable settings

#### 2. Dashboard (صفحه اصلی)
- Welcome greeting with exam countdown timer
- Today's study plan summary card
- Quick stats: hours studied today, streak count, completion rate
- Charts: daily study hours (bar chart), subject distribution (pie chart)
- Weekly progress overview

#### 3. Subject & Resource Management (مدیریت دروس)
- Add/edit/delete subjects with custom icons
- Per-subject strength level slider (ضعیف / متوسط / قوی)
- Add resources (books, videos, notes) linked to subjects
- Visual progress indicator per subject

#### 4. Study Timer (تایمر مطالعه)
- Pomodoro mode (25/5 or custom intervals)
- Custom session mode (free-form timer)
- Select subject before starting
- Auto-save study session to database on completion
- Beautiful circular progress animation

#### 5. Smart Planner (برنامه‌ریز هوشمند)
- Daily plan view with time blocks
- Weekly plan overview
- Monthly calendar view
- Manual drag-and-drop task scheduling
- Mark tasks as done/skipped

#### 6. Task Manager (مدیریت وظایف)
- Create tasks with due dates and priority
- Link tasks to subjects
- Checklist-style completion tracking

#### 7. Focus Mode (حالت تمرکز)
- Full-screen distraction-free study screen
- Active timer display with subject info
- Motivational Persian quotes
- Minimal UI — just timer + controls

#### 8. Notification System
- Toast notifications for session completion, reminders
- Study streak alerts and achievements

---

### Phase 2 — AI-Powered Intelligence

#### 9. Smart Study Advisor (مشاور هوشمند مطالعه)
Connected to **Lovable AI (Gemini)** via edge function:

- **Personalized daily schedule generation** — AI analyzes user's subjects, strength levels, exam date, and available hours to create optimized study plans
- **Adaptive rescheduling** — When user misses sessions, AI rebuilds the remaining plan automatically
- **Emergency mode** — "آزمون فرداست!" — generates an intensive last-minute study plan prioritizing high-impact weak subjects
- **Subject prioritization** — AI weighs weakness level × exam importance × remaining days
- **Weekly performance insights** — AI-generated summary of what went well and what needs attention

#### 10. AI Data Infrastructure
Database tables to power the AI:
- **Users** — profile, exam date, field, target rank, daily hours
- **Subjects** — name, field, strength level, importance weight
- **StudySessions** — subject, duration, date, completion status
- **Plans** — daily/weekly generated plans with tasks
- **AIRecommendations** — stored AI suggestions with timestamps
- **PerformanceLogs** — daily aggregated stats for trend analysis

---

### Pages & Navigation

| Page | Description |
|------|-------------|
| `/auth` | Login & signup with onboarding |
| `/` | Dashboard with stats & today's plan |
| `/subjects` | Subject & resource management |
| `/timer` | Study timer (Pomodoro + custom) |
| `/planner` | Daily/weekly/monthly plan views |
| `/tasks` | Task manager |
| `/focus` | Full-screen focus mode |
| `/advisor` | AI Smart Study Advisor |
| `/profile` | User settings & profile |

Bottom navigation bar (mobile-first) with icons for: Dashboard, Timer, Planner, Advisor, Profile

---

### Technical Approach

- **Lovable Cloud** for auth, database, edge functions, and secrets
- **Lovable AI (Gemini)** for real-time personalized study recommendations via edge function
- **Recharts** for dashboard analytics charts
- **Vazirmatn font** via Google Fonts CDN
- **RTL layout** with `dir="rtl"` and Tailwind RTL utilities
- Modular component architecture for scalability

