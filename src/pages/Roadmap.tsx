import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

import { useExams, useExamTopics } from "@/hooks/useExams";
import { useLearningProfile } from "@/hooks/useLearningProfile";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useUserXP } from "@/hooks/useGamification";
import { useSubjects } from "@/hooks/useSubjects";
import {
  useRoadmapNodes, useGenerateNodesFromExams, useCreateRoadmapNode,
} from "@/hooks/useRoadmapNodes";

import { LearningProfileDialog } from "@/components/roadmap/LearningProfileDialog";
import { NodeDetailDialog } from "@/components/roadmap/NodeDetailDialog";
import { RewardOverlay } from "@/components/roadmap/RewardOverlay";
import { ExamWizard } from "@/components/roadmap/ExamWizard";
import { CapacitySetupDialog } from "@/components/planino/CapacitySetupDialog";
import { BacklogDrawer } from "@/components/planino/BacklogDrawer";
import { BehaviorInsights } from "@/components/planino/BehaviorInsights";
import { useGeneratePlan } from "@/hooks/usePlanino";
import { Wand2 } from "lucide-react";

import { TodayMission } from "@/components/roadmap/command/TodayMission";
import { WeeklyMissionBoard } from "@/components/roadmap/command/WeeklyMissionBoard";
import { ExamJourney } from "@/components/roadmap/command/ExamJourney";
import { SubjectMasteryCenter } from "@/components/roadmap/command/SubjectMasteryCenter";
import { getLevelInfo, computeTotalXP } from "@/lib/xpEngine";

