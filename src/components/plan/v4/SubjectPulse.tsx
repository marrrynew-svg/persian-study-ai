export function SubjectPulse({ coverage }: { coverage: Record<string, number> }) {
  const entries = Object.entries(coverage || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!entries.length) return <div className="text-xs text-muted-foreground">دیتای پوشش هنوز آماده نیست.</div>;
  const max = Math.max(...entries.map(([, v]) => v));
  return (
    <div className="space-y-2.5">
      {entries.map(([name, min], i) => {
        const pct = Math.round((min / max) * 100);
        const hue = 265 - i * 12;
        return (
          <div key={name}>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="font-bold truncate max-w-[70%]">{name}</span>
              <span className="font-mono text-muted-foreground">{Math.round(min / 60)}س {min % 60 ? `${min % 60}د` : ""}</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(to left, hsl(${hue} 90% 60%), hsl(${hue - 40} 95% 55%))`,
                  boxShadow: `0 0 12px hsl(${hue} 100% 60% / 0.5)`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}