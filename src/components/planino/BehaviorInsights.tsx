import { Card } from "@/components/ui/card";
import { useBehavior } from "@/hooks/usePlanino";
import { weekdayLabel } from "@/lib/planino/capacity";
import { Flame, AlertTriangle, TrendingUp } from "lucide-react";

export function BehaviorInsights() {
  const { data } = useBehavior();
  if (!data) return null;
  const entries = Object.entries(data.weekday_strength)
    .map(([k, v]) => ({ wd: Number(k), v: Number(v) }))
    .sort((a, b) => a.wd - b.wd);
  const completion = Math.round(data.avg_completion_rate * 100);

  return (
    <Card className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> الگوی رفتار</h3>
        <span className={`text-xs font-bold ${completion >= 70 ? "text-emerald-500" : completion >= 40 ? "text-amber-500" : "text-destructive"}`}>
          {completion}٪ پایبندی
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {entries.map(({ wd, v }) => (
          <div key={wd} className="flex flex-col items-center gap-1">
            <div className="w-full h-10 bg-muted rounded-md overflow-hidden flex items-end">
              <div className="w-full bg-gradient-to-t from-violet-500 to-emerald-400 transition-all"
                style={{ height: `${Math.max(8, v * 100)}%` }} />
            </div>
            <span className="text-[9px] text-muted-foreground">{weekdayLabel(wd as any).slice(0, 2)}</span>
          </div>
        ))}
      </div>
      {data.burnout_flag && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <span>سه روز پشت سر هم برنامه‌ات سنگین‌تر از تواناییت بوده — حجم فردا کم می‌شود.</span>
        </div>
      )}
      {!data.burnout_flag && data.overload_streak > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Flame className="w-4 h-4 text-amber-500" />
          <span>{data.overload_streak} روز پشت‌سر هم زیر هدف. بیشتر فشار نیار.</span>
        </div>
      )}
    </Card>
  );
}