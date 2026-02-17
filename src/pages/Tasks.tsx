import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTasks, useAddTask, useToggleTask, useDeleteTask } from "@/hooks/useTasks";
import { useSubjects } from "@/hooks/useSubjects";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ListTodo, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Tasks() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: subjects = [] } = useSubjects();
  const addTask = useAddTask();
  const toggleTask = useToggleTask();
  const deleteTask = useDeleteTask();
  const { toast } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [subjectId, setSubjectId] = useState("");

  const handleAdd = async () => {
    if (!title.trim()) return;
    await addTask.mutateAsync({
      title,
      priority,
      subject_id: subjectId || undefined,
    });
    setTitle("");
    setShowAdd(false);
    toast({ title: "وظیفه اضافه شد ✅" });
  };

  const pending = tasks.filter((t: any) => !t.completed);
  const completed = tasks.filter((t: any) => t.completed);

  const priorityColor = (p: string) => {
    if (p === "high") return "text-destructive";
    if (p === "low") return "text-secondary";
    return "text-accent";
  };

  const priorityLabel = (p: string) => {
    if (p === "high") return "فوری";
    if (p === "low") return "کم";
    return "متوسط";
  };

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">وظایف</h1>
          <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="rounded-xl gradient-primary text-primary-foreground">
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card className="glass rounded-2xl p-4 space-y-3">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان وظیفه" className="rounded-xl" />
                <div className="flex gap-2">
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="rounded-xl flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">کم</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="high">فوری</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger className="rounded-xl flex-1"><SelectValue placeholder="درس" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAdd} className="w-full rounded-xl" disabled={addTask.isPending}>افزودن</Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />)}</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <ListTodo className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">هنوز وظیفه‌ای نداری</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-2">
                {pending.map((task: any, i: number) => (
                  <motion.div key={task.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card className="glass rounded-xl p-3 flex items-center gap-3">
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => toggleTask.mutate({ id: task.id, completed: true })}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className={priorityColor(task.priority)}>{priorityLabel(task.priority)}</span>
                          {task.subjects && <span>• {task.subjects.icon} {task.subjects.name}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTask.mutate(task.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">انجام شده ({completed.length})</p>
                <div className="space-y-2">
                  {completed.map((task: any) => (
                    <Card key={task.id} className="glass rounded-xl p-3 flex items-center gap-3 opacity-60">
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => toggleTask.mutate({ id: task.id, completed: false })}
                      />
                      <p className="text-sm line-through flex-1 truncate">{task.title}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
