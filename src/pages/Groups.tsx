import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useStudyGroups, useMyGroups, useGroupMembers, useGroupMessages,
  useCreateGroup, useJoinGroup, useSendMessage, useLeaveGroup
} from "@/hooks/useGroups";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useAwardBadge, BADGE_DEFINITIONS } from "@/hooks/useGamification";
import {
  Users, Plus, X, Send, Trophy, Hash, Crown, LogOut, Copy, ChevronLeft, Globe, Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GROUP_EMOJIS = ["📚", "🧮", "🔬", "🎯", "🏆", "💡", "🌟", "⚡", "🚀", "🎨"];

type View = "list" | "create" | "join" | "chat" | "leaderboard";

export default function Groups() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: myGroups = [], isLoading: myGroupsLoading } = useMyGroups();
  const { data: allGroups = [] } = useStudyGroups();
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();
  const sendMessage = useSendMessage();
  const awardBadge = useAwardBadge();
  const { toast } = useToast();

  const [view, setView] = useState<View>("list");
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [joinName, setJoinName] = useState(profile?.display_name || "");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create form
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupEmoji, setGroupEmoji] = useState("📚");
  const [groupPublic, setGroupPublic] = useState(true);

  const { data: members = [] } = useGroupMembers(selectedGroup?.id || null);
  const { data: messages = [] } = useGroupMessages(selectedGroup?.id || null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (profile?.display_name) setJoinName(profile.display_name);
  }, [profile]);

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    try {
      await createGroup.mutateAsync({
        name: groupName,
        description: groupDesc,
        emoji: groupEmoji,
        field_of_study: profile?.field_of_study || undefined,
        is_public: groupPublic,
      });
      await awardBadge.mutateAsync(BADGE_DEFINITIONS.find(b => b.badge_type === "social_butterfly")!);
      toast({ title: "گروه ساخته شد! 🎉" });
      setGroupName(""); setGroupDesc(""); setView("list");
    } catch (e: any) {
      toast({ title: e.message || "خطا", variant: "destructive" });
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    try {
      await joinGroup.mutateAsync({ inviteCode, displayName: joinName });
      await awardBadge.mutateAsync(BADGE_DEFINITIONS.find(b => b.badge_type === "social_butterfly")!);
      toast({ title: "به گروه پیوستید! 👥" });
      setInviteCode(""); setView("list");
    } catch (e: any) {
      toast({ title: e.message || "خطا", variant: "destructive" });
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedGroup) return;
    try {
      await sendMessage.mutateAsync({
        groupId: selectedGroup.id,
        content: message,
        displayName: profile?.display_name || "کاربر",
      });
      setMessage("");
    } catch (e: any) {
      toast({ title: "خطا در ارسال", variant: "destructive" });
    }
  };

  const openGroup = (group: any, defaultView: "chat" | "leaderboard" = "chat") => {
    setSelectedGroup(group);
    setView(defaultView);
  };

  const isMyGroup = (groupId: string) => myGroups.some((g: any) => g?.id === groupId);

  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-4">
        {/* Header */}
        <motion.div {...fadeUp} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(view !== "list") && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView("list")}>
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold">
                {view === "list" ? "گروه‌های مطالعه" :
                  view === "create" ? "ساخت گروه" :
                  view === "join" ? "پیوستن به گروه" :
                  view === "chat" ? selectedGroup?.name : "جدول امتیازات"}
              </h1>
              {view === "list" && <p className="text-xs text-muted-foreground">همراه با دوستان بهتر بخوان</p>}
            </div>
          </div>
          {view === "list" && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => setView("join")}>
                <Hash className="w-3 h-3 ml-1" />
                پیوستن
              </Button>
              <Button size="sm" className="rounded-xl gradient-primary text-primary-foreground text-xs" onClick={() => setView("create")}>
                <Plus className="w-3 h-3 ml-1" />
                گروه
              </Button>
            </div>
          )}
          {(view === "chat" || view === "leaderboard") && (
            <div className="flex gap-2">
              <Button size="sm" variant={view === "chat" ? "default" : "ghost"} className="rounded-xl text-xs h-8" onClick={() => setView("chat")}>
                💬
              </Button>
              <Button size="sm" variant={view === "leaderboard" ? "default" : "ghost"} className="rounded-xl text-xs h-8" onClick={() => setView("leaderboard")}>
                🏆
              </Button>
            </div>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {/* GROUP LIST */}
          {view === "list" && (
            <motion.div key="list" {...fadeUp} className="space-y-3">
              {myGroupsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
                </div>
              ) : myGroups.length === 0 ? (
                <Card className="glass rounded-2xl p-8 text-center">
                  <div className="text-5xl mb-3">👥</div>
                  <p className="font-semibold mb-1">هنوز عضو گروهی نیستید</p>
                  <p className="text-sm text-muted-foreground mb-4">یک گروه بسازید یا با کد دعوت بپیوندید</p>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" className="rounded-xl gradient-primary text-primary-foreground" onClick={() => setView("create")}>ساخت گروه</Button>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setView("join")}>پیوستن</Button>
                  </div>
                </Card>
              ) : (
                myGroups.map((group: any, i: number) => group && (
                  <motion.div key={group.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="glass rounded-2xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                          {group.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <h3 className="font-semibold truncate">{group.name}</h3>
                            {group.owner_id === user?.id && <Crown className="w-3 h-3 text-yellow-500 shrink-0" />}
                          </div>
                          {group.description && <p className="text-xs text-muted-foreground truncate">{group.description}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            {group.is_public ? <Globe className="w-3 h-3 text-muted-foreground" /> : <Lock className="w-3 h-3 text-muted-foreground" />}
                            <span className="text-xs text-muted-foreground">کد: {group.invite_code}</span>
                            <button onClick={() => { navigator.clipboard.writeText(group.invite_code); toast({ title: "کد کپی شد ✅" }); }}>
                              <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs" onClick={() => openGroup(group, "chat")}>💬</Button>
                          <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs" onClick={() => openGroup(group, "leaderboard")}>🏆</Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}

              {/* Public groups discovery */}
              {allGroups.filter((g: any) => !isMyGroup(g.id)).length > 0 && (
                <>
                  <p className="text-sm font-semibold text-muted-foreground pt-2">گروه‌های عمومی</p>
                  {allGroups.filter((g: any) => g.is_public && !isMyGroup(g.id)).slice(0, 5).map((group: any, i: number) => (
                    <motion.div key={group.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="glass rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-xl shrink-0">{group.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{group.name}</p>
                            {group.field_of_study && <p className="text-xs text-muted-foreground">{group.field_of_study}</p>}
                          </div>
                          <Button size="sm" variant="outline" className="rounded-xl text-xs shrink-0" onClick={() => {
                            setInviteCode(group.invite_code);
                            setView("join");
                          }}>پیوستن</Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </>
              )}
            </motion.div>
          )}

          {/* CREATE GROUP */}
          {view === "create" && (
            <motion.div key="create" {...fadeUp}>
              <Card className="glass rounded-2xl p-5 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">ایموجی گروه</p>
                  <div className="flex flex-wrap gap-2">
                    {GROUP_EMOJIS.map(e => (
                      <button key={e} onClick={() => setGroupEmoji(e)}
                        className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition ${groupEmoji === e ? "ring-2 ring-primary bg-muted" : "hover:bg-muted"}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>نام گروه</Label>
                  <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="مثلاً: تیم کنکور تجربی" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>توضیحات (اختیاری)</Label>
                  <Input value={groupDesc} onChange={e => setGroupDesc(e.target.value)} placeholder="درباره گروه بنویس..." className="rounded-xl" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>گروه عمومی باشد؟</Label>
                  <Switch checked={groupPublic} onCheckedChange={setGroupPublic} />
                </div>
                <Button onClick={handleCreate} disabled={createGroup.isPending || !groupName.trim()} className="w-full rounded-xl gradient-primary text-primary-foreground">
                  {createGroup.isPending ? "در حال ساخت..." : "✨ ساخت گروه"}
                </Button>
              </Card>
            </motion.div>
          )}

          {/* JOIN GROUP */}
          {view === "join" && (
            <motion.div key="join" {...fadeUp}>
              <Card className="glass rounded-2xl p-5 space-y-4">
                <div className="text-center text-4xl mb-2">🔑</div>
                <div className="space-y-2">
                  <Label>کد دعوت</Label>
                  <Input value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="مثلاً: a1b2c3d4" className="rounded-xl" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>نام شما در گروه</Label>
                  <Input value={joinName} onChange={e => setJoinName(e.target.value)} placeholder="نام نمایشی" className="rounded-xl" />
                </div>
                <Button onClick={handleJoin} disabled={joinGroup.isPending || !inviteCode.trim()} className="w-full rounded-xl gradient-primary text-primary-foreground">
                  {joinGroup.isPending ? "در حال پیوستن..." : "👥 پیوستن به گروه"}
                </Button>
              </Card>
            </motion.div>
          )}

          {/* CHAT */}
          {view === "chat" && selectedGroup && (
            <motion.div key="chat" {...fadeUp} className="flex flex-col h-[calc(100vh-220px)]">
              <Card className="glass rounded-2xl flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">هنوز پیامی ارسال نشده. اول باش! 👋</div>
                  ) : (
                    messages.map((msg: any) => {
                      const isOwn = msg.user_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? "justify-start" : "justify-end"}`}>
                          <div className={`max-w-[80%] ${isOwn ? "bg-primary/15 rounded-2xl rounded-tr-sm" : "bg-muted rounded-2xl rounded-tl-sm"} px-3 py-2`}>
                            {!isOwn && <p className="text-[10px] text-muted-foreground mb-1">{msg.display_name || "کاربر"}</p>}
                            <p className="text-sm">{msg.content}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 text-left" dir="ltr">
                              {new Date(msg.created_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t border-border/50 p-3 flex gap-2">
                  <Input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="پیام بنویس..."
                    className="rounded-xl flex-1"
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                  />
                  <Button size="icon" className="rounded-xl gradient-primary text-primary-foreground shrink-0" onClick={handleSend} disabled={sendMessage.isPending}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* LEADERBOARD */}
          {view === "leaderboard" && selectedGroup && (
            <motion.div key="leaderboard" {...fadeUp} className="space-y-3">
              <Card className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-semibold">جدول امتیازات</h3>
                </div>
                {members.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">هنوز عضوی ثبت نشده</p>
                ) : (
                  <div className="space-y-3">
                    {members.map((member: any, i: number) => (
                      <motion.div key={member.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                        <div className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? "bg-yellow-500/10" : i === 1 ? "bg-gray-400/10" : i === 2 ? "bg-amber-600/10" : "bg-muted/50"}`}>
                          <span className="text-lg font-bold w-8 text-center">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{member.display_name || "کاربر"}</p>
                            <p className="text-xs text-muted-foreground">{member.role === "owner" ? "👑 مدیر" : "عضو"}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-accent">{member.total_xp || 0} XP</p>
                            <p className="text-xs text-muted-foreground">{Math.round((member.weekly_minutes || 0) / 60 * 10) / 10} ساعت</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
              <Button
                variant="ghost"
                className="w-full rounded-xl text-destructive/70 hover:text-destructive"
                onClick={async () => {
                  await leaveGroup.mutateAsync(selectedGroup.id);
                  toast({ title: "از گروه خارج شدید" });
                  setView("list");
                }}
              >
                <LogOut className="w-4 h-4 ml-2" />
                خروج از گروه
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
