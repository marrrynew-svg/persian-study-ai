import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Calendar, Sparkles } from "lucide-react";
import { useExams, useExamTopics, useDeleteExam } from "@/hooks/useExams";
import { ExamWizard } from "@/components/roadmap/ExamWizard";
import { LearningProfileDialog } from "@/components/roadmap/LearningProfileDialog";
import { toast } from "sonner";

export default function Exams() {
  const { data: exams = [] } = useExams();
  const { data: topics = [] } = useExamTopics();
  const deleteExam = useDeleteExam();
  const [open, setOpen] = useState(false);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-4">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold">📚 آزمون‌های من</h1>
          <p className="text-xs text-muted-foreground">تمام آزمون‌های پیش‌رو و سرفصل‌هاشون</p>
        </motion.div>

        <div className="flex gap-2">
          <Button onClick={() => setOpen(true)} className="flex-1 gap-1.5 gradient-primary text-primary-foreground rounded-xl">
            <Plus className="w-4 h-4" /> آزمون جدید
          </Button>
          <LearningProfileDialog />
        </div>

        {exams.length === 0 ? (
          <Card className="glass rounded-2xl p-8 text-center">
            <Sparkles className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold mb-1">هنوز آزمونی اضافه نکردی</p>
            <p className="text-xs text-muted-foreground mb-4">یه آزمون اضافه کن تا برات نقشه راه هوشمند بسازم</p>
            <Button onClick={() => setOpen(true)} className="gradient-primary text-primary-foreground rounded-xl gap-1.5">
              <Plus className="w-4 h-4" /> شروع کن
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {exams.map((e, idx) => {
              const dl = Math.max(0, Math.ceil((+new Date(e.exam_date) - +today) / 86400000));
              const examTopics = topics.filter((t) => t.exam_id === e.id);
              const total = examTopics.reduce((a, t) => a + t.estimated_minutes, 0);
              const done = examTopics.reduce((a, t) => a + t.completed_minutes, 0);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const urgent = dl <= 7;

              return (
                <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                  <Card className={`rounded-2xl p-4 ${urgent ? "bg-destructive/10 border-destructive/30" : "glass"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{e.title}</h3>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted">
                            {e.exam_type === "test" ? "تستی" : e.exam_type === "descriptive" ? "تشریحی" : "ترکیبی"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{e.exam_date}</span>
                          <span>·</span>
                          <span className={urgent ? "text-destructive font-semibold" : ""}>{dl} روز مونده</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {examTopics.length} سرفصل · {Math.round(total / 60)} ساعت کل · {pct}٪ تکمیل
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => {
                        if (confirm("حذف این آزمون و سرفصل‌هاش؟")) {
                          deleteExam.mutate(e.id);
                          toast.success("حذف شد");
                        }
                      }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full gradient-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <ExamWizard open={open} onOpenChange={setOpen} />
      </div>
    </AppLayout>
  );
}