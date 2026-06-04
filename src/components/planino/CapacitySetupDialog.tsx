import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCapacity, useSaveCapacity } from "@/hooks/usePlanino";
import { computeEffectiveHours, weekdayLabel } from "@/lib/planino/capacity";
import type { CapacityRow, Weekday } from "@/lib/planino/types";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";

export function CapacitySetupDialog({ children }: { children?: React.ReactNode }) {
  const { data: capacity = [] } = useCapacity();
  const save = useSaveCapacity();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CapacityRow[]>(capacity);

  useEffect(() => { setRows(capacity); }, [capacity]);

  const update = (wd: Weekday, key: keyof CapacityRow, val: number) => {
    setRows((rs) => rs.map((r) => {
      if (r.weekday !== wd) return r;
      const next = { ...r, [key]: val } as CapacityRow;
      next.effective_h = computeEffectiveHours(next);
      return next;
    }));
  };

  const submit = async () => {
    try {
      await save.mutateAsync(rows);
      toast.success("ظرفیت روزها ذخیره شد");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "خطا در ذخیره");
    }
  };

  const order: Weekday[] = [6, 0, 1, 2, 3, 4, 5];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? <Button variant="outline" size="sm" className="gap-1"><Settings2 className="w-4 h-4" /> ظرفیت روزها</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>ظرفیت واقعی هر روز</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground mb-2">ساعت‌های روز را وارد کن؛ سیستم حداکثر زمان مفید مطالعه را خودش حساب می‌کند.</p>
        <div className="space-y-3">
          {order.map((wd) => {
            const r = rows.find((x) => x.weekday === wd);
            if (!r) return null;
            return (
              <div key={wd} className="rounded-xl border p-3 bg-card/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{weekdayLabel(wd)}</span>
                  <span className="text-xs text-emerald-500 font-semibold">مفید: {r.effective_h.toFixed(1)}h</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  {[
                    ["sleep_h", "خواب"],
                    ["school_h", "مدرسه"],
                    ["commute_h", "رفت‌وآمد"],
                    ["fixed_h", "ثابت"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <Label className="text-[10px] text-muted-foreground">{label}</Label>
                      <Input
                        type="number" min={0} max={24} step={0.5}
                        value={(r as any)[key]}
                        onChange={(e) => update(wd, key as any, parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <Button onClick={submit} disabled={save.isPending} className="w-full mt-3 gradient-primary text-primary-foreground">
          {save.isPending ? "..." : "ذخیره"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}