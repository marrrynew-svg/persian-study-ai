import { blockTypeColor } from "@/lib/planino/v3/planEngine";

const WD_LABELS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function WeekGrid({ days }: { days: any[] }) {
  // Group by date, next 7 days
  const first7 = days.slice(0, 7);
  return (
    <div className="grid grid-cols-7 gap-1 text-[10px]">
      {first7.map((d) => {
        const date = new Date(d.date);
        const label = WD_LABELS[(date.getDay() + 1) % 7];
        const blocks = (d.plan_block_v2 || []).sort((a: any, b: any) => a.block_order - b.block_order);
        const total = d.total_planned_minutes || 0;
        return (
          <div key={d.id} className="bg-card border border-border/40 rounded-xl p-1 min-h-[220px]">
            <div className="text-center font-bold mb-1">{label}</div>
            <div className="text-center text-muted-foreground mb-2 font-mono">{date.getDate()}</div>
            <div className="space-y-1">
              {blocks.slice(0, 6).map((b: any) => (
                <div
                  key={b.id}
                  className="rounded p-1 text-white truncate"
                  style={{ background: blockTypeColor(b.block_type || "study") }}
                  title={`${b.subject_name} · ${b.suggested_start_time || ""}`}
                >
                  <div className="text-[9px] font-mono opacity-90">{b.suggested_start_time?.slice(0, 5)}</div>
                  <div className="truncate">{b.subject_name}</div>
                </div>
              ))}
              {blocks.length > 6 && <div className="text-center text-muted-foreground">+{blocks.length - 6}</div>}
            </div>
            <div className="mt-2 text-center text-muted-foreground">{total}′</div>
          </div>
        );
      })}
    </div>
  );
}