import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, CalendarPlus, Flame, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { useLatestAnalysis, useActiveExamSetup } from "@/hooks/usePlanV2";
import { useDailyV3, useBuildPlanV3 } from "@/hooks/usePlanV3";
import { DiagnosisCard } from "@/components/plan/v2/DiagnosisCard";
import { SmartBlockCard } from "@/components/plan/v3/SmartBlockCard";
import { DayTimeline } from "@/components/plan/v3/DayTimeline";

function PhaseBadge({ phase }: { phase: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    foundation: { label: "فاز پایه", cls: "bg-blue-500/15 text-blue-600" },
    mastery: { label: "فاز تسلط", cls: "bg-purple-500/15 text-purple-600" },
    simulation: { label: "فاز شبیه‌ساز", cls: "bg-red-500/15 text-red-600" },
  };
  const m = map[phase] || map.foundation;
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.cls}`}>{m.label}</span>;
}

export default function SmartToday() {
  const { data: exam } = useActiveExamSetup();
  const { data: today, isLoading } = useDailyV3();
  const { data: analysis } = useLatestAnalysis();
  const build = useBuildPlanV3();

  if (!isLoading && !exam) {
    return (
      <AppLayout>
        <div className="px-4 pt-10 max-w-md mx-auto text-center space-y-4">
          <Sparkles className="w-12 h-12 mx-auto text-primary" />
          <h2 className="text-xl font-bold">برنامه هوشمندت آماده نیست</h2>
          <p className="text-sm text-muted-foreground">با چند سوال یک برنامه‌ی حرفه‌ای می‌سازم.</p>
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
  const day = today?.day;
  const done = blocks.filter((b: any) => b.status === "done").length;
  const total = blocks.length;
  const hasTimes = blocks.some((b: any) => b.suggested_start_time);

  return (
    <AppLayout>
      <div className="px-4 pt-5 pb-8 max-w-lg mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">برنامه امروز</h1>
            <p className="text-xs text-muted-foreground">{exam?.exam_name}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => build.mutate({})} disabled={build.isPending}>
            <RefreshCw className={`w-4 h-4 ml-1 ${build.isPending ? "animate-spin" : ""}`} /> بازسازی هوشمند
          </Button>
        </header>

        {day && (
          <Card className="p-3 rounded-2xl bg-gradient-to-l from-primary/10 to-accent/10 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <PhaseBadge phase={day.phase} />
                  {day.is_simulation_day && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 font-bold">شبیه‌ساز</span>
                  )}
                  {day.is_recovery_day && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 font-bold">ریکاوری</span>
                  )}
                </div>
                <div className="text-sm font-bold flex items-center gap-1">
                  <Target className="w-4 h-4" /> {day.day_goal}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 text-xs font-bold">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  {Math.round((day.heat_score || 0) * 100)}٪
                </div>
                <div className="text-[10px] text-muted-foreground">شدت</div>
              </div>
            </div>
          </Card>
        )}

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
            <div className="text-xs text-muted-foreground">{day?.total_planned_minutes || 0} دقیقه برنامه‌ریزی شده</div>
          </div>
          <Link to="/timer"><Button size="sm">شروع تایمر</Button></Link>
        </Card>

        {total === 0 && !isLoading && (
          <Card className="p-6 text-center rounded-2xl text-sm text-muted-foreground">
            امروز بلوکی برنامه‌ریزی نشده. روی «بازسازی هوشمند» بزن.
          </Card>
        )}

        {hasTimes && total > 0 && (
          <Card className="p-3 rounded-2xl">
            <div className="text-xs font-bold mb-2">تایم‌لاین امروز</div>
            <DayTimeline blocks={blocks} />
          </Card>
        )}

        <div className="space-y-2">
          {blocks.map((b: any) => <SmartBlockCard key={b.id} block={b} />)}
        </div>
      </div>
    </AppLayout>
  );
}
