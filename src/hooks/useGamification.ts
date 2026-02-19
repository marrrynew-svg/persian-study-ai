import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUserXP() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_xp", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_xp" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });
}

export function useAddXP() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      if (!user) return;
      const { data: existing } = await supabase
        .from("user_xp" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("user_xp" as any).insert({
          user_id: user.id,
          xp_points: amount,
          level: 1,
          streak_days: 0,
        });
      } else {
        const newXP = (existing as any).xp_points + amount;
        const newLevel = Math.floor(newXP / 500) + 1;
        await supabase
          .from("user_xp" as any)
          .update({ xp_points: newXP, level: newLevel })
          .eq("user_id", user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_xp"] });
    },
  });
}

export function useBadges() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["badges", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("badges" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user,
  });
}

export function useAwardBadge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (badge: { badge_type: string; badge_name: string; badge_emoji: string; description: string }) => {
      if (!user) return;
      // Check if already earned
      const { data: existing } = await supabase
        .from("badges" as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("badge_type", badge.badge_type)
        .maybeSingle();
      if (existing) return;
      await supabase.from("badges" as any).insert({ user_id: user.id, ...badge });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["badges"] });
    },
  });
}

export function useWeeklyChallenges() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split("T")[0];
  })();

  const query = useQuery({
    queryKey: ["weekly_challenges", user?.id, weekStart],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("weekly_challenges" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start", weekStart);
      if (error) throw error;

      // Auto-create challenges if not exists
      if (!data || data.length === 0) {
        const challenges = [
          { user_id: user.id, week_start: weekStart, challenge_type: "study_hours", target_value: 10, xp_reward: 100, current_value: 0 },
          { user_id: user.id, week_start: weekStart, challenge_type: "sessions", target_value: 5, xp_reward: 50, current_value: 0 },
          { user_id: user.id, week_start: weekStart, challenge_type: "tasks", target_value: 3, xp_reward: 75, current_value: 0 },
        ];
        await supabase.from("weekly_challenges" as any).upsert(challenges, { onConflict: "user_id,week_start,challenge_type" });
        return challenges as any[];
      }
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  const updateChallenge = useMutation({
    mutationFn: async ({ challenge_type, increment }: { challenge_type: string; increment: number }) => {
      if (!user) return;
      const { data: existing } = await supabase
        .from("weekly_challenges" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .eq("challenge_type", challenge_type)
        .maybeSingle();

      if (existing) {
        const newVal = Math.min((existing as any).current_value + increment, (existing as any).target_value);
        const completed = newVal >= (existing as any).target_value;
        await supabase
          .from("weekly_challenges" as any)
          .update({ current_value: newVal, completed })
          .eq("id", (existing as any).id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly_challenges"] }),
  });

  return { ...query, updateChallenge };
}

// XP thresholds for levels
export function useUpdateStreak() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { data: existing } = await supabase
        .from("user_xp" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      if (!existing) {
        // Create initial record
        await supabase.from("user_xp" as any).insert({
          user_id: user.id,
          xp_points: 0,
          level: 1,
          streak_days: 1,
          last_study_date: today,
          total_study_minutes: 0,
        });
        return { streak: 1, isNewDay: true };
      }

      const lastDate = (existing as any).last_study_date;

      // Already studied today — no streak update needed
      if (lastDate === today) return { streak: (existing as any).streak_days, isNewDay: false };

      let newStreak = 1;
      if (lastDate === yesterday) {
        // Consecutive day — increment
        newStreak = ((existing as any).streak_days || 0) + 1;
      }
      // Otherwise streak resets to 1 (missed a day)

      await supabase
        .from("user_xp" as any)
        .update({ streak_days: newStreak, last_study_date: today })
        .eq("user_id", user.id);

      return { streak: newStreak, isNewDay: true };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_xp"] }),
  });
}

export function getLevelInfo(xp: number) {
  const level = Math.floor(xp / 500) + 1;
  const currentLevelXP = (level - 1) * 500;
  const nextLevelXP = level * 500;
  const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  return { level, progress, xpInLevel: xp - currentLevelXP, xpNeeded: nextLevelXP - currentLevelXP };
}

export const BADGE_DEFINITIONS = [
  { badge_type: "first_session", badge_name: "اولین قدم", badge_emoji: "🌱", description: "اولین جلسه مطالعه را تمام کردی!" },
  { badge_type: "streak_3", badge_name: "سه روز پیاپی", badge_emoji: "🔥", description: "۳ روز متوالی مطالعه کردی" },
  { badge_type: "streak_7", badge_name: "هفته پیروز", badge_emoji: "⚡", description: "۷ روز متوالی مطالعه کردی" },
  { badge_type: "hours_10", badge_name: "ده ساعته", badge_emoji: "⏰", description: "۱۰ ساعت مطالعه جمع کردی" },
  { badge_type: "hours_50", badge_name: "پنجاه ساعته", badge_emoji: "🏆", description: "۵۰ ساعت مطالعه جمع کردی" },
  { badge_type: "subject_master", badge_name: "ارباب دروس", badge_emoji: "📚", description: "۵ درس اضافه کردی" },
  { badge_type: "task_hero", badge_name: "قهرمان وظایف", badge_emoji: "✅", description: "۱۰ وظیفه را تکمیل کردی" },
  { badge_type: "ai_advisor", badge_name: "هوشمند", badge_emoji: "🤖", description: "از مشاور هوش مصنوعی استفاده کردی" },
  { badge_type: "social_butterfly", badge_name: "گروه‌نشین", badge_emoji: "👥", description: "به یک گروه مطالعه پیوستی" },
  { badge_type: "level_5", badge_name: "سطح ۵", badge_emoji: "🌟", description: "به سطح ۵ رسیدی!" },
];
