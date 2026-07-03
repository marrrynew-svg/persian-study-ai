import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock, FileText, ListChecks, RotateCcw, X, Sparkles, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useUpdateBlockStatus } from "@/hooks/usePlanV2";
import { blockTypeColor, blockTypeLabel } from "@/lib/planino/v3/planEngine";
import { Link } from "react-router-dom";

export function SmartBlockCard({ block, compact = false }: { block: any; compact?: boolean }) {
  const update = useUpdateBlockStatus();
  const [open, setOpen] = useState(false);
  const isDone = block.status === "done";
  const isSkipped = block.status === "skipped";
  const color = blockTypeColor(block.block_type || "study");
  const label = blockTypeLabel(block.block_type || "study");
  const totalMin = block.study_minutes + block.review_minutes + block.recovery_minutes;

  return (
    <Card
      className={`p-3 rounded-2xl border relative overflow-hidden ${
        isDone ? "bg-emerald-500/5 border-emerald-500/30" : isSkipped ? "opacity-50" : "bg-card"
      }`}
      style={!isDone && !isSkipped ? { borderRightWidth: 4, borderRightColor: color } : {}}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${color}22`, color }}>
              {label}
            </span>
            {block.suggested_start_time && (
              <span className="text-[11px] font-mono text-muted-foreground">
                {block.suggested_start_time} – {block.suggested_end_time}
              </span>
            )}
          </div>
          <div className="font-bold text-sm truncate">{block.subject_name}</div>
          {block.topic && <div className="text-xs text-muted-foreground truncate">{block.topic}</div>}
        </div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
          <Clock className="w-3 h-3" /> {totalMin}′
        </div>
      </div>

      {!compact && (
        <>
          <div className="flex flex-wrap gap-2 text-[11px] mb-2">
            {block.pages > 0 && <Tag icon={FileText}>{block.pages} صفحه</Tag>}
            {block.tests > 0 && <Tag icon={ListChecks}>{block.tests} تست</Tag>}
            {block.review_minutes > 0 && <Tag icon={RotateCcw}>{block.review_minutes}′ مرور</Tag>}
          </div>
          {block.rationale && (
            <button
              onClick={() => setOpen(!open)}
              className="text-[11px] text-primary/80 flex items-center gap-1 mb-2"
            >
              <Sparkles className="w-3 h-3" /> چرا این بلوک؟
              <ChevronDown className={`w-3 h-3 transition ${open ? "rotate-180" : ""}`} />
            </button>
          )}
          {open && block.rationale && (
            <div className="text-[11px] bg-muted/40 rounded-lg p-2 mb-2 leading-relaxed">
              {block.rationale}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isDone ? "secondary" : "default"}
              className="flex-1 h-8 text-xs"
              onClick={() => update.mutate({ blockId: block.id, status: "done", doneMinutes: block.study_minutes })}
            >
              <Check className="w-3 h-3 ml-1" /> انجام
            </Button>
            <Link to="/timer" className="flex-1">
              <Button size="sm" variant="outline" className="w-full h-8 text-xs">شروع تایمر</Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => update.mutate({ blockId: block.id, status: "skipped" })}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </>
      )}
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