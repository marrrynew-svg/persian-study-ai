import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export function ReadinessChart({ data }: { data: { date: string; predicted_percent: number }[] }) {
  if (!data?.length) return null;
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rdg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} interval={Math.max(0, Math.floor(data.length / 6))} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} width={30} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          <Area type="monotone" dataKey="predicted_percent" stroke="hsl(160 84% 39%)" fill="url(#rdg)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}