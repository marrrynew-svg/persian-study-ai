import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Subjects from "./pages/Subjects";
import TimerPage from "./pages/TimerPage";
import Planner from "./pages/Planner";
import Tasks from "./pages/Tasks";
import FocusMode from "./pages/FocusMode";
import Advisor from "./pages/Advisor";
import Profile from "./pages/Profile";
import Groups from "./pages/Groups";
import Onboarding from "./pages/Onboarding";
import Analytics from "./pages/Analytics";
import NotesPage from "./pages/Notes";
import Roadmap from "./pages/Roadmap";
import Exams from "./pages/Exams";
import NotFound from "./pages/NotFound";
// Placeholder pages for newly added sub-routes
import Reviews from "./pages/placeholders/Reviews";
import CalendarPage from "./pages/placeholders/Calendar";
import Timeline from "./pages/placeholders/Timeline";
import Flashcards from "./pages/placeholders/Flashcards";
import ActiveRecall from "./pages/placeholders/ActiveRecall";
import Scanner from "./pages/placeholders/Scanner";
import Sessions from "./pages/placeholders/Sessions";
import SkillTree from "./pages/placeholders/SkillTree";
import Milestones from "./pages/placeholders/Milestones";
import Achievements from "./pages/placeholders/Achievements";
import Dreams from "./pages/placeholders/Dreams";
import Letters from "./pages/placeholders/Letters";
import Settings from "./pages/placeholders/Settings";
import CoachToday from "./pages/placeholders/CoachToday";
import CoachWeek from "./pages/placeholders/CoachWeek";
import CoachSuggest from "./pages/placeholders/CoachSuggest";
import CoachWeak from "./pages/placeholders/CoachWeak";
import CoachTomorrow from "./pages/placeholders/CoachTomorrow";
import CoachQuickReview from "./pages/placeholders/CoachQuickReview";
import CoachFeynman from "./pages/placeholders/CoachFeynman";
import SmartWizard from "./pages/plan/SmartWizard";
import SmartToday from "./pages/plan/SmartToday";
import SmartWeek from "./pages/plan/SmartWeek";
import SmartMonth from "./pages/plan/SmartMonth";
import PlanCoach from "./pages/plan/PlanCoach";
import { useStudySessionQueueSync } from "@/hooks/useStudySessions";
import { useEffect } from "react";
import { forceAIContextRefresh } from "@/lib/aiContextDispatcher";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  useStudySessionQueueSync();

  useEffect(() => {
    if (!user) return;
    forceAIContextRefresh();
    const onVisible = () => { if (document.visibilityState === "visible") forceAIContextRefresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
      <Route path="/timer" element={<ProtectedRoute><TimerPage /></ProtectedRoute>} />
      <Route path="/planner" element={<ProtectedRoute><Planner /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/focus" element={<ProtectedRoute><FocusMode /></ProtectedRoute>} />
      <Route path="/advisor" element={<ProtectedRoute><Advisor /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
      <Route path="/roadmap" element={<ProtectedRoute><Roadmap /></ProtectedRoute>} />
      <Route path="/exams" element={<ProtectedRoute><Exams /></ProtectedRoute>} />

      {/* Section hubs — redirect to first sub-route */}
      <Route path="/plan" element={<Navigate to="/plan/today" replace />} />
      <Route path="/study" element={<Navigate to="/timer" replace />} />
      <Route path="/coach" element={<Navigate to="/advisor" replace />} />
      <Route path="/journey" element={<Navigate to="/roadmap" replace />} />
      <Route path="/me" element={<Navigate to="/profile" replace />} />

      {/* Smart Planning v2 */}
      <Route path="/plan/wizard" element={<ProtectedRoute><SmartWizard /></ProtectedRoute>} />
      <Route path="/plan/today" element={<ProtectedRoute><SmartToday /></ProtectedRoute>} />
      <Route path="/plan/week" element={<ProtectedRoute><SmartWeek /></ProtectedRoute>} />
      <Route path="/plan/month" element={<ProtectedRoute><SmartMonth /></ProtectedRoute>} />
      <Route path="/plan/coach" element={<ProtectedRoute><PlanCoach /></ProtectedRoute>} />

      {/* Plan section */}
      <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />

      {/* Study section */}
      <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
      <Route path="/active-recall" element={<ProtectedRoute><ActiveRecall /></ProtectedRoute>} />
      <Route path="/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
      <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />

      {/* Journey section */}
      <Route path="/skill-tree" element={<ProtectedRoute><SkillTree /></ProtectedRoute>} />
      <Route path="/milestones" element={<ProtectedRoute><Milestones /></ProtectedRoute>} />
      <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />

      {/* Me section */}
      <Route path="/dreams" element={<ProtectedRoute><Dreams /></ProtectedRoute>} />
      <Route path="/letters" element={<ProtectedRoute><Letters /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      {/* Coach section */}
      <Route path="/coach/today" element={<ProtectedRoute><CoachToday /></ProtectedRoute>} />
      <Route path="/coach/week" element={<ProtectedRoute><CoachWeek /></ProtectedRoute>} />
      <Route path="/coach/suggest" element={<ProtectedRoute><CoachSuggest /></ProtectedRoute>} />
      <Route path="/coach/weak" element={<ProtectedRoute><CoachWeak /></ProtectedRoute>} />
      <Route path="/coach/tomorrow" element={<ProtectedRoute><CoachTomorrow /></ProtectedRoute>} />
      <Route path="/coach/quick-review" element={<ProtectedRoute><CoachQuickReview /></ProtectedRoute>} />
      <Route path="/coach/feynman" element={<ProtectedRoute><CoachFeynman /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
