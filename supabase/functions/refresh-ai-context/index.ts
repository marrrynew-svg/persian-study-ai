// Real-time AI Context Engine
// Recomputes structured userProfile + behavioral metrics and persists them
// to ai_user_memory + behavioral_snapshots so the chat advisor always reads
// fresh state without recomputing from scratch.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Subject = { id: string; name: string; strength_level: number; importance_weight: number };
type Session = { id: string; subject_id: string | null; duration_seconds: number; duration_minutes: number; started_at: string };
type Task = { id: string; completed: boolean; due_date: string | null; created_at: string };

function dayKey(d: Date | string) {
  return new Date(d).toISOString().slice(0, 10);
}

function inLastDays(s: Session, days: number) {
  return new Date(s.started_at).getTime() > Date.now() - days * 86400000;
}

function computeBehavior(sessions: Session[]) {
  const week = sessions.filter((s) => inLastDays(s, 7));
  const prev = sessions.filter((s) => {
    const t = new Date(s.started_at).getTime();
    return t > Date.now() - 14 * 86400000 && t <= Date.now() - 7 * 86400000;
  });
  const weekSec = week.reduce((a, s) => a + (s.duration_seconds || 0), 0);
  const prevSec = prev.reduce((a, s) => a + (s.duration_seconds || 0), 0);
  const days = new Set(week.map((s) => dayKey(s.started_at))).size;
  const consistency = Math.min(days / 7, 1);
  let burnout = 0.15;
  if (prevSec > 0 && weekSec < prevSec * 0.6) burnout += 0.25;
  const avgLen = weekSec / Math.max(week.length, 1);
  if (avgLen < 600 && week.length > 0) burnout += 0.2;
  if (7 - days >= 4) burnout += 0.3;
  else if (7 - days >= 2) burnout += 0.1;
  if (week.length > 25) burnout += 0.1;
  burnout = Math.min(burnout, 1);
  let motivation = 0.3;
  const recent3 = sessions.filter((s) => inLastDays(s, 3)).reduce((a, s) => a + s.duration_seconds, 0);
  if (recent3 > 7200) motivation = 0.85;
  else if (recent3 > 3600) motivation = 0.65;
  else if (recent3 > 600) motivation = 0.5;
  else if (recent3 > 0) motivation = 0.4;

  // Behavior type
  const hours = sessions.map((s) => new Date(s.started_at).getHours());
  const night = hours.filter((h) => h >= 22 || h <= 4).length;
  const morning = hours.filter((h) => h >= 5 && h <= 9).length;
  const short = sessions.filter((s) => (s.duration_seconds || 0) < 1200).length;
  const long = sessions.filter((s) => (s.duration_seconds || 0) > 5400).length;
  let behaviorType = "balanced";
  if (!sessions.length) behaviorType = "beginner";
  else if (night > sessions.length * 0.5) behaviorType = "night_learner";
  else if (morning > sessions.length * 0.5) behaviorType = "morning_learner";
  else if (short > sessions.length * 0.6) behaviorType = "procrastinator";
  else if (long > sessions.length * 0.4) behaviorType = "deep_focuser";

  // Focus window (most productive hour bucket)
  const buckets = new Array(24).fill(0);
  sessions.forEach((s) => { buckets[new Date(s.started_at).getHours()] += s.duration_seconds; });
  const peakHour = buckets.indexOf(Math.max(...buckets));
  const focusWindow = peakHour >= 5 && peakHour <= 11 ? "morning"
    : peakHour >= 12 && peakHour <= 17 ? "afternoon"
    : peakHour >= 18 && peakHour <= 22 ? "evening" : "late_night";

  return { burnout, motivation, consistency, behaviorType, focusWindow, weekSec, weekDays: days };
}

