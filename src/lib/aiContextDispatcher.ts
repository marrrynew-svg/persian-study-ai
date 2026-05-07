// Central event dispatcher: every meaningful user action triggers a debounced
// AI context refresh on the server. The result is cached locally for instant UI.
import { supabase } from "@/integrations/supabase/client";

export type StructuredUserProfile = {
  goalClarityScore: number;
  riskLevel: "low" | "medium" | "high";
  weakSubjects: { id: string; name: string; strength: number }[];
  strongSubjects: { id: string; name: string; strength: number }[];
  estimatedSuccessProbability: number;
  recommendedDailyHours: number;
  cognitivePattern: string;
  focusWindow: string;
  daysLeft: number | null;
  burnoutRisk: number;
  motivationScore: number;
  consistencyScore: number;
  overdueTasks: number;
  taskCompletionRate: number;
  weekStudySeconds: number;
  weekStudyDays: number;
  computedAt: string;
};

const CACHE_KEY = "ai-user-profile-cache";
let pending: number | null = null;
let lastRunAt = 0;
const MIN_INTERVAL_MS = 8000; // throttle server calls

const listeners = new Set<(p: StructuredUserProfile | null) => void>();

export function subscribeUserProfile(fn: (p: StructuredUserProfile | null) => void) {
  listeners.add(fn);
  fn(getCachedUserProfile());
  return () => listeners.delete(fn);
}

export function getCachedUserProfile(): StructuredUserProfile | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as StructuredUserProfile) : null;
  } catch { return null; }
}

async function runRefresh() {
  pending = null;
  lastRunAt = Date.now();
  try {
    const { data, error } = await supabase.functions.invoke("refresh-ai-context");
    if (error) throw error;
    const userProfile = (data as any)?.userProfile as StructuredUserProfile | undefined;
    if (userProfile) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(userProfile));
      listeners.forEach((fn) => fn(userProfile));
    }
  } catch (e) {
    console.warn("[ai-context] refresh failed", e);
  }
}

/**
 * Dispatch a user-activity event that should refresh AI context.
 * Debounced so a burst of timer ticks / task toggles only fires one call.
 */
export function dispatchAIContextRefresh(reason: string = "event") {
  if (typeof window === "undefined") return;
  console.info("[ai-context] event:", reason);
  if (pending) window.clearTimeout(pending);
  const wait = Math.max(1500, MIN_INTERVAL_MS - (Date.now() - lastRunAt));
  pending = window.setTimeout(runRefresh, wait);
}

/** Force a refresh now (used at app boot / login). */
export function forceAIContextRefresh() {
  if (pending) { window.clearTimeout(pending); pending = null; }
  return runRefresh();
}
