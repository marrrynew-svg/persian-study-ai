import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useStudyGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["study_groups"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("study_groups" as any)
        .select("*, group_members(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user,
  });
}

export function useMyGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_groups", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("group_members" as any)
        .select("group_id, study_groups(*)")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data || []).map((d: any) => d.study_groups) as any[];
    },
    enabled: !!user,
  });
}

export function useGroupMembers(groupId: string | null) {
  return useQuery({
    queryKey: ["group_members", groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from("group_members" as any)
        .select("*")
        .eq("group_id", groupId)
        .order("total_xp", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!groupId,
  });
}

export function useGroupMessages(groupId: string | null) {
  return useQuery({
    queryKey: ["group_messages", groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from("group_messages" as any)
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!groupId,
    refetchInterval: 3000,
  });
}

export function useCreateGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (group: { name: string; description?: string; emoji: string; field_of_study?: string; is_public: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("study_groups" as any)
        .insert({ ...group, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
      // Auto-join as owner
      await supabase.from("group_members" as any).insert({
        group_id: (data as any).id,
        user_id: user.id,
        role: "owner",
        display_name: "مدیر گروه",
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study_groups"] });
      queryClient.invalidateQueries({ queryKey: ["my_groups"] });
    },
  });
}

export function useJoinGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteCode, displayName }: { inviteCode: string; displayName: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: group, error: groupError } = await supabase
        .from("study_groups" as any)
        .select("id")
        .eq("invite_code", inviteCode.trim())
        .maybeSingle();
      if (groupError || !group) throw new Error("کد دعوت نامعتبر است");

      const { error } = await supabase.from("group_members" as any).insert({
        group_id: (group as any).id,
        user_id: user.id,
        display_name: displayName,
        role: "member",
      });
      if (error) {
        if (error.code === "23505") throw new Error("قبلاً عضو این گروه هستید");
        throw error;
      }
      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study_groups"] });
      queryClient.invalidateQueries({ queryKey: ["my_groups"] });
    },
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, content, displayName }: { groupId: string; content: string; displayName: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("group_messages" as any).insert({
        group_id: groupId,
        user_id: user.id,
        display_name: displayName,
        content,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["group_messages", vars.groupId] });
    },
  });
}

export function useLeaveGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) return;
      await supabase
        .from("group_members" as any)
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study_groups"] });
      queryClient.invalidateQueries({ queryKey: ["my_groups"] });
    },
  });
}
