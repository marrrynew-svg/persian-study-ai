import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useSubjects } from "@/hooks/useSubjects";
import { useStudySessions } from "@/hooks/useStudySessions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Advisor() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: subjects = [] } = useSubjects();
  const { data: sessions = [] } = useStudySessions(30);
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
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
            <Brain className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">مشاور هوشمند</h1>
            <p className="text-xs text-muted-foreground">مبتنی بر هوش مصنوعی</p>
          </div>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2">
          <Button
            variant={mode === "daily" ? "default" : "ghost"}
            onClick={() => setMode("daily")}
            className="flex-1 rounded-xl text-xs"
            size="sm"
          >
            برنامه روزانه
          </Button>
          <Button
            variant={mode === "emergency" ? "default" : "ghost"}
            onClick={() => setMode("emergency")}
            className="flex-1 rounded-xl text-xs"
            size="sm"
          >
            <AlertTriangle className="w-3 h-3 ml-1" />
            فوری
          </Button>
          <Button
            variant={mode === "insight" ? "default" : "ghost"}
            onClick={() => setMode("insight")}
            className="flex-1 rounded-xl text-xs"
            size="sm"
          >
            تحلیل عملکرد
          </Button>
        </div>

        {/* Generate button */}
        <Button
          onClick={getAdvice}
          disabled={loading}
          className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin ml-2" />
          ) : (
            <Sparkles className="w-5 h-5 ml-2" />
          )}
          {loading ? "در حال تحلیل..." : mode === "daily" ? "ساخت برنامه روزانه" : mode === "emergency" ? "برنامه فوری!" : "تحلیل عملکرد"}
        </Button>

        {/* Response */}
        {response && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass rounded-2xl p-4">
              <div className="prose prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap text-sm">
                {response}
              </div>
            </Card>
          </motion.div>
        )}

        {!response && !loading && (
          <Card className="glass rounded-2xl p-6 text-center">
            <Sparkles className="w-10 h-10 mx-auto text-accent mb-3" />
            <p className="text-sm text-muted-foreground">
              {subjects.length === 0
                ? "ابتدا دروس خود را در بخش مدیریت دروس اضافه کنید"
                : "یکی از حالت‌ها را انتخاب کنید و دکمه را بزنید"}
            </p>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
