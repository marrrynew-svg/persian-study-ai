import { blockTypeColor, blockTypeLabel } from "@/lib/planino/v3/planEngine";
import { SmartBlockCard } from "./SmartBlockCard";

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
        {blocks.map((b) => {
          const startM = toMin(b.suggested_start_time);
          const endM = toMin(b.suggested_end_time);
          if (startM == null || endM == null) return null;
          const top = ((startM - dayStart) / total) * 640;
          const height = Math.max(48, ((endM - startM) / total) * 640);
          const color = blockTypeColor(b.block_type || "study");
          return (
            <div
              key={b.id}
              className="absolute left-0 right-0 rounded-xl p-2 text-white shadow-md overflow-hidden"
              style={{ top, height, background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
            >
              <div className="text-[10px] opacity-90 font-mono">{b.suggested_start_time}</div>
              <div className="text-xs font-bold truncate">{b.subject_name}</div>
              <div className="text-[10px] opacity-80">{blockTypeLabel(b.block_type || "study")}</div>
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