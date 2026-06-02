import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { dispatchAIContextRefresh } from "@/lib/aiContextDispatcher";
import {
  applySessionToNodes,
  buildNodesForExam,
  recomputeUnlocks,
  resolveDraftRefs,
  type RoadmapNodeRow,
  type SessionLite,
  type ExamSeed,
  type TopicSeed,
} from "@/lib/roadmap/nodeEngine";

const TABLE = "roadmap_nodes";

export type { RoadmapNodeRow };

export function useRoadmapNodes() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`roadmap-nodes-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE, filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["roadmap_nodes"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, user]);

  return useQuery({
    queryKey: ["roadmap_nodes", user?.id],
    queryFn: async () => {
      if (!user) return [] as RoadmapNodeRow[];
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("user_id", user.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []) as RoadmapNodeRow[];
    },
    enabled: !!user,
  });
}

export function useUpdateRoadmapNode() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<RoadmapNodeRow> }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any)
        .from(TABLE).update(patch).eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap_nodes"] });
      dispatchAIContextRefresh("node_updated");
    },
  });
}

export function useDeleteRoadmapNode() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).from(TABLE).delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roadmap_nodes"] }),
  });
}

export function useCreateRoadmapNode() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: Partial<RoadmapNodeRow>) => {
      if (!user) throw new Error("Not authenticated");
      const payload = {
        user_id: user.id,
        title: draft.title || "نود جدید",
        type: draft.type || "study",
        status: draft.status || "available",
        estimated_minutes: draft.estimated_minutes ?? 60,
        xp_reward: draft.xp_reward ?? 50,
        position_x: draft.position_x ?? 600,
        position_y: draft.position_y ?? 400,
        order_index: draft.order_index ?? 9999,
        world_kind: draft.world_kind || "island",
        ...draft,
      };
      const { data, error } = await (supabase as any).from(TABLE).insert(payload).select().single();
      if (error) throw error;
      return data as RoadmapNodeRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roadmap_nodes"] }),
  });
}

/** Bulk-insert nodes generated from one or more exams. Skips exams that
 *  already have nodes in the table. */
export function useGenerateNodesFromExams() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      exams, topicsByExam, existing,
    }: {
      exams: ExamSeed[];
      topicsByExam: Record<string, TopicSeed[]>;
      existing: RoadmapNodeRow[];
    }) => {
      if (!user) throw new Error("Not authenticated");
      const haveExamIds = new Set(existing.filter((n) => n.exam_id).map((n) => n.exam_id!));
      const todo = exams.filter((e) => !haveExamIds.has(e.id));
      if (todo.length === 0) return { inserted: 0 };

      const ordered = [...todo].sort((a, b) => +new Date(a.exam_date) - +new Date(b.exam_date));
      let totalInserted = 0;
      for (let i = 0; i < ordered.length; i++) {
        const exam = ordered[i];
        const topics = topicsByExam[exam.id] || [];
        const drafts = buildNodesForExam(exam, topics, i);

        // Insert without unlock refs first to get real ids
        const initialRows = drafts.map(({ _tmpId, unlock_required_node_ids, ...rest }) => ({
          ...rest,
          unlock_required_node_ids: [],
          user_id: user.id,
        }));
        const { data: inserted, error } = await (supabase as any)
          .from(TABLE).insert(initialRows).select("id, order_index");
        if (error) throw error;

        // Map _tmpId → real id using order_index alignment
        const tmpToReal: Record<string, string> = {};
        drafts.forEach((d) => {
          const match = (inserted || []).find((r: any) => r.order_index === d.order_index);
          if (match) tmpToReal[d._tmpId] = match.id;
        });

        const resolved = resolveDraftRefs(drafts, tmpToReal);
        // Patch unlock refs
        for (const d of resolved) {
          const realId = tmpToReal[drafts.find((x) => x.order_index === d.order_index)!._tmpId];
          if (!realId || d.unlock_required_node_ids.length === 0) continue;
          await (supabase as any).from(TABLE)
            .update({ unlock_required_node_ids: d.unlock_required_node_ids })
            .eq("id", realId);
        }
        totalInserted += initialRows.length;
      }
      return { inserted: totalInserted };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap_nodes"] });
      dispatchAIContextRefresh("nodes_generated");
    },
  });
}

/** After a session is saved, push its effect into the nodes table. */
export async function applySessionEffect(
  userId: string,
  session: SessionLite,
  hintTopicId?: string | null,
): Promise<{ completedNodeIds: string[]; unlockedNodeIds: string[]; xpAwarded: number }> {
  const { data: nodes, error } = await (supabase as any)
    .from(TABLE).select("*").eq("user_id", userId);
  if (error || !nodes) return { completedNodeIds: [], unlockedNodeIds: [], xpAwarded: 0 };

  const result = applySessionToNodes(session, nodes as RoadmapNodeRow[], hintTopicId);
  if (result.patches.length === 0) return { completedNodeIds: [], unlockedNodeIds: [], xpAwarded: 0 };

  const completedIds: string[] = [];
  let xp = 0;
  for (const p of result.patches) {
    await (supabase as any).from(TABLE).update(p.patch).eq("id", p.id).eq("user_id", userId);
    await (supabase as any).from("node_events").insert({
      user_id: userId,
      node_id: p.id,
      session_id: session.id,
      event_type: p.completed ? "node_completed" : "session_applied",
      delta_minutes: session.duration_minutes,
      delta_progress: p.patch.progress ?? 0,
      payload: { source: "timer", subject_id: session.subject_id },
    });
    if (p.completed) completedIds.push(p.id);
    xp += p.xpAwarded;
  }

  // Unlock dependents
  if (result.unlocks.length > 0) {
    await (supabase as any).from(TABLE)
      .update({ status: "available" })
      .in("id", result.unlocks)
      .eq("user_id", userId);
  }

  // Bump user_xp.total_study_minutes & xp
  if (xp > 0) {
    const { data: cur } = await (supabase as any).from("user_xp").select("*").eq("user_id", userId).maybeSingle();
    if (cur) {
      const newXP = (cur.xp_points || 0) + xp;
      await (supabase as any).from("user_xp")
        .update({ xp_points: newXP, level: Math.floor(newXP / 500) + 1 })
        .eq("user_id", userId);
    } else {
      await (supabase as any).from("user_xp").insert({
        user_id: userId, xp_points: xp, level: Math.floor(xp / 500) + 1, streak_days: 0,
      });
    }
  }

  return { completedNodeIds: completedIds, unlockedNodeIds: result.unlocks, xpAwarded: xp };
}

export { recomputeUnlocks };