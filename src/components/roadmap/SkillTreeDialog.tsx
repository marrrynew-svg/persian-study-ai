import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { GitBranch } from "lucide-react";
import { hexPoints } from "@/lib/worldBuilder";
import type { ExamTopic } from "@/hooks/useExams";

function masteryColor(m: number): string {
  if (m <= 0)   return "rgba(255,255,255,0.15)";
  if (m < 31)   return "#ef4444";
  if (m < 71)   return "#f59e0b";
  if (m < 100)  return "#06b6d4";
  return "#10b981";
}

export function SkillTreeDialog({
  topics, mastery,
}: {
  topics: ExamTopic[];
  mastery: Record<string, number>;
}) {
  const groups = useMemo(() => {
    const m = new Map<string, ExamTopic[]>();
    for (const t of topics) {
      const key = t.subject_id || "بدون درس";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(t);
    }
    return Array.from(m.entries());
  }, [topics]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl gap-1.5">
          <GitBranch className="w-4 h-4" /> درخت مهارت
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>🌳 درخت مهارت</DialogTitle></DialogHeader>
        {groups.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">هنوز سرفصلی نداری</div>
        ) : (
          <Tabs defaultValue={groups[0][0]}>
            <TabsList className="w-full overflow-x-auto flex justify-start">
              {groups.map(([k]) => (
                <TabsTrigger key={k} value={k} className="text-xs">{k.slice(0, 8)}</TabsTrigger>
              ))}
            </TabsList>
            {groups.map(([k, list]) => (
              <TabsContent key={k} value={k}>
                <svg viewBox={`0 0 320 ${100 + list.length * 90}`} className="w-full">
                  {list.map((t, i) => {
                    const m = mastery[t.id] ?? 0;
                    const cx = 60 + (i % 3) * 100;
                    const cy = 60 + Math.floor(i / 3) * 100;
                    return (
                      <g key={t.id} transform={`translate(${cx}, ${cy})`}>
                        {i > 0 && <line x1={-30} y1={-30} x2={0} y2={0} stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />}
                        <polygon points={hexPoints(28)} fill={masteryColor(m)} opacity={m === 0 ? 0.4 : 0.9}
                          style={m === 100 ? { filter: "drop-shadow(0 0 8px #10b981)" } : undefined} />
                        <text fontSize={9} textAnchor="middle" dominantBaseline="central" fill="white">{Math.round(m)}%</text>
                        <text y={42} fontSize={9} textAnchor="middle" fill="rgba(255,255,255,0.7)">{t.title.slice(0, 10)}</text>
                      </g>
                    );
                  })}
                </svg>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}