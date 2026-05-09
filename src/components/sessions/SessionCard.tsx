import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Copy, StickyNote, Clock, RotateCcw } from "lucide-react";
import { formatStudyDuration, getSessionSeconds } from "@/lib/studySession";
import { useDeleteSession, useRestoreSession, useDuplicateSession } from "@/hooks/useStudySessions";
import { useUpsertNote } from "@/hooks/useNotes";
import { useToast } from "@/hooks/use-toast";
import { SessionEditDialog } from "./SessionEditDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Props {
  session: any;
  index?: number;
  showDate?: boolean;
}

const fmtTime = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

export function SessionCard({ session, index = 0, showDate = false }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const del = useDeleteSession();
  const restore = useRestoreSession();
  const dup = useDuplicateSession();
  const upsertNote = useUpsertNote();
  const { toast } = useToast();

  if (session?.__queued) {
    return (
      <Card className="glass rounded-2xl p-3 opacity-60">
        <p className="text-xs text-muted-foreground">⏳ در حال همگام‌سازی…</p>
      </Card>
    );
  }

  const subject = session.subjects;
  const color = subject?.color || "hsl(var(--accent))";
  const seconds = getSessionSeconds(session);
  const isDeleted = !!session.deleted_at;

  const handleDuplicate = async () => {
    try {
      await dup.mutateAsync(session);
      toast({ title: "📋 جلسه کپی شد" });
    } catch (e: any) {
      toast({ title: "خطا", description: e.message, variant: "destructive" });
    }
  };

  const handleAddNote = async () => {
    try {
      await upsertNote.mutateAsync({
        title: `یادداشت ${subject?.name || "جلسه"}`,
        content: `از جلسه ${formatStudyDuration(seconds)} در ${fmtTime(session.started_at)}\n\n`,
        session_id: session.id,
        subject_id: session.subject_id,
        tags: ["جلسه"],
      });
      toast({ title: "📝 یادداشت ساخته شد", description: "از صفحه یادداشت‌ها ادامه بده" });
    } catch (e: any) {
      toast({ title: "خطا", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await del.mutateAsync({ id: session.id, before: session });
      toast({ title: "🗑️ حذف شد", description: "از سطل بازیافت قابل بازگردانی است" });
    } catch (e: any) {
      toast({ title: "خطا", description: e.message, variant: "destructive" });
    }
  };

  const handleRestore = async () => {
    try {
      await restore.mutateAsync(session.id);
      toast({ title: "♻️ بازگردانی شد" });
    } catch (e: any) {
      toast({ title: "خطا", description: e.message, variant: "destructive" });
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ delay: index * 0.04 }}
      >
        <Card className={`glass rounded-2xl p-3 ${isDeleted ? "opacity-60" : ""}`}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
              style={{ backgroundColor: `${color}22`, color }}
            >
              {subject?.icon || "📘"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{subject?.name || "بدون درس"}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5" dir="ltr">
                <Clock className="w-3 h-3" />
                <span>{fmtTime(session.started_at)}</span>
                {showDate && session.started_at && <span>· {new Date(session.started_at).toLocaleDateString("fa-IR")}</span>}
                <span>·</span>
                <span>{session.mode === "pomodoro" ? "🍅" : session.source === "manual" ? "✍️" : "⏱"}</span>
                {session.edited_at && <span title="ویرایش‌شده">· ✏️</span>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold tabular-nums">{formatStudyDuration(seconds)}</p>
            </div>
          </div>

          {/* Visible action row */}
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/40">
            {isDeleted ? (
              <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs gap-1 text-emerald" onClick={handleRestore}>
                <RotateCcw className="w-3.5 h-3.5" /> بازگردانی
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs gap-1 flex-1" onClick={() => setEditOpen(true)}>
                  <Pencil className="w-3.5 h-3.5" /> ویرایش
                </Button>
                <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs gap-1 flex-1" onClick={handleDuplicate}>
                  <Copy className="w-3.5 h-3.5" /> کپی
                </Button>
                <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs gap-1 flex-1" onClick={handleAddNote}>
                  <StickyNote className="w-3.5 h-3.5" /> یادداشت
                </Button>
                <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs gap-1 text-destructive" onClick={() => setConfirmDel(true)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </Card>
      </motion.div>

      <SessionEditDialog session={session} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent className="rounded-2xl max-w-[340px]">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف جلسه؟</AlertDialogTitle>
            <AlertDialogDescription>
              این جلسه از داشبورد و آمار حذف می‌شود. می‌توانی بعداً از سطل بازیافت بازگردانی کنی.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>لغو</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}