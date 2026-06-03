import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, ChevronDown, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDeleteExam, type Exam } from "@/hooks/useExams";
import type { RoadmapNodeRow } from "@/hooks/useRoadmapNodes";

interface Props {
  exams: Exam[];
  nodes: RoadmapNodeRow[];
  onAddExam: () => void;
  onOpenNode: (id: string) => void;
}

export function ExamJourney({ exams, nodes, onAddExam, onOpenNode }: Props) {
  const deleteExam = useDeleteExam();
  const [openId, setOpenId] = useState<string | null>(exams[0]?.id ?? null);

  const sorted = useMemo(
    () => [...exams].sort((a, b) => +new Date(a.exam_date) - +new Date(b.exam_date)),
    [exams]
  );

  const handleDelete = async (id: string) => {
    if (!confirm("این آزمون و تمام نودهای مرتبط حذف بشن؟")) return;
    try {
      await deleteExam.mutateAsync(id);
      toast.success("حذف شد");
    } catch (e: any) { toast.error(e.message || "خطا"); }
  };

  return (
    <Card className="rounded-2xl p-4 border border-border/60">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">سفر آزمون‌ها</h3>
          <p className="text-[10px] text-muted-foreground">{sorted.length} آزمون فعال</p>
        </div>
        <Button onClick={onAddExam} size="sm" className="gap-1 h-7 text-xs rounded-lg gradient-primary text-primary-foreground">
          <Plus className="w-3.5 h-3.5" /> آزمون
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-muted-foreground mb-3">هنوز آزمونی تعریف نکردی</p>
          <Button onClick={onAddExam} size="sm" variant="outline" className="rounded-lg">تعریف اولین آزمون</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((exam) => {
            const examNodes = nodes
              .filter((n) => n.exam_id === exam.id)
              .sort((a, b) => a.order_index - b.order_index);
            const total = examNodes.length;
            const done = examNodes.filter((n) => n.status === "completed").length;
            const overall = total === 0 ? 0 :
              examNodes.reduce((a, n) => a + n.progress, 0) / total;
            const daysLeft = Math.ceil((+new Date(exam.exam_date) - Date.now()) / 86400000);
            const isOpen = openId === exam.id;

            return (
              <Collapsible key={exam.id} open={isOpen} onOpenChange={(o) => setOpenId(o ? exam.id : null)}>
                <div className="rounded-xl border border-border/60 overflow-hidden">
                  <CollapsibleTrigger className="w-full p-3 text-right hover:bg-accent/40 transition-colors">
                    <div className="flex items-center gap-2 mb-1.5">
                      <ChevronDown className={`w-4 h-4 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{exam.title}</div>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            {daysLeft >= 0 ? `${daysLeft} روز` : `${Math.abs(daysLeft)} روز قبل`}
                          </Badge>
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                            {done} / {total} مرحله
                          </Badge>
                        </div>
                      </div>
                      <span className="text-xs font-bold tabular-nums">{Math.round(overall)}%</span>
                    </div>
                    <Progress value={overall} className="h-1" />
                  </CollapsibleTrigger>

                  <CollapsibleContent className="border-t border-border/60 bg-muted/20">
                    {examNodes.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">مرحله‌ای ساخته نشده</p>
                    ) : (
                      <div className="p-2 space-y-1">
                        {examNodes.map((n, i) => (
                          <button
                            key={n.id}
                            onClick={() => onOpenNode(n.id)}
                            className="w-full text-right flex items-center gap-2 p-2 rounded-lg hover:bg-background/60 transition-colors"
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              n.status === "completed" ? "bg-emerald-500/20 text-emerald-400" :
                              n.status === "in_progress" ? "bg-primary/20 text-primary" :
                              n.status === "available" ? "bg-muted text-foreground" :
                              "bg-muted/50 text-muted-foreground"
                            }`}>
                              {n.type === "boss" ? "👑" : i + 1}
                            </div>
                            <div className="flex-1 min-w-0 text-right">
                              <div className="text-xs font-medium truncate">{n.title}</div>
                              <Progress value={n.progress} className="h-0.5 mt-1" />
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{Math.round(n.progress)}%</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="px-3 py-2 border-t border-border/60 flex justify-end">
                      <Button
                        onClick={() => handleDelete(exam.id)}
                        size="sm" variant="ghost"
                        className="h-6 text-[10px] text-destructive hover:text-destructive gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> حذف آزمون
                      </Button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}
    </Card>
  );
}