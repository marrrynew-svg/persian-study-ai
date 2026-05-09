import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ListTodo, Plus } from "lucide-react";
import { useTasks, useToggleTask, useAddTask } from "@/hooks/useTasks";

export function TodayTasks() {
  const navigate = useNavigate();
  const { data: tasks = [] } = useTasks();
  const toggle = useToggleTask();
  const add = useAddTask();
  const [title, setTitle] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const todayTasks = useMemo(() => {
    return (tasks as any[]).filter((t: any) => !t.completed && (!t.due_date || t.due_date <= today)).slice(0, 5);
  }, [tasks, today]);

  const submit = async () => {
    if (!title.trim()) return;
    await add.mutateAsync({ title: title.trim(), priority: "medium", due_date: today });
    setTitle("");
  };

  return (
    <Card className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5"><ListTodo className="w-4 h-4"/> وظایف امروز</h3>
        <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs" onClick={() => navigate("/tasks")}>
          همه
        </Button>
      </div>
      <div className="flex gap-2 mb-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="یه وظیفه سریع اضافه کن…"
          className="rounded-xl text-xs h-9"
        />
        <Button size="icon" className="rounded-xl gradient-primary text-primary-foreground h-9 w-9 shrink-0" onClick={submit} disabled={!title.trim() || add.isPending}>
          <Plus className="w-4 h-4"/>
        </Button>
      </div>
      {todayTasks.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">وظیفه‌ای برای امروز نداری ✨</p>
      ) : (
        <div className="space-y-1.5">
          {todayTasks.map((t: any) => (
            <div key={t.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted/30">
              <Checkbox checked={false} onCheckedChange={() => toggle.mutate({ id: t.id, completed: true })} />
              <p className="text-xs flex-1 truncate">{t.title}</p>
              {t.priority === "high" && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">فوری</span>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}