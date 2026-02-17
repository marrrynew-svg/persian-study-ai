import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSubjects, useAddSubject, useDeleteSubject, useUpdateSubject } from "@/hooks/useSubjects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, BookOpen, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ICONS = ["📚", "🧮", "🔬", "📐", "🌍", "🧪", "📖", "💻", "🎨", "⚽"];
const COLORS = ["#8b5cf6", "#10b981", "#1e3a5f", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

export default function Subjects() {
  const { data: subjects = [], isLoading } = useSubjects();
  const addSubject = useAddSubject();
  const deleteSubject = useDeleteSubject();
  const updateSubject = useUpdateSubject();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📚");
  const [newColor, setNewColor] = useState("#8b5cf6");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await addSubject.mutateAsync({ name: newName, icon: newIcon, color: newColor });
      setNewName("");
      setShowAdd(false);
      toast({ title: "درس اضافه شد ✅" });
    } catch {
      toast({ title: "خطا", variant: "destructive" });
    }
  };

  const strengthLabel = (level: number) => {
    if (level <= 33) return "ضعیف";
    if (level <= 66) return "متوسط";
    return "قوی";
  };

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">مدیریت دروس</h1>
          <Button
            onClick={() => setShowAdd(!showAdd)}
            size="sm"
            className="rounded-xl gradient-primary text-primary-foreground"
          >
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>

        {/* Add form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="glass rounded-2xl p-4 space-y-3">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="نام درس"
                  className="rounded-xl"
                />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">آیکون</p>
                  <div className="flex flex-wrap gap-2">
                    {ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setNewIcon(icon)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition ${
                          newIcon === icon ? "ring-2 ring-primary bg-muted" : "hover:bg-muted"
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">رنگ</p>
                  <div className="flex gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewColor(color)}
                        className={`w-7 h-7 rounded-full transition ${newColor === color ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <Button onClick={handleAdd} className="w-full rounded-xl" disabled={addSubject.isPending}>
                  اضافه کردن
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subject list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">هنوز درسی اضافه نکردید</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subjects.map((subject: any, i: number) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="glass rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: `${subject.color}20` }}
                    >
                      {subject.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold truncate">{subject.name}</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive/60 hover:text-destructive"
                          onClick={() => deleteSubject.mutate(subject.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">سطح تسلط</span>
                          <span className="text-xs font-medium" style={{ color: subject.color }}>
                            {strengthLabel(subject.strength_level || 50)}
                          </span>
                        </div>
                        <Slider
                          value={[subject.strength_level || 50]}
                          max={100}
                          step={1}
                          onValueCommit={(val) =>
                            updateSubject.mutate({ id: subject.id, strength_level: val[0] })
                          }
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
