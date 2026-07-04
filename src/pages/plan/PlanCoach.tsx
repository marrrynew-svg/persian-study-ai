import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Send, StopCircle, Brain, TrendingUp, AlertTriangle,
  RefreshCw, User, Bot, Trash2, Flame, Target, Calendar, ClipboardList,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDailyV3, useMonthlyV3, useWeeklyV3, useBuildPlanV3 } from "@/hooks/usePlanV3";
import { useAIConversations } from "@/hooks/useAdvisor";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Msg = { role: "user" | "assistant"; content: string; streaming?: boolean };

const QUICK_ACTIONS: { icon: any; label: string; prompt: string; color: string }[] = [
  { icon: Brain,       label: "تحلیل کامل برنامه",    color: "text-indigo-500",
    prompt: "به عنوان یه مشاور تحصیلی حرفه‌ای، برنامه فعلی من رو ۳۶۰ درجه تحلیل کن: نقاط قوت، ضعف، ریسک‌ها، پیش‌بینی آمادگی نهایی، و ۳ اقدام فوری که باید انجام بدم." },
  { icon: Target,      label: "درس ضعیف من چیه؟",     color: "text-rose-500",
    prompt: "با نگاه به سشن‌های اخیر و پوشش دروس، کدوم درس‌هام عقبن؟ برای هر کدوم یه استراتژی جبران دقیق (تعداد ساعت، بلوک، تست) بده." },
  { icon: Calendar,    label: "بازطراحی هفته",         color: "text-emerald-500",
    prompt: "با توجه به عملکرد هفته گذشته، برنامه هفته بعد رو چطور باید تنظیم کنم؟ توزیع دقیق ساعت به تفکیک درس بده و بگو چرا." },
  { icon: TrendingUp,  label: "پیش‌بینی آمادگی",        color: "text-sky-500",
    prompt: "با روند فعلی مطالعه‌م، درصد آمادگی من در روز آزمون چقدر میشه؟ فرضیاتت رو بگو و بگو با چه تغییری میتونم این عدد رو بالاتر ببرم." },
  { icon: AlertTriangle,label: "ریسک فرسودگی",         color: "text-amber-500",
    prompt: "ریسک فرسودگی ذهنی من الان چقدره؟ نشونه‌ها رو از داده‌هام بگو و پیشنهاد بازیابی بده." },
  { icon: ClipboardList,label: "استراتژی تست‌زنی",      color: "text-purple-500",
    prompt: "برای هر درس، بگو باید هفته‌ای چند تست بزنم، از چه سطحی شروع کنم، و چطور خطاهام رو تحلیل کنم." },
  { icon: Flame,       label: "پلن ۲۴ ساعت آینده",     color: "text-orange-500",
    prompt: "دقیقاً ۲۴ ساعت آینده‌م رو ساعت‌بندی کن: کی بخوابم، کی مطالعه کنم، چه بلوک‌هایی، چه استراحت‌هایی، با توجه به سبک و انرژی من." },
];

