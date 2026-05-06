import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Target } from "lucide-react";
import { formatStudyDuration } from "@/lib/studySession";

interface Props {
  monthSeconds: number;
  goalHours?: number;
}

export function GoalProgress({ monthSeconds, goalHours = 100 }: Props) {
  const goalSeconds = goalHours * 3600;
  const pct = Math.min(100, Math.round((monthSeconds / goalSeconds) * 100));
  const remaining = Math.max(0, goalSeconds - monthSeconds);

  return (
    <Card className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg gradient-emerald flex items-center justify-center">
          <Target className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <h3 className="text-sm font-semibold flex-1">هدف ماهانه ({goalHours} ساعت)</h3>
        <span className="text-xs font-bold tabular-nums text-emerald" dir="ltr">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8 }}
          className="h-full rounded-full gradient-emerald"
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>انجام شده: {formatStudyDuration(monthSeconds)}</span>
        <span>باقی‌مانده: {formatStudyDuration(remaining)}</span>
      </div>
    </Card>
  );
}
