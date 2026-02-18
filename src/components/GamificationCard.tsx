import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUserXP, useBadges, useWeeklyChallenges, getLevelInfo } from "@/hooks/useGamification";
import { Zap, Star, Trophy, Target } from "lucide-react";

const CHALLENGE_LABELS: Record<string, { label: string; icon: string; unit: string }> = {
  study_hours: { label: "ساعت مطالعه", icon: "⏰", unit: "ساعت" },
  sessions: { label: "جلسه مطالعه", icon: "📚", unit: "جلسه" },
  tasks: { label: "تکمیل وظیفه", icon: "✅", unit: "وظیفه" },
};

export function GamificationCard() {
  const { data: xpData } = useUserXP();
  const { data: badges = [] } = useBadges();
  const { data: challenges = [] } = useWeeklyChallenges();

  const xp = xpData?.xp_points || 0;
  const streak = xpData?.streak_days || 0;
  const { level, progress, xpInLevel, xpNeeded } = getLevelInfo(xp);

  return (
    <div className="space-y-3">
      {/* XP & Level Card */}
      <Card className="glass rounded-2xl overflow-hidden">
        <div className="gradient-primary p-4">
          <div className="flex items-center justify-between text-primary-foreground mb-3">
            <div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                <span className="font-bold text-lg">سطح {level}</span>
              </div>
              <p className="text-xs opacity-75 mt-0.5">{xpInLevel} / {xpNeeded} XP تا سطح بعد</p>
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1 justify-end">
                <Zap className="w-4 h-4 text-yellow-300" />
                <span className="text-2xl font-bold">{xp}</span>
              </div>
              <p className="text-xs opacity-70">کل XP</p>
            </div>
          </div>
              <div className="bg-primary-foreground/20 rounded-full h-2">
            <div
              className="bg-primary-foreground rounded-full h-2 transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
        <div className="px-4 py-3 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="font-bold text-lg">{streak}</p>
              <p className="text-[10px] text-muted-foreground">روز متوالی</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏅</span>
            <div>
              <p className="font-bold text-lg">{badges.length}</p>
              <p className="text-[10px] text-muted-foreground">نشان کسب شده</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Weekly Challenges */}
      {challenges.length > 0 && (
        <Card className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold">چالش‌های هفتگی</h3>
          </div>
          <div className="space-y-3">
            {challenges.map((challenge: any) => {
              const info = CHALLENGE_LABELS[challenge.challenge_type] || { label: challenge.challenge_type, icon: "🎯", unit: "" };
              const progress = challenge.target_value > 0
                ? Math.min((challenge.current_value / challenge.target_value) * 100, 100) : 0;
              return (
                <div key={challenge.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span>{info.icon}</span>
                      <span className="text-xs font-medium">{info.label}</span>
                      {challenge.completed && <span className="text-[10px] bg-emerald/20 text-emerald px-1.5 rounded-full">تکمیل ✓</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">{challenge.current_value}/{challenge.target_value}</span>
                      <span className="text-[10px] text-accent font-medium">+{challenge.xp_reward} XP</span>
                    </div>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <Card className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <h3 className="text-sm font-semibold">نشان‌های من</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge: any) => (
              <motion.div
                key={badge.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                title={badge.description}
                className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-muted/50 hover:bg-muted transition cursor-default"
              >
                <span className="text-2xl">{badge.badge_emoji}</span>
                <span className="text-[9px] text-muted-foreground text-center leading-tight max-w-14">{badge.badge_name}</span>
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
