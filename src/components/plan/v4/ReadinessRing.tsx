interface Props {
  percent: number;
  size?: number;
  label?: string;
}

export function ReadinessRing({ percent, size = 140, label = "آمادگی" }: Props) {
  const p = Math.max(0, Math.min(100, percent));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (p / 100) * c;
  const hue = 260 + (p / 100) * 60; // violet → cyan-ish
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <defs>
          <linearGradient id="rg-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={`hsl(${hue} 90% 65%)`} />
            <stop offset="100%" stopColor="hsl(188 95% 55%)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" opacity={0.25} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#rg-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 1.2s ease-out", filter: "drop-shadow(0 0 8px hsl(265 100% 65% / 0.6))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-black font-mono bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
          {Math.round(p)}<span className="text-base align-top">٪</span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  );
}