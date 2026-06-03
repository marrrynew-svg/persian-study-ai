import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, BookOpen, Clock, TrendingUp, TrendingDown } from "lucide-react";
import type { RoadmapNodeRow } from "@/hooks/useRoadmapNodes";
import type { ExamTopic } from "@/hooks/useExams";

interface Subject { id: string; name: string; icon?: string | null; color?: string | null }
interface Session { subject_id: string | null; duration_minutes: number | null }

interface Props {
  subjects: Subject[];
  nodes: RoadmapNodeRow[];
  topics: ExamTopic[];
  sessions: Session[];
  onOpenNode: (id: string) => void;
}

function masteryColor(m: number) {
  if (m < 20) return "text-red-400";
  if (m < 50) return "text-orange-400";
  if (m < 80) return "text-blue-400";
  return "text-emerald-400";
}
function masteryBg(m: number) {
  if (m < 20) return "bg-red-500/10 border-red-500/30";
  if (m < 50) return "bg-orange-500/10 border-orange-500/30";
  if (m < 80) return "bg-blue-500/10 border-blue-500/30";
  return "bg-emerald-500/10 border-emerald-500/30";
}
function barColor(m: number) {
  if (m < 20) return "bg-red-500";
  if (m < 50) return "bg-orange-500";
  if (m < 80) return "bg-blue-500";
  return "bg-emerald-500";
}

export function SubjectMasteryCenter({ subjects, nodes, topics, sessions, onOpenNode }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const data = useMemo(() => {
    return subjects.map((s) => {
      const subjNodes = nodes.filter((n) => n.subject_id === s.id);
      const subjTopics = topics.filter((t) => t.subject_id === s.id);
      const subjSessions = sessions.filter((sess) => sess.subject_id === s.id);

      const minutes = subjSessions.reduce((a, x) => a + (x.duration_minutes || 0), 0);
      const totalNodes = subjNodes.length;
      const nodeMastery = totalNodes === 0 ? 0 :
        subjNodes.reduce((a, n) => a + n.progress, 0) / totalNodes;
      const topicMastery = subjTopics.length === 0 ? 0 :
        subjTopics.reduce((a, t) => a + (t.estimated_minutes > 0
          ? Math.min(100, (t.completed_minutes / t.estimated_minutes) * 100) : 0), 0) / subjTopics.length;
      const mastery = Math.round(
        totalNodes > 0 && subjTopics.length > 0 ? (nodeMastery + topicMastery) / 2 :
        totalNodes > 0 ? nodeMastery : topicMastery
      );

      // breakdown items (combine topics & milestone nodes)
      const breakdown: { id: string; title: string; progress: number; kind: "topic" | "node" }[] = [
        ...subjTopics.map((t) => ({
          id: t.id, title: t.title, kind: "topic" as const,
          progress: t.estimated_minutes > 0
            ? Math.min(100, (t.completed_minutes / t.estimated_minutes) * 100) : 0,
        })),
        ...subjNodes.filter((n) => n.type === "milestone" || n.type === "study").map((n) => ({
          id: n.id, title: n.title, kind: "node" as const, progress: n.progress,
        })),
      ];

      const sortedBd = [...breakdown].sort((a, b) => a.progress - b.progress);
      const weakest = sortedBd[0]?.title || "—";
      const strongest = sortedBd[sortedBd.length - 1]?.title || "—";

      return { subject: s, minutes, mastery, breakdown, weakest, strongest, sessionCount: subjSessions.length };
    }).filter((d) => d.breakdown.length > 0 || d.minutes > 0);
  }, [subjects, nodes, topics, sessions]);

  return (
    <Card className="rounded-2xl p-4 border border-border/60">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">مرکز تسلط درس‌ها</h3>
        <p className="text-[10px] text-muted-foreground">نقاط قوت و ضعف بر اساس داده واقعی</p>
      </div>

      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">داده‌ای برای محاسبه تسلط نیست</p>
      ) : (
        <div className="space-y-2">
          {data.map((d) => {
            const isOpen = openId === d.subject.id;
            return (
              <Collapsible key={d.subject.id} open={isOpen} onOpenChange={(o) => setOpenId(o ? d.subject.id : null)}>
                <div className={`rounded-xl border ${masteryBg(d.mastery)} overflow-hidden`}>
                  <CollapsibleTrigger className="w-full p-3 text-right hover:bg-background/30 transition-colors">
                    <div className="flex items-center gap-2 mb-1.5">
                      <ChevronDown className={`w-4 h-4 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                      <span className="text-lg">{d.subject.icon || "📚"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{d.subject.name}</div>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5">
                            <Clock className="w-2.5 h-2.5" />{Math.round(d.minutes / 60)} ساعت
                          </Badge>
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5">
                            <BookOpen className="w-2.5 h-2.5" />{d.sessionCount} جلسه
                          </Badge>
                        </div>
                      </div>
                      <span className={`text-lg font-bold tabular-nums ${masteryColor(d.mastery)}`}>{d.mastery}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full transition-all ${barColor(d.mastery)}`} style={{ width: `${d.mastery}%` }} />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="border-t border-border/40 bg-background/30 p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="flex items-center gap-1 p-1.5 rounded-md bg-red-500/10">
                        <TrendingDown className="w-3 h-3 text-red-400 shrink-0" />
                        <span className="text-muted-foreground">ضعیف:</span>
                        <span className="truncate font-medium">{d.weakest}</span>
                      </div>
                      <div className="flex items-center gap-1 p-1.5 rounded-md bg-emerald-500/10">
                        <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="text-muted-foreground">قوی:</span>
                        <span className="truncate font-medium">{d.strongest}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {d.breakdown.slice(0, 12).map((b) => (
                        <button
                          key={`${b.kind}-${b.id}`}
                          onClick={() => b.kind === "node" ? onOpenNode(b.id) : undefined}
                          disabled={b.kind === "topic"}
                          className="w-full text-right"
                        >
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="truncate">{b.title}</span>
                            <span className={`tabular-nums font-bold ${masteryColor(b.progress)}`}>{Math.round(b.progress)}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full ${barColor(b.progress)}`} style={{ width: `${b.progress}%` }} />
                          </div>
                        </button>
                      ))}
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