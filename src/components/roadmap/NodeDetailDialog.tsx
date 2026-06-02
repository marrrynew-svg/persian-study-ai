import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trash2, Copy, Plus, Play, Save, Lock } from "lucide-react";
import {
  useUpdateRoadmapNode, useDeleteRoadmapNode, useCreateRoadmapNode,
  type RoadmapNodeRow,
} from "@/hooks/useRoadmapNodes";

interface Props {
  node: RoadmapNodeRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects?: Array<{ id: string; name: string }>;
}

const TYPE_LABEL: Record<RoadmapNodeRow["type"], string> = {
  study: "📖 مطالعه", review: "🔁 مرور", milestone: "🎯 سرفصل",
  exam: "📝 آزمون میانی", boss: "🐲 آزمون اصلی",
};
const STATUS_LABEL: Record<RoadmapNodeRow["status"], string> = {
  locked: "🔒 قفل", available: "✨ آماده", in_progress: "▶️ در حال انجام", completed: "✅ کامل",
};

export function NodeDetailDialog({ node, open, onOpenChange, subjects = [] }: Props) {
  const navigate = useNavigate();
  const update = useUpdateRoadmapNode();
  const remove = useDeleteRoadmapNode();
  const create = useCreateRoadmapNode();

  const [form, setForm] = useState<Partial<RoadmapNodeRow>>({});

  useEffect(() => {
    if (node) setForm({
      title: node.title,
      description: node.description || "",
      estimated_minutes: node.estimated_minutes,
      due_date: node.due_date,
      subject_id: node.subject_id,
      status: node.status,
      type: node.type,
    });
  }, [node?.id]);

  if (!node) return null;

  const isLocked = node.status === "locked";

  const handleSave = async () => {
    try {
      await update.mutateAsync({ id: node.id, patch: form });
      toast.success("ذخیره شد");
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message || "خطا در ذخیره"); }
  };

  const handleDelete = async () => {
    if (!confirm("این نود حذف بشه؟ زیرنودها هم حذف میشن.")) return;
    try {
      await remove.mutateAsync(node.id);
      toast.success("حذف شد");
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message || "خطا در حذف"); }
  };

  const handleDuplicate = async () => {
    try {
      const { id, created_at, updated_at, ...rest } = node;
      await create.mutateAsync({
        ...rest,
        title: `${node.title} (کپی)`,
        position_x: node.position_x + 60,
        position_y: node.position_y + 60,
        progress: 0, study_minutes: 0, status: "available",
        last_studied_at: null,
      });
      toast.success("کپی شد");
    } catch (e: any) { toast.error(e.message || "خطا"); }
  };

  const handleAddChild = async () => {
    try {
      await create.mutateAsync({
        parent_id: node.id,
        exam_id: node.exam_id, subject_id: node.subject_id,
        title: "زیرنود جدید",
        type: "study", status: "available",
        estimated_minutes: 30, xp_reward: 30,
        position_x: node.position_x + 60, position_y: node.position_y + 120,
        world_kind: node.world_kind, order_index: node.order_index + 0.5,
      });
      toast.success("زیرنود اضافه شد");
    } catch (e: any) { toast.error(e.message || "خطا"); }
  };

  const handleStartTimer = () => {
    onOpenChange(false);
    navigate(`/timer?subject=${node.subject_id || ""}&node=${node.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{TYPE_LABEL[node.type]}</span>
            <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[node.status]}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-1.5 mb-2">
          <div className="flex justify-between text-xs">
            <span>پیشرفت</span>
            <span className="font-bold">{Math.round(node.progress)}% · {node.study_minutes} از {node.estimated_minutes} دقیقه</span>
          </div>
          <Progress value={node.progress} className="h-2" />
          {node.last_studied_at && (
            <p className="text-[10px] text-muted-foreground">
              آخرین مطالعه: {new Date(node.last_studied_at).toLocaleString("fa-IR")}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">⚡ جایزه: +{node.xp_reward} XP</p>
        </div>

        {isLocked && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
            <Lock className="w-3.5 h-3.5" />
            <span>این نود قفله — نودهای پیش‌نیاز رو اول کامل کن.</span>
          </div>
        )}

        {/* Form */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs">عنوان</Label>
            <Input
              value={form.title || ""}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div>
            <Label className="text-xs">توضیحات</Label>
            <Textarea
              rows={2}
              value={form.description || ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">دقیقه پیش‌بینی</Label>
              <Input
                type="number" min={5}
                value={form.estimated_minutes ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, estimated_minutes: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label className="text-xs">تاریخ</Label>
              <Input
                type="date"
                value={form.due_date || ""}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">درس</Label>
              <Select
                value={form.subject_id || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, subject_id: v === "none" ? null : v }))}
              >
                <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— بدون درس —</SelectItem>
                  {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">وضعیت</Label>
              <Select
                value={form.status || node.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as RoadmapNodeRow["status"] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button onClick={handleStartTimer} disabled={isLocked} className="gap-1.5">
              <Play className="w-3.5 h-3.5" /> شروع تایمر
            </Button>
            <Button onClick={handleSave} variant="default" className="gap-1.5">
              <Save className="w-3.5 h-3.5" /> ذخیره
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 w-full">
            <Button onClick={handleAddChild} variant="outline" size="sm" className="gap-1">
              <Plus className="w-3.5 h-3.5" /> زیرنود
            </Button>
            <Button onClick={handleDuplicate} variant="outline" size="sm" className="gap-1">
              <Copy className="w-3.5 h-3.5" /> کپی
            </Button>
            <Button onClick={handleDelete} variant="destructive" size="sm" className="gap-1">
              <Trash2 className="w-3.5 h-3.5" /> حذف
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}