export default function Roadmap() {
  const navigate = useNavigate();
  const { data: exams = [] } = useExams();
  const { data: topics = [] } = useExamTopics();
  const { data: profile } = useLearningProfile();
  const { data: sessions = [] } = useStudySessions(30);
  const { data: userXP } = useUserXP();
  const { data: subjects = [] } = useSubjects();
  const { data: rmNodes = [] } = useRoadmapNodes();
  const generateFromExams = useGenerateNodesFromExams();
  const createNode = useCreateRoadmapNode();
  const generatePlan = useGeneratePlan();

  // Auto-bootstrap nodes for any exam that doesn't have nodes yet
  useEffect(() => {
    if (exams.length === 0) return;
    const haveExamIds = new Set(rmNodes.filter((n) => n.exam_id).map((n) => n.exam_id));
    const missing = exams.filter((e) => !haveExamIds.has(e.id));
    if (missing.length === 0) return;
    const topicsByExam: Record<string, any[]> = {};
    for (const e of missing) {
      topicsByExam[e.id] = topics.filter((t) => t.exam_id === e.id);
    }
    generateFromExams.mutate({ exams: missing as any, topicsByExam, existing: rmNodes });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exams.length, rmNodes.length, topics.length]);


  // --- Stats ---
  const totalStudyMinutes = useMemo(
    () => sessions.reduce((a: number, s: any) => a + (s.duration_minutes || 0), 0),
    [sessions]
  );
  const doneExams = useMemo(() => exams.filter((e) => e.status === "done").length, [exams]);
  const streak = (userXP as any)?.streak_days ?? 0;

  const todayKey = new Date().toISOString().split("T")[0];
  const todayMinutes = useMemo(
    () => sessions
      .filter((s: any) => (s.started_at || "").slice(0, 10) === todayKey)
      .reduce((a: number, s: any) => a + (s.duration_minutes || 0), 0),
    [sessions, todayKey]
  );

  const dailyTargetMinutes = Math.round(((profile?.weekly_available_hours || 14) / 7) * 60);

  const totalXP = computeTotalXP({
    totalStudyMinutes, completedTasks: 0, doneExams,
    bossesDefeated: doneExams, streakDays: streak,
  });
  const levelInfo = getLevelInfo(totalXP);

  // --- Dialog state ---
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedRow = useMemo(
    () => rmNodes.find((n) => n.id === selectedNodeId) || null,
    [rmNodes, selectedNodeId]
  );
  const [wizardOpen, setWizardOpen] = useState(false);

  // --- Reward overlay ---
  const [reward, setReward] = useState<{ id: string; title: string; xp: number } | null>(null);
  const [knownCompleted, setKnownCompleted] = useState<Set<string>>(new Set());
  useEffect(() => {
    const completed = rmNodes.filter((n) => n.status === "completed");
    if (knownCompleted.size === 0) {
      setKnownCompleted(new Set(completed.map((n) => n.id)));
      return;
    }
    const newly = completed.find((n) => !knownCompleted.has(n.id));
    if (newly) {
      setReward({ id: newly.id, title: newly.title, xp: newly.xp_reward });
      setKnownCompleted(new Set(completed.map((n) => n.id)));
    }
  }, [rmNodes]); // eslint-disable-line

  const handleAddMission = async () => {
    try {
      await createNode.mutateAsync({
        title: "ماموریت جدید",
        type: "study", status: "available",
        estimated_minutes: 60, xp_reward: 50,
        due_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        order_index: (rmNodes[rmNodes.length - 1]?.order_index ?? 0) + 1,
      });
      toast.success("ماموریت اضافه شد");
    } catch (e: any) { toast.error(e.message || "خطا"); }
  };

  const subjectsLight = subjects.map((s: any) => ({
    id: s.id, name: s.name, icon: s.icon, color: s.color,
  }));

  return (
    <AppLayout>
      <div className="px-3 pt-4 pb-24 max-w-lg mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> مرکز فرماندهی
            </h1>
            <p className="text-[11px] text-muted-foreground">
              سطح {levelInfo.level} · {levelInfo.name} · {totalXP.toLocaleString("fa-IR")} XP · {streak} روز استریک
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon" variant="ghost" className="w-8 h-8"
              onClick={() => navigate("/advisor")}
              title="مکالمه با Aria"
            >
              <Sparkles className="w-4 h-4 text-primary" />
            </Button>
            <LearningProfileDialog />
          </div>
        </div>

        {/* 1) Today Mission */}
        <TodayMission
          nodes={rmNodes}
          subjects={subjectsLight}
          exams={exams}
          todayMinutes={todayMinutes}
          dailyTargetMinutes={dailyTargetMinutes}
          onOpenNode={setSelectedNodeId}
        />

        {/* Planino controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="gap-1 gradient-primary text-primary-foreground"
            onClick={() => generatePlan.mutate()}
            disabled={generatePlan.isPending}
          >
            <Wand2 className="w-4 h-4" />
            {generatePlan.isPending ? "..." : "بازسازی برنامه ۷ روزه"}
          </Button>
          <CapacitySetupDialog />
          <BacklogDrawer />
        </div>

        {/* Behavior insights */}
        <BehaviorInsights />

        {/* 2) Weekly Mission Board */}
        <WeeklyMissionBoard
          nodes={rmNodes}
          subjects={subjectsLight}
          onOpenNode={setSelectedNodeId}
          onAddMission={handleAddMission}
        />

        {/* 3) Exam Journey */}
        <ExamJourney
          exams={exams}
          nodes={rmNodes}
          onAddExam={() => setWizardOpen(true)}
          onOpenNode={setSelectedNodeId}
        />

        {/* 4) Subject Mastery Center */}
        <SubjectMasteryCenter
          subjects={subjectsLight}
          nodes={rmNodes}
          topics={topics}
          sessions={sessions as any}
          onOpenNode={setSelectedNodeId}
        />
      </div>

      <NodeDetailDialog
        node={selectedRow}
        open={!!selectedNodeId}
        onOpenChange={(o) => { if (!o) setSelectedNodeId(null); }}
        subjects={subjectsLight.map((s) => ({ id: s.id, name: s.name }))}
      />

      <ExamWizard open={wizardOpen} onOpenChange={setWizardOpen} />

      <RewardOverlay reward={reward} onDone={() => setReward(null)} />
    </AppLayout>
  );
}