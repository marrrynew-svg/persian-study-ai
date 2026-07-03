import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useMonthlyV3, useBuildPlanV3 } from "@/hooks/usePlanV3";
import { ReadinessChart } from "@/components/plan/v3/ReadinessChart";
import { HeatmapCoverage } from "@/components/plan/v3/HeatmapCoverage";

const PHASE_COLORS: Record<string, string> = {
  foundation: "hsl(217 91% 60%)",
  mastery: "hsl(262 83% 58%)",
  simulation: "hsl(0 84% 60%)",
};
const PHASE_LABEL: Record<string, string> = {
  foundation: "پایه",
  mastery: "تسلط",
  simulation: "شبیه‌ساز",
};

export default function SmartMonth() {
  const { data: monthly, isLoading } = useMonthlyV3();
  const build = useBuildPlanV3();

  if (!isLoading && !monthly) {
    return (
      <AppLayout>
        <div className="px-4 pt-10 max-w-md mx-auto text-center space-y-4">
          <Sparkles className="w-12 h-12 mx-auto text-primary" />
          <h2 className="text-xl font-bold">هنوز برنامه ماهانه ساخته نشده</h2>
          <Button className="w-full" onClick={() => build.mutate({ horizonDays: 30 })}>
            <RefreshCw className="w-4 h-4 ml-1" /> ساخت برنامه ۳۰ روزه
          </Button>
        </div>
      </AppLayout>
    );
  }
  if (!monthly) return <AppLayout><div className="p-6 text-center text-sm">در حال بارگذاری…</div></AppLayout>;

  const phases = (monthly.phases || []) as any[];
  const totalDays = monthly.total_days || 1;

  return (
    <AppLayout>
      <div className="px-4 pt-5 pb-8 max-w-lg mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">برنامه ماهانه</h1>
            <p className="text-xs text-muted-foreground">{monthly.month_start} → {monthly.month_end}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => build.mutate({ horizonDays: 30 })} disabled={build.isPending}>
            <RefreshCw className={`w-4 h-4 ml-1 ${build.isPending ? "animate-spin" : ""}`} /> بازسازی
          </Button>
        </header>

        <Card className="p-3 rounded-2xl bg-gradient-to-l from-emerald-500/10 to-blue-500/10 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">پیش‌بینی آمادگی نهایی</div>
              <div className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
                {monthly.predicted_readiness_percent}٪
              </div>
            </div>
            <TrendingUp className="w-10 h-10 text-emerald-500/60" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">{monthly.rationale}</p>
        </Card>

        <Card className="p-3 rounded-2xl">
          <div className="text-xs font-bold mb-2">Roadmap فازها</div>
          <div className="flex h-5 rounded-full overflow-hidden">
            {phases.map((p: any, i: number) => {
              const w = ((p.days || 0) / totalDays) * 100;
              return (
                <div
                  key={i}
                  className="flex items-center justify-center text-[9px] text-white font-bold"
                  style={{ width: `${w}%`, background: PHASE_COLORS[p.phase] || "#888" }}
                  title={p.goal}
                >
                  {PHASE_LABEL[p.phase]} ({p.days}د)
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {phases.map((p: any, i: number) => (
              <div key={i} className="text-[10px] p-2 rounded-lg bg-muted/40">
                <div className="font-bold" style={{ color: PHASE_COLORS[p.phase] }}>
                  {PHASE_LABEL[p.phase]}
                </div>
                <div className="text-muted-foreground">{p.start?.slice(5)} – {p.end?.slice(5)}</div>
                <div className="mt-1">{p.goal}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-3 rounded-2xl">
          <div className="text-xs font-bold mb-2">پیش‌بینی رشد آمادگی</div>
          <ReadinessChart data={monthly.readiness_forecast || []} />
        </Card>

        <Card className="p-3 rounded-2xl">
          <div className="text-xs font-bold mb-2">Heatmap پوشش دروس</div>
          <HeatmapCoverage heatmap={monthly.heatmap || {}} />
        </Card>

        <Card className="p-3 rounded-2xl">
          <div className="text-xs font-bold mb-2">مایل‌استون‌های هفتگی</div>
          <div className="space-y-2">
            {(monthly.weekly_milestones || []).map((m: any) => (
              <div key={m.week_index} className="flex justify-between text-xs p-2 rounded-lg bg-muted/40">
                <span>هفته {m.week_index + 1}: {m.goal}</span>
                <span className="text-muted-foreground font-mono">{Math.round(m.target_minutes / 60)}س</span>
              </div>
            ))}
          </div>
        </Card>

        <Link to="/plan/coach">
          <Button className="w-full gradient-primary text-primary-foreground">
            <Sparkles className="w-4 h-4 ml-1" /> پرسیدن از مشاور AI درباره برنامه
          </Button>
        </Link>
      </div>
    </AppLayout>
  );
}
