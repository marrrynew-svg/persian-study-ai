import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Plus, Circle } from "lucide-react";
import type { RoadmapNodeRow } from "@/hooks/useRoadmapNodes";

interface Props {
  nodes: RoadmapNodeRow[];
  subjects: Array<{ id: string; name: string; icon?: string | null; color?: string | null }>;
  onOpenNode: (id: string) => void;
  onAddMission: () => void;
}

export function WeeklyMissionBoard({ nodes, subjects, onOpenNode, onAddMission }: Props) {
  const items = useMemo(() => {
    const now = Date.now();
    const weekEnd = now + 7 * 86400000;
    return [...nodes]
      .filter((n) => {
        if (n.status === "locked") return false;
        if (n.status === "completed") {
          // include if completed this week
          if (!n.last_studied_at) return false;
          return +new Date(n.last_studied_at) >= now - 7 * 86400000;
        }
        if (n.due_date && +new Date(n.due_date) > weekEnd) return false;
        return true;
      })
      .sort((a, b) => {
        const ad = a.due_date ? +new Date(a.due_date) : Infinity;
        const bd = b.due_date ? +new Date(b.due_date) : Infinity;
        return ad - bd;
      })
      .slice(0, 12);
  }, [nodes]);

  return (
    <Card className="rounded-2xl p-4 border border-border/60">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">برد ماموریت هفتگی</h3>
          <p className="text-[10px] text-muted-foreground">{items.length} ماموریت فعال</p>
        </div>
        <Button onClick={onAddMission} size="sm" variant="outline" className="gap-1 h-7 text-xs rounded-lg">
          <Plus className="w-3.5 h-3.5" /> ماموریت
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">این هفته ماموریتی نیست</p>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const subject = n.subject_id ? subjects.find((s) => s.id === n.subject_id) : null;
            const isDone = n.status === "completed";
            const isOverdue = !isDone && n.due_date && +new Date(n.due_date) < Date.now();
            const daysLeft = n.due_date ? Math.ceil((+new Date(n.due_date) - Date.now()) / 86400000) : null;

            return (
              <button
                key={n.id}
                onClick={() => onOpenNode(n.id)}
                className={`w-full text-right rounded-xl border p-3 transition-all hover:bg-accent/50 ${
                  isDone ? "border-emerald-500/30 bg-emerald-500/5" :
                  isOverdue ? "border-destructive/40 bg-destructive/5" :
                  "border-border/60"
                }`}
              >
                <div className="flex items-start gap-2 mb-1.5">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                  ) : isOverdue ? (
                    <AlertCircle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-snug">{n.title}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {subject && (
                        <Badge variant="secondary" className="text-[9px] gap-0.5 h-4 px-1.5">
                          {subject.icon || "📚"} {subject.name}
                        </Badge>
                      )}
                      {daysLeft !== null && !isDone && (
                        <Badge variant={isOverdue ? "destructive" : "outline"} className="text-[9px] h-4 px-1.5">
                          {isOverdue ? `${Math.abs(daysLeft)} روز عقب` : `${daysLeft} روز`}
                        </Badge>
                      )}
                      {isDone && (
                        <Badge className="text-[9px] h-4 px-1.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          +{n.xp_reward} XP
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold tabular-nums">{Math.round(n.progress)}%</span>
                </div>
                <Progress value={n.progress} className="h-1" />
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}