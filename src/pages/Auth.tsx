import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Brain, Zap, Target, Users } from "lucide-react";

const FEATURES = [
  { icon: "🧠", text: "مشاور هوشمند AI" },
  { icon: "⏱", text: "تایمر پومودورو" },
  { icon: "📊", text: "تحلیل پیشرفت" },
  { icon: "👥", text: "گروه‌های مطالعه" },
  { icon: "🏆", text: "سیستم XP و نشان" },
  { icon: "📅", text: "برنامه‌ریز هوشمند" },
];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "ثبت‌نام موفق! 🎉",
          description: "لطفاً ایمیل خود را برای تأیید بررسی کنید.",
        });
      }
    } catch (error: any) {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-10 right-10 w-80 h-80 rounded-full bg-accent/8 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-emerald/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm space-y-5">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center shadow-xl shadow-primary/20">
              <Brain className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-1">برنامه‌ریزی درسی هوشمند</h1>
          <p className="text-sm text-muted-foreground">پلتفرم پرمیوم آماده‌سازی کنکور</p>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 justify-center"
        >
          {FEATURES.map((f, i) => (
            <span key={i} className="text-xs glass px-2.5 py-1 rounded-full text-muted-foreground flex items-center gap-1">
              <span>{f.icon}</span>
              {f.text}
            </span>
          ))}
        </motion.div>

        {/* Auth card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass rounded-3xl p-6"
        >
          {/* Tab toggle */}
          <div className="flex gap-1 mb-6 bg-muted/50 rounded-xl p-1">
            <Button
              variant={isLogin ? "default" : "ghost"}
              className="flex-1 rounded-lg h-9 text-sm"
              onClick={() => setIsLogin(true)}
            >
              ورود
            </Button>
            <Button
              variant={!isLogin ? "default" : "ghost"}
              className="flex-1 rounded-lg h-9 text-sm"
              onClick={() => setIsLogin(false)}
            >
              ثبت‌نام
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label>نام</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="نام شما"
                    className="rounded-xl"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label>ایمیل</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="rounded-xl"
                dir="ltr"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>رمز عبور</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="حداقل ۶ کاراکتر"
                className="rounded-xl"
                dir="ltr"
                minLength={6}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-xl gradient-primary text-primary-foreground h-12 text-base shadow-lg shadow-primary/20"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : isLogin ? (
                "ورود به حساب →"
              ) : (
                "شروع رایگان ✨"
              )}
            </Button>
          </form>

          {!isLogin && (
            <p className="text-[11px] text-muted-foreground text-center mt-3">
              با ثبت‌نام، به XP، نشان‌ها و گروه‌های مطالعه دسترسی خواهی داشت 🎯
            </p>
          )}
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-around text-center"
        >
          <div>
            <p className="text-lg font-bold text-primary">AI</p>
            <p className="text-[10px] text-muted-foreground">مشاور هوشمند</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-lg font-bold text-accent">XP</p>
            <p className="text-[10px] text-muted-foreground">سیستم گیمیفیکیشن</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-lg font-bold text-emerald">RTL</p>
            <p className="text-[10px] text-muted-foreground">فارسی کامل</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
