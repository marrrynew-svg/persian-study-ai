interface Props {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

export function Sparkline({ data, color = "hsl(var(--accent))", height = 28, width = 80 }: Props) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = 0;
  const step = width / Math.max(1, data.length - 1);
  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / (max - min || 1)) * height}`)
    .join(" ");
  const area = `0,${height} ${points} ${width},${height}`;
  const id = `sg-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
