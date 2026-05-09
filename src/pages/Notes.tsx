import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNotes, useUpsertNote, useDeleteNote, useTogglePin, type Note } from "@/hooks/useNotes";
import { Plus, Pin, PinOff, Trash2, Search, StickyNote, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NotesPage() {
  const { data: notes = [], isLoading } = useNotes();
  const upsert = useUpsertNote();
  const del = useDeleteNote();
  const togglePin = useTogglePin();
  const { toast } = useToast();

  const [active, setActive] = useState<Partial<Note> | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return notes;
    return notes.filter((n) => (n.title + " " + n.content + " " + (n.tags || []).join(" ")).toLowerCase().includes(s));
  }, [notes, q]);

  const save = async () => {
    if (!active) return;
    if (!active.title?.trim() && !active.content?.trim()) {
      toast({ title: "یادداشت خالیه", variant: "destructive" });
      return;
    }
    try {
      await upsert.mutateAsync({
        id: active.id,
        title: active.title || "",
        content: active.content || "",
        pinned: !!active.pinned,
        tags: active.tags || [],
        folder: active.folder || null,
      });
      toast({ title: "✅ ذخیره شد" });
      setActive(null);
    } catch (e: any) {
      toast({ title: "خطا", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">📝 یادداشت‌ها</h1>
            <p className="text-xs text-muted-foreground">ایده‌ها، خلاصه‌ها و یادآوری‌ها</p>
          </div>
          <Button onClick={() => setActive({ title: "", content: "", pinned: false, tags: [] })} size="sm" className="rounded-xl gradient-primary text-primary-foreground gap-1">
            <Plus className="w-4 h-4" /> جدید
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو..." className="rounded-xl pr-9" />
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map((i)=>(<div key={i} className="h-20 rounded-2xl bg-muted animate-pulse"/>))}</div>
        ) : filtered.length === 0 ? (
          <Card className="glass rounded-2xl p-10 text-center">
            <StickyNote className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-semibold mb-1">یادداشتی نداری</p>
            <p className="text-xs text-muted-foreground mb-4">ایده‌ها و خلاصه‌های مطالعه‌ت رو اینجا ثبت کن</p>
            <Button onClick={() => setActive({ title: "", content: "" })} className="rounded-xl gradient-primary text-primary-foreground">
              <Plus className="w-4 h-4 ml-1" /> اولین یادداشت
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((n, i) => (
                <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.02 }}>
                  <Card className="glass rounded-2xl p-3" onClick={() => setActive(n)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {n.pinned && <Pin className="w-3 h-3 text-accent" />}
                          <p className="text-sm font-semibold truncate">{n.title || "بدون عنوان"}</p>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 whitespace-pre-wrap">{n.content || "—"}</p>
                        <p className="text-[10px] text-muted-foreground mt-1.5">{new Date(n.updated_at).toLocaleDateString("fa-IR")}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e)=>{e.stopPropagation(); togglePin.mutate({ id: n.id, pinned: !n.pinned });}}>
                          {n.pinned ? <PinOff className="w-3.5 h-3.5"/> : <Pin className="w-3.5 h-3.5"/>}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e)=>{e.stopPropagation(); del.mutate(n.id);}}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Editor sheet */}
        <AnimatePresence>
          {active && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={() => setActive(null)}>
              <motion.div initial={{y:40, opacity:0}} animate={{y:0, opacity:1}} exit={{y:40, opacity:0}} className="w-full max-w-lg" onClick={(e)=>e.stopPropagation()}>
                <Card className="glass rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{active.id ? "ویرایش یادداشت" : "یادداشت جدید"}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActive(null)}><X className="w-4 h-4"/></Button>
                  </div>
                  <Input value={active.title || ""} onChange={(e)=>setActive({...active, title: e.target.value})} placeholder="عنوان" className="rounded-xl" />
                  <Textarea value={active.content || ""} onChange={(e)=>setActive({...active, content: e.target.value})} placeholder="متن یادداشت (مارک‌داون پشتیبانی می‌شه)..." className="rounded-xl resize-none h-44" />
                  <Input
                    value={(active.tags || []).join("، ")}
                    onChange={(e) => setActive({ ...active, tags: e.target.value.split(/[،,]/).map(s=>s.trim()).filter(Boolean) })}
                    placeholder="تگ‌ها (با کاما جدا کن)"
                    className="rounded-xl text-xs"
                  />
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" className="rounded-xl gap-1.5" onClick={() => setActive({ ...active, pinned: !active.pinned })}>
                      {active.pinned ? <><PinOff className="w-3.5 h-3.5"/> برداشتن سنجاق</> : <><Pin className="w-3.5 h-3.5"/> سنجاق کن</>}
                    </Button>
                    <Button onClick={save} disabled={upsert.isPending} className="rounded-xl gradient-primary text-primary-foreground gap-1.5">
                      <Save className="w-4 h-4" /> ذخیره
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}