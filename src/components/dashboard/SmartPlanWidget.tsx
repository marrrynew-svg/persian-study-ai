import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useTodaySmartPlan, useActiveExamSetup } from "@/hooks/usePlanV2";

export function SmartPlanWidget() {
  const { data: exam } = useActiveExamSetup();
  const { data: today } = useTodaySmartPlan();

  if (!exam) {
    return (
      <Card className="p-4 rounded-2xl gradient-primary text-primary-foreground">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-bold">مشاور هوشمندت رو فعال کن</h3>
        </div>
        <p className="text-xs opacity-90 mb-3">با چند سوال یک برنامه شخصی و پویا برات می‌سازم.</p>
        <Link to="/plan/wizard">
          <Button size="sm" variant="secondary" className="w-full">شروع <ArrowLeft className="w-3 h-3 mr-1" /></Button>
        </Link>
      </Card>
    );
  }

  const blocks = today?.blocks || [];
  const done = blocks.filter((b: any) => b.status === "done").length;
  const planned = today?.day?.total_planned_minutes || 0;

  return (
    <Card className="p-4 rounded-2xl border border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">امروز باید بخوانی</h3>
        </div>
        <Link to="/plan/today" className="text-xs text-primary">همه <ArrowLeft className="w-3 h-3 inline" /></Link>
      </div>
      {blocks.length === 0 ? (
        <div className="text-xs text-muted-foreground py-2">هنوز برنامه‌ای برای امروز نیست.</div>
      ) : (
        <div className="space-y-1.5">
          {blocks.slice(0, 4).map((b: any) => (
            <div key={b.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {b.status === "done" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <span className="w-2 h-2 rounded-full bg-primary" />}
                <span className={b.status === "done" ? "line-through text-muted-foreground" : ""}>
                  {b.subject_name}
                </span>
              </div>
              <div className="text-muted-foreground text-[10px]">
                {b.pages > 0 && `${b.pages}ص · `}{b.tests > 0 && `${b.tests}تست · `}{b.study_minutes}m
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-border/40 flex justify-between text-[10px] text-muted-foreground">
        <span>{done}/{blocks.length} بلوک</span>
        <span>{planned} دقیقه برنامه‌ریزی‌شده</span>
      </div>
    </Card>
  );
}