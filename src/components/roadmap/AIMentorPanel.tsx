import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageCircle } from "lucide-react";
import { getLevelInfo, getLevelEmoji } from "@/lib/xpEngine";

export function AIMentorPanel({
  totalXP, streak, message,
}: {
  totalXP: number;
  streak: number;
  message: string;
}) {
  const nav = useNavigate();
  const info = getLevelInfo(totalXP);
  const [bounce, setBounce] = useState(false);
  useEffect(() => { setBounce(true); const t = setTimeout(() => setBounce(false), 700); return () => clearTimeout(t); }, [message]);

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className="rounded-xl gradient-primary text-primary-foreground gap-1.5">
          <Sparkles className="w-4 h-4" /> Aria
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <span style={{ display: "inline-block", animation: bounce ? "mentorBounce 0.6s" : undefined }}>🧙‍♂️</span>
            مربی Aria
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4">
          <div
            className="rounded-2xl p-4 text-sm leading-relaxed"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(6,182,212,0.10))",
              border: "1px solid rgba(124,58,237,0.3)",
            }}
          >
            <div className="text-[11px] text-white/60 mb-1">پیام مربی</div>
            {message}
          </div>

          <div className="rounded-2xl p-3 glass">
            <div className="flex justify-between text-xs mb-1">
              <span>{getLevelEmoji(info.level)} سطح {info.level} · {info.name}</span>
              <span className="tabular-nums">{info.xpInLevel} / {info.xpNeeded} XP</span>
            </div>
            <Progress value={info.percentage} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-3 glass text-center">
              <div className="text-[10px] text-muted-foreground">Streak</div>
              <div className="text-xl font-bold">🔥 {streak}</div>
            </div>
            <div className="rounded-xl p-3 glass text-center">
              <div className="text-[10px] text-muted-foreground">XP کل</div>
              <div className="text-xl font-bold tabular-nums">{totalXP}</div>
            </div>
          </div>

          <Button onClick={() => nav("/advisor")} className="w-full gradient-primary text-primary-foreground rounded-xl gap-1.5">
            <MessageCircle className="w-4 h-4" /> مکالمه با Aria
          </Button>
        </div>
        <style>{`
          @keyframes mentorBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        `}</style>
      </DrawerContent>
    </Drawer>
  );
}