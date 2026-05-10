import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, SkipForward, Play, BookOpen, Repeat2, ClipboardCheck, Coffee, Bed } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUpdateBlockStatus, type RoadmapBlock } from "@/hooks/useRoadmap";
import type { ExamTopic } from "@/hooks/useExams";
import { toast } from "sonner";

const TYPE_META: Record<RoadmapBlock["block_type"], { icon: any; label: string; color: string }> = {
  study:    { icon: BookOpen,        label: "مطالعه",   color: "hsl(263, 70%, 58%)" },
  review:   { icon: Repeat2,         label: "مرور",     color: "hsl(160, 60%, 45%)" },
  test:     { icon: ClipboardCheck,  label: "تست",      color: "hsl(25, 90%, 55%)" },
  buffer:   { icon: Coffee,          label: "جبران",    color: "hsl(215, 25%, 50%)" },
  recovery: { icon: Bed,             label: "ریکاوری",  color: "hsl(280, 35%, 50%)" },
};

function fmt(t: string | null) {
  if (!t) return "";
  return t.slice(0, 5);
}

export function SmartDailyPlan({ blocks, topics }: { blocks: RoadmapBlock[]; topics: ExamTopic[] }) {
  const today = new Date().toISOString().split("T")[0];
  const navigate = useNavigate();
  const updateStatus = useUpdateBlockStatus();

  const todayBlocks = useMemo(
    () => blocks.filter((b) => b.date === today).sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")),
    [blocks, today]
  );
  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);

  const totalMin = todayBlocks.reduce((a, b) => a + (b.status === "skipped" ? 0 : b.duration_minutes), 0);
  const doneMin = todayBlocks.filter((b) => b.status === "done").reduce((a, b) => a + b.duration_minutes, 0);

  return (
    <Card className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">📋 برنامه هوشمند امروز</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {todayBlocks.length} بلوک · {Math.floor(totalMin / 60)}س {totalMin % 60}د · انجام‌شده {doneMin} دقیقه
          </p>
        </div>
      </div>

      {todayBlocks.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground">
          هنوز برنامه‌ای برای امروز ساخته نشده. روی «بازسازی» بزن.
        </div>
      ) : (
        <div className="space-y-2">
          {todayBlocks.map((b, i) => {
            const meta = TYPE_META[b.block_type];
            const Icon = meta.icon;
            const topic = b.topic_id ? topicById.get(b.topic_id) : null;
            const done = b.status === "done";
            const skipped = b.status === "skipped";
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                  done ? "bg-emerald-500/10 border-emerald-500/30" :
                  skipped ? "bg-muted/30 opacity-60" : "bg-card border-border"
                }`}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                     style={{ backgroundColor: `${meta.color}20` }}>
                  <Icon className="w-4 h-4" style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">
                      {topic?.title || meta.label}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted">{meta.label}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>{fmt(b.start_time)}–{fmt(b.end_time)}</span>
                    <span>·</span>
                    <span>{b.duration_minutes}د</span>
                    {b.reason && <><span>·</span><span className="truncate">{b.reason}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!done && !skipped && (
                    <>
                      <Button size="icon" variant="ghost" className="w-7 h-7"
                              onClick={() => navigate("/timer")} title="شروع تایمر">
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="w-7 h-7 text-emerald-600"
                              onClick={async () => { await updateStatus.mutateAsync({ id: b.id, status: "done" }); toast.success("انجام شد ✅"); }}
                              title="انجام شد">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground"
                              onClick={() => updateStatus.mutate({ id: b.id, status: "skipped" })}
                              title="رد کردن">
                        <SkipForward className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Card>
  );
}