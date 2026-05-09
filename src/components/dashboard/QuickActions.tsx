import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Play, Plus, ListTodo, StickyNote } from "lucide-react";

export function QuickActions() {
  const navigate = useNavigate();
  const items = [
    { icon: Play, label: "تایمر", path: "/timer", color: "from-violet-500 to-fuchsia-500" },
    { icon: Plus, label: "ثبت جلسه", path: "/planner", color: "from-emerald-500 to-teal-500" },
    { icon: ListTodo, label: "وظیفه", path: "/tasks", color: "from-blue-500 to-cyan-500" },
    { icon: StickyNote, label: "یادداشت", path: "/notes", color: "from-amber-500 to-orange-500" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((it) => (
        <button
          key={it.path}
          onClick={() => navigate(it.path)}
          className="active:scale-95 transition-transform"
        >
          <Card className="glass rounded-2xl p-3 flex flex-col items-center gap-1.5 hover-lift">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${it.color} flex items-center justify-center text-white shadow-md`}>
              <it.icon className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-medium">{it.label}</span>
          </Card>
        </button>
      ))}
    </div>
  );
}