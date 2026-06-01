import { useMemo } from "react";
import type { WeatherState } from "@/lib/xpEngine";

/** Visual weather overlay layered above the map. Pure CSS. */
export function WeatherOverlay({ weather }: { weather: WeatherState }) {
  const drops = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${(i * 37) % 100}%`,
    delay: `${(i * 0.13).toFixed(2)}s`,
    duration: `${0.7 + ((i * 17) % 7) / 10}s`,
  })), []);

  const isRainy = weather.type === "rainy" || weather.type === "stormy" || weather.type === "lightning";
  const isStormy = weather.type === "stormy" || weather.type === "lightning";
  const isLightning = weather.type === "lightning";

  return (
    <div className="pointer-events-none fixed inset-0 z-[15] overflow-hidden">
      {weather.type === "sunny" && (
        <div
          className="absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(255,205,80,0.22), transparent 70%)" }}
        />
      )}

      {isRainy && drops.map((d) => (
        <span
          key={d.id}
          className="absolute top-[-20px] w-px h-6"
          style={{
            left: d.left,
            background: isLightning ? "rgba(167,139,250,0.55)" : "rgba(6,182,212,0.55)",
            animation: `rain ${d.duration} linear ${d.delay} infinite`,
          }}
        />
      ))}

      {isStormy && (
        <div
          className="absolute inset-0 mix-blend-screen"
          style={{
            background: isLightning ? "rgba(124,58,237,0.10)" : "rgba(120,140,180,0.08)",
            animation: "stormFlash 8s ease-in-out infinite",
          }}
        />
      )}

      <style>{`
        @keyframes rain { from { transform: translateY(-20px); opacity: 0.7; } to { transform: translateY(110vh); opacity: 0; } }
        @keyframes stormFlash {
          0%, 88%, 100% { opacity: 0; }
          90%, 92% { opacity: 1; }
          91% { opacity: 0.4; }
        }
        @keyframes mapShake {
          0%, 100% { transform: translate(0,0); }
          20% { transform: translate(-1px, 1px); }
          40% { transform: translate(1px, -1px); }
          60% { transform: translate(-1px, 2px); }
          80% { transform: translate(2px, -1px); }
        }
      `}</style>
    </div>
  );
}

export function weatherIcon(t: WeatherState["type"]): string {
  switch (t) {
    case "sunny": return "☀️";
    case "cloudy": return "☁️";
    case "rainy": return "🌧️";
    case "stormy": return "⛈️";
    case "lightning": return "🌩️";
  }
}