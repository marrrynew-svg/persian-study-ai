import {
  Home, Calendar, BookOpen, Brain, Map, User,
  CalendarDays, CalendarRange, Repeat, ListChecks, Clock,
  Timer, Layers, Sparkles, ScanLine, History,
  MessageSquare, BarChart3, TrendingUp, Lightbulb, AlertTriangle, CalendarClock, Zap, GraduationCap,
  Trophy, Award, Milestone,
  UserCircle2, FileBarChart, Heart, Mail, NotebookPen, Settings,
  type LucideIcon,
} from "lucide-react";

export type SectionKey = "home" | "plan" | "study" | "coach" | "journey" | "me";

export interface SubRoute {
  path: string;
  label: string;
  icon: LucideIcon;
}

export interface Section {
  key: SectionKey;
  path: string; // default landing
  label: string;
  icon: LucideIcon;
  subs: SubRoute[];
}

export const SECTIONS: Section[] = [
  {
    key: "home",
    path: "/",
    label: "خانه",
    icon: Home,
    subs: [{ path: "/", label: "داشبورد", icon: Home }],
  },
  {
    key: "plan",
    path: "/plan",
    label: "برنامه",
    icon: Calendar,
    subs: [
      { path: "/planner", label: "هفتگی", icon: CalendarRange },
      { path: "/exams", label: "آزمون‌ها", icon: GraduationCap },
      { path: "/tasks", label: "تسک‌ها", icon: ListChecks },
      { path: "/reviews", label: "مرورها", icon: Repeat },
      { path: "/calendar", label: "تقویم", icon: CalendarDays },
      { path: "/timeline", label: "Timeline", icon: Clock },
    ],
  },
  {
    key: "study",
    path: "/study",
    label: "مطالعه",
    icon: BookOpen,
    subs: [
      { path: "/timer", label: "تایمر", icon: Timer },
      { path: "/focus", label: "فوکوس", icon: Zap },
      { path: "/flashcards", label: "فلش‌کارت", icon: Layers },
      { path: "/active-recall", label: "مرور فعال", icon: Sparkles },
      { path: "/scanner", label: "اسکنر", icon: ScanLine },
      { path: "/sessions", label: "جلسات", icon: History },
      { path: "/subjects", label: "درس‌ها", icon: BookOpen },
    ],
  },
  {
    key: "coach",
    path: "/coach",
    label: "مربی AI",
    icon: Brain,
    subs: [
      { path: "/advisor", label: "گفت‌وگو", icon: MessageSquare },
      { path: "/coach/today", label: "تحلیل امروز", icon: BarChart3 },
      { path: "/coach/week", label: "تحلیل هفته", icon: TrendingUp },
      { path: "/coach/suggest", label: "پیشنهاد مطالعه", icon: Lightbulb },
      { path: "/coach/weak", label: "نقاط ضعف", icon: AlertTriangle },
      { path: "/coach/tomorrow", label: "برنامه فردا", icon: CalendarClock },
      { path: "/coach/quick-review", label: "مرور فوری", icon: Zap },
      { path: "/coach/feynman", label: "Feynman", icon: GraduationCap },
    ],
  },
  {
    key: "journey",
    path: "/roadmap",
    label: "سفر",
    icon: Map,
    subs: [
      { path: "/roadmap", label: "نقشه راه", icon: Map },
      { path: "/skill-tree", label: "درخت مهارت", icon: Trophy },
      { path: "/milestones", label: "نقاط عطف", icon: Milestone },
      { path: "/achievements", label: "دستاوردها", icon: Award },
    ],
  },
  {
    key: "me",
    path: "/profile",
    label: "من",
    icon: User,
    subs: [
      { path: "/profile", label: "پروفایل", icon: UserCircle2 },
      { path: "/analytics", label: "گزارش‌ها", icon: FileBarChart },
      { path: "/notes", label: "یادداشت‌ها", icon: NotebookPen },
      { path: "/groups", label: "گروه‌ها", icon: User },
      { path: "/dreams", label: "Dream Board", icon: Heart },
      { path: "/letters", label: "نامه‌ها", icon: Mail },
      { path: "/settings", label: "تنظیمات", icon: Settings },
    ],
  },
];

export function getActiveSection(pathname: string): Section {
  // Match by sub path
  for (const s of SECTIONS) {
    if (s.subs.some(sub => sub.path === pathname)) return s;
  }
  // Match by section path prefix
  for (const s of SECTIONS) {
    if (s.key !== "home" && pathname.startsWith(s.path)) return s;
  }
  return SECTIONS[0];
}