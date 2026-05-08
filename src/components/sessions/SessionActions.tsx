import { useState } from "react";
import { MoreVertical, Pencil, Trash2, RotateCcw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useDeleteSession, useRestoreSession } from "@/hooks/useStudySessions";
import { useToast } from "@/hooks/use-toast";
import { SessionEditDialog } from "./SessionEditDialog";

interface Props {
  session: any;
  variant?: "icon" | "compact";
}

export function SessionActions({ session, variant = "icon" }: Props) {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const del = useDeleteSession();
  const restore = useRestoreSession();
  const { toast } = useToast();

  if (session?.__queued) return null;
  const isDeleted = !!session?.deleted_at;

  const handleDelete = async () => {
    try {
      await del.mutateAsync({ id: session.id, before: session });
      toast({ title: "🗑️ جلسه حذف شد", description: "می‌توانی از سطل بازیافت بازگردانی کنی." });
    } catch (e: any) {
      toast({ title: "خطا در حذف", description: e.message, variant: "destructive" });
    }
  };

  const handleRestore = async () => {
    try {
      await restore.mutateAsync(session.id);
      toast({ title: "♻️ جلسه بازگردانی شد" });
    } catch (e: any) {
      toast({ title: "خطا در بازیابی", description: e.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1 rounded-xl" align="end">
          {!isDeleted ? (
            <>
              <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-xs" onClick={() => { setOpen(false); setEditOpen(true); }}>
                <Pencil className="w-3.5 h-3.5" /> ویرایش
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-xs text-destructive" onClick={() => { setOpen(false); setConfirmDel(true); }}>
                <Trash2 className="w-3.5 h-3.5" /> حذف
              </Button>
            </>
          ) : (
            <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-xs text-emerald" onClick={() => { setOpen(false); handleRestore(); }}>
              <RotateCcw className="w-3.5 h-3.5" /> بازگردانی
            </Button>
          )}
        </PopoverContent>
      </Popover>

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
