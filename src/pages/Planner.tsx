import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, ChevronRight, ChevronLeft } from "lucide-react";

const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

export default function Planner() {
  const [tab, setTab] = useState("daily");

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
        <h1 className="text-xl font-bold">برنامه‌ریز</h1>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full rounded-xl">
            <TabsTrigger value="daily" className="flex-1 rounded-lg">روزانه</TabsTrigger>
            <TabsTrigger value="weekly" className="flex-1 rounded-lg">هفتگی</TabsTrigger>
            <TabsTrigger value="monthly" className="flex-1 rounded-lg">ماهانه</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4">
            <Card className="glass rounded-2xl p-6 text-center">
              <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold mb-1">برنامه روزانه</p>
              <p className="text-sm text-muted-foreground mb-4">
                از مشاور هوشمند بخواهید برنامه امروز را بسازد
              </p>
              <Button className="rounded-xl gradient-primary text-primary-foreground" onClick={() => window.location.href = "/advisor"}>
                ساخت برنامه با AI
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="weekly" className="mt-4">
            <div className="space-y-2">
              {WEEKDAYS.map((day, i) => (
                <motion.div key={day} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="glass rounded-xl p-3 flex items-center justify-between">
                    <span className="font-medium text-sm">{day}</span>
                    <span className="text-xs text-muted-foreground">بدون برنامه</span>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="monthly" className="mt-4">
            <Card className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>
                <span className="font-semibold">{MONTHS[new Date().getMonth()]} {new Date().getFullYear()}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {WEEKDAYS.map(d => <span key={d} className="text-muted-foreground py-1">{d.slice(0, 1)}</span>)}
                {Array.from({ length: 31 }, (_, i) => (
                  <button
                    key={i}
                    className={`py-2 rounded-lg transition ${
                      i + 1 === new Date().getDate()
                        ? "gradient-primary text-primary-foreground font-bold"
                        : "hover:bg-muted"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
