import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, Save, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [examDate, setExamDate] = useState("");
  const [dailyHours, setDailyHours] = useState("4");
  const [targetRank, setTargetRank] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Initialize form from profile
  if (profile && !initialized) {
    setDisplayName(profile.display_name || "");
    setFieldOfStudy(profile.field_of_study || "");
    setExamDate(profile.exam_date || "");
    setDailyHours(String(profile.daily_hours || 4));
    setTargetRank(profile.target_rank ? String(profile.target_rank) : "");
    setInitialized(true);
  }

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        display_name: displayName,
        field_of_study: fieldOfStudy || null,
        exam_date: examDate || null,
        daily_hours: Number(dailyHours) || 4,
        target_rank: targetRank ? Number(targetRank) : null,
        onboarding_completed: true,
      });
      toast({ title: "پروفایل ذخیره شد ✅" });
    } catch {
      toast({ title: "خطا در ذخیره", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
        <h1 className="text-xl font-bold">پروفایل</h1>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Avatar */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center">
                <User className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold">{displayName || "کاربر"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </motion.div>

            <Card className="glass rounded-2xl p-4 space-y-4">
              <div className="space-y-2">
                <Label>نام</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-xl" />
              </div>

              <div className="space-y-2">
                <Label>رشته تحصیلی</Label>
                <Select value={fieldOfStudy} onValueChange={setFieldOfStudy}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="انتخاب رشته" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="تجربی">تجربی</SelectItem>
                    <SelectItem value="ریاضی">ریاضی</SelectItem>
                    <SelectItem value="انسانی">انسانی</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>تاریخ آزمون</Label>
                <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="rounded-xl" dir="ltr" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>ساعت مطالعه روزانه</Label>
                  <Input type="number" value={dailyHours} onChange={(e) => setDailyHours(e.target.value)} className="rounded-xl" dir="ltr" min={1} max={16} />
                </div>
                <div className="space-y-2">
                  <Label>رتبه هدف</Label>
                  <Input type="number" value={targetRank} onChange={(e) => setTargetRank(e.target.value)} className="rounded-xl" dir="ltr" placeholder="مثلاً ۱۰۰" />
                </div>
              </div>

              <Button onClick={handleSave} className="w-full rounded-xl gradient-primary text-primary-foreground" disabled={updateProfile.isPending}>
                <Save className="w-4 h-4 ml-2" />
                ذخیره تغییرات
              </Button>
            </Card>

            <Button variant="ghost" className="w-full rounded-xl text-destructive" onClick={signOut}>
              <LogOut className="w-4 h-4 ml-2" />
              خروج از حساب
            </Button>
          </>
        )}
      </div>
    </AppLayout>
  );
}
