import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useSubjects } from "@/hooks/useSubjects";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useUserXP } from "@/hooks/useGamification";
import { useAwardBadge, BADGE_DEFINITIONS } from "@/hooks/useGamification";
import { useAIConversations, useAIMemory } from "@/hooks/useAdvisor";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain, Sparkles, Loader2, Send, ChevronDown, Activity,
  Flame, Target, TrendingUp, AlertTriangle, Zap, Shield,
  Calendar, Clock, BookOpen, Users, BarChart2, MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MODES = [
  { id: "chat", icon: <MessageSquare className="w-4 h-4" />, label: "چت آزاد", emoji: "💬", desc: "هر سوالی داری بپرس" },
  { id: "daily", icon: <Calendar className="w-4 h-4" />, label: "برنامه امروز", emoji: "📅", desc: "بگم امروز چی بخونی" },
  { id: "insight", icon: <BarChart2 className="w-4 h-4" />, label: "کارنامه من", emoji: "📊", desc: "ببین چقد پیشرفت کردی" },
  { id: "strategy", icon: <Target className="w-4 h-4" />, label: "نقشه راه کنکور", emoji: "🎯", desc: "برنامه کلی تا کنکور" },
  { id: "weekly", icon: <TrendingUp className="w-4 h-4" />, label: "خلاصه هفته", emoji: "📈", desc: "این هفته چطور بود؟" },
  { id: "emergency", icon: <AlertTriangle className="w-4 h-4" />, label: "آزمون فرداست!", emoji: "🚨", desc: "برنامه فوری بده" },
];

const DEFAULT_MESSAGES: Record<string, string> = {
  chat: "سلام! یه راهنمایی میخوام.",
  daily: "امروز چی بخونم؟ یه برنامه خوب بریز برام.",
  insight: "عملکردم چطوره؟ کجاها ضعیفم کجاها خوبم؟",
  strategy: "از الان تا کنکور چیکار کنم؟ یه نقشه راه بده.",
  weekly: "این هفته چطور بود؟ هفته بعد چیکار کنم؟",
  emergency: "آزمونم نزدیکه! سریع بگو چیکار کنم.",
};

type Msg = { id: string; role: "user" | "assistant"; content: string; mode?: string };

function BurnoutMeter({ risk }: { risk: number }) {
  const pct = Math.round(risk * 100);
  const color = risk > 0.65 ? "text-destructive" : risk > 0.4 ? "text-yellow-500" : "text-emerald-500";
  const label = risk > 0.65 ? "خسته‌ای!" : risk > 0.4 ? "مراقب باش" : "عالی";
  return (
    <div className="flex items-center gap-2">
      <Activity className={`w-3.5 h-3.5 ${color}`} />
      <div className="flex-1">
        <div className="flex justify-between mb-0.5">
          <span className="text-[10px] text-muted-foreground">خستگی ذهنی</span>
          <span className={`text-[10px] font-bold ${color}`}>{label} {pct}٪</span>
        </div>
        <Progress value={pct} className="h-1" />
      </div>
    </div>
  );
}

function MemoryBadge({ category, value }: { category: string; value: string }) {
  const icons: Record<string, string> = {
    behavior: "🧠", burnout: "⚡", performance: "📊", personality: "🎭", emotional: "💭", goals: "🎯",
  };
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 text-[10px]">
      <span>{icons[category] || "📌"}</span>
      <span className="text-muted-foreground truncate max-w-[80px]">{value}</span>
    </div>
  );
}

