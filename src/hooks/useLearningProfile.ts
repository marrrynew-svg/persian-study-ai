import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { dispatchAIContextRefresh } from "@/lib/aiContextDispatcher";

export type LearningProfile = {
  id: string;
  user_id: string;
  reading_speed: "slow" | "medium" | "fast";
  study_depth: "deep" | "balanced" | "fast";
  focus_minutes: number;
  break_minutes: number;
  peak_window: "morning" | "afternoon" | "evening" | "night";
  consistency: number;
  distractibility: number;
  fatigue_curve: number;
  methods: string[];
  video_speed: number;
  pause_frequency: number;
  notes_intensity: number;
  memorization_strength: number;
  analytical_strength: number;
  weekly_available_hours: number;
  weekend_multiplier: number;
  prefers_practice_tests: boolean;
};

export const DEFAULT_PROFILE: Omit<LearningProfile, "id" | "user_id"> = {
  reading_speed: "medium",
  study_depth: "balanced",
  focus_minutes: 45,
  break_minutes: 10,
  peak_window: "evening",
  consistency: 3,
  distractibility: 3,
  fatigue_curve: 3,
  methods: ["book", "video"],
  video_speed: 1.25,
  pause_frequency: 2,
  notes_intensity: 3,
  memorization_strength: 3,
  analytical_strength: 3,
  weekly_available_hours: 28,
  weekend_multiplier: 1.3,
  prefers_practice_tests: true,
};

export function useLearningProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`learning_profile-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "learning_profile", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["learning_profile"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, user]);

  return useQuery({
    queryKey: ["learning_profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from("learning_profile").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return (data || null) as LearningProfile | null;
    },
    enabled: !!user,
  });
}

export function useUpsertLearningProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<LearningProfile>) => {
      if (!user) throw new Error("Not authenticated");
      const payload: any = { ...DEFAULT_PROFILE, ...patch, user_id: user.id };
      const { data, error } = await (supabase as any)
        .from("learning_profile").upsert(payload, { onConflict: "user_id" }).select().single();
      if (error) throw error;
      return data as LearningProfile;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learning_profile"] });
      dispatchAIContextRefresh("learning_profile_updated");
    },
  });
}