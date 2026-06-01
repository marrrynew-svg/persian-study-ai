import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { ALL_ACHIEVEMENTS } from "@/lib/xpEngine";

export function AchievementsPanel({ unlocked }: { unlocked: string[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl gap-1.5">
          <Trophy className="w-4 h-4" /> مدال‌ها ({unlocked.length}/{ALL_ACHIEVEMENTS.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>🏅 مدال‌ها و دستاوردها</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-3 mt-2">
          {ALL_ACHIEVEMENTS.map((a) => {
            const isUnlocked = unlocked.includes(a.id);
            return (
              <div
                key={a.id}
                title={`${a.title} — ${a.description} (+${a.xpReward} XP)`}
                className="aspect-square rounded-xl flex flex-col items-center justify-center p-2 transition"
                style={isUnlocked ? {
                  background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(245,158,11,0.25))",
                  border: "1px solid rgba(245,158,11,0.45)",
                  boxShadow: "0 0 16px rgba(245,158,11,0.25)",
                } : {
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                  opacity: 0.35, filter: "grayscale(1) blur(0.5px)",
                }}
              >
                <div className="text-3xl mb-1">{a.icon}</div>
                <div className="text-[10px] text-center font-medium leading-tight">{a.title}</div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}