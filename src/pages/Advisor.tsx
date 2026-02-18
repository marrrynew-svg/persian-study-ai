import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useSubjects } from "@/hooks/useSubjects";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useAwardBadge, BADGE_DEFINITIONS } from "@/hooks/useGamification";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, Loader2, AlertTriangle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Advisor() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: subjects = [] } = useSubjects();
  const { data: sessions = [] } = useStudySessions(30);
  const awardBadge = useAwardBadge();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [mode, setMode] = useState<"daily" | "emergency" | "insight">("daily");

  const getAdvice = async () => {
    if (!user) return;
    setLoading(true);
    setResponse("");

    const subjectInfo = subjects.map((s: any) => `${s.name} (سطح: ${s.strength_level}/100, اهمیت: ${s.importance_weight}/10)`).join("\n");
    const recentSessions = sessions.slice(0, 20).map((s: any) => `${s.subjects?.name || "نامشخص"}: ${s.duration_minutes} دقیقه`).join("\n");

    const examDate = profile?.exam_date;
    const daysLeft = examDate ? Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000)) : "نامشخص";

    let prompt = "";
    if (mode === "daily") {
      prompt = `تو یک مشاور تحصیلی حرفه‌ای هستی. برای دانش‌آموز رشته ${profile?.field_of_study || "نامشخص"} با ${profile?.daily_hours || 4} ساعت مطالعه روزانه و ${daysLeft} روز تا آزمون، یک برنامه مطالعاتی روزانه بهینه بساز.\n\nدروس:\n${subjectInfo}\n\nجلسات اخیر:\n${recentSessions}\n\nلطفاً برنامه را ساعت به ساعت و به فارسی بنویس. دروس ضعیف‌تر اولویت بیشتری داشته باشند.`;
    } else if (mode === "emergency") {
      prompt = `آزمون فرداست! دانش‌آموز رشته ${profile?.field_of_study || "نامشخص"} با دروس زیر نیاز به برنامه فوری دارد:\n\n${subjectInfo}\n\nیک برنامه فشرده و مؤثر برای امشب و فردا صبح بنویس. فقط مهم‌ترین نکات و دروس ضعیف را اولویت بده. به فارسی بنویس.`;
    } else {
      prompt = `تحلیل عملکرد هفتگی برای دانش‌آموز رشته ${profile?.field_of_study || "نامشخص"}:\n\nجلسات مطالعه:\n${recentSessions}\n\nدروس:\n${subjectInfo}\n\nلطفاً یک تحلیل کوتاه و مفید به فارسی بنویس: چه چیزی خوب بود، چه چیزی باید بهتر شود، و توصیه‌های عملی.`;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-advisor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt, mode }),
      });

      if (res.status === 429) {
        toast({ title: "تعداد درخواست‌ها زیاد است. لطفاً کمی صبر کنید.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (res.status === 402) {
        toast({ title: "اعتبار AI تمام شده. لطفاً شارژ کنید.", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (!res.ok || !res.body) throw new Error("Failed");

      // Award badge on first use
      await awardBadge.mutateAsync(BADGE_DEFINITIONS.find(b => b.badge_type === "ai_advisor")!);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              setResponse(fullResponse);
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "خطا در دریافت پاسخ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl gradient-accent flex items-center justify-center shadow-lg">
            <Brain className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">مشاور هوشمند</h1>
            <p className="text-xs text-muted-foreground">powered by Gemini AI 🤖</p>
          </div>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "daily", icon: "📅", label: "برنامه روزانه", desc: "بهینه‌سازی مطالعه" },
            { id: "emergency", icon: "⚡", label: "فوری!", desc: "آزمون فرداست" },
            { id: "insight", icon: "📊", label: "تحلیل", desc: "عملکرد هفتگی" },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as any)}
              className={`p-3 rounded-2xl text-center transition-all border ${mode === m.id ? "border-primary bg-primary/10" : "border-border glass"}`}
            >
              <div className="text-2xl mb-1">{m.icon}</div>
              <p className="text-[11px] font-semibold">{m.label}</p>
              <p className="text-[10px] text-muted-foreground">{m.desc}</p>
            </button>
          ))}
        </div>

        {/* Generate button */}
        <Button onClick={getAdvice} disabled={loading} className="w-full h-13 rounded-2xl gradient-primary text-primary-foreground shadow-lg shadow-primary/20">
          {loading ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Sparkles className="w-5 h-5 ml-2" />}
          {loading ? "در حال تحلیل با AI..." : mode === "daily" ? "🗓 ساخت برنامه روزانه" : mode === "emergency" ? "🚨 برنامه اضطراری!" : "📊 تحلیل عملکرد"}
        </Button>

        {/* Response streaming */}
        {response && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
                <Brain className="w-4 h-4 text-accent" />
                <span className="text-xs font-semibold text-accent">پاسخ مشاور AI</span>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {response}
                {loading && <span className="inline-block w-1.5 h-4 bg-accent animate-pulse ml-1 rounded-sm" />}
              </div>
            </Card>
          </motion.div>
        )}

        {!response && !loading && (
          <Card className="glass rounded-2xl p-8 text-center">
            <div className="text-5xl mb-3">🤖</div>
            <p className="font-semibold mb-1">
              {mode === "daily" ? "برنامه روزانه هوشمند" : mode === "emergency" ? "حالت اضطراری!" : "تحلیل عملکرد"}
            </p>
            <p className="text-sm text-muted-foreground">
              {subjects.length === 0
                ? "ابتدا دروس خود را در بخش مدیریت دروس اضافه کنید"
                : mode === "emergency"
                  ? "AI یک برنامه فشرده برای آزمون فردا می‌سازد"
                  : "AI با تحلیل دروس و جلسات شما برنامه شخصی می‌سازد"}
            </p>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

