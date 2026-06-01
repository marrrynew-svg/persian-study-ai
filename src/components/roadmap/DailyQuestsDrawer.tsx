import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger } from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollText } from "lucide-react";
import type { DailyQuest } from "@/lib/xpEngine";

export function DailyQuestsDrawer({
  quests, weekly,
}: {
  quests: DailyQuest[];
  weekly: { title: string; target: number; current: number; xpReward: number; deadline: string };
}) {
  const weeklyPct = Math.min(100, Math.round((weekly.current / Math.max(1, weekly.target)) * 100));
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" className="rounded-xl gap-1.5">
          <ScrollText className="w-4 h-4" /> مأموریت‌ها
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>📋 مأموریت‌های امروز</DrawerTitle>
          <DrawerDescription>هر روز تجدید می‌شن</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-2 overflow-y-auto">
          {quests.map((q) => {
            const pct = Math.min(100, Math.round((q.current / Math.max(1, q.target)) * 100));
            return (
              <Card key={q.id} className="glass rounded-xl p-3">
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className={q.completed ? "line-through text-muted-foreground" : "font-medium"}>{q.title}</span>
                  <span className="text-xs text-amber-400">+{q.xpReward} XP</span>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">{q.current} / {q.target}</div>
              </Card>
            );
          })}

          <Card className="rounded-xl p-3 mt-4 border-2 border-amber-500/40 bg-amber-500/5">
            <div className="flex justify-between items-center text-sm mb-1">
              <span className="font-bold">🏆 چالش هفتگی</span>
              <span className="text-xs text-amber-400">+{weekly.xpReward} XP</span>
            </div>
            <div className="text-xs text-muted-foreground mb-2">{weekly.title}</div>
            <Progress value={weeklyPct} className="h-2" />
            <div className="text-[10px] text-muted-foreground mt-1 flex justify-between">
              <span>{weekly.current} / {weekly.target}</span>
              <span>تا {weekly.deadline}</span>
            </div>
          </Card>
        </div>
      </DrawerContent>
    </Drawer>
  );
}