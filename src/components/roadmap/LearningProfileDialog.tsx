import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLearningProfile, useUpsertLearningProfile, DEFAULT_PROFILE, type LearningProfile } from "@/hooks/useLearningProfile";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";

export function LearningProfileDialog({ children }: { children?: React.ReactNode }) {
  const { data: profile } = useLearningProfile();
  const upsert = useUpsertLearningProfile();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<LearningProfile>>(DEFAULT_PROFILE);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const set = (k: keyof LearningProfile, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const save = async () => {
    try {
      await upsert.mutateAsync(form);
      toast.success("پروفایل یادگیری ذخیره شد ✨");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || "خطا در ذخیره");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
            <Settings2 className="w-4 h-4" /> پروفایل یادگیری
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>پروفایل یادگیری</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>سرعت مطالعه</Label>
              <Select value={form.reading_speed} onValueChange={(v) => set("reading_speed", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">آهسته 🐢</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="fast">سریع 🐇</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>عمق مطالعه</Label>
              <Select value={form.study_depth} onValueChange={(v) => set("study_depth", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deep">عمیق</SelectItem>
                  <SelectItem value="balanced">متعادل</SelectItem>
                  <SelectItem value="fast">سریع</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>پنجره اوج تمرکز</Label>
            <Select value={form.peak_window} onValueChange={(v) => set("peak_window", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">صبح ☀️</SelectItem>
                <SelectItem value="afternoon">ظهر</SelectItem>
                <SelectItem value="evening">عصر/شب 🌙</SelectItem>
                <SelectItem value="night">آخر شب 🌌</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex justify-between mb-1"><Label>طول جلسه تمرکز</Label><span className="text-xs text-muted-foreground">{form.focus_minutes} دقیقه</span></div>
            <Slider value={[form.focus_minutes || 45]} min={15} max={120} step={5} onValueChange={(v) => set("focus_minutes", v[0])} />
          </div>

          <div>
            <div className="flex justify-between mb-1"><Label>استراحت بین جلسات</Label><span className="text-xs text-muted-foreground">{form.break_minutes} دقیقه</span></div>
            <Slider value={[form.break_minutes || 10]} min={5} max={30} step={1} onValueChange={(v) => set("break_minutes", v[0])} />
          </div>

          <div>
            <div className="flex justify-between mb-1"><Label>ساعت در دسترس در هفته</Label><span className="text-xs text-muted-foreground">{form.weekly_available_hours} ساعت</span></div>
            <Slider value={[form.weekly_available_hours || 28]} min={5} max={70} step={1} onValueChange={(v) => set("weekly_available_hours", v[0])} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between mb-1"><Label>قدرت حافظه</Label><span className="text-xs">{form.memorization_strength}/5</span></div>
              <Slider value={[form.memorization_strength || 3]} min={1} max={5} step={1} onValueChange={(v) => set("memorization_strength", v[0])} />
            </div>
            <div>
              <div className="flex justify-between mb-1"><Label>تحلیل/استدلال</Label><span className="text-xs">{form.analytical_strength}/5</span></div>
              <Slider value={[form.analytical_strength || 3]} min={1} max={5} step={1} onValueChange={(v) => set("analytical_strength", v[0])} />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1"><Label>سرعت پخش ویدیو</Label><span className="text-xs">{form.video_speed}×</span></div>
            <Slider value={[Math.round((form.video_speed || 1.25) * 4)]} min={3} max={10} step={1} onValueChange={(v) => set("video_speed", v[0] / 4)} />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Label>عاشق تست‌زنی هستم؟</Label>
            <Switch checked={!!form.prefers_practice_tests} onCheckedChange={(v) => set("prefers_practice_tests", v)} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={upsert.isPending} className="gradient-primary text-primary-foreground">
            {upsert.isPending ? "در حال ذخیره…" : "ذخیره"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}