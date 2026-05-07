import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check } from "lucide-react";
import { useTheme, COLOR_THEMES, ColorTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PREVIEWS: Record<ColorTheme, string> = {
  "dark-academy": "linear-gradient(135deg, hsl(265 85% 60%), hsl(188 90% 55%))",
  "midnight-violet": "linear-gradient(135deg, hsl(270 90% 65%), hsl(285 95% 70%))",
  "neon-focus": "linear-gradient(135deg, hsl(160 100% 50%), hsl(195 100% 55%))",
  "prestige-gold": "linear-gradient(135deg, hsl(42 95% 55%), hsl(35 90% 50%))",
  "soft-pastel": "linear-gradient(135deg, hsl(280 80% 70%), hsl(340 85% 72%))",
  "minimal-clean": "linear-gradient(135deg, hsl(215 85% 45%), hsl(263 70% 58%))",
};

export function ThemeSwitcher() {
  const { colorTheme, setColorTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl hover-lift">
          <Palette className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 glass-strong border-border/60 rounded-2xl">
        <div className="mb-2 px-1">
          <p className="text-sm font-bold">انتخاب تم</p>
          <p className="text-xs text-muted-foreground">حال و هوای دلخواه خودت رو پیدا کن</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <AnimatePresence>
            {COLOR_THEMES.map((t) => {
              const active = t.id === colorTheme;
              return (
                <motion.button
                  key={t.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setColorTheme(t.id);
                    setTimeout(() => setOpen(false), 150);
                  }}
                  className={cn(
                    "relative rounded-xl p-2 text-right border transition-all overflow-hidden",
                    active
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-border/60 hover:border-primary/40",
                  )}
                >
                  <div
                    className="h-10 w-full rounded-lg mb-2"
                    style={{ background: PREVIEWS[t.id] }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1">
                      <span>{t.emoji}</span>
                      {t.label}
                    </span>
                    {active && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  );
}
