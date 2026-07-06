import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Target, Sparkles, CalendarPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useActiveExamSetup } from "@/hooks/usePlanV2";
import { useWeeklyV3, useBuildPlanV3 } from "@/hooks/usePlanV3";
import { WeekGrid } from "@/components/plan/v3/WeekGrid";
import { SmartBlockCard } from "@/components/plan/v3/SmartBlockCard";
import { toast } from "sonner";

export default function SmartWeek() {
  const navigate = useNavigate();
  const { data: exam } = useActiveExamSetup();
  const { data } = useWeeklyV3();
  const build = useBuildPlanV3();
  const weeks = data?.weeks || [];
  const days = data?.days || [];
  const currentWeek = weeks[0];
  const hasAnyBlocks = days.some((d: any) => (d.plan_block_v2 || []).length > 0);

  const handleRebuild = () => {
    build.mutate(
      {},
      {
        onError: (e: any) => {
          if (e?.code === "NO_EXAM" || e?.code === "INCOMPLETE_WIZARD") {
            toast.error(e.message);
            setTimeout(() => navigate("/plan/wizard"), 400);
          }
        },
      },
    );
  };

  return (
    <AppLayout>
      <div className="px-4 pt-5 pb-8 max-w-lg mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">برنامه هفتگی</h1>
            <p className="text-xs text-muted-foreground">نمای گرید ۷ روزه با فازها</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRebuild} disabled={build.isPending}>
            <RefreshCw className={`w-4 h-4 ml-1 ${build.isPending ? "animate-spin" : ""}`} /> بازسازی
          </Button>
        </header>

        {!exam && (
          <Card className="p-6 text-center rounded-2xl space-y-3">
            <Sparkles className="w-10 h-10 mx-auto text-primary" />
            <div className="text-sm font-bold">هنوز آزمونی ثبت نکردی</div>
            <p className="text-xs text-muted-foreground">با مشاور هوشمند شروع کن تا برنامه هفتگی حرفه‌ای بسازم.</p>
            <Link to="/plan/wizard">
              <Button size="sm" className="gradient-primary text-primary-foreground">
                <CalendarPlus className="w-4 h-4 ml-1" /> شروع مشاور هوشمند
              </Button>
            </Link>
          </Card>
        )}

        {exam && !hasAnyBlocks && !currentWeek && (
          <Card className="p-6 text-center rounded-2xl space-y-3">
            <Sparkles className="w-10 h-10 mx-auto text-primary" />
            <div className="text-sm font-bold">برنامه هفتگی هنوز ساخته نشده</div>
            <p className="text-xs text-muted-foreground">با یک کلیک، هفت روز آینده رو با فازبندی و تعادل کامل بساز.</p>
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={handleRebuild} disabled={build.isPending}>
              <Sparkles className={`w-4 h-4 ml-1 ${build.isPending ? "animate-spin" : ""}`} /> ساخت برنامه هفتگی
            </Button>
          </Card>
        )}

        {currentWeek && (
          <Card className="p-3 rounded-2xl bg-gradient-to-l from-primary/10 to-accent/5 border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">{currentWeek.weekly_goal}</span>
            </div>
            <p className="text-xs text-muted-foreground">{currentWeek.rationale}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {(currentWeek.milestones || []).map((m: string, i: number) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60">
                  ✓ {m}
                </span>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-2 rounded-2xl">
          <WeekGrid days={days} />
        </Card>

        {currentWeek?.coverage && (
          <Card className="p-3 rounded-2xl">
            <div className="text-xs font-bold mb-2">پوشش دروس این هفته</div>
            <div className="space-y-1.5">
              {Object.entries(currentWeek.coverage as Record<string, number>)
                .sort((a, b) => b[1] - a[1])
                .map(([sub, min]) => {
                  const max = Math.max(...Object.values(currentWeek.coverage as Record<string, number>));
                  const pct = Math.round((min / Math.max(1, max)) * 100);
                  return (
                    <div key={sub}>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="font-bold">{sub}</span>
                        <span className="text-muted-foreground">{min}′</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full gradient-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        )}

        {days.slice(0, 7).map((d: any) => {
          const blocks = (d.plan_block_v2 || []).sort((a: any, b: any) => a.block_order - b.block_order);
          if (!blocks.length) return null;
          return (
            <details key={d.id} className="bg-card rounded-2xl border border-border/40 p-3">
              <summary className="cursor-pointer flex justify-between items-center text-sm font-bold">
                <span>{d.date}</span>
                <span className="text-xs text-muted-foreground">{d.total_planned_minutes}′ · {blocks.length} بلوک</span>
              </summary>
              <div className="mt-3 space-y-2">
                {blocks.map((b: any) => <SmartBlockCard key={b.id} block={b} compact />)}
              </div>
            </details>
          );
        })}
      </div>
    </AppLayout>
  );
}
