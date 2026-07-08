import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";

const SUGGESTIONS = [
  "برنامه امروزم رو تحلیل کن",
  "نقاط ضعفم چیه؟",
  "چطور به هدفم برسم؟",
  "برنامه فردا رو سبک‌تر کن",
];

export function QuickAskBar() {
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    nav(`/advisor?q=${encodeURIComponent(t)}`);
  };
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center shadow-lg">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <div className="text-sm font-bold">از مشاور بپرس</div>
          <div className="text-[10px] text-muted-foreground">پاسخ آنی بر اساس داده‌های واقعی تو</div>
        </div>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); send(q); }}
        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] focus-within:border-primary/60 focus-within:shadow-[0_0_0_3px_hsl(265_100%_65%/0.15)] transition p-1.5 pr-3"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="مثلاً: چرا امروز فیزیک زیاد داره؟"
          className="flex-1 bg-transparent outline-none text-sm py-1.5"
        />
        <button
          type="submit"
          disabled={!q.trim()}
          className="w-8 h-8 rounded-xl bg-gradient-to-l from-primary to-accent grid place-items-center disabled:opacity-40"
        >
          <ArrowLeft className="w-4 h-4 text-primary-foreground" />
        </button>
      </form>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="text-[10px] px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] transition"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}