function buildUserProfile(profile: any, subjects: Subject[], sessions: Session[], tasks: Task[]) {
  const weak = subjects.filter((s) => (s.strength_level || 50) <= 40)
    .map((s) => ({ id: s.id, name: s.name, strength: s.strength_level }));
  const strong = subjects.filter((s) => (s.strength_level || 50) >= 70)
    .map((s) => ({ id: s.id, name: s.name, strength: s.strength_level }));
  const beh = computeBehavior(sessions);

  // Goal clarity (0-1)
  let clarity = 0;
  if (profile?.target_rank) clarity += 0.3;
  if (profile?.exam_date) clarity += 0.3;
  if (profile?.field_of_study) clarity += 0.2;
  if (profile?.daily_hours) clarity += 0.2;

  // Days left
  const daysLeft = profile?.exam_date
    ? Math.max(0, Math.ceil((new Date(profile.exam_date).getTime() - Date.now()) / 86400000))
    : null;

  // Risk
  let risk: "low" | "medium" | "high" = "low";
  if (beh.burnout > 0.6 || beh.consistency < 0.3) risk = "high";
  else if (beh.burnout > 0.4 || beh.consistency < 0.55) risk = "medium";

  // Success probability (rough heuristic)
  let success = 0.5;
  success += (beh.consistency - 0.5) * 0.3;
  success += (beh.motivation - 0.5) * 0.2;
  success -= (beh.burnout - 0.3) * 0.2;
  if (daysLeft !== null && daysLeft < 30 && beh.consistency < 0.5) success -= 0.15;
  success = Math.max(0.05, Math.min(0.95, success));

  // Recommended daily hours
  const targetHours = Number(profile?.daily_hours) || 4;
  const recommended = beh.burnout > 0.6 ? Math.max(2, targetHours - 1)
    : beh.consistency < 0.4 ? Math.max(2, targetHours * 0.7)
    : targetHours;

  // Pending / overdue tasks
  const today = dayKey(new Date());
  const overdue = tasks.filter((t) => !t.completed && t.due_date && t.due_date < today).length;
  const completionRate = tasks.length ? tasks.filter((t) => t.completed).length / tasks.length : 0;

  return {
    goalClarityScore: Number(clarity.toFixed(2)),
    riskLevel: risk,
    weakSubjects: weak,
    strongSubjects: strong,
    estimatedSuccessProbability: Number(success.toFixed(2)),
    recommendedDailyHours: Number(recommended.toFixed(1)),
    cognitivePattern: beh.behaviorType,
    focusWindow: beh.focusWindow,
    daysLeft,
    burnoutRisk: Number(beh.burnout.toFixed(2)),
    motivationScore: Number(beh.motivation.toFixed(2)),
    consistencyScore: Number(beh.consistency.toFixed(2)),
    overdueTasks: overdue,
    taskCompletionRate: Number(completionRate.toFixed(2)),
    weekStudySeconds: beh.weekSec,
    weekStudyDays: beh.weekDays,
    computedAt: new Date().toISOString(),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await supabaseUser.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = claims.claims.sub as string;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [pRes, sRes, sessRes, tRes] = await Promise.all([
      admin.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("subjects").select("*").eq("user_id", userId),
      admin.from("study_sessions").select("id,subject_id,duration_seconds,duration_minutes,started_at").eq("user_id", userId).order("started_at", { ascending: false }).limit(120),
      admin.from("tasks").select("id,completed,due_date,created_at").eq("user_id", userId).limit(50),
    ]);
    const profile = pRes.data;
    const subjects = (sRes.data || []) as Subject[];
    const sessions = (sessRes.data || []) as Session[];
    const tasks = (tRes.data || []) as Task[];

    const userProfile = buildUserProfile(profile, subjects, sessions, tasks);

    // Persist as AI memory for chat to read
    const now = new Date().toISOString();
    const memory = [
      { user_id: userId, memory_type: "long_term", category: "profile", key: "structured_user_profile", value: JSON.stringify(userProfile), confidence: 0.95, source: "context_engine", updated_at: now },
      { user_id: userId, memory_type: "mid_term", category: "burnout", key: "burnout_risk_current", value: String(userProfile.burnoutRisk), confidence: 0.9, source: "context_engine", updated_at: now },
      { user_id: userId, memory_type: "mid_term", category: "performance", key: "motivation_score", value: String(userProfile.motivationScore), confidence: 0.9, source: "context_engine", updated_at: now },
      { user_id: userId, memory_type: "mid_term", category: "performance", key: "consistency_score", value: String(userProfile.consistencyScore), confidence: 0.95, source: "context_engine", updated_at: now },
      { user_id: userId, memory_type: "long_term", category: "behavior", key: "study_behavior_type", value: userProfile.cognitivePattern, confidence: 0.85, source: "context_engine", updated_at: now },
      { user_id: userId, memory_type: "long_term", category: "behavior", key: "focus_window", value: userProfile.focusWindow, confidence: 0.8, source: "context_engine", updated_at: now },
      { user_id: userId, memory_type: "mid_term", category: "goals", key: "estimated_success_probability", value: String(userProfile.estimatedSuccessProbability), confidence: 0.7, source: "context_engine", updated_at: now },
    ];
    await admin.from("ai_user_memory").upsert(memory, { onConflict: "user_id,memory_type,key" });

    // Daily behavioral snapshot (upsert-like via delete+insert because no unique constraint guaranteed)
    const today = now.slice(0, 10);
    const todaySessions = sessions.filter((s) => dayKey(s.started_at) === today);
    await admin.from("behavioral_snapshots").delete().eq("user_id", userId).eq("snapshot_date", today);
    await admin.from("behavioral_snapshots").insert({
      user_id: userId,
      snapshot_date: today,
      study_minutes: Math.round(todaySessions.reduce((a, s) => a + (s.duration_seconds || 0), 0) / 60),
      sessions_count: todaySessions.length,
      avg_session_length: todaySessions.length ? todaySessions.reduce((a, s) => a + (s.duration_seconds || 0), 0) / todaySessions.length / 60 : 0,
      subjects_studied: Array.from(new Set(todaySessions.map((s) => s.subject_id).filter(Boolean))),
      burnout_risk: userProfile.burnoutRisk,
      motivation_score: userProfile.motivationScore,
      consistency_score: userProfile.consistencyScore,
      emotional_signals: { focus_window: userProfile.focusWindow, behavior: userProfile.cognitivePattern },
    });

    return new Response(JSON.stringify({ userProfile }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("refresh-ai-context error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
