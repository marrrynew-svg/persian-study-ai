import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatStudyDuration } from "@/lib/studySession";

interface SubjectStat {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  seconds: number;
  sessions: number;
}

interface Props {
  subjects: SubjectStat[];
  onSelect?: (id: string) => void;
  totalSeconds: number;
}

export function SubjectGrid({ subjects, onSelect, totalSeconds }: Props) {
  if (!subjects.length) return null;
  const max = Math.max(...subjects.map((s) => s.seconds), 1);

  return (
    <Card className="glass rounded-2xl p-4">
      <h3 className="text-sm font-semibold mb-3">📚 تحلیل دروس</h3>
      <div className="space-y-2.5">
        {subjects.map((s, i) => {
          const pct = totalSeconds ? Math.round((s.seconds / totalSeconds) * 100) : 0;
          const barPct = (s.seconds / max) * 100;
          const color = s.color || "hsl(var(--accent))";
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSelect?.(s.id)}
              className="w-full text-right hover:bg-muted/40 rounded-xl p-2 -m-2 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{s.icon || "📘"}</span>
                  <span className="text-xs font-medium">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground">· {s.sessions} جلسه</span>
                </div>
                <div className="text-[10px] tabular-nums">
                  <span className="font-semibold">{formatStudyDuration(s.seconds)}</span>
                  <span className="text-muted-foreground mr-1">({pct}٪)</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.04 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>
            </motion.button>
          );
        })}
      </div>
    </Card>
  );
}
