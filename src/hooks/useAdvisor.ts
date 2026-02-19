import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAIConversations(limit = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai_conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("ai_conversations" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user,
  });
}

export function useAIMemory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai_user_memory", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("ai_user_memory" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user,
  });
}

export function useBehavioralSnapshots(days = 14) {
  const { user } = useAuth();
  const since = new Date();
  since.setDate(since.getDate() - days);
  return useQuery({
    queryKey: ["behavioral_snapshots", user?.id, days],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("behavioral_snapshots" as any)
        .select("*")
        .eq("user_id", user.id)
        .gte("snapshot_date", since.toISOString().split("T")[0])
        .order("snapshot_date", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user,
  });
}
