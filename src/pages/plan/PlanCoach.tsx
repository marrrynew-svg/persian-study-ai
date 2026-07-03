import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Send } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDailyV3, useMonthlyV3 } from "@/hooks/usePlanV3";
import { toast } from "sonner";

const SUGGESTIONS = [
  "چرا امروز این بلوک‌ها رو انتخاب کردی؟",
  "کدوم درسم عقبه؟ چطور جبران کنم؟",
  "برنامه هفته بعد رو چطور بهتر کنم؟",
  "برای آمادگی نهایی چقدر شانس دارم؟",
];

export default function PlanCoach() {
  const { data: today } = useDailyV3();
  const { data: monthly } = useMonthlyV3();
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(question: string) {
    if (!question.trim()) return;
    setLoading(true); setA("");
    try {
      const ctx = {
        today: today?.day,
        blocks: today?.blocks,
        monthly_summary: monthly ? {
          predicted_readiness: monthly.predicted_readiness_percent,
          phases: monthly.phases,
          rationale: monthly.rationale,
        } : null,
      };
      const { data, error } = await supabase.functions.invoke("study-advisor", {
        body: { message: `[کوچ برنامه] ${question}\n\nContext: ${JSON.stringify(ctx).slice(0, 3000)}` },
      });
      if (error) throw error;
      setA((data as any)?.reply || (data as any)?.message || "پاسخی نیامد.");
    } catch (e: any) {
      toast.error(e?.message || "خطا");
    } finally { setLoading(false); }
  }

  return (
    <AppLayout>
      <div className="px-4 pt-5 pb-8 max-w-lg mx-auto space-y-4">
        <header>
          <h1 className="text-xl font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> مشاور AI برنامه</h1>
          <p className="text-xs text-muted-foreground">درباره منطق برنامه‌ات از هوش مصنوعی بپرس</p>
        </header>

        <Card className="p-3 rounded-2xl space-y-2">
          <div className="text-xs font-bold">پرسش‌های پیشنهادی</div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => { setQ(s); ask(s); }}
                className="text-[11px] px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition">
                {s}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-3 rounded-2xl">
          <textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="سوالت رو بنویس..."
            className="w-full bg-transparent text-sm outline-none resize-none min-h-[80px]"
          />
          <Button className="w-full gradient-primary text-primary-foreground" disabled={loading} onClick={() => ask(q)}>
            <Send className="w-4 h-4 ml-1" /> {loading ? "در حال فکر کردن..." : "بپرس"}
          </Button>
        </Card>

        {a && (
          <Card className="p-4 rounded-2xl bg-primary/5 border-primary/20 text-sm leading-relaxed whitespace-pre-wrap">
            {a}
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
