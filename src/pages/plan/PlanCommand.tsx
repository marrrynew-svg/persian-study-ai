import { AppLayout } from "@/components/layout/AppLayout";
import { AuroraBg } from "@/components/plan/v4/AuroraBg";
import { GlassCard } from "@/components/plan/v4/GlassCard";
import { ReadinessRing } from "@/components/plan/v4/ReadinessRing";
import { NextUpHero } from "@/components/plan/v4/NextUpHero";
import { WeekPulse } from "@/components/plan/v4/WeekPulse";
import { SubjectPulse } from "@/components/plan/v4/SubjectPulse";
import { QuickAskBar } from "@/components/plan/v4/QuickAskBar";
import { DayTimeline } from "@/components/plan/v3/DayTimeline";
import { Button } from "@/components/ui/button";
import { useActiveExamSetup, useLatestAnalysis } from "@/hooks/usePlanV2";
import { useDailyV3, useWeeklyV3, useMonthlyV3, useBuildPlanV3 } from "@/hooks/usePlanV3";
import {
  RefreshCw, Sparkles, Flame, Target, CalendarPlus, ChevronLeft, Calendar,
  CalendarRange, TrendingUp, AlertTriangle, Zap, BookOpen,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const isPast = (d?: string | null) => !!d && d < new Date().toISOString().slice(0, 10);

function daysBetween(a: string, b: string) {
  const t = (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
  return Math.max(0, Math.round(t));
}

const RISK: Record<string, { label: string; color: string; icon: any }> = {
  low: { label: "روی روال", color: "hsl(150 80% 50%)", icon: TrendingUp },
  medium: { label: "قابل مدیریت", color: "hsl(38 95% 60%)", icon: Zap },
  high: { label: "پرفشار", color: "hsl(20 95% 60%)", icon: Flame },
  critical: { label: "بحرانی", color: "hsl(0 90% 60%)", icon: AlertTriangle },
};

export default function PlanCommand() {
  const nav = useNavigate();
  const { data: exam } = useActiveExamSetup();
  const { data: today, isLoading } = useDailyV3();
  const { data: weekly } = useWeeklyV3();
  const { data: monthly } = useMonthlyV3();
  const { data: analysis } = useLatestAnalysis();
  const build = useBuildPlanV3();

  const rebuild = () => {
    build.mutate({}, {
      onError: (e: any) => {
        if (["NO_EXAM", "INCOMPLETE_WIZARD", "EXAM_EXPIRED"].includes(e?.code)) {
          toast.error(e.message);
          setTimeout(() => nav("/plan/wizard"), 400);
        }
      },
    });
  };

  if (!isLoading && (!exam || isPast(exam.exam_date))) {
    return (
      <AppLayout>
        <AuroraBg />
        <div className="px-4 pt-10 max-w-md mx-auto text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-primary to-accent grid place-items-center shadow-2xl">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-black">
            {exam ? "تاریخ آزمونت گذشته" : "برنامه هوشمندت آماده نیست"}
          </h2>
          <p className="text-sm text-muted-foreground">
            تاریخ هدف و اطلاعاتت رو به‌روز کن تا فرماندهی مطالعه‌ت شروع بشه.
          </p>
          <Link to="/plan/wizard">
            <Button className="w-full h-11 bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold">
              <CalendarPlus className="w-4 h-4 ml-1" /> شروع مشاور هوشمند
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const day = today?.day;
  const blocks = today?.blocks || [];
  const doneBlocks = blocks.filter((b: any) => b.status === "done").length;
  const totalBlocks = blocks.length;
  const doneMin = blocks
    .filter((b: any) => b.status === "done")
    .reduce((s: number, b: any) => s + (b.study_minutes || 0), 0);
  const plannedMin = day?.total_planned_minutes || 0;
  const dayProgress = plannedMin > 0 ? Math.round((doneMin / plannedMin) * 100) : 0;

  const daysToExam = exam?.exam_date ? daysBetween(new Date().toISOString().slice(0, 10), exam.exam_date) : 0;
  const readiness = monthly?.predicted_readiness_percent ?? Math.min(95, dayProgress + 30);
  const risk = RISK[analysis?.risk_level as string] || RISK.medium;
  const RiskIcon = risk.icon;

  const weekDays = weekly?.days || [];
  const currentWeek = weekly?.weeks?.[0];
  const hasBlocks = totalBlocks > 0 || weekDays.some((d: any) => (d.plan_block_v2 || []).length > 0);

  return (
    <AppLayout>
      <AuroraBg />
      <div className="px-4 pt-4 pb-10 max-w-lg mx-auto space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Command Center</div>
            <h1 className="text-2xl font-black bg-gradient-to-l from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              فرماندهی برنامه
            </h1>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {exam?.exam_name} · <span className="font-mono">{daysToExam}</span> روز مانده
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={rebuild} disabled={build.isPending}
            className="border-white/15 bg-white/5 backdrop-blur">
            <RefreshCw className={`w-4 h-4 ml-1 ${build.isPending ? "animate-spin" : ""}`} />
            بازسازی
          </Button>
        </header>

        {/* Empty state — no blocks yet */}
        {!hasBlocks && !isLoading && (
          <GlassCard glow="violet" intense className="p-6 text-center space-y-3">
            <Sparkles className="w-10 h-10 mx-auto text-primary" />
            <div className="text-base font-bold">هنوز برنامه‌ای ساخته نشده</div>
            <p className="text-xs text-muted-foreground">
              با یک کلیک، برنامه‌ای متعادل، فازبندی‌شده و بر اساس چرونوتایپ خودت بساز.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={rebuild} disabled={build.isPending}
                className="bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold">
                <Sparkles className="w-4 h-4 ml-1" /> ساخت برنامه هوشمند
              </Button>
              <Link to="/plan/wizard">
                <Button variant="outline" className="border-white/15 bg-white/5">
                  <CalendarPlus className="w-4 h-4 ml-1" /> مشاور
                </Button>
              </Link>
            </div>
          </GlassCard>
        )}

        {/* Top HUD: readiness + risk */}
        <GlassCard glow="violet" intense className="p-4">
          <div className="flex items-center gap-4">
            <ReadinessRing percent={readiness} size={124} label="آمادگی پیش‌بینی" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <RiskIcon className="w-4 h-4" style={{ color: risk.color }} />
                <span className="text-xs font-bold" style={{ color: risk.color }}>{risk.label}</span>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">پیشرفت امروز</div>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="font-bold">{doneMin}′ / {plannedMin}′</span>
                  <span className="text-muted-foreground">{dayProgress}٪</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden border border-white/5">
                  <div className="h-full rounded-full bg-gradient-to-l from-primary to-accent transition-all duration-700"
                    style={{ width: `${Math.min(100, dayProgress)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Stat label="بلوک" value={`${doneBlocks}/${totalBlocks}`} />
                <Stat
                  label="شدت"
                  value={`${Math.round((day?.heat_score || 0) * 100)}٪`}
                  icon={<Flame className="w-3 h-3 text-orange-400" />}
                />
              </div>
            </div>
          </div>
          {day?.day_goal && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-xs">
              <Target className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold">{day.day_goal}</span>
            </div>
          )}
        </GlassCard>

        {/* Next up hero */}
        {totalBlocks > 0 && (
          <GlassCard glow="cyan" intense>
            <NextUpHero blocks={blocks} />
          </GlassCard>
        )}

        {/* Week pulse */}
        {weekDays.length > 0 && (
          <GlassCard glow="violet" className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-primary" />
                <div className="text-sm font-bold">نبض هفته</div>
              </div>
              <Link to="/plan/week" className="text-[11px] text-primary flex items-center gap-0.5">
                جزئیات <ChevronLeft className="w-3 h-3" />
              </Link>
            </div>
            <WeekPulse days={weekDays} />
            {currentWeek?.weekly_goal && (
              <div className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-bold text-foreground">هدف هفته: </span>
                {currentWeek.weekly_goal}
              </div>
            )}
          </GlassCard>
        )}

        {/* Subject pulse */}
        {currentWeek?.coverage && (
          <GlassCard glow="pink" className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <div className="text-sm font-bold">پوشش دروس هفته</div>
            </div>
            <SubjectPulse coverage={currentWeek.coverage} />
          </GlassCard>
        )}

        {/* Today timeline preview */}
        {blocks.some((b: any) => b.suggested_start_time) && (
          <GlassCard glow="violet" className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <div className="text-sm font-bold">تایم‌لاین امروز</div>
              </div>
              <Link to="/plan/today" className="text-[11px] text-primary flex items-center gap-0.5">
                همه بلوک‌ها <ChevronLeft className="w-3 h-3" />
              </Link>
            </div>
            <DayTimeline blocks={blocks} />
          </GlassCard>
        )}

        {/* Quick ask */}
        <GlassCard glow="cyan">
          <QuickAskBar />
        </GlassCard>

        {/* Nav shortcuts */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { to: "/plan/today", label: "امروز", icon: Calendar },
            { to: "/plan/week", label: "هفته", icon: CalendarRange },
            { to: "/plan/month", label: "ماه", icon: TrendingUp },
          ].map((it) => (
            <Link key={it.to} to={it.to}>
              <GlassCard glow="none" className="p-3 text-center hover:bg-white/[0.08] transition">
                <it.icon className="w-4 h-4 mx-auto text-primary mb-1" />
                <div className="text-[11px] font-bold">{it.label}</div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/5 p-2">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className="text-sm font-black font-mono flex items-center gap-1">{icon}{value}</div>
    </div>
  );
}