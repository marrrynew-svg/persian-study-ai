import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { AlertTriangle, TrendingUp, Brain, Target } from "lucide-react";
import type { Exam, ExamTopic } from "@/hooks/useExams";
import type { RoadmapBlock } from "@/hooks/useRoadmap";
import type { LearningProfile } from "@/hooks/useLearningProfile";

function buildInsights(exams: Exam[], topics: ExamTopic[], blocks: RoadmapBlock[], sessions: any[], p: LearningProfile | null) {
  const out: { icon: any; tone: string; text: string }[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  for (const e of exams) {
    const dl = Math.ceil((+new Date(e.exam_date) - +today) / 86400000);
    if (dl <= 0) continue;
    const examTopics = topics.filter((t) => t.exam_id === e.id);
    const total = examTopics.reduce((a, t) => a + t.estimated_minutes, 0);
    const done = examTopics.reduce((a, t) => a + t.completed_minutes, 0);
    const remaining = Math.max(0, total - done);
    const planned = blocks.filter((b) => b.exam_id === e.id && b.date <= e.exam_date && b.status !== "skipped")
      .reduce((a, b) => a + b.duration_minutes, 0);

    if (remaining > 0 && planned < remaining) {
      out.push({
        icon: AlertTriangle, tone: "amber",
        text: `«${e.title}» ${Math.round((remaining - planned) / 60)} ساعت کسری داره — افزایش ساعت روزانه پیشنهاد میشه.`,
      });
    } else if (remaining > 0 && total > 0 && done / total < 0.4 && dl < 14) {
      out.push({
        icon: TrendingUp, tone: "destructive",
        text: `«${e.title}»: ${Math.round((done / total) * 100)}٪ پیشرفت با ${dl} روز مونده — وضعیت فشرده.`,
      });
    } else if (remaining === 0 && total > 0) {
      out.push({
        icon: Target, tone: "emerald",
        text: `«${e.title}» کاملاً پوشش داده شده ✨`,
      });
    }
  }

  if (p && sessions.length) {
    const avgLen = sessions.reduce((a: number, s: any) => a + (s.duration_minutes || 0), 0) / sessions.length;
    if (avgLen > p.focus_minutes * 1.4) {
      out.push({
        icon: Brain, tone: "blue",
        text: `میانگین جلسه‌هات ${Math.round(avgLen)} دقیقه‌ست؛ پنجره تمرکز خودت ${p.focus_minutes} دقیقه — وقت استراحت‌های کوتاه‌تره.`,
      });
    }
  }

  if (!out.length) {
    out.push({ icon: Target, tone: "muted", text: "هنوز داده کافی نیست. چند روز با تایمر و آزمون‌ها کار کن." });
  }
  return out.slice(0, 5);
}

export function SmartInsightsPanel({ exams, topics, blocks, sessions, profile }: {
  exams: Exam[]; topics: ExamTopic[]; blocks: RoadmapBlock[]; sessions: any[]; profile: LearningProfile | null;
}) {
  const insights = useMemo(() => buildInsights(exams, topics, blocks, sessions, profile), [exams, topics, blocks, sessions, profile]);

  return (
    <Card className="glass rounded-2xl p-4">
      <h3 className="text-sm font-semibold mb-3">🧠 بینش‌های هوشمند</h3>
      <div className="space-y-2">
        {insights.map((i, idx) => {
          const Icon = i.icon;
          const bg = i.tone === "destructive" ? "bg-destructive/10" :
                     i.tone === "amber" ? "bg-amber-500/10" :
                     i.tone === "emerald" ? "bg-emerald-500/10" :
                     i.tone === "blue" ? "bg-blue-500/10" : "bg-muted/30";
          return (
            <div key={idx} className={`flex items-start gap-2 p-2.5 rounded-xl ${bg}`}>
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="text-xs leading-relaxed">{i.text}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}