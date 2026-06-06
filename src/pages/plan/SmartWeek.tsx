import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { useWeekSmartPlan } from "@/hooks/usePlanV2";
import { BlockCard } from "@/components/plan/v2/BlockCard";

const WD = ["یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];

export default function SmartWeek() {
  const { data: days = [] } = useWeekSmartPlan();
  return (
    <AppLayout>
      <div className="px-4 pt-5 pb-8 max-w-lg mx-auto space-y-4">
        <h1 className="text-xl font-bold">برنامه هفتگی</h1>
        {days.map((d: any) => {
          const date = new Date(d.date);
          const blocks = d.plan_block_v2 || [];
          return (
            <Card key={d.id} className="p-3 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <div className="font-bold text-sm">{WD[(date.getDay() + 1) % 7]} · {d.date}</div>
                <div className="text-xs text-muted-foreground">{d.total_planned_minutes}m</div>
              </div>
              {blocks.length === 0 ? (
                <div className="text-xs text-muted-foreground">بلوکی نیست</div>
              ) : (
                <div className="space-y-2">
                  {blocks.sort((a: any, b: any) => a.block_order - b.block_order).map((b: any) => (
                    <BlockCard key={b.id} block={b} />
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}