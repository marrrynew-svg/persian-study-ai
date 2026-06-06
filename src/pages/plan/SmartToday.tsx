import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, CalendarPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { useTodaySmartPlan, useLatestAnalysis, useActiveExamSetup, useReplan } from "@/hooks/usePlanV2";
import { DiagnosisCard } from "@/components/plan/v2/DiagnosisCard";
import { BlockCard } from "@/components/plan/v2/BlockCard";

export default function SmartToday() {
  const { data: exam } = useActiveExamSetup();
  const { data: today, isLoading } = useTodaySmartPlan();
  const { data: analysis } = useLatestAnalysis();
  const replan = useReplan();

  if (!isLoading && !exam) {
    return (
      <AppLayout>
        <div className="px-4 pt-10 max-w-md mx-auto text-center space-y-4">
          <Sparkles className="w-12 h-12 mx-auto text-primary" />
          <h2 className="text-xl font-bold">برنامه هوشمندت آماده نیست</h2>
          <p className="text-sm text-muted-foreground">با چند سوال یک مشاور هوشمند برات می‌سازم.</p>
          <Link to="/plan/wizard">
            <Button className="w-full gradient-primary text-primary-foreground">
              <CalendarPlus className="w-4 h-4 ml-1" /> شروع مشاور هوشمند
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const blocks = today?.blocks || [];
  const done = blocks.filter((b: any) => b.status === "done").length;
  const total = blocks.length;

  return (
    <AppLayout>
      <div className="px-4 pt-5 pb-8 max-w-lg mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">برنامه امروز</h1>
            <p className="text-xs text-muted-foreground">{exam?.exam_name}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => replan.mutate()} disabled={replan.isPending}>
            <RefreshCw className={`w-4 h-4 ml-1 ${replan.isPending ? "animate-spin" : ""}`} /> بازسازی
          </Button>
        </header>

        {analysis && (
          <DiagnosisCard
            risk={analysis.risk_level}
            daysLeft={analysis.days_left}
            dailyNeed={(analysis.reasoning as any)?.daily_need_minutes ?? 0}
            dailyCap={(analysis.reasoning as any)?.daily_capacity_minutes ?? 0}
            totalRequired={analysis.total_required_minutes}
            totalAvailable={analysis.total_available_minutes}
          />
        )}

        <Card className="p-3 rounded-2xl flex items-center justify-between">
          <div className="text-sm">
            <div className="font-bold">{done} / {total} بلوک انجام شده</div>
            <div className="text-xs text-muted-foreground">{today?.day?.total_planned_minutes || 0} دقیقه برنامه‌ریزی شده</div>
          </div>
          <Link to="/timer"><Button size="sm">شروع تایمر</Button></Link>
        </Card>

        {total === 0 && !isLoading && (
          <Card className="p-6 text-center rounded-2xl text-sm text-muted-foreground">
            امروز بلوکی برنامه‌ریزی نشده. روی بازسازی بزن.
          </Card>
        )}

        <div className="space-y-2">
          {blocks.map((b: any) => <BlockCard key={b.id} block={b} />)}
        </div>
      </div>
    </AppLayout>
  );
}