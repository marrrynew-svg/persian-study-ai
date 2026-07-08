export function AuroraBg() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full blur-3xl opacity-40 animate-[pulse_10s_ease-in-out_infinite]"
        style={{ background: "radial-gradient(circle, hsl(265 100% 60% / 0.9), transparent 70%)" }}
      />
      <div
        className="absolute top-1/3 -left-32 w-[440px] h-[440px] rounded-full blur-3xl opacity-30 animate-[pulse_14s_ease-in-out_infinite]"
        style={{ background: "radial-gradient(circle, hsl(188 100% 55% / 0.8), transparent 70%)" }}
      />
      <div
        className="absolute -bottom-32 right-1/4 w-[420px] h-[420px] rounded-full blur-3xl opacity-25 animate-[pulse_16s_ease-in-out_infinite]"
        style={{ background: "radial-gradient(circle, hsl(230 100% 55% / 0.8), transparent 70%)" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_20%,hsl(var(--background))_75%)]" />
    </div>
  );
}