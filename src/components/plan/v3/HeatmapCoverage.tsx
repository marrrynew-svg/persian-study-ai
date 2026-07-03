export function HeatmapCoverage({ heatmap }: { heatmap: Record<string, Record<string, number>> }) {
  const dates = Object.keys(heatmap).sort();
  const subjects = Array.from(
    new Set(dates.flatMap((d) => Object.keys(heatmap[d] || {}))),
  );
  if (!dates.length || !subjects.length) {
    return <div className="text-xs text-muted-foreground text-center py-6">داده‌ای نیست</div>;
  }
  const max = Math.max(1, ...dates.flatMap((d) => Object.values(heatmap[d] || {})));

  return (
    <div className="overflow-x-auto">
      <table className="text-[10px] border-separate" style={{ borderSpacing: 2 }}>
        <thead>
          <tr>
            <th className="text-right sticky right-0 bg-card z-10 pr-2"></th>
            {dates.map((d) => (
              <th key={d} className="font-mono text-muted-foreground rotate-[-60deg] origin-bottom-right h-8">
                {d.slice(5)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => (
            <tr key={s}>
              <td className="text-right sticky right-0 bg-card z-10 pr-2 font-bold whitespace-nowrap">{s}</td>
              {dates.map((d) => {
                const v = heatmap[d]?.[s] || 0;
                const intensity = v / max;
                return (
                  <td key={d}>
                    <div
                      title={`${s} · ${d}: ${v}′`}
                      className="w-4 h-4 rounded"
                      style={{
                        background:
                          v === 0 ? "hsl(var(--muted))" : `hsl(217 91% ${Math.max(20, 80 - intensity * 55)}%)`,
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}