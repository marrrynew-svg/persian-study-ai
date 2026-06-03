import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Play, Sparkles, Clock, Target } from "lucide-react";
import type { RoadmapNodeRow } from "@/hooks/useRoadmapNodes";

interface Props {
  nodes: RoadmapNodeRow[];
  subjects: Array<{ id: string; name: string; icon?: string | null; color?: string | null }>;
  exams: Array<{ id: string; title: string; exam_date: string }>;
  todayMinutes: number;
  dailyTargetMinutes: number;
  onOpenNode: (id: string) => void;
}

/** Pick the most important node for today. */
function pickTopMission(nodes: RoadmapNodeRow[]): RoadmapNodeRow | null {
  const open = nodes.filter((n) => n.status === "in_progress" || n.status === "available");
  if (open.length === 0) return null;
  const today = Date.now();
  const score = (n: RoadmapNodeRow) => {
    const daysToDue = n.due_date ? (+new Date(n.due_date) - today) / 86400000 : 999;
    const urgency = daysToDue <= 0 ? 100 : daysToDue <= 3 ? 80 : daysToDue <= 7 ? 50 : 10;
    const typeBoost = n.type === "boss" ? 30 : n.type === "review" ? 15 : n.type === "milestone" ? 10 : 0;
    const statusBoost = n.status === "in_progress" ? 20 : 0;
    const progressPenalty = n.progress * 0.3;
    return urgency + typeBoost + statusBoost - progressPenalty;
  };
  return [...open].sort((a, b) => score(b) - score(a))[0];
}

export function TodayMission({ nodes, subjects, exams, todayMinutes, dailyTargetMinutes, onOpenNode }: Props) {
  const navigate = useNavigate();
  const top = useMemo(() => pickTopMission(nodes), [nodes]);

  const subject = top?.subject_id ? subjects.find((s) => s.id === top.subject_id) : null;
  const exam = top?.exam_id ? exams.find((e) => e.id === top.exam_id) : null;
  const daysToExam = exam ? Math.max(0, Math.ceil((+new Date(exam.exam_date) - Date.now()) / 86400000)) : null;

  const dailyPct = Math.min(100, Math.round((todayMinutes / Math.max(1, dailyTargetMinutes)) * 100));
  const remainingMin = Math.max(0, (top?.estimated_minutes || 0) - (top?.study_minutes || 0));

  const startTimer = () => {
    if (!top) return navigate("/timer");
    navigate(`/timer?subject=${top.subject_id || ""}&node=${top.id}`);
  };

  return (
    <Card className="rounded-2xl p-4 border border-border/60 bg-gradient-to-br from-primary/10 via-card to-card relative overflow-hidden">
      <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>ماموریت امروز</span>
        </div>

        {top ? (
          <>
            <button
              onClick={() => onOpenNode(top.id)}
              className="text-right block w-full mb-2"
            >
              <h2 className="text-lg font-bold leading-snug">{top.title}</h2>
              {top.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{top.description}</p>
              )}
            </button>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {subject && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <span>{subject.icon || "📚"}</span>{subject.name}
                </Badge>
              )}
              {exam && daysToExam !== null && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Target className="w-3 h-3" />{exam.title} · {daysToExam} روز
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] gap-1">
                <Clock className="w-3 h-3" />{remainingMin} دقیقه باقی
              </Badge>
              <Badge className="text-[10px] gradient-primary text-primary-foreground">+{top.xp_reward} XP</Badge>
            </div>

            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>پیشرفت ماموریت</span><span>{Math.round(top.progress)}%</span>
              </div>
              <Progress value={top.progress} className="h-1.5" />
            </div>

            <Button onClick={startTimer} className="w-full gap-2 gradient-primary text-primary-foreground rounded-xl">
              <Play className="w-4 h-4" /> شروع مطالعه
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold mb-2">امروز ماموریت فعالی نداری</h2>
            <p className="text-xs text-muted-foreground mb-3">یه آزمون یا ماموریت اضافه کن تا AI برات برنامه بریزه.</p>
            <Button onClick={startTimer} variant="outline" className="w-full gap-2 rounded-xl">
              <Play className="w-4 h-4" /> شروع تایمر آزاد
            </Button>
          </>
        )}

        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>هدف مطالعه امروز</span>
            <span className="font-bold">{todayMinutes} / {dailyTargetMinutes} دقیقه</span>
          </div>
          <Progress value={dailyPct} className="h-1.5" />
        </div>
      </div>
    </Card>
  );
}