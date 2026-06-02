import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Sparkles, Wand2 } from "lucide-react";

import { useExams, useExamTopics } from "@/hooks/useExams";
import { useLearningProfile, useUpsertLearningProfile, DEFAULT_PROFILE } from "@/hooks/useLearningProfile";
import { useRoadmapBlocks, useRegenerateRoadmap } from "@/hooks/useRoadmap";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useTasks } from "@/hooks/useTasks";
import { useUserXP } from "@/hooks/useGamification";
import { useProfile } from "@/hooks/useProfile";
import { useRPGState } from "@/hooks/useRPGState";
import { useSubjects } from "@/hooks/useSubjects";
import {
  useRoadmapNodes, useGenerateNodesFromExams, useCreateRoadmapNode,
  type RoadmapNodeRow,
} from "@/hooks/useRoadmapNodes";

import { LearningProfileDialog } from "@/components/roadmap/LearningProfileDialog";
import { AdventureMap } from "@/components/roadmap/AdventureMap";
import { MiniMap } from "@/components/roadmap/MiniMap";
import { WeatherOverlay, weatherIcon } from "@/components/roadmap/WeatherOverlay";
import { DailyQuestsDrawer } from "@/components/roadmap/DailyQuestsDrawer";
import { AchievementsPanel } from "@/components/roadmap/AchievementsPanel";
import { SkillTreeDialog } from "@/components/roadmap/SkillTreeDialog";
import { AIMentorPanel } from "@/components/roadmap/AIMentorPanel";
import { NodeDetailDialog } from "@/components/roadmap/NodeDetailDialog";
import { RewardOverlay } from "@/components/roadmap/RewardOverlay";

import { currentNodeIndex, type MapNode } from "@/lib/worldBuilder";
import {
  ALL_ACHIEVEMENTS, calculateWeather, checkAchievements, computeTotalXP, getLevelInfo,
} from "@/lib/xpEngine";

