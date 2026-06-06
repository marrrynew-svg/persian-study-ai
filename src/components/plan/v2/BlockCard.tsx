import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock, FileText, ListChecks, RotateCcw, X } from "lucide-react";
import { useUpdateBlockStatus } from "@/hooks/usePlanV2";

export function BlockCard({ block }: { block: any }) {
  const update = useUpdateBlockStatus();
  const isDone = block.status === "done";
  const isSkipped = block.status === "skipped";

  return (
    <Card className={`p-3 rounded-2xl border ${isDone ? "bg-emerald-500/5 border-emerald-500/30" : isSkipped ? "bg-muted/30 opacity-60" : "bg-card border-border/50"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-sm">{block.subject_name}</div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" /> {block.study_minutes + block.review_minutes + block.recovery_minutes} دقیقه
        </div>
      </div>
      {block.topic && <div className="text-xs text-muted-foreground mb-2">{block.topic}</div>}
      <div className="flex flex-wrap gap-2 text-[11px] mb-3">
        {block.pages > 0 && <Tag icon={FileText}>{block.pages} صفحه</Tag>}
        {block.tests > 0 && <Tag icon={ListChecks}>{block.tests} تست</Tag>}
        {block.review_minutes > 0 && <Tag icon={RotateCcw}>{block.review_minutes}m مرور</Tag>}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant={isDone ? "secondary" : "default"} className="flex-1 h-8 text-xs"
          onClick={() => update.mutate({ blockId: block.id, status: "done", doneMinutes: block.study_minutes })}>
          <Check className="w-3 h-3 ml-1" /> انجام شد
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-xs"
          onClick={() => update.mutate({ blockId: block.id, status: "postponed" })}>
          عقب بنداز
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
          onClick={() => update.mutate({ blockId: block.id, status: "skipped" })}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  );
}

function Tag({ icon: Icon, children }: { icon: any; children: any }) {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50">
      <Icon className="w-3 h-3" /> {children}
    </div>
  );
}