export default function PlanCoach() {
  const qc = useQueryClient();
  const { data: today } = useDailyV3();
  const { data: weekly } = useWeeklyV3();
  const { data: monthly } = useMonthlyV3();
  const { data: history } = useAIConversations(50);
  const rebuild = useBuildPlanV3();

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages: Msg[] = useMemo(() => {
    const base: Msg[] = (history || [])
      .filter((c: any) => c.role === "user" || c.role === "assistant")
      .map((c: any) => ({ role: c.role, content: c.content }));
    if (loading || streaming) base.push({ role: "assistant", content: streaming, streaming: true });
    return base;
  }, [history, streaming, loading]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, streaming]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const readiness = monthly?.predicted_readiness_percent ?? null;
  const daysLeft = useMemo(() => {
    if (!monthly?.month_end) return null;
    return Math.max(0, Math.ceil((new Date(monthly.month_end).getTime() - Date.now()) / 86400000));
  }, [monthly]);
  const todayMin = today?.day?.total_planned_minutes ?? 0;
  const todayDone = today?.day?.total_done_minutes ?? 0;

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput("");
    setLoading(true);
    setStreaming("");

    // Optimistically append user message to cache
    qc.setQueryData(["ai_conversations", (await supabase.auth.getUser()).data.user?.id], (old: any) => {
      const arr = Array.isArray(old) ? old : [];
      return [...arr, { role: "user", content: msg, created_at: new Date().toISOString() }];
    });

    // Compact plan context to enrich the prompt
    const ctx = {
      today: today?.day ? {
        date: today.day.date, phase: today.day.phase, heat: today.day.heat_score,
        planned_min: today.day.total_planned_minutes, done_min: today.day.total_done_minutes,
        blocks: (today.blocks || []).map((b: any) => ({
          subject: b.subject_name, type: b.block_type, min: b.study_minutes,
          status: b.status, time: b.suggested_start_time,
        })),
      } : null,
      weekly: (weekly?.weeks || []).slice(0, 2).map((w: any) => ({
        week: w.week_index, goal: w.weekly_goal, target_min: w.target_minutes, coverage: w.coverage,
      })),
      monthly: monthly ? {
        readiness: monthly.predicted_readiness_percent,
        phases: monthly.phases, milestones: monthly.weekly_milestones,
      } : null,
    };

    const enrichedMessage = `[کوچ برنامه Planino v3] ${msg}\n\n--- context ---\n${JSON.stringify(ctx).slice(0, 3500)}`;

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("لطفاً وارد شو");

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-advisor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ message: enrichedMessage, mode: "plan_coach" }),
          signal: ctrl.signal,
        },
      );

      if (!res.ok || !res.body) {
        if (res.status === 429) toast.error("درخواست‌ها زیاد شد — کمی بعد امتحان کن");
        else if (res.status === 402) toast.error("اعتبار AI تموم شد");
        else toast.error("خطا در ارتباط با مشاور");
        throw new Error("bad_response");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl); buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) { full += delta; setStreaming(full); }
          } catch { /* partial */ }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error(e);
    } finally {
      abortRef.current = null;
      setLoading(false);
      setStreaming("");
      // Refresh persisted conversation
      qc.invalidateQueries({ queryKey: ["ai_conversations"] });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function stop() {
    abortRef.current?.abort();
    setLoading(false);
  }

  async function clearChat() {
    if (!confirm("تاریخچه گفتگو پاک بشه؟")) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await (supabase as any).from("ai_conversations").delete().eq("user_id", u.user.id);
    qc.invalidateQueries({ queryKey: ["ai_conversations"] });
    toast.success("پاک شد");
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100dvh-64px)] max-w-2xl mx-auto">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border/40 backdrop-blur-md bg-background/70 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold truncate">مشاور تحصیلی حرفه‌ای</h1>
                <p className="text-[10px] text-muted-foreground truncate">
                  {loading ? "در حال تحلیل داده‌های تو..." : "با دسترسی کامل به برنامه، سشن‌ها و پروفایل تو"}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => rebuild.mutate({})}
                title="بازسازی برنامه" disabled={rebuild.isPending}>
                <RefreshCw className={`w-4 h-4 ${rebuild.isPending ? "animate-spin" : ""}`} />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={clearChat} title="پاک کردن گفتگو">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Live KPI strip */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            <MiniStat label="آمادگی" value={readiness !== null ? `${Math.round(readiness)}٪` : "—"} tone="primary" />
            <MiniStat label="روز تا آزمون" value={daysLeft !== null ? `${daysLeft}` : "—"} tone="warning" />
            <MiniStat label="امروز پلن" value={`${todayMin}د`} tone="muted" />
            <MiniStat label="امروز انجام" value={`${todayDone}د`} tone={todayDone >= todayMin && todayMin > 0 ? "success" : "muted"} />
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
          {messages.length === 0 && !loading && (
            <div className="space-y-3 pt-2">
              <Card className="p-4 rounded-2xl bg-primary/5 border-primary/20">
                <div className="flex items-start gap-2">
                  <Bot className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm leading-relaxed space-y-2">
                    <p className="font-bold">سلام 👋 من مشاور تحصیلی شخصی توام.</p>
                    <p className="text-muted-foreground text-xs">
                      به همه داده‌هات دسترسی دارم: برنامه روزانه/هفتگی/ماهانه، سشن‌های مطالعه، سبک یادگیری، آزمون‌ها و پیشرفت. یه اقدام سریع بزن یا مستقیم سوالتو بپرس.
                    </p>
                  </div>
                </div>
              </Card>

              <div>
                <div className="text-[11px] font-bold text-muted-foreground mb-2 px-1">اقدام‌های حرفه‌ای</div>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((a) => (
                    <button key={a.label} onClick={() => send(a.prompt)}
                      className="text-right p-3 rounded-2xl bg-card/60 border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition group">
                      <a.icon className={`w-4 h-4 ${a.color} mb-1.5`} />
                      <div className="text-xs font-bold">{a.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <MessageBubble key={i} msg={m} />
          ))}
        </div>

        {/* Composer */}
        <div className="border-t border-border/40 bg-background/80 backdrop-blur-md p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
              }}
              placeholder="از مشاور بپرس... (Shift+Enter برای خط جدید)"
              className="flex-1 bg-muted/40 border border-border/40 rounded-2xl px-4 py-2.5 text-sm outline-none resize-none min-h-[44px] max-h-32 focus:border-primary/50"
              rows={1}
              disabled={loading}
            />
            {loading ? (
              <Button size="icon" variant="destructive" className="rounded-2xl h-11 w-11 shrink-0" onClick={stop}>
                <StopCircle className="w-5 h-5" />
              </Button>
            ) : (
              <Button size="icon" className="rounded-2xl h-11 w-11 shrink-0 gradient-primary text-primary-foreground"
                onClick={() => send(input)} disabled={!input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "primary" | "success" | "warning" | "muted" }) {
  const toneCls =
    tone === "primary" ? "bg-primary/10 text-primary border-primary/20" :
    tone === "success" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
    tone === "warning" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                         "bg-muted/40 text-foreground/80 border-border/40";
  return (
    <div className={`rounded-xl border px-2 py-1.5 text-center ${toneCls}`}>
      <div className="text-sm font-bold tabular-nums">{value}</div>
      <div className="text-[9px] opacity-70 mt-0.5">{label}</div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? "bg-primary/15 text-primary" : "gradient-primary text-primary-foreground"
      }`}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
      </div>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-card/70 border border-border/40 rounded-tl-sm"
      }`}>
        {msg.streaming && !msg.content ? (
          <div className="flex gap-1 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        ) : isUser ? (
          <div className="whitespace-pre-wrap">{msg.content}</div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:mt-2 prose-headings:mb-1 prose-ul:my-1 prose-li:my-0 prose-strong:text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            {msg.streaming && <span className="inline-block w-1.5 h-3 bg-primary/60 animate-pulse ml-0.5 align-middle" />}
          </div>
        )}
      </div>
    </div>
  );
}