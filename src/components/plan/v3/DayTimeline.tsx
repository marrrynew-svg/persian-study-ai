import { blockTypeColor, blockTypeLabel } from "@/lib/planino/v3/planEngine";
import { SmartBlockCard } from "./SmartBlockCard";
import { useEffect, useState } from "react";

function toMin(t?: string) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function DayTimeline({ blocks }: { blocks: any[] }) {
  const dayStart = 6 * 60; // 06:00
  const dayEnd = 24 * 60; // 24:00
  const total = dayEnd - dayStart;
  const hourMarks = Array.from({ length: 10 }, (_, i) => 6 + i * 2);
  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    }, 60000);
    return () => clearInterval(id);
  }, []);
  const nowTop = nowMin >= dayStart && nowMin <= dayEnd ? ((nowMin - dayStart) / total) * 640 : -1;

  return (
    <div className="relative flex gap-3">
      {/* Timeline ruler */}
      <div className="w-10 shrink-0 relative" style={{ height: 640 }}>
        {hourMarks.map((h) => {
          const top = ((h * 60 - dayStart) / total) * 640;
          return (
            <div key={h} className="absolute left-0 right-0 text-[10px] font-mono text-muted-foreground" style={{ top }}>
              {String(h).padStart(2, "0")}:00
            </div>
          );
        })}
      </div>
      <div className="flex-1 relative border-r border-border/40 pr-3" style={{ height: 640 }}>
        {hourMarks.map((h) => {
          const top = ((h * 60 - dayStart) / total) * 640;
          return <div key={h} className="absolute left-0 right-0 border-t border-dashed border-border/30" style={{ top }} />;
        })}
        {nowTop >= 0 && (
          <div className="absolute left-0 right-0 z-20" style={{ top: nowTop }}>
            <div className="relative h-0.5 bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]">
              <div className="absolute -right-1 -top-1.5 w-3 h-3 rounded-full bg-red-500 shadow-lg animate-pulse" />
              <div className="absolute -right-1 top-1 text-[9px] font-mono text-red-500 font-bold">الان</div>
            </div>
          </div>
        )}
        {blocks.map((b) => {
          const startM = toMin(b.suggested_start_time);
          const endM = toMin(b.suggested_end_time);
          if (startM == null || endM == null) return null;
          const top = ((startM - dayStart) / total) * 640;
          const height = Math.max(48, ((endM - startM) / total) * 640);
          const color = blockTypeColor(b.block_type || "study");
          const isPast = endM < nowMin;
          const isNow = startM <= nowMin && endM >= nowMin;
          return (
            <div
              key={b.id}
              className={`absolute left-0 right-0 rounded-xl p-2 text-white overflow-hidden backdrop-blur-md border transition-all ${
                isNow ? "ring-2 ring-white/60 shadow-2xl scale-[1.02] z-10" : isPast ? "opacity-50" : "shadow-lg"
              }`}
              style={{
                top, height,
                background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
                borderColor: `${color}66`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              <div className="text-[10px] opacity-90 font-mono">{b.suggested_start_time}</div>
              <div className="text-xs font-bold truncate">{b.subject_name}</div>
              <div className="text-[10px] opacity-80">{blockTypeLabel(b.block_type || "study")}</div>
              {isNow && <div className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full bg-white/30 backdrop-blur font-bold">در حال اجرا</div>}
            </div>
          );
        })}
      </div>

      {/* Fallback list for blocks without suggested times */}
      <div className="hidden">
        {blocks.filter((b) => !b.suggested_start_time).map((b) => (
          <SmartBlockCard key={b.id} block={b} />
        ))}
      </div>
    </div>
  );
}