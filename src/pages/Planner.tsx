import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useSubjects } from "@/hooks/useSubjects";
import { useUserXP } from "@/hooks/useGamification";
import { PlannerDashboard } from "@/components/planner/PlannerDashboard";
import { DailyPlanner } from "@/components/planner/DailyPlanner";
import { WeeklyPlanner } from "@/components/planner/WeeklyPlanner";
import { MonthlyCalendar } from "@/components/planner/MonthlyCalendar";
import { GoalTracker } from "@/components/planner/GoalTracker";
import { SessionLogDialog } from "@/components/planner/SessionLogDialog";
import { BarChart3, CalendarDays, LayoutGrid, Target, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Planner() {
  const [tab, setTab] = useState("daily");
  const { data: sessions = [] } = useStudySessions(90);
  const { data: subjects = [] } = useSubjects();
  const { data: xpData } = useUserXP();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="px-4 pt-5 pb-4 max-w-lg mx-auto space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              📒 برنامه‌ریز هوشمند
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">برنامه‌ات رو مدیریت کن و پیشرفتت رو ببین</p>
          </div>
          <SessionLogDialog subjects={subjects}>
            <Button size="icon" className="rounded-xl gradient-primary text-primary-foreground h-9 w-9 shadow-lg">
              <Plus className="w-4 h-4" />
            </Button>
          </SessionLogDialog>
        </motion.div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full rounded-xl h-10 p-1 bg-muted/60 backdrop-blur">
            <TabsTrigger value="daily" className="flex-1 rounded-lg gap-1 text-xs data-[state=active]:shadow-md">
              <CalendarDays className="w-3.5 h-3.5" />
              روزانه
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex-1 rounded-lg gap-1 text-xs data-[state=active]:shadow-md">
              <LayoutGrid className="w-3.5 h-3.5" />
              هفتگی
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex-1 rounded-lg gap-1 text-xs data-[state=active]:shadow-md">
              <BarChart3 className="w-3.5 h-3.5" />
              داشبورد
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex-1 rounded-lg gap-1 text-xs data-[state=active]:shadow-md">
              <Target className="w-3.5 h-3.5" />
              اهداف
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4">
            <DailyPlanner sessions={sessions} subjects={subjects} />
            {/* Monthly mini calendar */}
            <div className="mt-4">
              <MonthlyCalendar sessions={sessions} />
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="mt-4">
            <WeeklyPlanner sessions={sessions} subjects={subjects} />
          </TabsContent>

          <TabsContent value="dashboard" className="mt-4">
            <PlannerDashboard sessions={sessions} subjects={subjects} xpData={xpData} />
          </TabsContent>

          <TabsContent value="goals" className="mt-4">
            <GoalTracker sessions={sessions} subjects={subjects} xpData={xpData} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
