import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { generateDailyQuests, type DailyQuest } from "@/lib/xpEngine";

/** Local-only RPG meta state (achievements + quests + skill mastery).
 *  Stored per-user in localStorage to avoid a DB migration. */

interface RPGState {
  unlockedAchievements: string[];
  quests: DailyQuest[];
  questsDate: string;
  mastery: Record<string, number>; // topicId -> 0..100
}

const DEFAULT: RPGState = { unlockedAchievements: [], quests: [], questsDate: "", mastery: {} };

function key(uid?: string) { return `rpg-state-${uid || "anon"}`; }

function load(uid?: string): RPGState {
  try {
    const raw = localStorage.getItem(key(uid));
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT }; }
}

function save(uid: string | undefined, s: RPGState) {
  try { localStorage.setItem(key(uid), JSON.stringify(s)); } catch {}
}

export function useRPGState(opts: { dailyStudyHours: number; weakSubject?: string | null }) {
  const { user } = useAuth();
  const [state, setState] = useState<RPGState>(() => load(user?.id));

  useEffect(() => { setState(load(user?.id)); }, [user?.id]);

  // Ensure today's quests exist
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (state.questsDate !== today) {
      const fresh = generateDailyQuests({ dailyStudyHours: opts.dailyStudyHours, weakSubject: opts.weakSubject });
      const next = { ...state, quests: fresh, questsDate: today };
      setState(next); save(user?.id, next);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questsDate]);

  const unlock = useCallback((ids: string[]) => {
    setState((prev) => {
      const merged = Array.from(new Set([...prev.unlockedAchievements, ...ids]));
      const next = { ...prev, unlockedAchievements: merged };
      save(user?.id, next);
      return next;
    });
  }, [user?.id]);

  const setQuestProgress = useCallback((updates: { type: DailyQuest["type"]; value: number }[]) => {
    setState((prev) => {
      const quests = prev.quests.map((q) => {
        const u = updates.find((x) => x.type === q.type);
        if (!u) return q;
        const current = Math.min(q.target, u.value);
        return { ...q, current, completed: current >= q.target };
      });
      const next = { ...prev, quests };
      save(user?.id, next);
      return next;
    });
  }, [user?.id]);

  const bumpMastery = useCallback((topicId: string, deltaMinutes: number) => {
    setState((prev) => {
      const cur = prev.mastery[topicId] ?? 0;
      const next = Math.min(100, cur + (deltaMinutes / 30) * 10);
      const m = { ...prev.mastery, [topicId]: next };
      const updated = { ...prev, mastery: m };
      save(user?.id, updated);
      return updated;
    });
  }, [user?.id]);

  return { state, unlock, setQuestProgress, bumpMastery };
}