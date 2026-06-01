import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Sparkles } from "lucide-react";

import { useExams, useExamTopics } from "@/hooks/useExams";
import { useLearningProfile, useUpsertLearningProfile, DEFAULT_PROFILE } from "@/hooks/useLearningProfile";
import { useRoadmapBlocks, useRegenerateRoadmap } from "@/hooks/useRoadmap";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useTasks } from "@/hooks/useTasks";
import { useUserXP } from "@/hooks/useGamification";
import { useProfile } from "@/hooks/useProfile";
import { useRPGState } from "@/hooks/useRPGState";

import { LearningProfileDialog } from "@/components/roadmap/LearningProfileDialog";
import { AdventureMap } from "@/components/roadmap/AdventureMap";
import { MiniMap } from "@/components/roadmap/MiniMap";
import { WeatherOverlay, weatherIcon } from "@/components/roadmap/WeatherOverlay";
import { DailyQuestsDrawer } from "@/components/roadmap/DailyQuestsDrawer";
import { AchievementsPanel } from "@/components/roadmap/AchievementsPanel";
import { SkillTreeDialog } from "@/components/roadmap/SkillTreeDialog";
import { AIMentorPanel } from "@/components/roadmap/AIMentorPanel";

import { layoutNodes, currentNodeIndex, type MapNode } from "@/lib/worldBuilder";
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
  const regen = useRegenerateRoadmap();
  const upsertProfile = useUpsertLearningProfile();

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

  // --- Build milestone nodes from real exams ---
  const nodes: MapNode[] = useMemo(() => {
    const upcoming = [...exams].sort((a, b) => +new Date(a.exam_date) - +new Date(b.exam_date));
    if (upcoming.length === 0) return layoutNodes([]);
    return layoutNodes(
      upcoming.map((e, i) => ({
        id: e.id,
        title: e.title,
        date: e.exam_date,
        examId: e.id,
        isBoss: e.importance >= 4 && i !== upcoming.length - 1,
        isFinish: i === upcoming.length - 1,
      }))
    );
  }, [exams]);

  // --- XP, level, weather ---
  const totalXP = computeTotalXP({
    totalStudyMinutes, completedTasks, doneExams,
    bossesDefeated: doneExams, streakDays: streak,
  });
  const levelInfo = getLevelInfo(totalXP);
  const weather = calculateWeather({ streak, todayMinutes, daysToExam: nextExamDays });

  // --- RPG meta state (achievements / quests) ---
  const weakSubject = (userProfile?.weakest_subjects as string[] | null)?.[0] ?? null;
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
                if (n.status === "locked") {
                  toast.message(`${n.title} هنوز قفله`, { description: n.date ? `${n.daysAway} روز تا اونجا` : undefined });
                } else {
                  toast.success(`${n.title}`, { description: n.reward });
                }
              }}
            />

            {/* Action row */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleRegen} disabled={regen.isPending} className="flex-1 min-w-[140px] gap-1.5 gradient-primary text-primary-foreground rounded-xl">
                <RefreshCw className={`w-4 h-4 ${regen.isPending ? "animate-spin" : ""}`} />
                {regen.isPending ? "در حال ساخت…" : "بازسازی برنامه"}
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
    </AppLayout>
  );
}