export default function Roadmap() {
  const navigate = useNavigate();
  const { data: exams = [] } = useExams();
  const { data: topics = [] } = useExamTopics();
  const { data: profile } = useLearningProfile();
  const { data: blocks = [] } = useRoadmapBlocks(30);
  const { data: sessions = [] } = useStudySessions(30);
  const { data: tasks = [] } = useTasks();
  const { data: userProfile } = useProfile();
  const { data: userXP } = useUserXP();
  const { data: subjects = [] } = useSubjects();
  const { data: rmNodes = [] } = useRoadmapNodes();
  const generateFromExams = useGenerateNodesFromExams();
  const createNode = useCreateRoadmapNode();
  const regen = useRegenerateRoadmap();
  const upsertProfile = useUpsertLearningProfile();

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

  // --- Stats derived from real data ---
  const totalStudyMinutes = useMemo(
    () => sessions.reduce((a: number, s: any) => a + (s.duration_minutes || 0), 0),
    [sessions]
  );
  const completedTasks = useMemo(
    () => (tasks as any[]).filter((t) => t.completed || t.status === "done").length,
    [tasks]
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

  const nextExamDays = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = exams
      .filter((e) => +new Date(e.exam_date) >= +today)
      .sort((a, b) => +new Date(a.exam_date) - +new Date(b.exam_date))[0];
    if (!upcoming) return 999;
    return Math.ceil((+new Date(upcoming.exam_date) - +today) / 86400000);
  }, [exams]);

  // --- Build MapNode[] from real RoadmapNodeRow[] (DB source of truth) ---
  const nodes: MapNode[] = useMemo(() => {
    if (rmNodes.length === 0) return [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    // synthetic start
    const startNode: MapNode = {
      id: "__start__", kind: "start", status: "completed",
      title: "شروع سفر", subtitle: "اولین قدم", xpReward: 0,
      position: { x: 600, y: 80 },
    };
    const sorted = [...rmNodes].sort((a, b) => a.order_index - b.order_index);
    const mapped: MapNode[] = sorted.map((n) => {
      const days = n.due_date ? Math.ceil((+new Date(n.due_date) - +today) / 86400000) : undefined;
      const kind: MapNode["kind"] =
        n.type === "boss" ? "boss" :
        n.type === "review" || n.type === "exam" ? "finish" :
        "milestone";
      const status: MapNode["status"] =
        n.status === "completed" ? "completed" :
        n.status === "in_progress" ? "current" :
        n.status === "available" ? (days !== undefined && days <= 7 ? "current" : "locked") :
        "locked";
      return {
        id: n.id, kind, status,
        title: n.title, subtitle: n.description || undefined,
        date: n.due_date || undefined, daysAway: days,
        xpReward: n.xp_reward, reward: `+${n.xp_reward} XP`,
        position: { x: n.position_x || 600, y: 200 + (n.order_index || 0) * 180 },
        examId: n.exam_id || undefined,
      };
    });
    return [startNode, ...mapped];
  }, [rmNodes]);

  // --- XP, level, weather ---
  const totalXP = computeTotalXP({
    totalStudyMinutes, completedTasks, doneExams,
    bossesDefeated: doneExams, streakDays: streak,
  });
  const levelInfo = getLevelInfo(totalXP);
  const weather = calculateWeather({ streak, todayMinutes, daysToExam: nextExamDays });

  // --- RPG meta state (achievements / quests) ---
  const weakSubject = ((userProfile as any)?.weak_subjects?.[0]) ?? null;
  const dailyStudyHours = Math.max(1, Math.round(((profile?.weekly_available_hours || 14) / 7)));
  const { state: rpg, unlock, setQuestProgress } = useRPGState({ dailyStudyHours, weakSubject });

  // Sync quest progress from real data
  useEffect(() => {
    setQuestProgress([
      { type: "study_hours", value: todayMinutes },
      { type: "tasks", value: completedTasks },
      { type: "review", value: blocks.filter((b: any) => b.block_type === "review" && b.status === "done" && b.date === todayKey).length },
      { type: "test", value: blocks.filter((b: any) => b.block_type === "test" && b.status === "done" && b.date === todayKey).length },
    ]);
  }, [todayMinutes, completedTasks, blocks, todayKey, setQuestProgress]);

  // Unlock achievements as triggers fire
  useEffect(() => {
    const newly = checkAchievements({
      totalStudyMinutes, completedTasks, doneExams,
      bossesDefeated: doneExams, streakDays: streak,
      finishedGoal: nodes[nodes.length - 1]?.status === "completed",
    }, rpg.unlockedAchievements);
    if (newly.length > 0) {
      unlock(newly.map((a) => a.id));
      newly.forEach((a) => toast.success(`🏅 ${a.title} باز شد!`, { description: `+${a.xpReward} XP` }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalStudyMinutes, completedTasks, doneExams, streak]);

  // --- Mentor message ---
  const mentorMessage = useMemo(() => {
    if (nextExamDays <= 7) return `فقط ${nextExamDays} روز تا آزمون نزدیک! امروز مرور و تست‌زنی رو جدی بگیر.`;
    if (streak === 0)       return "چند روزه نخوندی. یه جلسه‌ی ۲۵ دقیقه‌ای کوتاه شروع کن، استریک رو احیا کن.";
    if (todayMinutes === 0) return "امروز هنوز شروع نکردی. کوتاه‌ترین تسک رو بزن، بقیه راحت‌تر میشه.";
    if (streak >= 7)        return `${streak} روز استریک! این ریتم رو نگه دار، Boss نزدیکه.`;
    return `${Math.round(totalStudyMinutes / 60)} ساعت تا حالا. ادامه بده، در سطح ${levelInfo.level} (${levelInfo.name}) هستی.`;
  }, [nextExamDays, streak, todayMinutes, totalStudyMinutes, levelInfo]);

  // --- Weekly challenge derived from sessions ---
  const weeklyChallenge = useMemo(() => {
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);
    const minutesThisWeek = sessions
      .filter((s: any) => +new Date(s.started_at) >= +weekStart)
      .reduce((a: number, s: any) => a + (s.duration_minutes || 0), 0);
    const target = (profile?.weekly_available_hours || 14) * 60;
    const deadline = new Date(weekStart.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    return { title: "هدف هفتگی مطالعه", target, current: minutesThisWeek, xpReward: 200, deadline };
  }, [sessions, profile]);

  // --- Minimap pan target ---
  const [panTarget, setPanTarget] = useState<{ x: number; y: number } | undefined>();
  const handleJump = (x: number, y: number) => {
    setPanTarget({ x, y });
    toast.message("به این بخش از نقشه برو", { description: "روی نود کلیک کن تا جزئیاتش رو ببینی" });
  };

  const handleRegen = async () => {
    let p = profile;
    if (!p) p = (await upsertProfile.mutateAsync(DEFAULT_PROFILE)) as any;
    if (exams.length === 0) { toast.error("اول حداقل یک آزمون اضافه کن"); navigate("/exams"); return; }
    try {
      const summary = await regen.mutateAsync({ exams, topics, profile: p!, daysHorizon: 30 });
      toast.success(`نقشه راه ساخته شد · ${summary.totalBlocks} بلوک`);
    } catch (e: any) { toast.error(e.message || "خطا در ساخت برنامه"); }
  };

  const curNode = nodes[currentNodeIndex(nodes)];
  const shake = weather.type === "lightning";

  // --- Node detail dialog state ---
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedRow = useMemo(
    () => rmNodes.find((n) => n.id === selectedNodeId) || null,
    [rmNodes, selectedNodeId]
  );

  // --- Reward overlay: trigger when a node flips to "completed" ---
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

  const handleAddNode = async () => {
    try {
      await createNode.mutateAsync({
        title: "نود جدید",
        type: "study", status: "available",
        estimated_minutes: 60, xp_reward: 50,
        position_x: 600, position_y: 400,
        order_index: (rmNodes[rmNodes.length - 1]?.order_index ?? 0) + 1,
      });
      toast.success("نود اضافه شد");
    } catch (e: any) { toast.error(e.message || "خطا"); }
  };

  return (
    <AppLayout>
      <WeatherOverlay weather={weather} />

      <div className="px-3 pt-4 pb-24 max-w-lg mx-auto space-y-3">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> سفر یادگیری
            </h1>
            <p className="text-[11px] text-muted-foreground">
              سطح {levelInfo.level} · {levelInfo.name} · {totalXP.toLocaleString("fa-IR")} XP
            </p>
          </div>
          <LearningProfileDialog />
        </motion.div>

        {/* Weather strip */}
        <div
          className="rounded-xl px-3 py-2 text-xs flex items-center gap-2 backdrop-blur-md"
          style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-base">{weatherIcon(weather.type)}</span>
          <span className="text-white/80">{weather.reason}</span>
        </div>

        {exams.length === 0 ? (
          <Card className="glass rounded-2xl p-8 text-center">
            <Sparkles className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold mb-1">هنوز آزمونی تعریف نکردی</p>
            <p className="text-xs text-muted-foreground mb-4">اول یه آزمون اضافه کن تا نقشه سفرت ساخته بشه</p>
            <Button onClick={() => navigate("/exams")} className="gradient-primary text-primary-foreground rounded-xl">
              تعریف آزمون
            </Button>
          </Card>
        ) : (
          <>
            {/* The Adventure Map */}
            <AdventureMap
              nodes={nodes}
              avatar={{ level: levelInfo.level, glowColor: levelInfo.glowColor }}
              weatherShake={shake}
              onNodeClick={(n) => {
                if (n.id === "__start__") return;
                setSelectedNodeId(n.id);
              }}
            />

            {/* Action row */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleRegen} disabled={regen.isPending} className="flex-1 min-w-[120px] gap-1.5 gradient-primary text-primary-foreground rounded-xl">
                <Wand2 className={`w-4 h-4 ${regen.isPending ? "animate-spin" : ""}`} />
                {regen.isPending ? "…" : "ساخت با AI"}
              </Button>
              <Button variant="outline" onClick={handleAddNode} className="gap-1.5 rounded-xl">
                <Plus className="w-4 h-4" /> نود
              </Button>
              <Button variant="outline" onClick={() => navigate("/exams")} className="gap-1.5 rounded-xl">
                <Plus className="w-4 h-4" /> آزمون
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <DailyQuestsDrawer quests={rpg.quests} weekly={weeklyChallenge} />
              <AchievementsPanel unlocked={rpg.unlockedAchievements} />
              <SkillTreeDialog topics={topics} mastery={rpg.mastery} />
              <AIMentorPanel totalXP={totalXP} streak={streak} message={mentorMessage} />
            </div>

            <MiniMap nodes={nodes} panTarget={curNode?.position} onJump={handleJump} />
          </>
        )}
      </div>

      <NodeDetailDialog
        node={selectedRow}
        open={!!selectedNodeId}
        onOpenChange={(o) => { if (!o) setSelectedNodeId(null); }}
        subjects={subjects.map((s: any) => ({ id: s.id, name: s.name }))}
      />

      <RewardOverlay reward={reward} onDone={() => setReward(null)} />
    </AppLayout>
  );
}