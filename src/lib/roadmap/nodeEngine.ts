// Core roadmap-node engine: applies study sessions to nodes, recomputes
// unlocks, builds default nodes from exams/topics. Pure & deterministic.

export interface RoadmapNodeRow {
  id: string;
  user_id: string;
  parent_id: string | null;
  exam_id: string | null;
  topic_id: string | null;
  subject_id: string | null;
  title: string;
  description: string | null;
  type: "study" | "exam" | "review" | "milestone" | "boss";
  status: "locked" | "available" | "in_progress" | "completed";
  progress: number;
  study_minutes: number;
  estimated_minutes: number;
  xp_reward: number;
  due_date: string | null;
  last_studied_at: string | null;
  unlock_required_node_ids: string[];
  unlock_required_study_minutes: number;
  position_x: number;
  position_y: number;
  world_kind: "island" | "city" | "tower" | "cave" | "boss_arena";
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface SessionLite {
  id: string;
  subject_id: string | null;
  duration_minutes: number;
  started_at: string;
  notes?: string | null;
}

export interface ApplyResult {
  patches: Array<{
    id: string;
    patch: Partial<RoadmapNodeRow>;
    completed: boolean;
    xpAwarded: number;
  }>;
  unlocks: string[]; // node ids newly unlocked
}

/**
 * Decide which node a finished session should affect.
 * Priority:
 *   1) explicit topic_id match on `in_progress`/`available`
 *   2) same-subject node that is `in_progress`
 *   3) same-subject node that is `available`, lowest order_index
 *   4) any `in_progress` node
 *   5) lowest-order available milestone
 */
export function pickTargetNode(
  session: SessionLite,
  nodes: RoadmapNodeRow[],
  hintTopicId?: string | null,
): RoadmapNodeRow | null {
  const open = nodes.filter((n) => n.status !== "locked" && n.status !== "completed");
  if (open.length === 0) return null;

  if (hintTopicId) {
    const t = open.find((n) => n.topic_id === hintTopicId);
    if (t) return t;
  }
  if (session.subject_id) {
    const inProg = open.find((n) => n.subject_id === session.subject_id && n.status === "in_progress");
    if (inProg) return inProg;
    const av = open
      .filter((n) => n.subject_id === session.subject_id && n.status === "available")
      .sort((a, b) => a.order_index - b.order_index)[0];
    if (av) return av;
  }
  const anyIp = open.find((n) => n.status === "in_progress");
  if (anyIp) return anyIp;
  return open.sort((a, b) => a.order_index - b.order_index)[0] || null;
}

/** Apply a finished session to nodes; returns DB patches and any unlocks. */
export function applySessionToNodes(
  session: SessionLite,
  nodes: RoadmapNodeRow[],
  hintTopicId?: string | null,
): ApplyResult {
  const target = pickTargetNode(session, nodes, hintTopicId);
  if (!target || session.duration_minutes <= 0) return { patches: [], unlocks: [] };

  const study_minutes = target.study_minutes + session.duration_minutes;
  const est = Math.max(1, target.estimated_minutes);
  const progress = Math.min(100, Math.round((study_minutes / est) * 100));
  const completed = progress >= 100;
  const patch: Partial<RoadmapNodeRow> = {
    study_minutes,
    progress,
    last_studied_at: new Date().toISOString(),
    status: completed ? "completed" : "in_progress",
  };

  const next = nodes.map((n) => (n.id === target.id ? { ...n, ...patch } as RoadmapNodeRow : n));
  const unlocks = completed ? recomputeUnlocks(next) : [];

  return {
    patches: [
      {
        id: target.id,
        patch,
        completed,
        xpAwarded: completed ? target.xp_reward : 0,
      },
    ],
    unlocks,
  };
}

/** Return ids of locked nodes whose unlock requirements are now satisfied. */
export function recomputeUnlocks(nodes: RoadmapNodeRow[]): string[] {
  const completed = new Set(nodes.filter((n) => n.status === "completed").map((n) => n.id));
  const totalStudy = nodes.reduce((a, n) => a + n.study_minutes, 0);
  const out: string[] = [];
  for (const n of nodes) {
    if (n.status !== "locked") continue;
    const reqIds = n.unlock_required_node_ids || [];
    const idsOk = reqIds.every((id) => completed.has(id));
    const minsOk = totalStudy >= (n.unlock_required_study_minutes || 0);
    if (idsOk && minsOk) out.push(n.id);
  }
  return out;
}

// ── Node generation from an exam + its topics ────────────────────────────

const WORLDS: RoadmapNodeRow["world_kind"][] = ["island", "city", "tower", "cave"];

export interface ExamSeed {
  id: string;
  title: string;
  exam_date: string;
  importance: number;
  priority: number;
}

export interface TopicSeed {
  id: string;
  exam_id: string;
  subject_id: string | null;
  title: string;
  estimated_minutes: number;
  order_index: number;
}

export interface NodeDraft extends Omit<RoadmapNodeRow, "id" | "user_id" | "created_at" | "updated_at"> {
  _tmpId: string;
}

/** Build default nodes for an exam and all its topics. */
export function buildNodesForExam(
  exam: ExamSeed,
  topics: TopicSeed[],
  baseOrder = 0,
): NodeDraft[] {
  const drafts: NodeDraft[] = [];
  const sortedTopics = [...topics].sort((a, b) => a.order_index - b.order_index);

  const examDateBefore = (offsetDays: number) => {
    const d = new Date(exam.exam_date);
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().slice(0, 10);
  };

  // Spread topic milestones from far → close to exam date
  const topicIds: string[] = [];
  sortedTopics.forEach((t, i) => {
    const tmp = `tmp-topic-${t.id}`;
    topicIds.push(tmp);
    drafts.push({
      _tmpId: tmp,
      parent_id: null,
      exam_id: exam.id,
      topic_id: t.id,
      subject_id: t.subject_id,
      title: t.title,
      description: null,
      type: "milestone",
      status: i === 0 ? "available" : "locked",
      progress: 0,
      study_minutes: 0,
      estimated_minutes: t.estimated_minutes || 60,
      xp_reward: 150,
      due_date: examDateBefore(Math.max(1, sortedTopics.length - i) * 3),
      last_studied_at: null,
      unlock_required_node_ids: i === 0 ? [] : [topicIds[i - 1]],
      unlock_required_study_minutes: 0,
      position_x: 600 + (i % 2 === 0 ? -260 : 260),
      position_y: 240 + baseOrder * 1400 + i * 180,
      world_kind: WORLDS[i % WORLDS.length],
      order_index: baseOrder * 1000 + i,
    });
  });

  // Final review node
  const reviewTmp = `tmp-review-${exam.id}`;
  drafts.push({
    _tmpId: reviewTmp,
    parent_id: null,
    exam_id: exam.id,
    topic_id: null,
    subject_id: null,
    title: `مرور نهایی ${exam.title}`,
    description: "مرور فاصله‌دار همه‌ی سرفصل‌ها قبل از آزمون",
    type: "review",
    status: "locked",
    progress: 0,
    study_minutes: 0,
    estimated_minutes: 180,
    xp_reward: 250,
    due_date: examDateBefore(2),
    last_studied_at: null,
    unlock_required_node_ids: topicIds,
    unlock_required_study_minutes: 0,
    position_x: 600,
    position_y: 240 + baseOrder * 1400 + (sortedTopics.length + 1) * 180,
    world_kind: "tower",
    order_index: baseOrder * 1000 + sortedTopics.length + 1,
  });

  // Boss node = the exam itself
  drafts.push({
    _tmpId: `tmp-boss-${exam.id}`,
    parent_id: null,
    exam_id: exam.id,
    topic_id: null,
    subject_id: null,
    title: exam.title,
    description: "آزمون — Boss Fight",
    type: "boss",
    status: "locked",
    progress: 0,
    study_minutes: 0,
    estimated_minutes: 120,
    xp_reward: 1000 + exam.importance * 200,
    due_date: exam.exam_date,
    last_studied_at: null,
    unlock_required_node_ids: [reviewTmp],
    unlock_required_study_minutes: 0,
    position_x: 600,
    position_y: 240 + baseOrder * 1400 + (sortedTopics.length + 2) * 180,
    world_kind: "boss_arena",
    order_index: baseOrder * 1000 + sortedTopics.length + 2,
  });

  return drafts;
}

/** Resolve _tmpId references in `unlock_required_node_ids` to real UUIDs. */
export function resolveDraftRefs(
  drafts: NodeDraft[],
  tmpToReal: Record<string, string>,
): Array<Omit<NodeDraft, "_tmpId">> {
  return drafts.map(({ _tmpId, unlock_required_node_ids, ...rest }) => ({
    ...rest,
    unlock_required_node_ids: (unlock_required_node_ids || [])
      .map((id) => tmpToReal[id] || id)
      .filter(Boolean),
  }));
}