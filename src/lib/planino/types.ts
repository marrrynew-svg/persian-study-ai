export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface CapacityRow {
  id?: string;
  weekday: Weekday;
  sleep_h: number;
  school_h: number;
  commute_h: number;
  fixed_h: number;
  effective_h: number;
}

export interface BacklogItem {
  id?: string;
  user_id?: string;
  subject_id?: string | null;
  topic_id?: string | null;
  exam_id?: string | null;
  title: string;
  remaining_minutes: number;
  source_date: string;
  priority_score: number;
  status?: "pending" | "scheduled" | "done";
}

export interface DailyPlan {
  id?: string;
  date: string;
  total_planned_minutes: number;
  total_done_minutes: number;
  status: "pending" | "completed" | "partial" | "skipped";
}

export interface BehaviorModel {
  weekday_strength: Record<string, number>;
  avg_completion_rate: number;
  burnout_flag: boolean;
  overload_streak: number;
}

export interface PlanTask {
  id: string;                  // synthetic id (topic/backlog/task id)
  source: "exam_topic" | "task" | "weak_subject" | "review" | "backlog";
  title: string;
  subject_id: string | null;
  topic_id: string | null;
  exam_id: string | null;
  duration_minutes: number;    // requested minutes
  due_date: string | null;
  // raw inputs for scoring
  exam_importance: number;     // 1..5
  weakness: number;            // 0..100  (lower = weaker)
  size_minutes: number;        // total est minutes (for size weight)
  history_factor: number;      // 0..1 (1 = strong day, 0 = weak day)
  priority_score?: number;
}

export interface PlannedBlock {
  date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  block_type: "study" | "review" | "test" | "buffer";
  exam_id: string | null;
  topic_id: string | null;
  subject_id: string | null;
  priority: number;
  reason: string;
  status: "planned";
  auto_generated: true;
}