function ChatBubble({ msg, isStreaming }: { msg: Msg; isStreaming?: boolean }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-xl gradient-primary flex items-center justify-center shrink-0 mt-1 shadow-sm shadow-primary/20">
          <Brain className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
      )}
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "gradient-primary text-primary-foreground rounded-tr-sm"
            : "glass border border-border/50 text-foreground rounded-tl-sm"
        }`}
        style={{ direction: "rtl" }}
      >
        <div className="whitespace-pre-wrap">{msg.content}</div>
        {isStreaming && (
          <span className="inline-block w-1.5 h-3.5 bg-current opacity-70 animate-pulse rounded-sm mr-0.5 align-middle" />
        )}
      </div>
    </motion.div>
  );
}

export default function Advisor() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: subjects = [] } = useSubjects();
  const { data: sessions = [] } = useStudySessions(30);
  const { data: xp } = useUserXP();
  const awardBadge = useAwardBadge();
  const { data: memory = [] } = useAIMemory();
  const { toast } = useToast();

  const [mode, setMode] = useState("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModes, setShowModes] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Computed behavioral metrics from memory
  const burnoutRisk = parseFloat(memory.find((m: any) => m.key === "burnout_risk_current")?.value || "0.2");
  const motivationScore = parseFloat(memory.find((m: any) => m.key === "motivation_score")?.value || "0.5");
  const consistencyScore = parseFloat(memory.find((m: any) => m.key === "consistency_score")?.value || "0.5");
  const behaviorType = memory.find((m: any) => m.key === "study_behavior_type")?.value || "balanced";

  const daysLeft = profile?.exam_date
    ? Math.max(0, Math.ceil((new Date(profile.exam_date).getTime() - Date.now()) / 86400000))
    : null;

  const selectedMode = MODES.find(m => m.id === mode)!;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || !user || loading) return;

    setInput("");
    setLoading(true);
    setShowModes(false);

    const userMsg: Msg = { id: Date.now().toString(), role: "user", content: text, mode };
    setMessages(prev => [...prev, userMsg]);

    // Placeholder streaming message
    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMsgId, role: "assistant", content: "", mode }]);

    try {
      const { data: { session } } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        toast({ title: "لطفاً دوباره وارد شوید.", variant: "destructive" });
        setMessages(prev => prev.filter(m => m.id !== aiMsgId));
        setLoading(false);
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-advisor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message: text, mode }),
      });

      if (res.status === 429) {
        toast({ title: "تعداد درخواست‌ها زیاد است. لطفاً کمی صبر کنید.", variant: "destructive" });
        setMessages(prev => prev.filter(m => m.id !== aiMsgId));
        setLoading(false);
        return;
      }
      if (res.status === 402) {
        toast({ title: "اعتبار AI تمام شده.", variant: "destructive" });
        setMessages(prev => prev.filter(m => m.id !== aiMsgId));
        setLoading(false);
        return;
      }
      if (!res.ok || !res.body) throw new Error("Failed");

      // Award badge on first use
      await awardBadge.mutateAsync(BADGE_DEFINITIONS.find(b => b.badge_type === "ai_advisor")!).catch(() => {});

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setMessages(prev =>
                prev.map(m => m.id === aiMsgId ? { ...m, content: fullText } : m)
              );
            }
          } catch { /* partial chunk */ }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "خطا در دریافت پاسخ", variant: "destructive" });
      setMessages(prev => prev.filter(m => m.id !== aiMsgId));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const longTermMemory = memory.filter((m: any) => m.memory_type === "long_term").slice(0, 6);
  const midTermMemory = memory.filter((m: any) => m.memory_type === "mid_term").slice(0, 4);

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-lg mx-auto">
        {/* ── Header ── */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-primary/25">
                  <Brain className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald rounded-full border-2 border-background" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">الیت کوچ</h1>
                <p className="text-[10px] text-muted-foreground">مشاور هوشمند درسی</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {daysLeft !== null && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${
                  daysLeft < 30 ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
                }`}>
                  <Clock className="w-3 h-3" />
                  {daysLeft} روز
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl h-8 px-2 text-xs gap-1"
                onClick={() => setShowMemory(!showMemory)}
              >
                <Shield className="w-3.5 h-3.5" />
                حافظه
              </Button>
            </div>
          </div>

          {/* Behavioral metrics strip */}
          <Card className="glass rounded-xl p-2.5 mb-2">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">میزان انگیزه</div>
                <div className="text-xs font-bold text-accent">{Math.round(motivationScore * 100)}٪</div>
              </div>
              <div className="text-center border-x border-border/40">
                <div className="text-[10px] text-muted-foreground">نظم هفتگی</div>
                <div className="text-xs font-bold text-primary">{Math.round(consistencyScore * 100)}٪</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">روزهای پشت‌سرهم</div>
                <div className="text-xs font-bold" style={{ color: "hsl(25 95% 53%)" }}>🔥{xp?.streak_days || 0}</div>
              </div>
            </div>
            <BurnoutMeter risk={burnoutRisk} />
          </Card>

          {/* Memory panel */}
          <AnimatePresence>
            {showMemory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Card className="glass rounded-xl p-3 mb-2">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">🧠 چیزایی که ازت یاد گرفتم</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {longTermMemory.length > 0 ? longTermMemory.map((m: any) => (
                      <MemoryBadge key={m.id} category={m.category} value={m.value} />
                    )) : <span className="text-[10px] text-muted-foreground">داده‌ای ندارم هنوز</span>}
                  </div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">📊 وضعیت این هفته‌ات</p>
                  <div className="flex flex-wrap gap-1.5">
                    {midTermMemory.length > 0 ? midTermMemory.map((m: any) => (
                      <MemoryBadge key={m.id} category={m.category} value={m.value} />
                    )) : <span className="text-[10px] text-muted-foreground">داده‌ای ندارم هنوز</span>}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mode selector */}
          <div className="relative">
            <button
              onClick={() => setShowModes(!showModes)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl glass border border-border/50 text-sm"
            >
              <div className="flex items-center gap-2">
                <span>{selectedMode.emoji}</span>
                <span className="font-medium">{selectedMode.label}</span>
                <span className="text-[10px] text-muted-foreground">{selectedMode.desc}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showModes ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {showModes && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl glass border border-border shadow-xl overflow-hidden"
                >
                  {MODES.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setMode(m.id); setShowModes(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-right hover:bg-muted/50 transition-colors ${mode === m.id ? "bg-primary/10" : ""}`}
                    >
                      <span className="text-lg">{m.emoji}</span>
                      <div>
                        <p className="text-sm font-medium">{m.label}</p>
                        <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Chat area ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full gap-4 text-center"
            >
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <Brain className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-base mb-1">الیت کوچ آماده‌ست</h2>
                <p className="text-xs text-muted-foreground max-w-[240px]">
                  {burnoutRisk > 0.6
                    ? "خسته‌ای؟ نگران نباش، با هم حلش می‌کنیم 💙"
                    : "سلام! من مشاور درسیتم. هر سوالی داری بپرس 😊"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {MODES.slice(0, 4).map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setMode(m.id); sendMessage(DEFAULT_MESSAGES[m.id]); }}
                    className="glass rounded-xl p-2.5 text-center border border-border/50 hover:border-primary/40 transition-colors"
                  >
                    <div className="text-xl mb-0.5">{m.emoji}</div>
                    <p className="text-[10px] font-medium">{m.label}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg, i) => (
            <ChatBubble
              key={msg.id}
              msg={msg}
              isStreaming={loading && i === messages.length - 1 && msg.role === "assistant"}
            />
          ))}
        </div>

        {/* ── Input area ── */}
        <div className="px-4 pb-4 pt-2 shrink-0">
          {burnoutRisk > 0.6 && messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-[11px] text-destructive">خسته به نظر میای — امروز کمتر فشار بیار به خودت 💙</p>
            </motion.div>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`پیام به ${selectedMode.label}...`}
              className="rounded-xl resize-none text-sm min-h-[44px] max-h-[120px] glass border-border/60"
              rows={1}
              dir="rtl"
              disabled={loading}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              size="icon"
              className="rounded-xl h-11 w-11 gradient-primary text-primary-foreground shadow-md shadow-primary/25 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            Enter برای ارسال • Shift+Enter برای خط جدید
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
