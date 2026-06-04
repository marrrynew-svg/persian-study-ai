import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBacklog } from "@/hooks/usePlanino";
import { History, AlertCircle } from "lucide-react";

export function BacklogDrawer() {
  const { data: backlog = [] } = useBacklog();
  const totalMin = backlog.reduce((a, b) => a + b.remaining_minutes, 0);

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 relative">
          <History className="w-4 h-4" /> Backlog
          {backlog.length > 0 && (
            <Badge className="absolute -top-2 -left-2 h-5 min-w-5 px-1 text-[10px]">{backlog.length}</Badge>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> عقب‌افتاده‌ها ({Math.round(totalMin / 60 * 10) / 10}h)
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-2 overflow-y-auto">
          {backlog.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">عقب‌افتادگی نداری 🎉</p>
          ) : backlog.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-xl border bg-card/40 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{b.title}</p>
                <p className="text-[10px] text-muted-foreground">{b.source_date} · اولویت {Math.round(b.priority_score)}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">{b.remaining_minutes}m</Badge>
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}