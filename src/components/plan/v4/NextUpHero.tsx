import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Check, SkipForward, Clock, Sparkles } from "lucide-react";
import { useUpdateBlockStatus } from "@/hooks/usePlanV2";
import { Link } from "react-router-dom";
import { blockTypeColor, blockTypeLabel } from "@/lib/planino/v3/planEngine";

function toMin(t?: string) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function fmt(mins: number) {
  const sign = mins < 0 ? "-" : "";
  const a = Math.abs(mins);
  const h = Math.floor(a / 60);
  const m = a % 60;
  return `${sign}${h > 0 ? h + "س " : ""}${m}د`;
}

export function NextUpHero({ blocks }: { blocks: any[] }) {
  const update = useUpdateBlockStatus();
  const [now, setNow] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const withTime = blocks
    .filter((b) => b.status === "pending" && b.suggested_start_time)
    .map((b) => ({ ...b, _s: toMin(b.suggested_start_time)!, _e: toMin(b.suggested_end_time)! }))
    .sort((a, b) => a._s - b._s);

  const current = withTime.find((b) => b._s <= now && b._e >= now);
  const next = current || withTime.find((b) => b._s > now) || withTime[0] || blocks.find((b) => b.status === "pending");

  if (!next) {
    return (
      <div className="p-6 text-center">
        <Sparkles className="w-8 h-8 mx-auto text-primary/70 mb-2" />
        <div className="text-sm font-bold">همه بلوک‌های امروز تموم شد 🎯</div>
        <div className="text-xs text-muted-foreground mt-1">وقتشه یه استراحت خوب یا مرور فعال داشته باشی.</div>
      </div>
    );
  }

  const color = blockTypeColor(next.block_type || "study");
  const totalMin = (next.study_minutes || 0) + (next.review_minutes || 0) + (next.recovery_minutes || 0);
  const startM = next._s ?? toMin(next.suggested_start_time);
  const isLive = current && current.id === next.id;
  const delta = startM != null ? startM - now : null;

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${color}33`, color }}>
            {blockTypeLabel(next.block_type || "study")}
          </span>
          {isLive ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              الان در جریان
            </span>
          ) : delta != null && delta > 0 ? (
            <span className="text-[10px] text-muted-foreground font-mono">تا {fmt(delta)} دیگه</span>
          ) : (
            <span className="text-[10px] text-amber-400 font-bold">بلوک بعدی</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
          <Clock className="w-3 h-3" /> {totalMin}′
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground mb-1 font-mono">
        {next.suggested_start_time} – {next.suggested_end_time}
      </div>
      <div className="text-2xl font-black leading-tight">{next.subject_name}</div>
      {next.topic && <div className="text-sm text-muted-foreground mt-1">{next.topic}</div>}

      <div className="flex flex-wrap gap-2 text-[11px] mt-3">
        {next.pages > 0 && (
          <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">{next.pages} صفحه</span>
        )}
        {next.tests > 0 && (
          <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">{next.tests} تست</span>
        )}
        {next.review_minutes > 0 && (
          <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">{next.review_minutes}′ مرور</span>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <Link to="/timer" className="flex-1">
          <Button className="w-full h-10 bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold shadow-[0_8px_24px_-8px_hsl(265_100%_60%/0.6)]">
            <Play className="w-4 h-4 ml-1" /> شروع تایمر
          </Button>
        </Link>
        <Button
          variant="outline"
          className="h-10 border-white/15 bg-white/5 hover:bg-white/10"
          onClick={() => update.mutate({ blockId: next.id, status: "done", doneMinutes: next.study_minutes })}
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          className="h-10 w-10 p-0 text-muted-foreground"
          onClick={() => update.mutate({ blockId: next.id, status: "skipped" })}
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}