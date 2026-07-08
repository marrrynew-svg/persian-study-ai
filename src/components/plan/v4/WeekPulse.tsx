const WD = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function WeekPulse({ days }: { days: any[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const slice = days.slice(0, 7);
  const max = Math.max(60, ...slice.map((d) => d.total_planned_minutes || 0));
  return (
    <div className="flex items-end justify-between gap-1.5 h-28 pt-2">
      {slice.map((d) => {
        const date = new Date(d.date);
        const label = WD[(date.getDay() + 1) % 7];
        const isToday = d.date === today;
        const total = d.total_planned_minutes || 0;
        const blocks = d.plan_block_v2 || [];
        const doneMin = blocks
          .filter((b: any) => b.status === "done")
          .reduce((s: number, b: any) => s + (b.study_minutes || 0), 0);
        const h = (total / max) * 90;
        const doneH = (doneMin / max) * 90;
        return (
          <div key={d.id} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-[9px] font-mono text-muted-foreground">{Math.round(total / 60)}س</div>
            <div className="relative w-full flex justify-center" style={{ height: 90 }}>
              <div
                className={`w-full rounded-t-lg self-end ${isToday ? "shadow-[0_0_20px_hsl(265_100%_65%/0.7)]" : ""}`}
                style={{
                  height: h,
                  background: isToday
                    ? "linear-gradient(to top, hsl(265 100% 60%), hsl(188 100% 55%))"
                    : "linear-gradient(to top, hsl(265 60% 40% / 0.5), hsl(265 60% 55% / 0.3))",
                }}
              />
              {doneH > 0 && (
                <div
                  className="absolute bottom-0 w-full rounded-t-lg opacity-90"
                  style={{ height: doneH, background: "linear-gradient(to top, hsl(150 80% 45%), hsl(160 80% 55%))" }}
                />
              )}
            </div>
            <div
              className={`text-[10px] font-bold ${isToday ? "text-primary" : "text-muted-foreground"}`}
            >
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}