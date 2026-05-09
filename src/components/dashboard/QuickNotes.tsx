import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pin, Plus, StickyNote } from "lucide-react";
import { useNotes } from "@/hooks/useNotes";

export function QuickNotes() {
  const navigate = useNavigate();
  const { data: notes = [] } = useNotes();
  const top = notes.slice(0, 3);

  return (
    <Card className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5"><StickyNote className="w-4 h-4"/> یادداشت‌های اخیر</h3>
        <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs gap-1" onClick={() => navigate("/notes")}>
          <Plus className="w-3 h-3"/> جدید
        </Button>
      </div>
      {top.length === 0 ? (
        <button onClick={() => navigate("/notes")} className="w-full py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl hover:bg-muted/30 transition">
          هنوز یادداشتی نداری — یکی بساز ✍️
        </button>
      ) : (
        <div className="space-y-1.5">
          {top.map((n) => (
            <button key={n.id} onClick={() => navigate("/notes")} className="w-full text-right p-2 rounded-xl hover:bg-muted/40 transition">
              <div className="flex items-center gap-1.5">
                {n.pinned && <Pin className="w-3 h-3 text-accent shrink-0" />}
                <p className="text-xs font-medium truncate">{n.title || "بدون عنوان"}</p>
              </div>
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{n.content || "—"}</p>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}