import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Sparkles } from "lucide-react";
import { useExams, useExamTopics } from "@/hooks/useExams";
import { useLearningProfile, useUpsertLearningProfile, DEFAULT_PROFILE } from "@/hooks/useLearningProfile";
import { useRoadmapBlocks, useRegenerateRoadmap } from "@/hooks/useRoadmap";
import { useStudySessions } from "@/hooks/useStudySessions";
import { RoadmapTimeline } from "@/components/roadmap/RoadmapTimeline";
import { SmartDailyPlan } from "@/components/roadmap/SmartDailyPlan";
import { SmartInsightsPanel } from "@/components/roadmap/SmartInsightsPanel";
import { LearningProfileDialog } from "@/components/roadmap/LearningProfileDialog";
import { toast } from "sonner";

export default function Roadmap() {
  const navigate = useNavigate();
  const { data: exams = [] } = useExams();
  const { data: topics = [] } = useExamTopics();
  const { data: profile } = useLearningProfile();
  const { data: blocks = [] } = useRoadmapBlocks(30);
  const { data: sessions = [] } = useStudySessions(14);
  const regen = useRegenerateRoadmap();
  const upsertProfile = useUpsertLearningProfile();

  const dailyCap = ((profile?.weekly_available_hours || 28) / 7) * 60;

  const handleRegen = async () => {
    let p = profile;
    if (!p) {
      // ensure a profile row exists with defaults
      p = await upsertProfile.mutateAsync(DEFAULT_PROFILE) as any;
    }
    if (exams.length === 0) {
      toast.error("اول حداقل یک آزمون اضافه کن");
      navigate("/exams");
      return;
    }
    try {
      const summary = await regen.mutateAsync({ exams, topics, profile: p!, daysHorizon: 30 });
      toast.success(`نقشه راه ساخته شد · ${summary.totalBlocks} بلوک`);
    } catch (e: any) {
      toast.error(e.message || "خطا در ساخت برنامه");
    }
  };

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-4">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> نقشه راه
            </h1>
            <p className="text-xs text-muted-foreground">برنامه هوشمند مبتنی بر آزمون‌ها و پروفایل تو</p>
          </div>
          <LearningProfileDialog />
        </motion.div>

        <div className="flex gap-2">
          <Button onClick={handleRegen} disabled={regen.isPending} className="flex-1 gap-1.5 gradient-primary text-primary-foreground rounded-xl">
            <RefreshCw className={`w-4 h-4 ${regen.isPending ? "animate-spin" : ""}`} />
            {regen.isPending ? "در حال ساخت…" : "بازسازی برنامه"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/exams")} className="gap-1.5 rounded-xl">
            <Plus className="w-4 h-4" /> آزمون
          </Button>
        </div>

        {exams.length === 0 ? (
          <Card className="glass rounded-2xl p-8 text-center">
            <Sparkles className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold mb-1">هنوز آزمونی تعریف نکردی</p>
            <p className="text-xs text-muted-foreground mb-4">اول یه آزمون اضافه کن تا برات نقشه راه بسازم</p>
            <Button onClick={() => navigate("/exams")} className="gradient-primary text-primary-foreground rounded-xl">
              تعریف آزمون
            </Button>
          </Card>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <RoadmapTimeline exams={exams} blocks={blocks} dailyCapacityMin={dailyCap} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <SmartDailyPlan blocks={blocks} topics={topics} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <SmartInsightsPanel exams={exams} topics={topics} blocks={blocks} sessions={sessions} profile={profile || null} />
            </motion.div>
          </>
        )}
      </div>
    </AppLayout>
  );
}