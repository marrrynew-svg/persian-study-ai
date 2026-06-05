import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { dispatchAIContextRefresh } from "@/lib/aiContextDispatcher";

export type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  pinned: boolean;
  folder: string | null;
  tags: string[];
  subject_id: string | null;
  session_id: string | null;
  created_at: string;
  updated_at: string;
};

export function useNotes() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notes-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["notes"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, user]);

  return useQuery({
    queryKey: ["notes", user?.id],
    queryFn: async () => {
      if (!user) return [] as Note[];
      const { data, error } = await (supabase as any)
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Note[];
    },
    enabled: !!user,
  });
}

export function useUpsertNote() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: Partial<Note> & { id?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const payload: any = {
        user_id: user.id,
        title: note.title ?? "",
        content: note.content ?? "",
        pinned: note.pinned ?? false,
        folder: note.folder ?? null,
        tags: note.tags ?? [],
        subject_id: note.subject_id ?? null,
        session_id: note.session_id ?? null,
      };
      if (note.id) payload.id = note.id;
      const { data, error } = await (supabase as any).from("notes").upsert(payload).select().single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      dispatchAIContextRefresh("note_saved");
    },
  });
}

export function useDeleteNote() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).from("notes").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      dispatchAIContextRefresh("note_deleted");
    },
  });
}

export function useTogglePin() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).from("notes").update({ pinned }).eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}